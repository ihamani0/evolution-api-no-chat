# Rate Limiter & Queue System - Complete Guide

## Why This System Exists

WhatsApp (Meta) monitors accounts that send bulk messages. If you send too many messages too quickly, they will **block your account**. 

This system helps you send messages safely by:
1. Limiting how many messages you send
2. Adding delays between messages
3. Queueing excess messages for later

---

## How WhatsApp Blocking Works

### What Triggers Blocking?
- Sending many messages to people who don't have your number saved
- Sending identical messages to many people
- Sending messages very fast (burst)
- Sudden increase in message volume

### What Happens When Blocked?
- Limited to few messages per day
- Account may be permanently banned
- Phone number becomes unusable

---

## The Solution: Rate Limiter + Queue

### Two Parts Working Together

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR MESSAGE                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              1. CHECK RATE LIMITER                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Is message allowed?                                  │   │
│  │  • Per second: ?  (max 1-10)                        │   │
│  │  • Per minute: ?  (max 1-120)                        │   │
│  │  • Per hour: ?    (max 1-5000)                       │   │
│  │  • Per day: ?     (max 1-50000)                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│           ┌──────────────┴──────────────┐                   │
│           │                             │                    │
│      YES, OK                    NO, FULL                   │
│           │                             │                    │
│           ▼                             ▼                    │
│  ┌──────────────────┐        ┌───────────────────┐          │
│  │  2. SEND MESSAGE │        │  PUT IN QUEUE    │          │
│  │  + Apply Delay   │        │  (Wait for later)│          │
│  │  + Record Count  │        └───────────────────┘          │
│  └──────────────────┘                     │                 │
│                                           ▼                  │
│                                 ┌───────────────────┐        │
│                                 │ AUTO-PROCESSOR   │        │
│                                 │ (Every 30 sec)   │        │
│                                 └───────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## Parameter Explanation

### 1. messagesPerSecond
**What it does:** Limits how many messages can be sent in 1 second

**Safe value:** 1

**Why:** Humans don't send messages instantly. 1 message/second looks natural.

**Example:**
```
messagesPerSecond: 1
→ Can send 60 messages in 60 seconds
```

---

### 2. messagesPerMinute
**What it does:** Limits messages per 60 seconds

**Safe value:** 20-30

**Why:** More realistic for active users. 30 messages/minute is still fast but not suspicious.

**Example:**
```
messagesPerMinute: 30
→ Can send 1,800 messages per hour
→ Can send 43,200 messages per day
```

---

### 3. messagesPerHour
**What it does:** Limits messages per 60 minutes

**Safe value:** 200-300

**Why:** WhatsApp monitors hourly activity. Under 300/hour is generally safe.

**Example:**
```
messagesPerHour: 200
→ Can send 4,800 messages per day
```

---

### 4. messagesPerDay
**What it does:** Maximum messages per 24 hours

**Safe value:** 1000-2000

**Why:** WhatsApp has daily limits. Staying under 2000 is conservative and safe.

**Example:**
```
messagesPerDay: 1000
→ Message limit for the day
```

---

### 5. delayBetweenMessages
**What it does:** Wait time between each message

**Safe value:** 2000-5000 (milliseconds)

**Why:** 
- 0ms = instant (bot-like, suspicious)
- 2000ms = 2 seconds (natural)
- 5000ms = 5 seconds (very safe)

**Calculation:**
```
delay: 2000ms = 2 seconds between messages
30 messages × 2 seconds = 60 seconds to send 30 messages
```

---

## Queue System Explained

### When Does Queue Activate?

The queue activates when you try to send more messages than your limits allow.

**Example Scenario:**
```
Your limit: 1 message per minute
You send: 3 messages in 5 seconds

Message 1: ✅ SENT (under limit)
Message 2: ⏳ QUEUED (limit reached)
Message 3: ⏳ QUEUED (limit reached)

Queue holds messages 2 & 3
```

---

### How Queue Works

```
┌─────────────────────────────────────────────────────────┐
│                   QUEUE STORAGE                          │
│                                                          │
│  Redis Database (temporary storage)                      │
│                                                          │
│  ┌─────────────┐                                         │
│  │ Message 1  │  ← First queued (will send first)       │
│  ├─────────────┤                                         │
│  │ Message 2  │  ← Second queued                        │
│  ├─────────────┤                                         │
│  │ Message 3  │  ← Third queued (will send last)        │
│  └─────────────┘                                         │
│                                                          │
│  First In, First Out (FIFO)                            │
└─────────────────────────────────────────────────────────┘
```

---

### Auto-Processor

**What it does:** Checks the queue every 30 seconds and sends messages when limits allow.

```
EVERY 30 SECONDS:
┌─────────────────────────────────────────┐
│  1. Check rate limiter                  │
│     • Is minute limit available?         │
│     • Is hour limit available?           │
│     • Is day limit available?           │
│                                          │
│  2. If YES → Take message from queue    │
│     → Send it                           │
│     → Record the count                  │
│                                          │
│  3. Repeat until:                       │
│     • Queue empty OR                     │
│     • Rate limit reached                 │
└─────────────────────────────────────────┘
```

---

## Queue Configuration

### 1. enabled
**What:** Enable or disable queue
**Default:** true
**Recommendation:** Keep enabled

