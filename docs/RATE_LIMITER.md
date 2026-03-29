# Rate Limiter API

The Rate Limiter API helps prevent WhatsApp account blocking by controlling the message sending rate. It automatically integrates with all message sending endpoints.

## Base URL

```
{{baseUrl}}
```

## Authentication

- **Header**: `apikey: YOUR_API_KEY`
- **Instance**: URL parameter `:instanceName`

---

## Rate Limiter Endpoints

### 1. Set Configuration
**POST** `/rate-limiter/set/:instanceName`

Configure rate limits for an instance.

```bash
curl -X POST "{{baseUrl}}/rate-limiter/set/issam" \
  -H "apikey: issamhamani19@" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "messagesPerSecond": 1,
    "messagesPerMinute": 30,
    "messagesPerHour": 200,
    "messagesPerDay": 1000,
    "delayBetweenMessages": 2000
  }'
```

**Response:**
```json
{
  "success": true,
  "config": {
    "enabled": true,
    "messagesPerSecond": 1,
    "messagesPerMinute": 30,
    "messagesPerHour": 200,
    "messagesPerDay": 1000,
    "delayBetweenMessages": 2000,
    "maxRetries": 3,
    "backoffMultiplier": 1.5
  }
}
```

---

### 2. Get Configuration
**GET** `/rate-limiter/find/:instanceName`

Get current configuration.

```bash
curl "{{baseUrl}}/rate-limiter/find/issam" \
  -H "apikey: issamhamani19@"
```

---

### 3. Get Status
**GET** `/rate-limiter/status/:instanceName`

Get usage statistics.

```bash
curl "{{baseUrl}}/rate-limiter/status/issam" \
  -H "apikey: issamhamani19@"
```

**Response:**
```json
{
  "canSend": true,
  "remainingToday": 1000,
  "remainingThisHour": 200,
  "remainingThisMinute": 30,
  "totalSentToday": 0,
  "totalSentThisHour": 0,
  "totalSentThisMinute": 0
}
```

---

### 4. Reset Counters
**DELETE** `/rate-limiter/reset/:instanceName`

Reset all message counters.

```bash
curl -X DELETE "{{baseUrl}}/rate-limiter/reset/issam" \
  -H "apikey: issamhamani19@"
```

---

## Queue Endpoints

### 1. Set Queue Configuration
**POST** `/rate-limiter/queue/set/:instanceName`

Configure queue settings.

```bash
curl -X POST "{{baseUrl}}/rate-limiter/queue/set/issam" \
  -H "apikey: issamhamani19@" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "maxRetries": 3,
    "processInterval": 30000,
    "maxMessagesPerProcess": 10,
    "autoProcess": true
  }'
```

**Queue Config Options:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable queue |
| `maxRetries` | number | 3 | Max retry attempts |
| `processInterval` | number | 30000 | Auto-process interval (ms) |
| `maxMessagesPerProcess` | number | 10 | Max messages per cycle |
| `autoProcess` | boolean | true | Enable auto-processing |

---

### 2. Get Queue Configuration
**GET** `/rate-limiter/queue/find/:instanceName`

```bash
curl "{{baseUrl}}/rate-limiter/queue/find/issam" \
  -H "apikey: issamhamani19@"
```

---

### 3. Get Queue Status
**GET** `/rate-limiter/queue/status/:instanceName`

Get current queue status.

```bash
curl "{{baseUrl}}/rate-limiter/queue/status/issam" \
  -H "apikey: issamhamani19@"
```

**Response:**
```json
{
  "count": 5,
  "lastProcessedAt": 1704067200000
}
```

---

### 4. Get All Queued Messages
**GET** `/rate-limiter/queue/messages/:instanceName`

```bash
curl "{{baseUrl}}/rate-limiter/queue/messages/issam" \
  -H "apikey: issamhamani19@"
```

---

### 5. Process Queue (Manual)
**POST** `/rate-limiter/queue/process/:instanceName`

Manually trigger queue processing. Optionally add `?maxMessages=N` to limit.

```bash
# Process up to 10 messages (default)
curl -X POST "{{baseUrl}}/rate-limiter/queue/process/issam" \
  -H "apikey: issamhamani19@"

# Process up to 5 messages
curl -X POST "{{baseUrl}}/rate-limiter/queue/process/issam?maxMessages=5" \
  -H "apikey: issamhamani19@"
```

**Response:**
```json
{
  "processed": 3,
  "remaining": 2,
  "failed": 0
}
```

---

### 6. Clear Queue
**DELETE** `/rate-limiter/queue/clear/:instanceName`

```bash
curl -X DELETE "{{baseUrl}}/rate-limiter/queue/clear/issam" \
  -H "apikey: issamhamani19@"
```

**Response:**
```json
{
  "success": true
}
```

---

### 7. Remove Specific Message
**DELETE** `/rate-limiter/queue/message/:messageId?instanceName=:instanceName`

```bash
curl -X DELETE "{{baseUrl}}/rate-limiter/queue/message/msg_abc123?instanceName=issam" \
  -H "apikey: issamhamani19@"
```

---

## Configuration Options

### Rate Limiting

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `enabled` | boolean | `true` | - | Enable rate limiting |
| `messagesPerSecond` | integer | `1` | 1-10 | Max messages/second |
| `messagesPerMinute` | integer | `20` | 1-120 | Max messages/minute |
| `messagesPerHour` | integer | `200` | 1-5000 | Max messages/hour |
| `messagesPerDay` | integer | `1000` | 1-50000 | Max messages/day |
| `delayBetweenMessages` | integer | `2000` | 0-60000 | Delay between messages (ms) |

