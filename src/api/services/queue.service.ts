import { Logger } from '@config/logger.config';
import { CacheService } from '@api/services/cache.service';
import { QueueConfigDto, QueueStatusDto, ProcessQueueResultDto, EnqueueResultDto } from '@api/dto/queue.dto';
import { v4 } from 'uuid';

export interface QueuedMessage {
  id: string;
  instanceName: string;
  number: string;
  messageType: string;
  messagePayload: Record<string, any>;
  queuedAt: number;
  retryCount: number;
}

interface QueueData {
  messages: QueuedMessage[];
  lastProcessedAt?: number;
}

export class QueueService {
  private readonly logger = new Logger('QueueService');
  private readonly cache: CacheService;
  private readonly defaultConfig: QueueConfigDto = {
    enabled: true,
    maxRetries: 3,
    processInterval: 30000,
    maxMessagesPerProcess: 10,
    autoProcess: true,
  };

  private processingInstances: Set<string> = new Set();

  constructor(cacheService: CacheService) {
    this.cache = cacheService;
  }

  private getQueueKey(instanceName: string): string {
    return `rate_limiter:queue:${instanceName}`;
  }

  private getConfigKey(instanceName: string): string {
    return `rate_limiter:queue:config:${instanceName}`;
  }

  async getConfig(instanceName: string): Promise<QueueConfigDto> {
    const key = this.getConfigKey(instanceName);
    const data = await this.cache.get(key);
    return data || this.defaultConfig;
  }

  async setConfig(instanceName: string, config: QueueConfigDto): Promise<void> {
    const key = this.getConfigKey(instanceName);
    const mergedConfig = { ...this.defaultConfig, ...config };
    await this.cache.set(key, JSON.stringify(mergedConfig), 0);
  }

  async enqueue(
    instanceName: string,
    message: Omit<QueuedMessage, 'id' | 'queuedAt' | 'retryCount'>,
  ): Promise<EnqueueResultDto> {
    const config = await this.getConfig(instanceName);

    if (!config.enabled) {
      return { queued: false };
    }

    const key = this.getQueueKey(instanceName);
    const queuedMessage: QueuedMessage = {
      ...message,
      id: v4(),
      queuedAt: Date.now(),
      retryCount: 0,
    };

    const existingData = await this.cache.get(key);
    let queueData: QueueData = existingData ? JSON.parse(existingData) : { messages: [] };

    queueData.messages.push(queuedMessage);

    await this.cache.set(key, JSON.stringify(queueData), 0);

    const count = queueData.messages.length;

    this.logger.log(`Message ${queuedMessage.id} queued for instance ${instanceName}. Position: ${count}`);

    return {
      queued: true,
      messageId: queuedMessage.id,
      position: count,
    };
  }

  async dequeue(instanceName: string): Promise<QueuedMessage | null> {
    const key = this.getQueueKey(instanceName);
    const existingData = await this.cache.get(key);

    if (!existingData) {
      return null;
    }

    const queueData: QueueData = JSON.parse(existingData);

    if (queueData.messages.length === 0) {
      return null;
    }

    const message = queueData.messages.shift();

    await this.cache.set(key, JSON.stringify(queueData), 0);

    return message || null;
  }

  async peek(instanceName: string): Promise<QueuedMessage | null> {
    const key = this.getQueueKey(instanceName);
    const existingData = await this.cache.get(key);

    if (!existingData) {
      return null;
    }

    const queueData: QueueData = JSON.parse(existingData);

    if (queueData.messages.length === 0) {
      return null;
    }

    return queueData.messages[0] || null;
  }

  async getAllMessages(instanceName: string): Promise<QueuedMessage[]> {
    const key = this.getQueueKey(instanceName);
    const existingData = await this.cache.get(key);

    if (!existingData) {
      return [];
    }

    const queueData: QueueData = JSON.parse(existingData);
    return queueData.messages;
  }

  async getStatus(instanceName: string): Promise<QueueStatusDto> {
    const key = this.getQueueKey(instanceName);
    const existingData = await this.cache.get(key);

    if (!existingData) {
      return { count: 0, lastProcessedAt: null };
    }

    const queueData: QueueData = JSON.parse(existingData);

    return {
      count: queueData.messages.length,
      lastProcessedAt: queueData.lastProcessedAt || null,
    };
  }

  async clear(instanceName: string): Promise<void> {
    const key = this.getQueueKey(instanceName);
    await this.cache.delete(key);
    this.logger.log(`Queue cleared for instance ${instanceName}`);
  }

  async removeMessage(instanceName: string, messageId: string): Promise<boolean> {
    const key = this.getQueueKey(instanceName);
    const existingData = await this.cache.get(key);

    if (!existingData) {
      return false;
    }

    const queueData: QueueData = JSON.parse(existingData);
    const originalLength = queueData.messages.length;

    queueData.messages = queueData.messages.filter((msg) => msg.id !== messageId);

    if (queueData.messages.length === originalLength) {
      return false;
    }

    await this.cache.set(key, JSON.stringify(queueData), 0);

    return true;
  }

