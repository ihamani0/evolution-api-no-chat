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
