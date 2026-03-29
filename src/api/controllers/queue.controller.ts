import { InstanceDto } from '@api/dto/instance.dto';
import { ProcessQueueResultDto, QueueConfigDto, QueueMessageDto, QueueStatusDto } from '@api/dto/queue.dto';
import { QueueService } from '@api/services/queue.service';

export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  public async setConfig(instance: InstanceDto, data: QueueConfigDto) {
    await this.queueService.setConfig(instance.instanceName, data);
    return { success: true, config: await this.queueService.getConfig(instance.instanceName) };
  }

  public async getConfig(instance: InstanceDto) {
    return this.queueService.getConfig(instance.instanceName);
  }

  public async getStatus(instance: InstanceDto): Promise<QueueStatusDto> {
    return this.queueService.getStatus(instance.instanceName);
  }

  public async processQueue(instance: InstanceDto, maxMessages?: number): Promise<ProcessQueueResultDto> {
    return this.queueService.processQueue(instance.instanceName, maxMessages);
  }

  public async clearQueue(instance: InstanceDto) {
    await this.queueService.clear(instance.instanceName);
    return { success: true };
  }

  public async removeMessage(instance: InstanceDto, messageId: string) {
    const removed = await this.queueService.removeMessage(instance.instanceName, messageId);
    return { success: removed };
  }

  public async getMessages(instance: InstanceDto): Promise<QueueMessageDto[]> {
    return this.queueService.getAllMessages(instance.instanceName);
  }
}
