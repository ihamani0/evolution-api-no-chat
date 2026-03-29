import { EnqueueResultDto, ProcessQueueResultDto, QueueConfigDto, QueueStatusDto } from '@api/dto/queue.dto';
import { SendTextDto } from '@api/dto/sendMessage.dto';
import { PrismaRepository } from '@api/repository/repository.service';
import { WAMonitoringService } from '@api/services/monitor.service';
import { RateLimiterService } from '@api/services/rate-limiter.service';
import { Logger } from '@config/logger.config';

interface QueuedMessageData {
  id: string;
  instanceName: string;
  number: string;
  messageType: string;
  messagePayload: {
    message: any;
    options?: any;
  };
  queuedAt: number;
  retryCount: number;
  instanceId?: string;
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

  private configCache: Map<string, QueueConfigDto> = new Map();
  private processingInstances: Set<string> = new Set();

  constructor(
    private readonly prismaRepository: PrismaRepository,
    private readonly waMonitor: WAMonitoringService,
    private readonly rateLimiterService: RateLimiterService,
  ) {}

  async getConfig(instanceName: string): Promise<QueueConfigDto> {
    if (this.configCache.has(instanceName)) {
      return this.configCache.get(instanceName)!;
    }
    return this.defaultConfig;
  }

  async setConfig(instanceName: string, config: QueueConfigDto): Promise<void> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    this.configCache.set(instanceName, mergedConfig);
    this.logger.log(`Queue config set for instance ${instanceName}`);
  }

  async enqueue(
    instanceName: string,
    message: Omit<QueuedMessageData, 'id' | 'queuedAt' | 'retryCount'>,
  ): Promise<EnqueueResultDto> {
    const config = await this.getConfig(instanceName);

    if (!config.enabled) {
      return { queued: false };
    }

    try {
      const instance = await this.prismaRepository.instance.findUnique({
        where: { name: instanceName },
      });

      if (!instance) {
        this.logger.error('Instance ' + instanceName + ' not found');
        return { queued: false };
      }

      const queuedMessage = await this.prismaRepository.queuedMessage.create({
        data: {
          instanceName: instanceName,
          number: message.number,
          messageType: message.messageType,
          messagePayload: message.messagePayload,
          retryCount: 0,
          instanceId: instance.id,
        },
      });

      const count = await this.prismaRepository.queuedMessage.count({
        where: { instanceName },
      });

      this.logger.log(`Message ${queuedMessage.id} queued for instance ${instanceName}. Position: ${count}`);

      return {
        queued: true,
        messageId: queuedMessage.id,
        position: count,
      };
    } catch (error) {
      this.logger.error('Error enqueuing message: ' + error);
      return { queued: false };
    }
  }

  async dequeue(instanceName: string): Promise<QueuedMessageData | null> {
    try {
      const message = await this.prismaRepository.queuedMessage.findFirst({
        where: { instanceName },
        orderBy: { queuedAt: 'asc' },
      });

      if (!message) {
        return null;
      }

      return {
        id: message.id,
        instanceName: message.instanceName,
        number: message.number,
        messageType: message.messageType,
        messagePayload: message.messagePayload as any,
        queuedAt: message.queuedAt.getTime(),
        retryCount: message.retryCount,
        instanceId: message.instanceId,
      };
    } catch (error) {
      this.logger.error('Error dequeuing message: ' + error);
      return null;
    }
  }

  async peek(instanceName: string): Promise<QueuedMessageData | null> {
    try {
      const message = await this.prismaRepository.queuedMessage.findFirst({
        where: { instanceName },
        orderBy: { queuedAt: 'asc' },
      });

      if (!message) {
        return null;
      }

      return {
        id: message.id,
        instanceName: message.instanceName,
        number: message.number,
        messageType: message.messageType,
        messagePayload: message.messagePayload as any,
        queuedAt: message.queuedAt.getTime(),
        retryCount: message.retryCount,
        instanceId: message.instanceId,
      };
    } catch (error) {
      this.logger.error('Error peeking message: ' + error);
      return null;
    }
  }

  async getAllMessages(instanceName: string): Promise<QueuedMessageData[]> {
    try {
      const messages = await this.prismaRepository.queuedMessage.findMany({
        where: { instanceName },
        orderBy: { queuedAt: 'asc' },
      });

      return messages.map((msg) => ({
        id: msg.id,
        instanceName: msg.instanceName,
        number: msg.number,
        messageType: msg.messageType,
        messagePayload: msg.messagePayload as any,
        queuedAt: msg.queuedAt.getTime(),
        retryCount: msg.retryCount,
        instanceId: msg.instanceId,
      }));
    } catch (error) {
      this.logger.error('Error getting all messages: ' + error);
      return [];
    }
  }

  async getStatus(instanceName: string): Promise<QueueStatusDto> {
    try {
      const count = await this.prismaRepository.queuedMessage.count({
        where: { instanceName },
      });

      const lastMessage = await this.prismaRepository.queuedMessage.findFirst({
        where: { instanceName },
        orderBy: { queuedAt: 'desc' },
      });

      return {
        count,
        lastProcessedAt: lastMessage?.queuedAt?.getTime() || null,
      };
    } catch (error) {
      this.logger.error('Error getting queue status: ' + error);
      return { count: 0, lastProcessedAt: null };
    }
  }

  async clear(instanceName: string): Promise<void> {
    try {
      await this.prismaRepository.queuedMessage.deleteMany({
        where: { instanceName },
      });
      this.logger.log('Queue cleared for instance ' + instanceName);
    } catch (error) {
      this.logger.error('Error clearing queue: ' + error);
    }
  }

  async removeMessage(instanceName: string, messageId: string): Promise<boolean> {
    try {
      await this.prismaRepository.queuedMessage.delete({
        where: { id: messageId },
      });
      return true;
    } catch (error) {
      this.logger.error('Error removing message: ' + error);
      return false;
    }
  }

  async processQueue(instanceName: string, maxMessages?: number): Promise<ProcessQueueResultDto> {
    console.log('[QUEUE-DEBUG] processQueue called for ' + instanceName);

    if (this.processingInstances.has(instanceName)) {
      const msg = 'Already processing queue for instance ' + instanceName;
      this.logger.warn(msg);
      console.log('[QUEUE-DEBUG] ' + msg);
      return { processed: 0, remaining: 0, failed: 0 };
    }

    const config = await this.getConfig(instanceName);
    const limit = maxMessages || config.maxMessagesPerProcess || 10;

    this.processingInstances.add(instanceName);
    console.log('[QUEUE-DEBUG] Added ' + instanceName + ' to processingInstances');

    const results: Array<{ messageId: string; success: boolean; error?: string }> = [];
    let processed = 0;
    let failed = 0;

    try {
      console.log('[QUEUE-DEBUG] Getting status...');
      const queueStatus = await this.getStatus(instanceName);
      const rateStatus = await this.rateLimiterService.getStatus(instanceName);
      let remaining = queueStatus.count;

      const logMsg =
        'Processing queue for ' +
        instanceName +
        ': ' +
        remaining +
        ' messages, remainingThisMinute: ' +
        rateStatus.remainingThisMinute +
        ', remainingThisHour: ' +
        rateStatus.remainingThisHour;
      this.logger.log(logMsg);
      console.log('[QUEUE-DEBUG] ' + logMsg);

      while (processed < limit && remaining > 0) {
        console.log('[QUEUE-DEBUG] While loop iteration, processed=' + processed + ', remaining=' + remaining);

        // Get fresh rate status for each iteration
        const currentRateStatus = await this.rateLimiterService.getStatus(instanceName);
        const { canSend } = await this.rateLimiterService.checkLimit(instanceName);

        console.log(
          '[QUEUE-DEBUG] canSend=' +
            canSend +
            ', remainingThisMinute=' +
            currentRateStatus.remainingThisMinute +
            ', remainingThisHour=' +
            currentRateStatus.remainingThisHour,
        );

        // Only block if hour or day limits are hit (not minute)
        // Allow processing when minute limit resets
        if (!canSend && currentRateStatus.remainingThisHour <= 0) {
          const msg = 'Hour/Day limit reached for instance ' + instanceName + ', waiting for next cycle';
          this.logger.log(msg);
          console.log('[QUEUE-DEBUG] ' + msg);
          break;
        }

        if (!canSend && currentRateStatus.remainingThisMinute <= 0) {
          const msg = 'Per-minute limit reached, will retry in next cycle';
          this.logger.log(msg);
          console.log('[QUEUE-DEBUG] ' + msg);
          break;
        }

        console.log('[QUEUE-DEBUG] Dequeuing message...');
        const message = await this.dequeue(instanceName);

        if (!message) {
          console.log('[QUEUE-DEBUG] No message to dequeue');
          break;
        }

        console.log('[QUEUE-DEBUG] Sending message ' + message.id + ' to ' + message.number);

        try {
          await this.sendMessage(instanceName, message);
          console.log('[QUEUE-DEBUG] Message sent, deleting from queue...');

          await this.prismaRepository.queuedMessage.delete({
            where: { id: message.id },
          });

          await this.rateLimiterService.recordMessage(instanceName);

          processed++;
          this.logger.log(`Processed and deleted queued message ${message.id} for instance ${instanceName}`);
          console.log('[QUEUE-DEBUG] Message ' + message.id + ' processed and deleted');
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.log('[QUEUE-DEBUG] Error processing message: ' + errorMsg);

          if (message.retryCount < (config.maxRetries || 3)) {
            await this.prismaRepository.queuedMessage.update({
              where: { id: message.id },
              data: { retryCount: message.retryCount + 1 },
            });
            this.logger.warn(`Message ${message.id} failed, will retry. Retry: ${message.retryCount + 1}`);
          } else {
            await this.prismaRepository.queuedMessage.update({
              where: { id: message.id },
              data: { failedAt: new Date(), errorMessage: errorMsg },
            });
            results.push({ messageId: message.id, success: false, error: errorMsg });
            this.logger.error(`Message ${message.id} failed after max retries: ${errorMsg}`);
          }
        }

        remaining = (await this.getStatus(instanceName)).count;
      }

      console.log('[QUEUE-DEBUG] While loop ended, processed=' + processed + ', remaining=' + remaining);
    } finally {
      this.processingInstances.delete(instanceName);
      console.log('[QUEUE-DEBUG] Removed ' + instanceName + ' from processingInstances');
    }

    const finalStatus = await this.getStatus(instanceName);

    return {
      processed,
      remaining: finalStatus.count,
      failed,
      results,
    };
  }

  private async sendMessage(instanceName: string, message: QueuedMessageData): Promise<void> {
    this.logger.log(`Sending queued message ${message.id} to ${message.number} (type: ${message.messageType})`);

    const { message: msgContent } = message.messagePayload;

    if (!this.waMonitor.waInstances[instanceName]) {
      throw new Error(`Instance ${instanceName} not found in waMonitor`);
    }

    const waInstance = this.waMonitor.waInstances[instanceName];
    const config = await this.rateLimiterService.getConfig(instanceName);

    try {
      if (config.humanLikeBehavior) {
        await waInstance.simulateHumanBehavior(message.number, msgContent, config);
      }
    } catch (error) {
      this.logger.warn('Human behavior simulation failed for queued message: ' + error);
    }

    switch (message.messageType) {
      case 'text': {
        const sendData: SendTextDto = {
          number: message.number,
          text: msgContent?.text || msgContent?.conversation || JSON.stringify(msgContent),
          isFromQueue: true,
        };
        await waInstance.textMessage(sendData);
        break;
      }
      default: {
        this.logger.warn(`Unknown message type: ${message.messageType}, using text fallback`);
        const fallbackData: SendTextDto = {
          number: message.number,
          text: JSON.stringify(msgContent),
          isFromQueue: true,
        };
        await waInstance.textMessage(fallbackData);
      }
    }

    this.logger.log(`Successfully sent message ${message.id} to ${message.number}`);
  }

  async startAutoProcess(): Promise<void> {
    const loggerMsg = '[QUEUE-AUTO] Starting auto process scheduler';
    this.logger.log(loggerMsg);
    console.log(loggerMsg);

    setInterval(async () => {
      try {
        console.log('[QUEUE-AUTO] === AUTO-PROCESS CYCLE START ===');

        const instances = await this.prismaRepository.instance.findMany({
          where: { connectionStatus: 'open' },
        });

        const msg = '[QUEUE-AUTO] Found ' + instances.length + ' instances with connectionStatus: open';
        this.logger.log(msg);
        console.log(msg);

        if (instances.length === 0) {
          const allInstances = await this.prismaRepository.instance.findMany({
            select: { name: true, connectionStatus: true },
          });
          const statusMsg =
            '[QUEUE-AUTO] All instances: ' +
            JSON.stringify(allInstances.map((i) => ({ name: i.name, status: i.connectionStatus })));
          this.logger.log(statusMsg);
          console.log(statusMsg);
        }

        for (const instance of instances) {
          const config = await this.getConfig(instance.name);
          const configMsg = '[QUEUE-AUTO] Instance: ' + instance.name + ' autoProcess=' + config.autoProcess;
          this.logger.log(configMsg);
          console.log(configMsg);

          if (config.autoProcess) {
            const queueStatus = await this.getStatus(instance.name);
            const queueMsg = '[QUEUE-AUTO] Queue for ' + instance.name + ': count=' + queueStatus.count;
            this.logger.log(queueMsg);
            console.log(queueMsg);

            if (queueStatus.count > 0) {
              const processMsg = '[QUEUE-AUTO] Calling processQueue for ' + instance.name;
              this.logger.log(processMsg);
              console.log(processMsg);
              await this.processQueue(instance.name);
            } else {
              const skipMsg = '[QUEUE-AUTO] No messages in queue for ' + instance.name + ', skipping';
              this.logger.log(skipMsg);
              console.log(skipMsg);
            }
          } else {
            const disabledMsg = '[QUEUE-AUTO] Auto-process disabled for ' + instance.name;
            this.logger.log(disabledMsg);
            console.log(disabledMsg);
          }
        }
        console.log('[QUEUE-AUTO] === AUTO-PROCESS CYCLE END ===');
      } catch (error) {
        const errorMsg = '[QUEUE-AUTO] Auto process error: ' + error;
        this.logger.error(errorMsg);
        console.error(errorMsg);
      }
    }, this.defaultConfig.processInterval || 30000);
  }
}
