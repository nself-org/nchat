# API Examples - nself-chat Bot API

Comprehensive code examples for integrating with the nself-chat Bot API in multiple programming languages.

---

## Table of Contents

- [Authentication](#authentication)
- [Send Message](#send-message)
- [Create Channel](#create-channel)
- [Get Channel Info](#get-channel-info)
- [Add Reaction](#add-reaction)
- [Get User Info](#get-user-info)
- [Webhook Integration](#webhook-integration)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Best Practices](#best-practices)

---

## Authentication

All Bot API requests require authentication via Bearer token in the `Authorization` header.

### Token Format

```
Authorization: Bearer nbot_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

---

## Send Message

**Endpoint:** `POST /api/bots/send-message`

Send a message to a channel as a bot.

### cURL

```bash
curl -X POST https://your-domain.com/api/bots/send-message \
  -H "Authorization: Bearer nbot_YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "550e8400-e29b-41d4-a716-446655440000",
    "content": "Hello from my bot!",
    "type": "text"
  }'
```

### JavaScript/TypeScript (Node.js)

```javascript
const fetch = require('node-fetch')

const BOT_TOKEN = 'nbot_YOUR_TOKEN_HERE'
const API_URL = 'https://your-domain.com/api/bots'

async function sendMessage(channelId, content) {
  const response = await fetch(`${API_URL}/send-message`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel_id: channelId,
      content: content,
      type: 'text',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to send message: ${error.message}`)
  }

  return await response.json()
}

// Usage
sendMessage('550e8400-e29b-41d4-a716-446655440000', 'Hello from my bot!')
  .then((data) => console.log('Message sent:', data))
  .catch((err) => console.error('Error:', err))
```

### JavaScript/TypeScript (with async/await class)

```typescript
import fetch, { Response } from 'node-fetch'

interface SendMessageParams {
  channel_id: string
  content: string
  type?: 'text' | 'system' | 'announcement'
  reply_to_id?: string
}

interface Message {
  id: string
  channel_id: string
  content: string
  type: string
  created_at: string
}

class NchatBotClient {
  private token: string
  private baseUrl: string

  constructor(token: string, baseUrl: string = 'https://your-domain.com/api/bots') {
    this.token = token
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API Error: ${error.message}`)
    }

    return await response.json()
  }

  async sendMessage(params: SendMessageParams): Promise<Message> {
    return this.request<Message>('/send-message', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }
}

// Usage
const bot = new NchatBotClient('nbot_YOUR_TOKEN_HERE')

bot
  .sendMessage({
    channel_id: '550e8400-e29b-41d4-a716-446655440000',
    content: 'Hello from my TypeScript bot!',
    type: 'text',
  })
  .then((message) => console.log('Message sent:', message))
  .catch((err) => console.error('Error:', err))
```

### Python

```python
import requests
import json

BOT_TOKEN = 'nbot_YOUR_TOKEN_HERE'
API_URL = 'https://your-domain.com/api/bots'

def send_message(channel_id, content, message_type='text'):
    """Send a message to a channel as a bot."""
    headers = {
        'Authorization': f'Bearer {BOT_TOKEN}',
        'Content-Type': 'application/json',
    }

    payload = {
        'channel_id': channel_id,
        'content': content,
        'type': message_type,
    }

    response = requests.post(
        f'{API_URL}/send-message',
        headers=headers,
        json=payload
    )

    if response.status_code != 200:
        raise Exception(f'Failed to send message: {response.text}')

    return response.json()

# Usage
try:
    result = send_message(
        '550e8400-e29b-41d4-a716-446655440000',
        'Hello from my Python bot!'
    )
    print(f'Message sent: {result}')
except Exception as e:
    print(f'Error: {e}')
```

### Python (with class)

```python
import requests
from typing import Optional, Dict, Any

class NchatBotClient:
    """Client for interacting with the nself-chat Bot API."""

    def __init__(self, token: str, base_url: str = 'https://your-domain.com/api/bots'):
        self.token = token
        self.base_url = base_url

    def _request(self, endpoint: str, method: str = 'GET', data: Optional[Dict] = None) -> Dict[Any, Any]:
        """Make an authenticated request to the API."""
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json',
        }

        url = f'{self.base_url}{endpoint}'

        if method == 'GET':
            response = requests.get(url, headers=headers, params=data)
        elif method == 'POST':
            response = requests.post(url, headers=headers, json=data)
        else:
            raise ValueError(f'Unsupported method: {method}')

        if not response.ok:
            raise Exception(f'API Error: {response.status_code} - {response.text}')

        return response.json()

    def send_message(
        self,
        channel_id: str,
        content: str,
        message_type: str = 'text',
        reply_to_id: Optional[str] = None
    ) -> Dict[Any, Any]:
        """Send a message to a channel."""
        payload = {
            'channel_id': channel_id,
            'content': content,
            'type': message_type,
        }

        if reply_to_id:
            payload['reply_to_id'] = reply_to_id

        return self._request('/send-message', method='POST', data=payload)

# Usage
bot = NchatBotClient('nbot_YOUR_TOKEN_HERE')

try:
    message = bot.send_message(
        channel_id='550e8400-e29b-41d4-a716-446655440000',
        content='Hello from my Python bot!',
        message_type='text'
    )
    print(f'Message sent: {message}')
except Exception as e:
    print(f'Error: {e}')
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

const (
    BOT_TOKEN = "nbot_YOUR_TOKEN_HERE"
    API_URL   = "https://your-domain.com/api/bots"
)

type SendMessageRequest struct {
    ChannelID string `json:"channel_id"`
    Content   string `json:"content"`
    Type      string `json:"type"`
}

type Message struct {
    ID        string `json:"id"`
    ChannelID string `json:"channel_id"`
    Content   string `json:"content"`
    Type      string `json:"type"`
    CreatedAt string `json:"created_at"`
}

func sendMessage(channelID, content string) (*Message, error) {
    payload := SendMessageRequest{
        ChannelID: channelID,
        Content:   content,
        Type:      "text",
    }

    jsonData, err := json.Marshal(payload)
    if err != nil {
        return nil, fmt.Errorf("failed to marshal JSON: %w", err)
    }

    req, err := http.NewRequest("POST", API_URL+"/send-message", bytes.NewBuffer(jsonData))
    if err != nil {
        return nil, fmt.Errorf("failed to create request: %w", err)
    }

    req.Header.Set("Authorization", "Bearer "+BOT_TOKEN)
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, fmt.Errorf("failed to send request: %w", err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, fmt.Errorf("failed to read response: %w", err)
    }

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("API error: %s", string(body))
    }

    var message Message
    if err := json.Unmarshal(body, &message); err != nil {
        return nil, fmt.Errorf("failed to unmarshal response: %w", err)
    }

    return &message, nil
}

func main() {
    message, err := sendMessage("550e8400-e29b-41d4-a716-446655440000", "Hello from my Go bot!")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }

    fmt.Printf("Message sent: %+v\n", message)
}
```

### Ruby

```ruby
require 'net/http'
require 'json'
require 'uri'

BOT_TOKEN = 'nbot_YOUR_TOKEN_HERE'
API_URL = 'https://your-domain.com/api/bots'

def send_message(channel_id, content, type = 'text')
  uri = URI("#{API_URL}/send-message")

  request = Net::HTTP::Post.new(uri)
  request['Authorization'] = "Bearer #{BOT_TOKEN}"
  request['Content-Type'] = 'application/json'
  request.body = {
    channel_id: channel_id,
    content: content,
    type: type
  }.to_json

  response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') do |http|
    http.request(request)
  end

  if response.code != '200'
    raise "Failed to send message: #{response.body}"
  end

  JSON.parse(response.body)
end

# Usage
begin
  result = send_message('550e8400-e29b-41d4-a716-446655440000', 'Hello from my Ruby bot!')
  puts "Message sent: #{result}"
rescue => e
  puts "Error: #{e.message}"
end
```

### PHP

```php
<?php

define('BOT_TOKEN', 'nbot_YOUR_TOKEN_HERE');
define('API_URL', 'https://your-domain.com/api/bots');

function sendMessage($channelId, $content, $type = 'text') {
    $url = API_URL . '/send-message';

    $data = [
        'channel_id' => $channelId,
        'content' => $content,
        'type' => $type,
    ];

    $options = [
        'http' => [
            'method' => 'POST',
            'header' => [
                'Authorization: Bearer ' . BOT_TOKEN,
                'Content-Type: application/json',
            ],
            'content' => json_encode($data),
        ],
    ];

    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);

    if ($response === false) {
        throw new Exception('Failed to send message');
    }

    return json_decode($response, true);
}

// Usage
try {
    $result = sendMessage('550e8400-e29b-41d4-a716-446655440000', 'Hello from my PHP bot!');
    echo "Message sent: " . json_encode($result) . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

---

## Create Channel

**Endpoint:** `POST /api/bots/create-channel`

Create a new channel programmatically.

### cURL

```bash
curl -X POST https://your-domain.com/api/bots/create-channel \
  -H "Authorization: Bearer nbot_YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "bot-created-channel",
    "description": "Channel created by bot",
    "is_private": false
  }'
```

### JavaScript

```javascript
async function createChannel(name, description, isPrivate = false) {
  const response = await fetch(`${API_URL}/create-channel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name,
      description: description,
      is_private: isPrivate,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create channel: ${await response.text()}`)
  }

  return await response.json()
}

// Usage
createChannel('bot-announcements', 'Automated bot announcements', false)
  .then((channel) => console.log('Channel created:', channel))
  .catch((err) => console.error('Error:', err))
```

### Python

```python
def create_channel(name, description, is_private=False):
    """Create a new channel."""
    headers = {
        'Authorization': f'Bearer {BOT_TOKEN}',
        'Content-Type': 'application/json',
    }

    payload = {
        'name': name,
        'description': description,
        'is_private': is_private,
    }

    response = requests.post(
        f'{API_URL}/create-channel',
        headers=headers,
        json=payload
    )

    if response.status_code != 200:
        raise Exception(f'Failed to create channel: {response.text}')

    return response.json()

# Usage
channel = create_channel('bot-announcements', 'Automated bot announcements', False)
print(f'Channel created: {channel}')
```

---

## Get Channel Info

**Endpoint:** `GET /api/bots/channel-info?channel_id={id}`

Retrieve information about a channel.

### cURL

```bash
curl -X GET "https://your-domain.com/api/bots/channel-info?channel_id=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer nbot_YOUR_TOKEN_HERE"
```

### JavaScript

```javascript
async function getChannelInfo(channelId) {
  const response = await fetch(`${API_URL}/channel-info?channel_id=${channelId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${BOT_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get channel info: ${await response.text()}`)
  }

  return await response.json()
}

// Usage
getChannelInfo('550e8400-e29b-41d4-a716-446655440000')
  .then((channel) => console.log('Channel info:', channel))
  .catch((err) => console.error('Error:', err))
```

### Python

```python
def get_channel_info(channel_id):
    """Get information about a channel."""
    headers = {
        'Authorization': f'Bearer {BOT_TOKEN}',
    }

    response = requests.get(
        f'{API_URL}/channel-info',
        headers=headers,
        params={'channel_id': channel_id}
    )

    if response.status_code != 200:
        raise Exception(f'Failed to get channel info: {response.text}')

    return response.json()

# Usage
channel = get_channel_info('550e8400-e29b-41d4-a716-446655440000')
print(f'Channel info: {channel}')
```

---

## Add Reaction

**Endpoint:** `POST /api/bots/add-reaction`

Add an emoji reaction to a message.

### cURL

```bash
curl -X POST https://your-domain.com/api/bots/add-reaction \
  -H "Authorization: Bearer nbot_YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "660e8400-e29b-41d4-a716-446655440001",
    "emoji": "👍"
  }'
```

### JavaScript

```javascript
async function addReaction(messageId, emoji) {
  const response = await fetch(`${API_URL}/add-reaction`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message_id: messageId,
      emoji: emoji,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to add reaction: ${await response.text()}`)
  }

  return await response.json()
}

// Usage
addReaction('660e8400-e29b-41d4-a716-446655440001', '👍')
  .then((reaction) => console.log('Reaction added:', reaction))
  .catch((err) => console.error('Error:', err))
```

### Python

```python
def add_reaction(message_id, emoji):
    """Add a reaction to a message."""
    headers = {
        'Authorization': f'Bearer {BOT_TOKEN}',
        'Content-Type': 'application/json',
    }

    payload = {
        'message_id': message_id,
        'emoji': emoji,
    }

    response = requests.post(
        f'{API_URL}/add-reaction',
        headers=headers,
        json=payload
    )

    if response.status_code != 200:
        raise Exception(f'Failed to add reaction: {response.text}')

    return response.json()

# Usage
reaction = add_reaction('660e8400-e29b-41d4-a716-446655440001', '👍')
print(f'Reaction added: {reaction}')
```

---

## Get User Info

**Endpoint:** `GET /api/bots/user-info?user_id={id}`

Retrieve information about a user.

### cURL

```bash
curl -X GET "https://your-domain.com/api/bots/user-info?user_id=770e8400-e29b-41d4-a716-446655440002" \
  -H "Authorization: Bearer nbot_YOUR_TOKEN_HERE"
```

### JavaScript

```javascript
async function getUserInfo(userId) {
  const response = await fetch(`${API_URL}/user-info?user_id=${userId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${BOT_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${await response.text()}`)
  }

  return await response.json()
}

