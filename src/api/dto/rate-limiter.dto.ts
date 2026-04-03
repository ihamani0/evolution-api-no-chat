export class RateLimiterConfigDto {
  enabled?: boolean;
  messagesPerSecond?: number;
  messagesPerMinute?: number;
  messagesPerHour?: number;
  messagesPerDay?: number;
  delayBetweenMessages?: number;
  maxRetries?: number;
  backoffMultiplier?: number;
  readMessages?: boolean;
  maxMessagesToRead?: number;
  randomDelayBeforeReadMin?: number;
  randomDelayBeforeReadMax?: number;
  randomDelayBeforeReplyMin?: number;
  randomDelayBeforeReplyMax?: number;
  humanLikeBehavior?: boolean;
  typingSpeedMsPerChar?: number;
  minRandomVariation?: number;
  maxRandomVariation?: number;
  maxTypingDelayMs?: number;
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
