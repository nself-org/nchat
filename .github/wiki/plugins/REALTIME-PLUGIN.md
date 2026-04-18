# ɳChat Realtime Plugin

**Plugin Name**: `realtime`
**Version**: 1.0.0
**Category**: Communication
**Status**: Production Ready
**Priority**: CRITICAL

---

## Overview

The Realtime Plugin provides WebSocket-based real-time communication infrastructure for ɳChat. It handles instant message delivery, presence tracking, typing indicators, and live updates.

---

## Features

### Core Features

- ✅ **WebSocket Server** - Bi-directional real-time communication
- ✅ **Presence Tracking** - Online/away/dnd/offline status
- ✅ **Typing Indicators** - Real-time typing notifications
- ✅ **Room Management** - Channel-based message routing
- ✅ **Connection Management** - Auto-reconnection, heartbeat
- ✅ **Event Broadcasting** - Pub/sub event system
- ✅ **Message Delivery** - Real-time message push
- ✅ **Read Receipts** - Message read status tracking
- ✅ **Reactions** - Real-time reaction updates

### Advanced Features

- ✅ **Offline Queue** - Queue messages when offline
- ✅ **Presence Sync** - Synchronize presence across devices
- ✅ **Scalability** - Redis-backed scaling to 10,000+ connections
- ✅ **Authentication** - JWT token validation
- ✅ **Rate Limiting** - Prevent message spam
- ✅ **Monitoring** - Connection metrics and health checks

---

## Installation

### Prerequisites

- Docker running
- nself CLI v0.9.8+
- Redis service (provided by nself stack)

### Install Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend
nself plugin install realtime
```

### Configuration

Add to `backend/.env.plugins`:

```bash
# Realtime Plugin
REALTIME_ENABLED=true
REALTIME_PORT=3101
REALTIME_ROUTE=realtime.${BASE_DOMAIN:-localhost}
REALTIME_MEMORY=256M

# WebSocket Configuration
REALTIME_WEBSOCKET_MAX_CONNECTIONS=10000
REALTIME_WEBSOCKET_PING_INTERVAL=25000
REALTIME_WEBSOCKET_PING_TIMEOUT=5000

# Presence Configuration
REALTIME_PRESENCE_TIMEOUT=30000
REALTIME_PRESENCE_SYNC_INTERVAL=10000

# Typing Configuration
REALTIME_TYPING_TIMEOUT=3000
REALTIME_TYPING_DEBOUNCE=300

# Redis Configuration
REALTIME_REDIS_HOST=redis
REALTIME_REDIS_PORT=6379
REALTIME_REDIS_DB=1
REALTIME_REDIS_PASSWORD=${REDIS_PASSWORD:-}

# Authentication
REALTIME_JWT_SECRET=${JWT_SECRET}
REALTIME_JWT_ALGORITHM=HS256

# Rate Limiting
REALTIME_RATE_LIMIT_ENABLED=true
REALTIME_RATE_LIMIT_POINTS=100
REALTIME_RATE_LIMIT_DURATION=60

# Monitoring
REALTIME_METRICS_ENABLED=true
REALTIME_HEALTH_CHECK_INTERVAL=30
```

### Start Service

```bash
nself restart
```

---

## API Endpoints

### Health Check

```bash
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "service": "realtime",
  "version": "1.0.0",
  "uptime": 86400,
  "websocket": {
    "running": true,
    "connections": 1234
  },
  "dependencies": {
    "redis": {
      "status": "connected",
      "latency": 2
    }
  }
}
```

### Presence Management

#### Get Channel Presence

```bash
GET /presence/:channelId
```

**Response:**

```json
{
  "channelId": "channel-123",
  "users": [
    {
      "userId": "user-1",
      "status": "online",
      "lastSeen": "2026-02-03T12:00:00Z"
    }
  ],
  "count": {
    "online": 5,
    "away": 2,
    "dnd": 1,
    "offline": 10
  }
}
```

#### Update Presence

```bash
POST /presence/:channelId
Content-Type: application/json

{
  "userId": "user-123",
  "status": "online"
}
```

### Typing Indicators

#### Send Typing Indicator

```bash
POST /typing
Content-Type: application/json

{
  "userId": "user-123",
  "channelId": "channel-456",
  "isTyping": true
}
```

### Messages

#### Send Message

```bash
POST /messages
Content-Type: application/json

{
  "channelId": "channel-123",
  "userId": "user-456",
  "content": "Hello world!",
  "mentions": ["user-789"]
}
```

### Polling Endpoint (Fallback)

```bash
GET /poll?channelId=channel-123&since=1234567890
```

For clients that can't use WebSocket, provides HTTP polling.

---

## WebSocket Events

### Client → Server

#### Connection

```javascript
socket.connect({
  auth: {
    token: 'jwt-token-here',
    userId: 'user-123',
  },
})
```

#### Join Channel

```javascript
socket.emit('channel:join', {
  channelId: 'channel-123',
})
```

#### Leave Channel

```javascript
socket.emit('channel:leave', {
  channelId: 'channel-123',
})
```

#### Send Message

```javascript
socket.emit('message:send', {
  channelId: 'channel-123',
  content: 'Hello!',
  mentions: [],
})
```

#### Update Presence

```javascript
socket.emit('presence:update', {
  status: 'online', // online, away, dnd, offline
})
```

#### Send Typing

```javascript
socket.emit('typing', {
  channelId: 'channel-123',
  isTyping: true,
})
```

### Server → Client

#### Message Received

```javascript
socket.on('message', (message) => {
  console.log('New message:', message)
})
```

#### Presence Changed

```javascript
socket.on('presence', (presence) => {
  console.log('Presence update:', presence)
})
```

#### Typing Indicator

```javascript
socket.on('typing', (typing) => {
  console.log('User typing:', typing)
})
```

#### Read Receipt

```javascript
socket.on('read', (receipt) => {
  console.log('Message read:', receipt)
})
```

#### Reaction

```javascript
socket.on('reaction', (reaction) => {
  console.log('Message reaction:', reaction)
})
```

#### Error

```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error)
})
```

---

## Frontend Integration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_REALTIME_URL=http://realtime.localhost:3101
NEXT_PUBLIC_REALTIME_WS_URL=ws://realtime.localhost:3101
NEXT_PUBLIC_REALTIME_ENABLED=true
```