---

### 2. maxRetries
**What:** How many times to retry a failed message
**Default:** 3
**Recommendation:** Keep at 3

---

### 3. processInterval
**What:** How often (ms) to check queue automatically
**Default:** 30000 (30 seconds)
**Recommendation:** Keep at 30000

---

### 4. maxMessagesPerProcess
**What:** Max messages to send per auto-process cycle
**Default:** 10
**Recommendation:** Keep at 10

---

### 5. autoProcess
**What:** Enable automatic queue processing
**Default:** true
**Recommendation:** Keep enabled

---

## Real-World Usage Examples

### Example 1: Conservative (Very Safe)
For new accounts or accounts you want to protect heavily.

```json
{
  "enabled": true,
  "messagesPerMinute": 10,
  "messagesPerHour": 100,
  "messagesPerDay": 500,
  "delayBetweenMessages": 5000
}
```

**What happens:**
- 10 messages/minute = 600/hour
- But we cap at 100/hour
- 5 second delay between each message
- Extra messages go to queue

**Best for:** New WhatsApp numbers, important accounts

---

### Example 2: Moderate (Recommended)
Balance between volume and safety.

```json
{
  "enabled": true,
  "messagesPerMinute": 30,
  "messagesPerHour": 300,
  "messagesPerDay": 1500,
  "delayBetweenMessages": 2000
}
```

**What happens:**
- 30 messages/minute = 1800/hour
- But we cap at 300/hour
- 2 second delay between each message
- Good for established accounts

**Best for:** Most business use cases

---

### Example 3: Aggressive (Use Caution)
Higher volume but higher risk.

```json
{
  "enabled": true,
  "messagesPerMinute": 60,
  "messagesPerHour": 500,
  "messagesPerDay": 3000,
  "delayBetweenMessages": 500
}
```

**What happens:**
- 60 messages/minute = 3600/hour
- But we cap at 500/hour
- Only 0.5 second delay
- Only for experienced users

**Best for:** High-volume campaigns, short campaigns only

---

## Step-by-Step Workflow

### Scenario: You want to send 100 messages

```
HOUR 1:
┌────────────────────────────────────────────────────────────┐
│ Set: 30 msg/min, 300 msg/hour, 2000ms delay              │
│                                                            │
│ Msg 1-30:  ✅ Sent (takes ~60 seconds with delays)        │
│ Msg 31:    ⏳ Queued (hour limit reached)                 │
│ ...        ⏳ Queued                                       │
│ Msg 100:   ⏳ Queued                                       │
│                                                            │
│ Queue has: 70 messages waiting                            │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
HOUR 2:
┌────────────────────────────────────────────────────────────┐
│ Auto-processor runs every 30 seconds                      │
│                                                            │
│ At minute 1:  ✅ Sends 30 from queue (limit allows)       │
│ At minute 2:  ✅ Sends 30 from queue                     │
│ At minute 3:  ✅ Sends 10 from queue (completes!)         │
│                                                            │
│ All 100 messages sent!                                     │
└────────────────────────────────────────────────────────────┘
```

---

## Quick Start Commands

### 1. Enable Rate Limiter
```bash
curl -X POST "http://localhost:8080/rate-limiter/set/YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY" \
  -d '{
    "enabled": true,
    "messagesPerMinute": 30,
    "messagesPerHour": 300,
    "messagesPerDay": 1500,
    "delayBetweenMessages": 2000
  }'
```

### 2. Enable Queue
```bash
curl -X POST "http://localhost:8080/rate-limiter/queue/set/YOUR_INSTANCE" \
  -H "apiKey: YOUR_API_KEY" \
  -d '{"enabled": true}'
```

### 3. Send Messages
```bash
# These will queue automatically when limits reached
curl -X POST "http://localhost:8080/message/sendText/YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY" \
  -d '{"number": "201234567890", "text": "Hello!"}'
```

### 4. Monitor
```bash
# Check rate limits
curl "http://localhost:8080/rate-limiter/status/YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY"

# Check queue
curl "http://localhost:8080/rate-limiter/queue/status/YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY"

# Manually process queue
curl -X POST "http://localhost:8080/rate-limiter/queue/process/YOUR_INSTANCE" \
  -H "apikey: YOUR_API_KEY"
```

---

## Safety Tips

### ✅ DO:
- Start with conservative limits
- Use delays between messages
- Warm up new numbers slowly
- Monitor your status regularly
- Use queue when sending bulk messages

### ❌ DON'T:
- Send to random numbers
- Send identical messages to many people
- Use 0 delay between messages
- Send burst messages (many at once)
- Ignore warning signs

### Warning Signs:
- Messages taking longer to send
- More failed deliveries
- WhatsApp warnings
- Sudden limit reductions

---

## Summary

| Parameter | What It Does | Safe Value |
|-----------|--------------|------------|
| messagesPerSecond | Messages per second | 1 |
| messagesPerMinute | Messages per minute | 20-30 |
| messagesPerHour | Messages per hour | 200-300 |
| messagesPerDay | Messages per day | 1000-2000 |
| delayBetweenMessages | Wait between messages | 2000-5000ms |

**The key:** Keep limits moderate and use delays to appear human-like!