// Usage
getUserInfo('770e8400-e29b-41d4-a716-446655440002')
  .then((user) => console.log('User info:', user))
  .catch((err) => console.error('Error:', err))
```

### Python

```python
def get_user_info(user_id):
    """Get information about a user."""
    headers = {
        'Authorization': f'Bearer {BOT_TOKEN}',
    }

    response = requests.get(
        f'{API_URL}/user-info',
        headers=headers,
        params={'user_id': user_id}
    )

    if response.status_code != 200:
        raise Exception(f'Failed to get user info: {response.text}')

    return response.json()

# Usage
user = get_user_info('770e8400-e29b-41d4-a716-446655440002')
print(f'User info: {user}')
```

---

## Webhook Integration

Receive events from nself-chat via webhooks.

### Webhook Signature Verification

All webhook requests include an `X-Webhook-Signature` header with an HMAC-SHA256 signature.

#### JavaScript/Node.js

```javascript
const crypto = require('crypto')
const express = require('express')

const WEBHOOK_SECRET = 'your_webhook_secret_here'

function verifyWebhookSignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}

const app = express()
app.use(express.json())

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature']

  if (!signature || !verifyWebhookSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Process webhook event
  const event = req.body
  console.log('Received webhook event:', event)

  switch (event.type) {
    case 'message.created':
      handleMessageCreated(event.data)
      break
    case 'channel.created':
      handleChannelCreated(event.data)
      break
    // ... handle other events
  }

  res.status(200).json({ received: true })
})

