# nChat API Documentation

Complete API reference for building on nChat - the white-label team communication platform.

## Overview

nChat provides both REST and GraphQL APIs for maximum flexibility:

- **REST API** - Traditional HTTP endpoints for simple operations
- **GraphQL API** - Flexible queries and real-time subscriptions
- **WebSocket API** - Real-time events and presence

## Base URLs

```
REST API:      https://api.nchat.example.com/api
GraphQL API:   https://api.nchat.example.com/graphql
WebSocket:     wss://api.nchat.example.com/socket.io
```

## Authentication

All API requests require authentication via one of the following methods:

### 1. API Key (Server-to-Server)

```bash
curl https://api.nchat.example.com/api/channels \
  -H "X-API-Key: your-api-key"
```

### 2. JWT Token (User Authentication)

```bash
curl https://api.nchat.example.com/api/channels \
  -H "Authorization: Bearer your-jwt-token"
```

### 3. OAuth 2.0

```bash
# Get access token
POST /api/auth/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "auth-code",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret"
}
```

## Quick Start

### Using REST API

```bash
# Sign in
curl -X POST https://api.nchat.example.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Response
{
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

# Send a message
curl -X POST https://api.nchat.example.com/api/messages \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "channel-123",
    "content": "Hello, world!"
  }'
```

### Using GraphQL API

```graphql
# Query
query GetChannels {
  nchat_channels(limit: 10, order_by: { created_at: desc }) {
    id
    name
    description
    type
    member_count
  }
}

# Mutation
mutation SendMessage($channelId: uuid!, $content: String!) {
  insert_nchat_messages_one(object: { channel_id: $channelId, content: $content }) {
    id
    content
    created_at
    user {
      id
      display_name
    }
  }
}

# Subscription
subscription OnNewMessage($channelId: uuid!) {
  nchat_messages(
    where: { channel_id: { _eq: $channelId } }
    order_by: { created_at: desc }
    limit: 1
  ) {
    id
    content
    user {
      display_name
    }
  }
}
```

### Using the SDK

```typescript
import { NChatClient } from '@nchat/sdk'

const client = new NChatClient({
  apiUrl: 'https://api.nchat.example.com',
  apiKey: 'your-api-key',
})

// Authenticate
const { user, token } = await client.auth.signIn({
  email: 'user@example.com',
  password: 'password123',
})

client.setToken(token)

// Send a message
const message = await client.messages.send({
  channelId: 'channel-123',
  content: 'Hello, world!',
})
```

## API Sections

### Core APIs

- [Authentication](./authentication.md) - Sign in, sign up, OAuth, 2FA
- [Users](./users.md) - User management and profiles
- [Channels](./channels.md) - Channel creation and management
- [Messages](./messages.md) - Send, edit, delete messages
- [Direct Messages](./direct-messages.md) - One-on-one conversations

### Advanced Features

- [Threads](./threads.md) - Message threading
- [Reactions](./reactions.md) - Emoji reactions
- [Attachments](./attachments.md) - File uploads and media
- [Search](./search.md) - Full-text search
- [Notifications](./notifications.md) - Push notifications

### Real-time

- [WebSocket Events](./websocket-events.md) - Real-time updates
- [Presence](./presence.md) - User online status
- [Typing Indicators](./typing.md) - Live typing status

### Integrations

- [Webhooks](../plugins/webhooks.md) - Outgoing webhooks
- [Bots](../plugins/bots.md) - Bot API and management
- [OAuth Apps](./oauth-apps.md) - Third-party integrations

### Administration

- [Admin API](./admin.md) - Administrative operations
- [Analytics](./analytics.md) - Usage statistics
- [Audit Logs](./audit-logs.md) - Activity tracking
- [Moderation](./moderation.md) - Content moderation

## Response Format

### Success Response

```json
{
  "data": {
    "id": "123",
    "name": "General",
    "type": "public"
  },
  "success": true
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "errors": {
      "email": ["Email is required"],
      "password": ["Password must be at least 8 characters"]
    }
  },
  "success": false
}
```

### Paginated Response

```json
{
  "data": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true,
    "nextCursor": "eyJpZCI6IjIifQ=="
  },
  "success": true
}
```

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Authenticated requests**: 1000 requests per minute
- **Unauthenticated requests**: 60 requests per minute
- **Webhook deliveries**: 100 requests per minute per webhook

Rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

When rate limited:

```json
{
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "retryAfter": 60
  },
  "success": false
}
```

## Error Codes

| Code                   | HTTP Status | Description                        |
| ---------------------- | ----------- | ---------------------------------- |
| `AUTHENTICATION_ERROR` | 401         | Authentication required or invalid |
| `AUTHORIZATION_ERROR`  | 403         | Insufficient permissions           |
| `NOT_FOUND`            | 404         | Resource not found                 |
| `VALIDATION_ERROR`     | 400         | Invalid request data               |
| `RATE_LIMIT_ERROR`     | 429         | Too many requests                  |
| `SERVER_ERROR`         | 500         | Internal server error              |
| `NETWORK_ERROR`        | -           | Network connection failed          |

## Versioning

The API uses semantic versioning. The current version is `v1`.

```bash
# REST API version in URL
https://api.nchat.example.com/api/v1/channels

# GraphQL API version in header
X-API-Version: 1
```

## Webhooks

Register webhooks to receive real-time events:

```bash
POST /api/webhooks
{
  "name": "My Webhook",
  "url": "https://example.com/webhook",
  "events": ["message.created", "channel.created"],
  "secret": "optional-secret-for-verification"
}
```

Webhook payload:

```json
{
  "event": "message.created",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "id": "message-123",
    "channelId": "channel-456",
    "content": "Hello!",
    "userId": "user-789"
  },
  "signature": "sha256=..."
}
```

## GraphQL Schema

Full GraphQL schema documentation:

- [GraphQL Schema Reference](./graphql-schema.md)
- [GraphQL Queries](./graphql-queries.md)
- [GraphQL Mutations](./graphql-mutations.md)
- [GraphQL Subscriptions](./graphql-subscriptions.md)

## Code Examples

Examples in multiple languages:

- [TypeScript/JavaScript](./examples/typescript.md)
- [Python](./examples/python.md)
- [cURL](./examples/curl.md)
- [Go](./examples/go.md)

## SDKs and Libraries

Official SDKs:

- **TypeScript/JavaScript**: `@nchat/sdk` ([docs](../guides/development/sdk-usage.md))
- **Python**: `nchat-python` (coming soon)
- **Go**: `nchat-go` (coming soon)

## API Playground

Try the API in your browser:

- [REST API Explorer](https://api.nchat.example.com/docs) - Swagger UI
- [GraphQL Playground](https://api.nchat.example.com/graphql) - GraphiQL interface

## Support

- **Documentation**: https://docs.nchat.example.com
- **API Status**: https://status.nchat.example.com
- **Support**: support@nchat.example.com
- **Discord**: https://discord.gg/nchat
- **GitHub Issues**: https://github.com/nself-chat/nself-chat/issues

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for API changes and version history.
