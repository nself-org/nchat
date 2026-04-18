# Developer Tools Guide

Complete guide to nChat developer tools including SDK, CLI, and API documentation.

## Overview

nChat provides a comprehensive developer toolkit to make building on the platform easy and efficient:

1. **TypeScript SDK** - Type-safe client library for all APIs
2. **CLI Tool** - Command-line interface for development and deployment
3. **API Documentation** - Complete REST and GraphQL API reference
4. **API Playground** - Interactive API explorer with Swagger UI and GraphiQL

## Quick Links

### Documentation

- [SDK Usage Guide](./sdk-usage.md) - Complete SDK documentation
- [CLI Usage Guide](./cli-usage.md) - CLI command reference
- [API Reference](../../api/README.md) - REST and GraphQL API docs
- [Authentication Guide](../../api/authentication.md) - Auth implementation

### Interactive Tools

- **REST API Explorer**: http://localhost:3000/api-docs
- **GraphQL Playground**: http://localhost:3000/graphql-playground
- **API Spec**: http://localhost:3000/api/openapi.json

## Getting Started

### 1. Install the SDK

```bash
npm install @nchat/sdk
```

### 2. Install the CLI

```bash
npm install -g @nchat/cli
```

### 3. Start Development

```bash
# Start backend services
nchat-cli dev backend

# Run database migrations
nchat-cli db migrate

# Seed sample data
nchat-cli db seed

# Start development server
nchat-cli dev start
```

### 4. Make Your First API Call

```typescript
import { NChatClient } from '@nchat/sdk'

const client = new NChatClient({
  apiUrl: 'http://localhost:3000',
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
  content: 'Hello from the SDK!',
})

console.log('Message sent:', message.id)
```

## Developer Tools Features

### TypeScript SDK

✅ **Type-Safe** - Full TypeScript support with comprehensive types
✅ **GraphQL & REST** - Supports both API types
✅ **Authentication** - Built-in auth handling
✅ **Error Handling** - Custom error classes
✅ **Pagination** - Easy pagination support
✅ **Retry Logic** - Automatic retry with configurable options

**Installation**:

```bash
npm install @nchat/sdk
```

**Usage**:

```typescript
import { NChatClient } from '@nchat/sdk'

const client = new NChatClient({
  apiUrl: 'https://api.nchat.example.com',
  apiKey: 'your-api-key',
})
```

[Full SDK Documentation →](./sdk-usage.md)

### CLI Tool

✅ **Development Server** - Start dev server with hot reload
✅ **Backend Management** - Start/stop backend services
✅ **Database Tools** - Migrations, seeding, backups
✅ **User Management** - Create, update, delete users
✅ **Channel Management** - Manage channels via CLI
✅ **Deployment** - Deploy to Vercel, Docker, K8s

**Installation**:

```bash
npm install -g @nchat/cli
```

**Usage**:

```bash
# Development
nchat-cli dev start
nchat-cli dev backend

# Database
nchat-cli db migrate
nchat-cli db seed

# Deployment
nchat-cli deploy vercel --prod
```

[Full CLI Documentation →](./cli-usage.md)

### API Documentation

✅ **REST API** - Traditional HTTP endpoints
✅ **GraphQL API** - Flexible queries and subscriptions
✅ **WebSocket API** - Real-time events
✅ **Code Examples** - TypeScript, Python, cURL, Go
✅ **Authentication Guide** - Complete auth documentation
✅ **Rate Limiting** - Rate limit information

**Endpoints**:

- REST: `https://api.nchat.example.com/api`
- GraphQL: `https://api.nchat.example.com/graphql`
- WebSocket: `wss://api.nchat.example.com/socket.io`

**Explore APIs**:

- REST Explorer: `/api-docs`
- GraphQL Playground: `/graphql-playground`

[Full API Documentation →](../../api/README.md)

### API Playground

✅ **Interactive Explorer** - Test APIs in your browser
✅ **Swagger UI** - REST API documentation and testing
✅ **GraphiQL** - GraphQL query builder
✅ **Authentication** - Built-in auth support
✅ **Code Generation** - Generate code snippets

**Access**:

- http://localhost:3000/api-docs (Swagger UI)
- http://localhost:3000/graphql-playground (GraphiQL)

## Common Tasks

### Authentication

#### Using SDK

```typescript
// Sign up
const { user, token } = await client.auth.signUp({
  email: 'newuser@example.com',
  password: 'SecurePassword123!',
  displayName: 'John Doe',
})

// Sign in
const { user, token } = await client.auth.signIn({
  email: 'user@example.com',
  password: 'password123',
})

// Set token
client.setToken(token)

// Sign out
await client.auth.signOut()
```

#### Using REST API

```bash
# Sign up
curl -X POST https://api.nchat.example.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "displayName": "John Doe"
  }'

# Sign in
curl -X POST https://api.nchat.example.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Managing Channels

#### Using SDK

```typescript
// Create channel
const channel = await client.channels.create({
  name: 'general',
  description: 'General discussion',
  type: 'public',
})