### React Hook

```typescript
import { useRealtime } from '@/hooks/use-realtime'

function ChatChannel({ channelId }) {
  const {
    isConnected,
    joinChannel,
    leaveChannel,
    sendTyping,
    updatePresence
  } = useRealtime()

  useEffect(() => {
    if (isConnected) {
      joinChannel(channelId)
    }
    return () => leaveChannel(channelId)
  }, [channelId, isConnected])

  const handleTyping = () => {
    sendTyping(channelId, true)
  }

  return (
    <div>
      {isConnected ? 'Connected' : 'Connecting...'}
    </div>
  )
}
```

### Service Layer

```typescript
import { realtimeClient } from '@/services/realtime/realtime-client'

// Connect
await realtimeClient.connect(userId, token)

// Join channel
realtimeClient.joinChannel('channel-123')

// Listen for messages
realtimeClient.on('message', (message) => {
  console.log('New message:', message)
})

// Send typing indicator
realtimeClient.sendTyping('channel-123', true)

// Update presence
realtimeClient.updatePresence('online')

// Disconnect
realtimeClient.disconnect()
```

---

## Testing

### Health Check Test

```bash
curl http://realtime.localhost:3101/health
```

### Integration Test

```typescript
describe('Realtime Plugin', () => {
  it('should connect and join channel', async () => {
    const client = new RealtimeClient()
    await client.connect('user-123', 'token')

    client.joinChannel('channel-123')

    const message = await new Promise((resolve) => {
      client.on('message', resolve)
      // Trigger message from another client
    })

    expect(message).toHaveProperty('content')
  })
})
```

---

## Performance

### Metrics

- **Connections**: Supports 10,000+ concurrent connections
- **Message Latency**: < 50ms average
- **CPU**: ~0.5 core at 1000 connections
- **Memory**: ~256MB baseline, scales with connections
- **Redis**: 1-2ms average latency

### Scaling

For horizontal scaling:

```yaml
# docker-compose.yml
realtime:
  deploy:
    replicas: 3
  environment:
    - REALTIME_REDIS_HOST=redis-cluster
```

Use Redis Cluster for pub/sub across instances.

---

## Monitoring

### Health Endpoint

```bash
curl http://realtime.localhost:3101/health
```

### Prometheus Metrics

```bash
curl http://realtime.localhost:3101/metrics
```

**Key Metrics:**

- `realtime_connections_total` - Active connections
- `realtime_messages_total` - Messages processed
- `realtime_presence_updates_total` - Presence updates
- `realtime_latency_ms` - Message latency histogram

### Logs

```bash
nself logs realtime --follow
```

---

## Troubleshooting

### Connection Issues

**Problem**: WebSocket connection fails

**Solutions:**

1. Check if service is running: `nself status realtime`
2. Verify JWT token is valid
3. Check firewall/proxy settings for WebSocket
4. Test with HTTP polling as fallback

### High Latency

**Problem**: Messages delayed

**Solutions:**

1. Check Redis latency: `redis-cli --latency`
2. Monitor connection count: `/health` endpoint
3. Scale horizontally if at capacity
4. Check network bandwidth

### Memory Issues

**Problem**: High memory usage

**Solutions:**

1. Check connection count
2. Review presence timeout settings
3. Enable connection limits
4. Monitor with: `docker stats realtime`

---

## Best Practices

### Client-Side

1. **Auto-Reconnect**: Enable exponential backoff
2. **Heartbeat**: Keep connection alive with ping/pong
3. **Fallback**: Implement HTTP polling for unstable connections
4. **Token Refresh**: Update JWT before expiration
5. **Error Handling**: Gracefully handle disconnections

### Server-Side

1. **Rate Limiting**: Prevent message spam
2. **Connection Limits**: Set max connections per user
3. **Monitoring**: Track metrics and set alerts
4. **Scaling**: Use Redis Cluster for horizontal scaling
5. **Security**: Validate all incoming events

---

## Security

### Authentication

All WebSocket connections require JWT authentication:

```javascript
socket.connect({
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
})
```

### Authorization

Room access is validated before join:

```javascript
socket.emit('channel:join', { channelId: 'private-channel' })
// Validated against user permissions
```

### Rate Limiting

Configured per-user limits:

- 100 events per minute (default)
- Configurable via `REALTIME_RATE_LIMIT_POINTS`

---

## Changelog

### Version 1.0.0 (2026-02-03)

- Initial release
- WebSocket server with Socket.IO
- Presence tracking
- Typing indicators
- Room management
- Redis pub/sub scaling
- Health checks and monitoring

---

## Support

- **Documentation**: https://nself.org/docs/plugins/realtime
- **Issues**: https://github.com/nself-org/plugins/issues
- **Discord**: https://discord.gg/nself

---

## Related Documentation

- [Installation Guide](./INSTALLATION-GUIDE.md)
- [Integration Guide](./INTEGRATION-GUIDE.md)
- [Notifications Plugin](./NOTIFICATIONS-PLUGIN.md)
- [Plugin System Overview](./README.md)
