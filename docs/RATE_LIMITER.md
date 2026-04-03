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
  -H "apikey: xxxxxxxx" \
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
  -H "apikey: xxxxxxxx"
```

---

### 3. Get Status
**GET** `/rate-limiter/status/:instanceName`

Get usage statistics.

```bash
curl "{{baseUrl}}/rate-limiter/status/issam" \
  -H "apikey: xxxxxxxx"
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
  -H "apikey: xxxxxxxx"
```

---

## Queue Endpoints

### 1. Set Queue Configuration
**POST** `/rate-limiter/queue/set/:instanceName`

Configure queue settings.

```bash
curl -X POST "{{baseUrl}}/rate-limiter/queue/set/issam" \
  -H "apikey: xxxxxxxx" \
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
  -H "apikey: xxxxxxxx"
```

---

### 3. Get Queue Status
**GET** `/rate-limiter/queue/status/:instanceName`

Get current queue status.

```bash
curl "{{baseUrl}}/rate-limiter/queue/status/issam" \
  -H "apikey: xxxxxxxx"
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
  -H "apikey: xxxxxxxx"
```

---

### 5. Process Queue (Manual)
**POST** `/rate-limiter/queue/process/:instanceName`

Manually trigger queue processing. Optionally add `?maxMessages=N` to limit.

```bash
# Process up to 10 messages (default)
curl -X POST "{{baseUrl}}/rate-limiter/queue/process/issam" \
  -H "apikey: xxxxxxxx"

# Process up to 5 messages
curl -X POST "{{baseUrl}}/rate-limiter/queue/process/issam?maxMessages=5" \
  -H "apikey: xxxxxxxx"
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
  -H "apikey: xxxxxxxx"
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
  -H "apikey: xxxxxxxx"
