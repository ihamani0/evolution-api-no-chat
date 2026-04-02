import { RateLimiterConfigDto, RateLimiterStatusDto } from '@api/dto/rate-limiter.dto';
import { CacheService } from '@api/services/cache.service';
import { Logger } from '@config/logger.config';

interface RateLimitData {
  timestamps: number[];
  config: RateLimiterConfigDto;
}

export class RateLimiterService {
  private readonly logger = new Logger('RateLimiterService');
  private readonly cache: CacheService;
  private readonly defaultConfig: RateLimiterConfigDto = {
    enabled: true,
    messagesPerSecond: 1,
    messagesPerMinute: 20,
    messagesPerHour: 200,
    messagesPerDay: 1000,
    delayBetweenMessages: 2000,
    maxRetries: 3,
    backoffMultiplier: 1.5,
  };

  constructor(cacheService: CacheService) {
    this.cache = cacheService;
  }

  private getCacheKey(instanceName: string): string {
    return `rate_limiter:${instanceName}`;
  }

  async getConfig(instanceName: string): Promise<RateLimiterConfigDto> {
    const key = this.getCacheKey(instanceName);
    const data = await this.cache.hGet(key, 'config');
    return data || this.defaultConfig;
  }

  async setConfig(instanceName: string, config: RateLimiterConfigDto): Promise<void> {
    const key = this.getCacheKey(instanceName);
    const mergedConfig = { ...this.defaultConfig, ...config };
    await this.cache.hSet(key, 'config', mergedConfig);
  }

  async checkLimit(instanceName: string): Promise<{ canSend: boolean; waitTime?: number }> {
    const config = await this.getConfig(instanceName);

    if (!config.enabled) {
      return { canSend: true };
    }

    const now = Date.now();
    const data = await this.getRateLimitData(instanceName, config);

    // Sliding window boundaries
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    // Filter timestamps within each sliding window
    const secondMessages = data.timestamps.filter((ts) => ts >= oneSecondAgo);
    const minuteMessages = data.timestamps.filter((ts) => ts >= oneMinuteAgo);
    const hourMessages = data.timestamps.filter((ts) => ts >= oneHourAgo);
    const dayMessages = data.timestamps.filter((ts) => ts >= oneDayAgo);

    if (config.messagesPerSecond && secondMessages.length >= config.messagesPerSecond) {
      const oldestInSecond = Math.min(...secondMessages);
      const waitTime = oldestInSecond + 1000 - now;
      return { canSend: false, waitTime: Math.max(0, waitTime) };
    }

    if (config.messagesPerMinute && minuteMessages.length >= config.messagesPerMinute) {
      const oldestInMinute = Math.min(...minuteMessages);
      const waitTime = oldestInMinute + 60000 - now;
      return { canSend: false, waitTime: Math.max(0, waitTime) };
    }

    if (config.messagesPerHour && hourMessages.length >= config.messagesPerHour) {
      const oldestInHour = Math.min(...hourMessages);
      const waitTime = oldestInHour + 3600000 - now;
      return { canSend: false, waitTime: Math.max(0, waitTime) };
    }

    if (config.messagesPerDay && dayMessages.length >= config.messagesPerDay) {
      const oldestInDay = Math.min(...dayMessages);
      const waitTime = oldestInDay + 86400000 - now;
      return { canSend: false, waitTime: Math.max(0, waitTime) };
    }

    return { canSend: true };
  }

  async waitForSlot(instanceName: string, maxWaitTime = 60000): Promise<boolean> {
    const config = await this.getConfig(instanceName);
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const { canSend, waitTime } = await this.checkLimit(instanceName);

      if (canSend) {
        return true;
      }

      if (waitTime && waitTime > 0) {
        const actualWait = Math.min(waitTime, maxWaitTime - (Date.now() - startTime));
        await this.delay(actualWait);
      } else {
        await this.delay(config.delayBetweenMessages || 2000);
      }
    }

    return false;
  }

  async recordMessage(instanceName: string): Promise<void> {
    const config = await this.getConfig(instanceName);

    if (!config.enabled) {
      return;
    }

    const key = this.getCacheKey(instanceName);
    const now = Date.now();

    const data = await this.getRateLimitData(instanceName, config);

    data.timestamps.push(now);

    // Clean up old timestamps (keep last 24 hours)
    const oneDayAgo = now - 86400000;
    data.timestamps = data.timestamps.filter((ts) => ts >= oneDayAgo);

    await this.cache.hSet(key, 'data', data);
  }

  async getStatus(instanceName: string): Promise<RateLimiterStatusDto> {
    const config = await this.getConfig(instanceName);
    const now = Date.now();

    // Sliding window boundaries
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    const data = await this.getRateLimitData(instanceName, config);

    const secondMessages = data.timestamps.filter((ts) => ts >= oneSecondAgo);
    const minuteMessages = data.timestamps.filter((ts) => ts >= oneMinuteAgo);
    const hourMessages = data.timestamps.filter((ts) => ts >= oneHourAgo);
    const dayMessages = data.timestamps.filter((ts) => ts >= oneDayAgo);

    const remainingDay = config.messagesPerDay ? config.messagesPerDay - dayMessages.length : Infinity;
    const remainingHour = config.messagesPerHour ? config.messagesPerHour - hourMessages.length : Infinity;
    const remainingMinute = config.messagesPerMinute ? config.messagesPerMinute - minuteMessages.length : Infinity;

    return {
      canSend: remainingDay > 0 && remainingHour > 0 && remainingMinute > 0,
      remainingToday: Math.max(0, remainingDay),
      remainingThisHour: Math.max(0, remainingHour),
      remainingThisMinute: Math.max(0, remainingMinute),
      totalSentToday: dayMessages.length,
      totalSentThisHour: hourMessages.length,
      totalSentThisMinute: minuteMessages.length,
    };
  }

  async resetLimits(instanceName: string): Promise<void> {
    const key = this.getCacheKey(instanceName);
    await this.cache.hSet(key, 'data', {
      timestamps: [],
      config: await this.getConfig(instanceName),
    });
  }

  private async getRateLimitData(instanceName: string, config: RateLimiterConfigDto): Promise<RateLimitData> {
    const key = this.getCacheKey(instanceName);
    const data = await this.cache.hGet(key, 'data');
    return (
      data || {
        timestamps: [],
        config,
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
