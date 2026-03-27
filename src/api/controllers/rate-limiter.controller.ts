import { InstanceDto } from '@api/dto/instance.dto';
import { RateLimiterConfigDto, RateLimiterStatusDto } from '@api/dto/rate-limiter.dto';
import { RateLimiterService } from '@api/services/rate-limiter.service';

export class RateLimiterController {
  constructor(private readonly rateLimiterService: RateLimiterService) {}

  public async setConfig(instance: InstanceDto, data: RateLimiterConfigDto) {
    await this.rateLimiterService.setConfig(instance.instanceName, data);
    return { success: true, config: await this.rateLimiterService.getConfig(instance.instanceName) };
  }

  public async getConfig(instance: InstanceDto) {
    return this.rateLimiterService.getConfig(instance.instanceName);
  }

  public async getStatus(instance: InstanceDto): Promise<RateLimiterStatusDto> {
    return this.rateLimiterService.getStatus(instance.instanceName);
  }

  public async resetLimits(instance: InstanceDto) {
    await this.rateLimiterService.resetLimits(instance.instanceName);
    return { success: true };
  }
}