```

---

## Configuration Options

### Rate Limiting

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `enabled` | boolean | `true` | - | Enable rate limiting |
| `messagesPerSecond` | integer | `1` | 1-10 | Max messages per second |
| `messagesPerMinute` | integer | `20` | 1-120 | Max messages per minute |
| `messagesPerHour` | integer | `200` | 1-5000 | Max messages per hour |
| `messagesPerDay` | integer | `1000` | 1-50000 | Max messages per day |
| `delayBetweenMessages` | integer | `2000` | 0-60000 | Delay between messages (milliseconds) |
| `maxRetries` | integer | `3` | 1-10 | Maximum retry attempts when rate limit is hit |
| `backoffMultiplier` | number | `1.5` | 1-5 | Exponential backoff multiplier for retries |

### Human-Like Behavior

Simulate human typing to avoid WhatsApp bot detection.

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `readMessages` | boolean | `false` | - | Mark incoming messages as read before replying (anti-ban) |
| `maxMessagesToRead` | integer | `20` | 1-100 | Maximum number of incoming messages to mark as read at once |
| `randomDelayBeforeReadMin` | integer | `1000` | 0-10000 | Minimum wait before marking as read (ms) |
| `randomDelayBeforeReadMax` | integer | `3000` | 0-10000 | Maximum wait before marking as read (ms) |
| `randomDelayBeforeReplyMin` | integer | `2000` | 0-30000 | Minimum wait before starting to type (ms) |
| `randomDelayBeforeReplyMax` | integer | `8000` | 0-30000 | Maximum wait before starting to type (ms) |
| `humanLikeBehavior` | boolean | `false` | - | Enable typing simulation |
| `typingSpeedMsPerChar` | integer | `50` | 10-200 | Base typing speed (milliseconds per character) |
| `minRandomVariation` | integer | `100` | 0-1000 | Minimum random delay variation (ms) |
| `maxRandomVariation` | integer | `500` | 0-5000 | Maximum random delay variation (ms) |
| `maxTypingDelayMs` | integer | `2000` | 0-10000 | Maximum typing delay cap (ms) |

### Queue Configuration

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `enabled` | boolean | `false` | - | Enable message queue |
| `maxRetries` | integer | `3` | 1-10 | Max retry attempts for failed messages |
| `processInterval` | integer | `30` | 5-300 | Auto-process interval (seconds) |
| `maxMessagesPerProcess` | integer | `10` | 1-50 | Max messages per processing cycle |
| `autoProcess` | boolean | `true` | - | Enable automatic queue processing |

### Rate Limiter Status Response

| Field | Type | Description |
|-------|------|-------------|
| `canSend` | boolean | Whether a message can be sent now |
| `remainingToday` | number | Remaining messages allowed today |
| `remainingThisHour` | number | Remaining messages allowed this hour |
| `remainingThisMinute` | number | Remaining messages allowed this minute |
| `totalSentToday` | number | Total messages sent today |
| `totalSentThisHour` | number | Total messages sent this hour |
| `totalSentThisMinute` | number | Total messages sent this minute |
| `nextAvailableAt` | number | Timestamp when next message can be sent (if rate limited) |

### Queue Status Response

| Field | Type | Description |
|-------|------|-------------|
| `count` | number | Number of messages in queue |
| `lastProcessedAt` | number | Timestamp of last processing (null if never) |
| `messages` | array | Array of queued messages (optional) |

---

## Parameter Details

### Rate Limiting Parameters

#### `messagesPerSecond`
- **Description**: Maximum messages allowed per second
- **Default**: 1
- **Range**: 1-10
- **Use Case**: Very strict limit for high-volume sending

#### `messagesPerMinute`
- **Description**: Maximum messages allowed per minute
- **Default**: 20
- **Range**: 1-120
- **Use Case**: Standard limit for bulk messaging

#### `messagesPerHour`
- **Description**: Maximum messages allowed per hour
- **Default**: 200
- **Range**: 1-5000
- **Use Case**: Hourly quota management

#### `messagesPerDay`
- **Description**: Maximum messages allowed per day
- **Default**: 1000
- **Range**: 1-50000
- **Use Case**: Daily budget control

#### `delayBetweenMessages`
- **Description**: Wait time between sending each message
- **Default**: 2000 (2 seconds)
- **Range**: 0-60000 ms
- **Use Case**: Add spacing between messages to appear more natural

#### `maxRetries`
- **Description**: How many times to retry when rate limited
- **Default**: 3
- **Range**: 1-10
- **Use Case**: Queue messages for later sending when limit reached

#### `backoffMultiplier`
- **Description**: Exponential backoff multiplier for retry delays
- **Default**: 1.5
- **Range**: 1-5
- **Use Case**: Increase wait time progressively on each retry

---

### Human-Like Behavior Parameters

#### `humanLikeBehavior`
- **Description**: Enable simulated human typing behavior
- **Default**: false
- **Use Case**: Avoid WhatsApp bot detection by simulating real user behavior

#### `typingSpeedMsPerChar`
- **Description**: Base time to type each character
- **Default**: 50ms
- **Range**: 10-200ms
- **Use Case**: Lower = faster typing, Higher = slower typing
- **Example**: 50ms × 100 chars = 5000ms base typing time

#### `minRandomVariation`
- **Description**: Minimum random delay added to typing time
- **Default**: 100ms
- **Range**: 0-1000ms
- **Use Case**: Add natural variation to typing speed

#### `maxRandomVariation`
- **Description**: Maximum random delay added to typing time
- **Default**: 500ms
- **Range**: 0-5000ms
- **Use Case**: Add natural variation to typing speed

#### `maxTypingDelayMs`
- **Description**: Maximum cap on total typing delay
- **Default**: 2000ms
- **Range**: 0-10000ms
- **Use Case**: Prevent extremely long delays for long messages

#### `readMessages`
- **Description**: Mark incoming messages as read before sending reply
- **Default**: false
- **Use Case**: Simulate human reading behavior (anti-ban)

#### `humanLikeBehavior`
- **Description**: Enable simulated human typing behavior
- **Default**: false
- **Use Case**: Avoid WhatsApp bot detection by simulating real user behavior

#### `typingSpeedMsPerChar`
- **Description**: Base time to type each character
- **Default**: 50ms
- **Range**: 10-200ms
- **Use Case**: Lower = faster typing, Higher = slower typing
- **Example**: 50ms × 100 chars = 5000ms base typing time

#### `minRandomVariation`
- **Description**: Minimum random delay added to typing time
- **Default**: 100ms
- **Range**: 0-1000ms
- **Use Case**: Add natural variation to typing speed

#### `maxRandomVariation`
- **Description**: Maximum random delay added to typing time
- **Default**: 500ms
- **Range**: 0-5000ms
- **Use Case**: Add natural variation to typing speed

#### `maxTypingDelayMs`
- **Description**: Maximum cap on total typing delay
- **Default**: 2000ms
- **Range**: 0-10000ms
- **Use Case**: Prevent extremely long delays for long messages

---

### Queue Parameters

#### `enabled`
- **Description**: Enable message queuing when rate limit is reached
- **Default**: false
- **Use Case**: Automatically queue messages instead of failing

#### `maxRetries`
- **Description**: Maximum attempts to process a queued message
- **Default**: 3
- **Range**: 1-10
- **Use Case**: Handle persistent failures gracefully

#### `processInterval`
- **Description**: How often to automatically process queued messages
- **Default**: 30 seconds
- **Range**: 5-300 seconds
- **Use Case**: Balance between quick delivery and rate limiting

#### `maxMessagesPerProcess`
- **Description**: Maximum messages to send per processing cycle
- **Default**: 10
- **Range**: 1-50
- **Use Case**: Control batch size during processing

#### `autoProcess`
- **Description**: Enable automatic background processing
- **Default**: true
- **Use Case**: Process queue without manual intervention

**How Human-Like Behavior Works:**

1. **Mark as read** (if `readMessages` enabled) - Wait random delay, then mark incoming message as read
2. **Random delay** (if `humanLikeBehavior` enabled) - Wait random "thinking" time before typing
3. **Start typing** - Send "typing" indicator to WhatsApp
4. **Calculate delay** - Based on message length × typing speed
5. **Add variation** - Apply random delay between min/max
6. **Cap delay** - Ensure delay doesn't exceed maxTypingDelayMs
7. **Stop typing** - Remove "typing" indicator
8. **Send message** - Actually send the WhatsApp message

**Example - Full Configuration:**
```json
{
  "enabled": true,
  "messagesPerMinute": 30,
  "messagesPerHour": 200,
  "messagesPerDay": 1000,
  "delayBetweenMessages": 2000,
  "readMessages": true,
  "randomDelayBeforeReadMin": 1000,
  "randomDelayBeforeReadMax": 3000,
  "randomDelayBeforeReplyMin": 2000,
  "randomDelayBeforeReplyMax": 8000,
  "humanLikeBehavior": true,
  "typingSpeedMsPerChar": 50,
  "minRandomVariation": 100,
  "maxRandomVariation": 500,
  "maxTypingDelayMs": 2000
}
```

**Example Calculation:**
- Message: "Hello, how are you?" (20 characters)
- `typingSpeedMsPerChar`: 50ms
- Base delay: 20 × 50 = 1000ms
- Random variation: 100-500ms
- Final delay: 1100-1500ms (capped at maxTypingDelayMs if lower)

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
  "delayBetweenMessages": 5000,
  "readMessages": true,
  "randomDelayBeforeReadMin": 1000,
  "randomDelayBeforeReadMax": 3000,
  "randomDelayBeforeReplyMin": 3000,
  "randomDelayBeforeReplyMax": 8000,
  "humanLikeBehavior": true
}
```