  async processQueue(instanceName: string, maxMessages?: number): Promise<ProcessQueueResultDto> {
    if (this.processingInstances.has(instanceName)) {
      this.logger.warn(`Already processing queue for instance ${instanceName}`);
      return { processed: 0, remaining: 0, failed: 0 };
    }

    const config = await this.getConfig(instanceName);
    const limit = maxMessages || config.maxMessagesPerProcess || 10;

    this.processingInstances.add(instanceName);

    const results: Array<{ messageId: string; success: boolean; error?: string }> = [];
    let processed = 0;
    let failed = 0;

    try {
      const status = await this.getStatus(instanceName);
      let remaining = status.count;

      while (processed < limit && remaining > 0) {
        const canSend = await this.checkAndWaitForSlot(instanceName);

        if (!canSend) {
          this.logger.log(`Rate limit reached for instance ${instanceName}, waiting for next cycle`);
          break;
        }

        const message = await this.dequeue(instanceName);

        if (!message) {
          break;
        }

        try {
          await this.sendMessage(instanceName, message);
          processed++;
          this.logger.log(`Processed queued message ${message.id} for instance ${instanceName}`);
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';

          if (message.retryCount < (config.maxRetries || 3)) {
            message.retryCount++;
            const key = this.getQueueKey(instanceName);
            const existingData = await this.cache.get(key);
            const queueData: QueueData = existingData ? JSON.parse(existingData) : { messages: [] };
            queueData.messages.push(message);
            await this.cache.set(key, JSON.stringify(queueData), 0);
            this.logger.warn(`Message ${message.id} failed, requeued. Retry: ${message.retryCount}`);
          } else {
            results.push({ messageId: message.id, success: false, error: errorMsg });
            this.logger.error(`Message ${message.id} failed after max retries: ${errorMsg}`);
          }
        }

        remaining = (await this.getStatus(instanceName)).count;
      }

      if (processed > 0) {
        const key = this.getQueueKey(instanceName);
        const existingData = await this.cache.get(key);
        const queueData: QueueData = existingData ? JSON.parse(existingData) : { messages: [] };
        queueData.lastProcessedAt = Date.now();
        await this.cache.set(key, JSON.stringify(queueData), 0);
      }
    } finally {
      this.processingInstances.delete(instanceName);
    }

    const finalStatus = await this.getStatus(instanceName);

    return {
      processed,
      remaining: finalStatus.count,
      failed,
      results,
    };
  }

  private async checkAndWaitForSlot(instanceName: string): Promise<boolean> {
    const { cache } = this;
    const key = `rate_limiter:${instanceName}`;
    const data = await cache.hGet(key, 'data');

    if (!data) {
      return true;
    }

    const rateLimitData = typeof data === 'string' ? JSON.parse(data) : data;
    const config = await this.getConfig(instanceName);

    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentMinute = Math.floor(now / 60000);
    const currentHour = Math.floor(now / 3600000);
    const currentDay = Math.floor(now / 86400000);

    const secondMessages = (rateLimitData.second || []).filter((ts: number) => ts >= currentSecond);
    const minuteMessages = (rateLimitData.minute || []).filter((ts: number) => ts >= currentMinute);
    const hourMessages = (rateLimitData.hour || []).filter((ts: number) => ts >= currentHour);
    const dayMessages = (rateLimitData.day || []).filter((ts: number) => ts >= currentDay);

    if (config.messagesPerSecond && secondMessages.length >= config.messagesPerSecond) {
      return false;
    }
    if (config.messagesPerMinute && minuteMessages.length >= config.messagesPerMinute) {
      return false;
    }
    if (config.messagesPerHour && hourMessages.length >= config.messagesPerHour) {
      return false;
    }
    if (config.messagesPerDay && dayMessages.length >= config.messagesPerDay) {
      return false;
    }

    return true;
  }

  private async sendMessage(instanceName: string, message: QueuedMessage): Promise<void> {
    this.logger.log(`Sending queued message ${message.id} to ${message.number}`);
  }

  async startAutoProcess(): Promise<void> {
    this.logger.log('Starting auto process scheduler');

    setInterval(async () => {
      try {
        const keys = await this.cache.keys('rate_limiter:queue:*');
        const instanceNames = new Set<string>();

        for (const key of keys) {
          if (key.includes('rate_limiter:queue:') && !key.includes('config:') && !key.includes('status:')) {
            const match = key.match(/rate_limiter:queue:([^:]+)$/);
            if (match) {
              instanceNames.add(match[1]);
            }
          }
        }

        for (const instanceName of instanceNames) {
          const config = await this.getConfig(instanceName);
          if (config.autoProcess) {
            await this.processQueue(instanceName);
          }
        }
      } catch (error) {
        this.logger.error(error);
      }
    }, this.defaultConfig.processInterval || 30000);
  }
}
