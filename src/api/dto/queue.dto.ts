import { RateLimiterConfigDto } from './rate-limiter.dto';

export class QueueConfigDto extends RateLimiterConfigDto {
  enabled?: boolean;
  maxRetries?: number;
  processInterval?: number;
  maxMessagesPerProcess?: number;
  autoProcess?: boolean;
}

export class QueueMessageDto {
  id?: string;
  instanceName?: string;
  number?: string;
  messageType?: string;
  messagePayload?: Record<string, any>;
  queuedAt?: number;
  retryCount?: number;
}

export class QueueStatusDto {
  count: number;
  lastProcessedAt?: number | null;
  messages?: QueueMessageDto[];
}

export class ProcessQueueResultDto {
  processed: number;
  remaining: number;
  failed: number;
  results?: Array<{
    messageId: string;
    success: boolean;
    error?: string;
  }>;
}

export class EnqueueResultDto {
  queued: boolean;
  messageId?: string;
  position?: number;
}
