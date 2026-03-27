import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const rateLimiterConfigSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    enabled: { type: 'boolean', default: true },
    messagesPerSecond: {
      type: 'integer',
      minimum: 1,
      maximum: 10,
      description: 'Maximum messages per second',
    },
    messagesPerMinute: {
      type: 'integer',
      minimum: 1,
      maximum: 120,
      description: 'Maximum messages per minute',
    },
    messagesPerHour: {
      type: 'integer',
      minimum: 1,
      maximum: 5000,
      description: 'Maximum messages per hour',
    },
    messagesPerDay: {
      type: 'integer',
      minimum: 1,
      maximum: 50000,
      description: 'Maximum messages per day',
    },
    delayBetweenMessages: {
      type: 'integer',
      minimum: 0,
      maximum: 60000,
      description: 'Delay between messages in milliseconds',
    },
    maxRetries: {
      type: 'integer',
      minimum: 1,
      maximum: 10,
      description: 'Maximum retry attempts when rate limit is hit',
    },
    backoffMultiplier: {
      type: 'number',
      minimum: 1,
      maximum: 5,
      description: 'Exponential backoff multiplier',
    },
  },
};
