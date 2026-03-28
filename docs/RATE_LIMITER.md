# Rate Limiter API

The Rate Limiter API helps prevent WhatsApp account blocking by controlling the message sending rate. It automatically integrates with all message sending endpoints.

## Base URL

```
{{baseUrl}}/rate-limiter
```

## Authentication

- **Header**: `apikey: YOUR_API_KEY`
- **Query Parameter**: `instanceName=YOUR_INSTANCE_NAME`

---

## Endpoints

### 1. Set Rate Limiter Configuration

**POST** `/rate-limiter/set`

Configure the rate limits for an instance.

**Request:**

```json
{
  "enabled": true,
  "messagesPerSecond": 1,
  "messagesPerMinute": 20,
  "messagesPerHour": 200,
  "messagesPerDay": 1000,
  "delayBetweenMessages": 2000
}
```

**Example:**

```bash
curl -X POST "{{baseUrl}}/rate-limiter/set?instanceName=myInstance" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "messagesPerMinute": 30,
    "delayBetweenMessages": 3000
  }'
```

---

### 2. Get Current Configuration

**GET** `/rate-limiter/find`

Retrieve the current rate limiter configuration.

**Example:**

```bash
curl "{{baseUrl}}/rate-limiter/find?instanceName=myInstance" \
  -H "apikey: YOUR_API_KEY"
```

**Response:**

```json
{
  "enabled": true,
  "messagesPerSecond": 1,
  "messagesPerMinute": 30,
  "messagesPerHour": 200,
  "messagesPerDay": 1000,
  "delayBetweenMessages": 3000
}
```

---

### 3. Get Usage Status

**GET** `/rate-limiter/status`

Get current usage statistics to monitor message sending.

**Example:**

```bash
curl "{{baseUrl}}/rate-limiter/status?instanceName=myInstance" \
  -H "apikey: YOUR_API_KEY"
```

**Response:**

```json
{
  "canSend": true,
  "remainingToday": 800,
  "remainingThisHour": 150,
  "remainingThisMinute": 18,
  "totalSentToday": 200,
  "totalSentThisHour": 50,
  "totalSentThisMinute": 2
}
```

---

### 4. Reset Counters

**DELETE** `/rate-limiter/reset`

Reset all message counters for an instance.

**Example:**

```bash
curl -X DELETE "{{baseUrl}}/rate-limiter/reset?instanceName=myInstance" \
  -H "apikey: YOUR_API_KEY"
```

---

## Configuration Options

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `enabled` | boolean | `true` | - | Enable or disable rate limiting |
| `messagesPerSecond` | integer | `1` | 1-10 | Maximum messages per second |
| `messagesPerMinute` | integer | `20` | 1-120 | Maximum messages per minute |
| `messagesPerHour` | integer | `200` | 1-5000 | Maximum messages per hour |
| `messagesPerDay` | integer | `1000` | 1-50000 | Maximum messages per day |
| `delayBetweenMessages` | integer | `2000` | 0-60000 | Delay in milliseconds between messages |

---

## WhatsApp Best Practices to Avoid Blocking

### Understanding WhatsApp Limits

WhatsApp (Meta) monitors accounts that send bulk messages and may block them if suspicious activity is detected. The rate limiter helps you stay within safe limits.

### Recommended Settings

#### Conservative (Very Safe)
Best for production accounts you want to protect.

```json
{
  "enabled": true,
  "messagesPerMinute": 10,
  "messagesPerHour": 100,
  "messagesPerDay": 500,
  "delayBetweenMessages": 5000
}
```

#### Moderate (Recommended)
Good balance between volume and safety.

```json
{
  "enabled": true,
  "messagesPerMinute": 30,
  "messagesPerHour": 300,
  "messagesPerDay": 1500,
  "delayBetweenMessages": 2000
}
```

#### Aggressive (Use with Caution)
Higher volume but higher risk of blocking.

```json
{
  "enabled": true,
  "messagesPerMinute": 60,
  "messagesPerHour": 500,
  "messagesPerDay": 3000,
  "delayBetweenMessages": 500
}
```

### Key Tips to Avoid Blocking

1. **Start Conservative**: Begin with lower limits and gradually increase if needed.

2. **Use Delays**: Always add a delay between messages (minimum 2 seconds recommended).

3. **Avoid Identical Messages**: Don't send the same message to many contacts in a short time. Vary the content.

4. **Get User Opt-In**: Only send messages to users who have opted in or requested information.

5. **Monitor Status**: Regularly check the `/rate-limiter/status` endpoint to stay within limits.

6. **Warm Up New Accounts**: If you have a new WhatsApp number, start with very low limits (5-10 messages/hour) for the first week.

7. **Time Distribution**: Spread messages throughout the day rather than sending in bursts.

8. **Two-Way Communication**: Encourage users to reply to establish a conversation pattern.

### Warning Signs of Potential Blocking

- Sudden drop in message delivery rate
- Messages taking longer to send
- Increased "failed" message responses
- WhatsApp warning messages

If you notice these signs, reduce your sending rate immediately.

---

## Integration

The rate limiter is **automatically integrated** with all message sending endpoints:

- `POST /message/sendText`
- `POST /message/sendMedia`
- `POST /message/sendLocation`
- `POST /message/sendLink`
- And all other message sending endpoints

When you send a message, the system will:

1. Check if rate limiting is enabled
2. Verify if limits allow sending
3. If limits reached, wait for next available slot
4. Apply delay between messages
5. Record the message for tracking
6. Send the message

---

## Testing

### Test the Configuration