// List channels
const { data: channels } = await client.channels.list({ limit: 50 })

// Join channel
await client.channels.join(channel.id)
```

#### Using CLI

```bash
# Create channel
nchat-cli channel create --name general --type public

# List channels
nchat-cli channel list

# Delete channel
nchat-cli channel delete channel-123
```

### Sending Messages

#### Using SDK

```typescript
// Simple message
const message = await client.messages.send({
  channelId: 'channel-123',
  content: 'Hello, world!',
})

// Message with mentions
await client.messages.send({
  channelId: 'channel-123',
  content: 'Hey @john!',
  mentions: ['user-456'],
})

// Reply in thread
await client.messages.send({
  channelId: 'channel-123',
  content: 'This is a reply',
  parentId: 'message-789',
})
```

#### Using GraphQL

```graphql
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
```

### User Management

#### Using SDK

```typescript
// Get current user
const user = await client.users.me()

// Search users
const { data: users } = await client.users.search('john')

// Update profile
await client.users.update({
  displayName: 'New Name',
  avatarUrl: 'https://example.com/avatar.jpg',
})
```

#### Using CLI

```bash
# Create user
nchat-cli user create \
  --email admin@example.com \
  --name "Admin User" \
  --role admin

# List users
nchat-cli user list

# Update user role
nchat-cli user update user-123 --role moderator

# Suspend user
nchat-cli user suspend user-456 --reason "Violation"
```

## Development Workflow

### Local Development

```bash
# 1. Start backend services
nchat-cli dev backend --detach

# 2. Run migrations
nchat-cli db migrate

# 3. Seed sample data
nchat-cli db seed --users 50 --channels 10

# 4. Start dev server
nchat-cli dev start

# 5. Run tests (separate terminal)
nchat-cli dev test --watch
```

### Testing APIs

```bash
# Open REST API Explorer
open http://localhost:3000/api-docs

# Open GraphQL Playground
open http://localhost:3000/graphql-playground

# Or use curl
curl http://localhost:3000/api/channels \
  -H "Authorization: Bearer $TOKEN"
```

### Building and Deploying

```bash
# 1. Run tests
nchat-cli dev test --coverage

# 2. Build for production
nchat-cli dev build

# 3. Create backup
nchat-cli backup create

# 4. Deploy
nchat-cli deploy vercel --prod
```

## Best Practices

### 1. Error Handling

Always handle errors properly:

```typescript
import { AuthenticationError, ValidationError, RateLimitError } from '@nchat/sdk'

try {
  const message = await client.messages.send({ ... })
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Redirect to login
  } else if (error instanceof ValidationError) {
    // Show validation errors
    console.error(error.errors)
  } else if (error instanceof RateLimitError) {
    // Wait and retry
    await sleep(error.retryAfter * 1000)
  }
}
```

### 2. Token Management

Store and refresh tokens securely:

```typescript
// Store tokens
localStorage.setItem('nchat_token', token)
localStorage.setItem('nchat_refresh_token', refreshToken)

// Refresh when needed
if (isTokenExpired(token)) {
  const { token, refreshToken } = await client.auth.refreshToken(refreshToken)
  client.setToken(token)
  // Update storage
}
```

### 3. Pagination

Handle pagination correctly:

```typescript
// Load all results
async function* paginateAll<T>(fetcher: (options: ListOptions) => Promise<PaginatedResult<T>>) {
  let offset = 0
  const limit = 50

  while (true) {
    const result = await fetcher({ limit, offset })
    yield* result.data

    if (!result.pagination.hasMore) break
    offset += limit
  }
}

// Usage
for await (const message of paginateAll((opts) => client.messages.list('channel-123', opts))) {
  console.log(message.content)
}
```

### 4. Rate Limiting

Respect rate limits:

```typescript
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof RateLimitError && i < maxRetries - 1) {
        await sleep(error.retryAfter * 1000)
        continue
      }
      throw error
    }
  }
}
```

## Support and Resources

### Documentation

- [SDK Usage Guide](./sdk-usage.md)
- [CLI Usage Guide](./cli-usage.md)
- [API Reference](../../api/README.md)
- [GraphQL Schema](../../api/graphql-schema.md)
- [Authentication Guide](../../api/authentication.md)

### Interactive Tools

- REST API Explorer: http://localhost:3000/api-docs
- GraphQL Playground: http://localhost:3000/graphql-playground
- API Spec: http://localhost:3000/api/openapi.json

### Community

- **Website**: https://nchat.example.com
- **Documentation**: https://docs.nchat.example.com
- **Discord**: https://discord.gg/nchat
- **GitHub**: https://github.com/nself-chat/nself-chat
- **Support**: support@nchat.example.com

### Examples

Check out the examples repository for complete working examples:

https://github.com/nself-chat/examples

## Contributing

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../../../LICENSE) for details.
