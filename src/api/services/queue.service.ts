import { Logger } from '@config/logger.config';
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
  private readonly defaultConfig: QueueConfigDto = {
    enabled: true,
    maxRetries: 3,
    processInterval: 30000,
    maxMessagesPerProcess: 10,
    autoProcess: true,
  };

  private processingInstances: Set<string> = new Set();

  private queueData: Map<string, QueueData> = new Map();

  private getQueueData(instanceName: string): QueueData {
    if (!this.queueData.has(instanceName)) {
      this.queueData.set(instanceName, { messages: [], lastProcessedAt: undefined });
    }
    return this.queueData.get(instanceName)!;
  }

  private saveQueueData(instanceName: string, data: QueueData): void {
    this.queueData.set(instanceName, data);
  }

  async getConfig(instanceName: string): Promise<QueueConfigDto> {
    const data = this.getQueueData(instanceName);
    const config = (data as any).config;
    return config || this.defaultConfig;
  }

  async setConfig(instanceName: string, config: QueueConfigDto): Promise<void> {
    const data = this.getQueueData(instanceName);
    (data as any).config = { ...this.defaultConfig, ...config };
    this.saveQueueData(instanceName, data);
  }

  async enqueue(
    instanceName: string,
    message: Omit<QueuedMessage, 'id' | 'queuedAt' | 'retryCount'>,
  ): Promise<EnqueueResultDto> {
    const config = await this.getConfig(instanceName);

    if (!config.enabled) {
      return { queued: false };
    }

    const data = this.getQueueData(instanceName);
    const queuedMessage: QueuedMessage = {
      ...message,
      id: v4(),
      queuedAt: Date.now(),
      retryCount: 0,
    };

    data.messages.push(queuedMessage);
    this.saveQueueData(instanceName, data);

    const position = data.messages.length;

    this.logger.log(`Message ${queuedMessage.id} queued for instance ${instanceName}. Position: ${position}`);

    return {
      queued: true,
      messageId: queuedMessage.id,
      position: position,
    };
  }

  async dequeue(instanceName: string): Promise<QueuedMessage | null> {
    const data = this.getQueueData(instanceName);

    if (data.messages.length === 0) {
      return null;
    }

    const message = data.messages.shift()!;
    this.saveQueueData(instanceName, data);

    return message;
  }

  async peek(instanceName: string): Promise<QueuedMessage | null> {
    const data = this.getQueueData(instanceName);

    if (data.messages.length === 0) {
      return null;
    }

    return data.messages[0] || null;
  }

  async getAllMessages(instanceName: string): Promise<QueuedMessage[]> {
    const data = this.getQueueData(instanceName);
    return [...data.messages];
  }

  async getStatus(instanceName: string): Promise<QueueStatusDto> {
    const data = this.getQueueData(instanceName);
    return {
      count: data.messages.length,
      lastProcessedAt: data.lastProcessedAt || null,
    };
  }

  async clear(instanceName: string): Promise<void> {
    const data = this.getQueueData(instanceName);
    data.messages = [];
    data.lastProcessedAt = undefined;
    this.saveQueueData(instanceName, data);
    this.logger.log(`Queue cleared for instance ${instanceName}`);
  }

  async removeMessage(instanceName: string, messageId: string): Promise<boolean> {
    const data = this.getQueueData(instanceName);
    const originalLength = data.messages.length;

    data.messages = data.messages.filter((msg) => msg.id !== messageId);

    if (data.messages.length === originalLength) {
      return false;
    }

    this.saveQueueData(instanceName, data);
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
        const canSend = await this.checkAndWaitForSlot(instanceName, config);

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
            const data = this.getQueueData(instanceName);
            data.messages.push(message);
            this.saveQueueData(instanceName, data);
            this.logger.warn(`Message ${message.id} failed, requeued. Retry: ${message.retryCount}`);
          } else {
            results.push({ messageId: message.id, success: false, error: errorMsg });
            this.logger.error(`Message ${message.id} failed after max retries: ${errorMsg}`);
          }
        }

        remaining = (await this.getStatus(instanceName)).count;
      }

      if (processed > 0) {
        const data = this.getQueueData(instanceName);
        data.lastProcessedAt = Date.now();
        this.saveQueueData(instanceName, data);
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

  private async checkAndWaitForSlot(instanceName: string, config: QueueConfigDto): Promise<boolean> {
    const data = this.getQueueData(instanceName);
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentMinute = Math.floor(now / 60000);
    const currentHour = Math.floor(now / 3600000);
    const currentDay = Math.floor(now / 86400000);

    const rateLimitData = (data as any).rateLimitData || {
      second: [],
      minute: [],
      hour: [],
      day: [],
    };

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
        for (const instanceName of this.queueData.keys()) {
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