function handleMessageCreated(message) {
  console.log('New message:', message)
  // Your logic here
}

function handleChannelCreated(channel) {
  console.log('New channel:', channel)
  // Your logic here
}

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000')
})
```

#### Python/Flask

```python
import hmac
import hashlib
import json
from flask import Flask, request, jsonify

WEBHOOK_SECRET = 'your_webhook_secret_here'

app = Flask(__name__)

def verify_webhook_signature(payload, signature):
    """Verify the webhook signature."""
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        json.dumps(payload).encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')

    if not signature or not verify_webhook_signature(request.json, signature):
        return jsonify({'error': 'Invalid signature'}), 401

    # Process webhook event
    event = request.json
    print(f'Received webhook event: {event}')

    event_type = event.get('type')

    if event_type == 'message.created':
        handle_message_created(event['data'])
    elif event_type == 'channel.created':
        handle_channel_created(event['data'])
    # ... handle other events

    return jsonify({'received': True}), 200

def handle_message_created(message):
    print(f'New message: {message}')
    # Your logic here

def handle_channel_created(channel):
    print(f'New channel: {channel}')
    # Your logic here

if __name__ == '__main__':
    app.run(port=3000)
```

### Webhook Event Types

| Event Type        | Description               | Payload         |
| ----------------- | ------------------------- | --------------- |
| `message.created` | New message posted        | Message object  |
| `message.updated` | Message edited            | Message object  |
| `message.deleted` | Message deleted           | Message ID      |
| `channel.created` | New channel created       | Channel object  |
| `channel.updated` | Channel updated           | Channel object  |
| `user.joined`     | User joined channel       | User + Channel  |
| `reaction.added`  | Reaction added to message | Reaction object |

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

| Code                  | Status | Description                     |
| --------------------- | ------ | ------------------------------- |
| `INVALID_TOKEN`       | 401    | Bot token is invalid or expired |
| `MISSING_PERMISSION`  | 403    | Bot lacks required permission   |
| `CHANNEL_NOT_FOUND`   | 404    | Channel ID does not exist       |
| `MESSAGE_TOO_LONG`    | 400    | Message exceeds length limit    |
| `RATE_LIMIT_EXCEEDED` | 429    | Too many requests               |
| `INTERNAL_ERROR`      | 500    | Server error                    |

### Error Handling Example (JavaScript)

```javascript
async function sendMessageWithRetry(channelId, content, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendMessage(channelId, content)
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = error.response.headers['retry-after'] || 60
        console.log(`Rate limited. Retrying after ${retryAfter}s...`)
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
        continue
      }

      if (error.response?.status >= 500 && attempt < maxRetries) {
        // Server error - retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        console.log(`Server error. Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // Non-retryable error or max retries reached
      throw error
    }
  }
}
```

---

## Rate Limiting

### Limits

- **100 requests per minute** per bot
- **Rate limit headers** included in responses:
  - `X-RateLimit-Limit`: Maximum requests per minute
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

### Handling Rate Limits (JavaScript)

```javascript
class RateLimitedBotClient {
  constructor(token) {
    this.token = token
    this.requestQueue = []
    this.processing = false
  }