### Human-Like Behavior

Simulate human typing to avoid WhatsApp bot detection.

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `humanLikeBehavior` | boolean | `true` | - | Enable typing simulation |
| `typingSpeedMsPerChar` | integer | `50` | 10-200 | Base typing speed (ms per character) |
| `minRandomVariation` | number | `0.5` | 0.1-1.0 | Min random multiplier (50% = 0.5) |
| `maxRandomVariation` | number | `1.5` | 1.0-2.0 | Max random multiplier (150% = 1.5) |
| `maxTypingDelayMs` | integer | `5000` | 1000-30000 | Max delay cap (ms) |
| `markAsReadBeforeSend` | boolean | `true` | - | Mark message as read before replying |

**Example - Full Configuration:**
```json
{
  "enabled": true,
  "messagesPerMinute": 30,
  "messagesPerHour": 200,
  "messagesPerDay": 1000,
  "delayBetweenMessages": 2000,
  "humanLikeBehavior": true,
  "typingSpeedMsPerChar": 50,
  "minRandomVariation": 0.5,
  "maxRandomVariation": 1.5,
  "maxTypingDelayMs": 5000,
  "markAsReadBeforeSend": true
}
```

**How Human-Like Behavior Works:**

1. **Send "seen"** - Mark incoming message as read before replying
2. **Start typing** - Show "typing" indicator
3. **Random delay** - Wait based on message size with random variation:
   - Calculate: `payloadSize × typingSpeedMsPerChar`
   - Apply random variation: `× (minRandomVariation to maxRandomVariation)`
   - Cap at: `maxTypingDelayMs`
4. **Stop typing** - Hide typing indicator
5. **Send message** - Send the actual WhatsApp message

**Example:**
- Message payload: 100 characters
- Typing speed: 50ms/char
- Base delay: 100 × 50 = 5000ms
- Random variation (0.5 - 1.5): 2500ms - 7500ms
- Capped at 5000ms
- Actual delay: Random between 2500-5000ms

---

## WhatsApp Best Practices

### Recommended Settings

**Conservative (Very Safe)**
```json
{
  "enabled": true,
  "messagesPerMinute": 10,
  "messagesPerHour": 100,
  "messagesPerDay": 500,
  "delayBetweenMessages": 5000
}
```

**Moderate (Recommended)**
```json
{
  "enabled": true,
  "messagesPerMinute": 30,
  "messagesPerHour": 300,
  "messagesPerDay": 1500,
  "delayBetweenMessages": 2000
}
```

---

## How It Works

### Message Flow

1. **Send message** → Check rate limits
2. **If limit OK** → Send message + apply delay + record
3. **If limit FULL** → Queue message in Redis + return `queued: true`

### Auto-Processing

- Runs every 30 seconds automatically
- Checks all instances with queued messages
- If rate limit allows → dequeues and sends
- Continues until queue empty OR limit reached

### Manual Processing

You can manually trigger queue processing anytime:
```bash
curl -X POST "{{baseUrl}}/rate-limiter/queue/process/issam" \
  -H "apikey: issamhamani19@"
```

---

## Testing Example

```bash
# 1. Reset counters
curl -X DELETE "http://localhost:8080/rate-limiter/reset/issam" \
  -H "apikey: issamhamani19@"

# 2. Set rate limits (1 message per minute)
curl -X POST "http://localhost:8080/rate-limiter/set/issam" \
  -H "apikey: issamhamani19@" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "messagesPerMinute": 1,
    "delayBetweenMessages": 1000
  }'

# 3. Enable queue
curl -X POST "http://localhost:8080/rate-limiter/queue/set/issam" \
  -H "apikey: issamhamani19@" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 4. Send messages rapidly
curl -X POST "http://localhost:8080/message/sendText/issam" \
  -H "apikey: issamhamani19@" \
  -d '{"number": "201097441134", "text": "Message 1"}'
# Returns: {"status": "PENDING"}

curl -X POST "http://localhost:8080/message/sendText/issam" \
  -H "apikey: issamhamani19@" \
  -d '{"number": "201097441134", "text": "Message 2"}'
# Returns: {"queued": true, "messageId": "...", "position": 2}

curl -X POST "http://localhost:8080/message/sendText/issam" \
  -H "apikey: issamhamani19@" \
  -d '{"number": "201097441134", "text": "Message 3"}'
# Returns: {"queued": true, "messageId": "...", "position": 3}

# 5. Check queue status
curl "http://localhost:8080/rate-limiter/queue/status/issam" \
  -H "apikey: issamhamani19@"

# 6. Manual process (or wait for auto-process)
curl -X POST "http://localhost:8080/rate-limiter/queue/process/issam" \
  -H "apikey: issamhamani19@"

# 7. Check rate limiter status
curl "http://localhost:8080/rate-limiter/status/issam" \
  -H "apikey: issamhamani19@"
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Set limits | `POST /rate-limiter/set/:instance` |
| Get status | `GET /rate-limiter/status/:instance` |
| Reset | `DELETE /rate-limiter/reset/:instance` |
| Enable queue | `POST /rate-limiter/queue/set/:instance` |
| Check queue | `GET /rate-limiter/queue/status/:instance` |
| Process queue | `POST /rate-limiter/queue/process/:instance` |
| Clear queue | `DELETE /rate-limiter/queue/clear/:instance` |

---

## Example Response When Message is Queued

```json
{
  "queued": true,
  "messageId": "msg_abc123xyz",
  "position": 3
}
```

When the queue auto-processes or you trigger it manually, the queued messages will be sent automatically when the rate limit allows.