```bash
# 1. Set conservative limits
curl -X POST "{{baseUrl}}/rate-limiter/set?instanceName=test" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "messagesPerMinute": 5,
    "delayBetweenMessages": 5000
  }'

# 2. Check status before sending
curl "{{baseUrl}}/rate-limiter/status?instanceName=test" \
  -H "apikey: YOUR_API_KEY"

# 3. Send a few test messages
curl -X POST "{{baseUrl}}/message/sendText?instanceName=test" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "text": "Test message 1"
  }'

# 4. Check status after sending
curl "{{baseUrl}}/rate-limiter/status?instanceName=test" \
  -H "apikey: YOUR_API_KEY"
```

You should see the `totalSentThisMinute` and `totalSentThisHour` counters increase.

---

## Troubleshooting

### Messages are not being sent

Check if rate limiting is enabled and if you've reached the limit:

```bash
curl "{{baseUrl}}/rate-limiter/status?instanceName=YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY"
```

If `canSend` is `false`, wait for the next time window or reset the counters.

### Need to send more messages

Increase your limits gradually:

```bash
curl -X POST "{{baseUrl}}/rate-limiter/set?instanceName=YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messagesPerMinute": 60,
    "delayBetweenMessages": 1000
  }'
```

### Reset counters

If you need to reset your message counts:

```bash
curl -X DELETE "{{baseUrl}}/rate-limiter/reset?instanceName=YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY"
```

---

## Queue System

The queue system automatically stores messages when rate limits are reached and processes them when limits allow.

### How It Works

1. When rate limit is reached, message is queued in Redis
2. Automatic scheduler runs every 30 seconds to process queue
3. When new time window opens (new hour/day), queued messages are sent automatically
4. You can also manually trigger queue processing

### Queue Endpoints

#### 1. Get Queue Status
**GET** `/rate-limiter/queue/status`

Get the current queue status for an instance.

```bash
curl "{{baseUrl}}/rate-limiter/queue/status?instanceName=YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY"
```

Response:
```json
{
  "count": 5,
  "lastProcessedAt": 1704067200000
}
```

#### 2. Get All Queued Messages
**GET** `/rate-limiter/queue/messages`

Get all messages currently in the queue.

```bash
curl "{{baseUrl}}/rate-limiter/queue/messages?instanceName=YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY"
```

#### 3. Manually Process Queue
**POST** `/rate-limiter/queue/process`

Manually trigger queue processing. Optionally specify `maxMessages` to limit how many messages to process.

```bash
# Process up to 10 messages
curl -X POST "{{baseUrl}}/rate-limiter/queue/process?instanceName=YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY"

# Process up to 5 messages
curl -X POST "{{baseUrl}}/rate-limiter/queue/process?instanceName=YOUR_INSTANCE&maxMessages=5" \
  -H "apikey: YOUR_API_KEY"
```

Response:
```json
{
  "processed": 3,
  "remaining": 2,
  "failed": 0
}
```

#### 4. Clear Queue
**DELETE** `/rate-limiter/queue/clear`

Clear all queued messages for an instance.

```bash
curl -X DELETE "{{baseUrl}}/rate-limiter/queue/clear?instanceName=YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY"
```

Response:
```json
{
  "success": true
}
```

#### 5. Remove Specific Message
**DELETE** `/rate-limiter/queue/message/:messageId`

Remove a specific message from the queue.

```bash
curl -X DELETE "{{baseUrl}}/rate-limiter/queue/message/msg_abc123?instanceName=YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY"
```

#### 6. Set Queue Configuration
**POST** `/rate-limiter/queue/set`

Configure queue settings.

```bash
curl -X POST "{{baseUrl}}/rate-limiter/queue/set?instanceName=YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "maxRetries": 3,
    "processInterval": 30000,
    "maxMessagesPerProcess": 10,
    "autoProcess": true
  }'
```

Queue Configuration Options:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable queue |
| `maxRetries` | number | `3` | Max retry attempts for failed messages |
| `processInterval` | number | `30000` | Auto-process interval in milliseconds |
| `maxMessagesPerProcess` | number | `10` | Max messages to process per cycle |
| `autoProcess` | boolean | `true` | Enable automatic queue processing |

#### 7. Get Queue Configuration
**GET** `/rate-limiter/queue/find`

Get current queue configuration.

```bash
curl "{{baseUrl}}/rate-limiter/queue/find?instanceName=YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY"
```

### Example: Queue Flow

```bash
# 1. Set rate limits (very low for testing)
curl -X POST "{{baseUrl}}/rate-limiter/set?instanceName=test" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "messagesPerMinute": 1,
    "delayBetweenMessages": 60000
  }'

# 2. Enable queue
curl -X POST "{{baseUrl}}/rate-limiter/queue/set?instanceName=test" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 3. Send messages rapidly - some will be queued
curl -X POST "{{baseUrl}}/message/sendText?instanceName=test" \
  -H "apikey: YOUR_API_KEY" \
  -d '{"number": "5511999999999", "text": "Hello 1"}'

curl -X POST "{{baseUrl}}/message/sendText?instanceName=test" \
  -H "apikey: YOUR_API_KEY" \
  -d '{"number": "5511999999999", "text": "Hello 2"}'

# 4. Check queue status
curl "{{baseUrl}}/rate-limiter/queue/status?instanceName=test" \
  -H "apikey: YOUR_API_KEY"

# 5. Manually process queue
curl -X POST "{{baseUrl}}/rate-limiter/queue/process?instanceName=test" \
  -H "apikey: YOUR_API_KEY"
```

### Response When Message is Queued

When a message is queued because rate limit is reached, the response will include:

```json
{
  "queued": true,
  "messageId": "msg_abc123",
  "position": 3
}
```