  async request(endpoint, options) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ endpoint, options, resolve, reject })
      this.processQueue()
    })
  }

  async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return

    this.processing = true

    while (this.requestQueue.length > 0) {
      const { endpoint, options, resolve, reject } = this.requestQueue.shift()

      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.token}`,
            ...options.headers,
          },
        })

        const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0')
        const resetTime = parseInt(response.headers.get('X-RateLimit-Reset') || '0')

        if (response.status === 429) {
          // Rate limited - requeue and wait
          this.requestQueue.unshift({ endpoint, options, resolve, reject })
          const waitTime = resetTime - Date.now() || 60000
          await new Promise((r) => setTimeout(r, waitTime))
          continue
        }

        const data = await response.json()
        resolve(data)

        // Proactive rate limiting
        if (remaining <= 10) {
          const waitTime = (resetTime - Date.now()) / (remaining + 1)
          await new Promise((r) => setTimeout(r, waitTime))
        }
      } catch (error) {
        reject(error)
      }
    }

    this.processing = false
  }
}

// Usage
const bot = new RateLimitedBotClient('nbot_YOUR_TOKEN_HERE')
```

---

## Best Practices

### 1. Use Environment Variables

```javascript
// ✅ Good
const BOT_TOKEN = process.env.BOT_TOKEN

// ❌ Bad
const BOT_TOKEN = 'nbot_hardcoded_token'
```

