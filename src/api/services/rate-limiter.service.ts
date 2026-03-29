import { RateLimiterConfigDto, RateLimiterStatusDto } from '@api/dto/rate-limiter.dto';
import { CacheService } from '@api/services/cache.service';
import { Logger } from '@config/logger.config';

interface RateLimitData {
  second: number[];
  minute: number[];
  hour: number[];
  day: number[];
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
    const currentSecond = Math.floor(now / 1000);
    const currentMinute = Math.floor(now / 60000);
    const currentHour = Math.floor(now / 3600000);
    const currentDay = Math.floor(now / 86400000);

    const secondMessages = data.second.filter((ts) => ts >= currentSecond);
    const minuteMessages = data.minute.filter((ts) => ts >= currentMinute);
    const hourMessages = data.hour.filter((ts) => ts >= currentHour);
    const dayMessages = data.day.filter((ts) => ts >= currentDay);

    if (config.messagesPerSecond && secondMessages.length >= config.messagesPerSecond) {
      const oldestInSecond = Math.min(...secondMessages);
      const waitTime = (oldestInSecond + 1 - currentSecond) * 1000;
      return { canSend: false, waitTime };
    }

    if (config.messagesPerMinute && minuteMessages.length >= config.messagesPerMinute) {
      const oldestInMinute = Math.min(...minuteMessages);
      const waitTime = (oldestInMinute + 60 - currentMinute) * 60000;
      return { canSend: false, waitTime };
    }

    if (config.messagesPerHour && hourMessages.length >= config.messagesPerHour) {
      const oldestInHour = Math.min(...hourMessages);
      const waitTime = (oldestInHour + 3600 - currentHour) * 3600000;
      return { canSend: false, waitTime };
    }

    if (config.messagesPerDay && dayMessages.length >= config.messagesPerDay) {
      const oldestInDay = Math.min(...dayMessages);
      const waitTime = (oldestInDay + 86400 - currentDay) * 86400000;
      return { canSend: false, waitTime };
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
    const currentSecond = Math.floor(now / 1000);
    const currentMinute = Math.floor(now / 60000);
    const currentHour = Math.floor(now / 3600000);
    const currentDay = Math.floor(now / 86400000);

    const data = await this.getRateLimitData(instanceName, config);

    data.second.push(currentSecond);
    data.minute.push(currentMinute);
    data.hour.push(currentHour);
    data.day.push(currentDay);

    data.second = data.second.filter((ts) => ts >= currentSecond);
    data.minute = data.minute.filter((ts) => ts >= currentMinute);
    data.hour = data.hour.filter((ts) => ts >= currentHour);
    data.day = data.day.filter((ts) => ts >= currentDay);

    await this.cache.hSet(key, 'data', data);
  }

  async getStatus(instanceName: string): Promise<RateLimiterStatusDto> {
    const config = await this.getConfig(instanceName);
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentMinute = Math.floor(now / 60000);
    const currentHour = Math.floor(now / 3600000);
    const currentDay = Math.floor(now / 86400000);

    const data = await this.getRateLimitData(instanceName, config);

    const secondMessages = data.second.filter((ts) => ts >= currentSecond);
    const minuteMessages = data.minute.filter((ts) => ts >= currentMinute);
    const hourMessages = data.hour.filter((ts) => ts >= currentHour);
    const dayMessages = data.day.filter((ts) => ts >= currentDay);

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
      second: [],
      minute: [],
      hour: [],
      day: [],
      config: await this.getConfig(instanceName),
    });
  }

  private async getRateLimitData(instanceName: string, config: RateLimiterConfigDto): Promise<RateLimitData> {
    const key = this.getCacheKey(instanceName);
    const data = await this.cache.hGet(key, 'data');
    return (
      data || {
        second: [],
        minute: [],
        hour: [],
        day: [],
        config,
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