**Moderate (Recommended)**
```json
{
  "enabled": true,
  "messagesPerMinute": 30,
  "messagesPerHour": 300,
  "messagesPerDay": 1500,
  "delayBetweenMessages": 2000,
  "readMessages": true,
  "randomDelayBeforeReadMin": 1000,
  "randomDelayBeforeReadMax": 3000,
  "randomDelayBeforeReplyMin": 2000,
  "randomDelayBeforeReplyMax": 8000,
  "humanLikeBehavior": true
}
```

---

## How It Works

### Message Flow

1. **Send message** → Check rate limits
2. **If limit OK** → Send message + apply delay + record
3. **If limit FULL** → Queue message in Redis + return `queued: true`

### Human-Like Behavior Flow (when enabled)

1. **If `readMessages` enabled**: Wait random delay (1-3s) → Mark message as read
2. **If `humanLikeBehavior` enabled**: Wait random delay (2-8s) → Show "typing..." → Type → Hide "typing..."
3. **Send message**

### Auto-Processing

- Runs every 30 seconds automatically
- Checks all instances with queued messages
- If rate limit allows → dequeues and sends
- Continues until queue empty OR limit reached

### Manual Processing

You can manually trigger queue processing anytime:
```bash
curl -X POST "{{baseUrl}}/rate-limiter/queue/process/issam" \
  -H "apikey: xxxxxxxx"
```

---

## Testing Example

```bash
# 1. Reset counters
curl -X DELETE "http://localhost:8080/rate-limiter/reset/issam" \
  -H "apikey: xxxxxxxx"

# 2. Set rate limits (1 message per minute)
curl -X POST "http://localhost:8080/rate-limiter/set/issam" \
  -H "apikey: xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "messagesPerMinute": 1,
    "delayBetweenMessages": 1000
  }'

# 3. Enable queue
curl -X POST "http://localhost:8080/rate-limiter/queue/set/issam" \
  -H "apikey: xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 4. Send messages rapidly
curl -X POST "http://localhost:8080/message/sendText/issam" \
  -H "apikey: xxxxxxxx" \
  -d '{"number": "201097441134", "text": "Message 1"}'
# Returns: {"status": "PENDING"}

curl -X POST "http://localhost:8080/message/sendText/issam" \
  -H "apikey: xxxxxxxx" \
  -d '{"number": "201097441134", "text": "Message 2"}'
# Returns: {"queued": true, "messageId": "...", "position": 2}

curl -X POST "http://localhost:8080/message/sendText/issam" \
  -H "apikey: xxxxxxxx" \
  -d '{"number": "201097441134", "text": "Message 3"}'
# Returns: {"queued": true, "messageId": "...", "position": 3}

# 5. Check queue status
curl "http://localhost:8080/rate-limiter/queue/status/issam" \
  -H "apikey: xxxxxxxx"

# 6. Manual process (or wait for auto-process)
curl -X POST "http://localhost:8080/rate-limiter/queue/process/issam" \
  -H "apikey: xxxxxxxx"

# 7. Check rate limiter status
curl "http://localhost:8080/rate-limiter/status/issam" \
  -H "apikey: xxxxxxxx"
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