### 2. Implement Exponential Backoff

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000))
    }
  }
}
```

### 3. Validate Input

```javascript
function sendMessage(channelId, content) {
  if (!channelId || typeof channelId !== 'string') {
    throw new Error('Invalid channel ID')
  }

  if (!content || content.length > 4000) {
    throw new Error('Content must be between 1 and 4000 characters')
  }

  // ... make API call
}
```

### 4. Log Errors

```javascript
try {
  await sendMessage(channelId, content)
} catch (error) {
  console.error('Failed to send message:', {
    channelId,
    error: error.message,
    stack: error.stack,
  })
  // Report to error tracking service
}
```

### 5. Use Webhooks for Events

Instead of polling for new messages, use webhooks to receive events in real-time.

### 6. Cache Channel/User Info

```javascript
const cache = new Map()

async function getChannelInfoCached(channelId) {
  if (cache.has(channelId)) {
    return cache.get(channelId)
  }

  const channel = await getChannelInfo(channelId)
  cache.set(channelId, channel)

  // Expire after 5 minutes
  setTimeout(() => cache.delete(channelId), 5 * 60 * 1000)

  return channel
}
```

---

## Complete Bot Example (JavaScript)

```javascript
const fetch = require('node-fetch')
const express = require('express')
const crypto = require('crypto')

