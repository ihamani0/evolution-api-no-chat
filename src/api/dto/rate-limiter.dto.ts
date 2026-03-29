export class RateLimiterConfigDto {
  enabled?: boolean;
  messagesPerSecond?: number;
  messagesPerMinute?: number;
  messagesPerHour?: number;
  messagesPerDay?: number;
  delayBetweenMessages?: number;
  maxRetries?: number;
  backoffMultiplier?: number;
  // Human-like behavior options
  humanLikeBehavior?: boolean;
  typingSpeedMsPerChar?: number;
  minRandomVariation?: number;
  maxRandomVariation?: number;
  maxTypingDelayMs?: number;
  markAsReadBeforeSend?: boolean;
}

export class RateLimiterStatusDto {
  canSend: boolean;
  remainingToday: number;
  remainingThisHour: number;
  remainingThisMinute: number;
  nextAvailableAt?: number;
  totalSentToday: number;
  totalSentThisHour: number;
  totalSentThisMinute: number;
}