class NchatBot {
  constructor(token, webhookSecret) {
    this.token = token
    this.webhookSecret = webhookSecret
    this.apiUrl = 'https://your-domain.com/api/bots'
  }

  async sendMessage(channelId, content) {
    const response = await fetch(`${this.apiUrl}/send-message`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel_id: channelId, content, type: 'text' }),
    })

    if (!response.ok) throw new Error(await response.text())
    return await response.json()
  }

  verifyWebhookSignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex')

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  }

  createWebhookServer(port = 3000) {
    const app = express()
    app.use(express.json())

    app.post('/webhook', async (req, res) => {
      const signature = req.headers['x-webhook-signature']

      if (!signature || !this.verifyWebhookSignature(req.body, signature)) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      try {
        await this.handleWebhook(req.body)
        res.status(200).json({ received: true })
      } catch (error) {
        console.error('Webhook error:', error)
        res.status(500).json({ error: 'Internal error' })
      }
    })

    app.listen(port, () => {
      console.log(`Webhook server listening on port ${port}`)
    })

    return app
  }

  async handleWebhook(event) {
    console.log('Received event:', event.type)

    switch (event.type) {
      case 'message.created':
        await this.onMessageCreated(event.data)
        break
      // ... handle other events
    }
  }

  async onMessageCreated(message) {
    // Bot logic: respond to mentions
    if (message.content.includes('@bot')) {
      await this.sendMessage(message.channel_id, `Hello! You mentioned me. How can I help?`)
    }
  }
}

// Usage
const bot = new NchatBot(process.env.BOT_TOKEN, process.env.WEBHOOK_SECRET)

// Start webhook server
bot.createWebhookServer(3000)

// Send a message
bot
  .sendMessage('550e8400-e29b-41d4-a716-446655440000', 'Bot is online!')
  .then(() => console.log('Message sent'))
  .catch((err) => console.error('Error:', err))
```

---

## Related Documentation

- [Bot API Implementation](BOT_API_IMPLEMENTATION.md)
- [Bot Development Guide](../features/Bots.md)
- [API Documentation](API-DOCUMENTATION.md)
- [Interactive API Docs](/api-docs/bots)

---

**Last Updated:** January 30, 2026 • **Version:** 0.3.0
