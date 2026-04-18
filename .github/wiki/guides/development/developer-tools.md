# nChat Developer Tools

Complete developer toolkit for building on nChat - the white-label team communication platform.

## 🚀 Quick Start

```bash
# Install SDK
npm install @nchat/sdk

# Install CLI
npm install -g @nchat/cli

# Start development
nchat-cli dev backend
nchat-cli db migrate
nchat-cli db seed
nchat-cli dev start

# Open API Explorer
open http://localhost:3000/api-docs
open http://localhost:3000/graphql-playground
```

## 📦 What's Included

### 1. TypeScript SDK (`@nchat/sdk`)

Type-safe client library for all nChat APIs.

**Location**: `/src/sdk/`

**Features**:

- ✅ Full TypeScript support with comprehensive types
- ✅ GraphQL and REST API support
- ✅ Built-in authentication handling
- ✅ Custom error classes
- ✅ Pagination support
- ✅ Automatic retry logic

**Quick Example**:

```typescript
import { NChatClient } from '@nchat/sdk'

const client = new NChatClient({
  apiUrl: 'https://api.nchat.example.com',
  apiKey: 'your-api-key',
})

const { user, token } = await client.auth.signIn({
  email: 'user@example.com',
  password: 'password123',
})

client.setToken(token)

const message = await client.messages.send({
  channelId: 'channel-123',
  content: 'Hello, world!',
})
```

**Documentation**: [docs/guides/development/sdk-usage.md](sdk-usage.md)

### 2. CLI Tool (`@nchat/cli`)

Command-line interface for development, deployment, and management.

**Location**: `/src/cli/`

**Features**:

- ✅ Development server management
- ✅ Backend service orchestration
- ✅ Database migrations and seeding
- ✅ User and channel management
- ✅ Deployment automation
- ✅ Backup and restore

**Quick Example**:

```bash
# Development
nchat-cli dev start
nchat-cli dev backend

# Database
nchat-cli db migrate
nchat-cli db seed --users 100 --channels 20

# User management
nchat-cli user create --email admin@example.com --role admin
nchat-cli user list

# Deployment
nchat-cli deploy vercel --prod
nchat-cli deploy docker --tag latest --push
```

**Documentation**: [docs/guides/development/cli-usage.md](cli-usage.md)

### 3. API Documentation

Comprehensive API reference with interactive examples.

**Location**: `/docs/api/`

**Included**:

- ✅ REST API reference
- ✅ GraphQL schema documentation
- ✅ Authentication guide
- ✅ Code examples (TypeScript, Python, cURL, Go)
- ✅ Rate limiting information
- ✅ Error handling guide

**API Endpoints**:

- **REST**: `https://api.nchat.example.com/api`
- **GraphQL**: `https://api.nchat.example.com/graphql`
- **WebSocket**: `wss://api.nchat.example.com/socket.io`

**Documentation**: [docs/api/README.md](README.md)

### 4. API Playground

Interactive API exploration and testing.

**REST API Explorer** (Swagger UI):

- URL: http://localhost:3000/api-docs
- Interactive REST API documentation
- Try API calls directly in browser
- Authentication support
- Code snippet generation

**GraphQL Playground** (GraphiQL):

- URL: http://localhost:3000/graphql-playground
- Interactive GraphQL query builder
- Schema exploration
- Query, mutation, and subscription examples
- Real-time testing

## 📚 Documentation Structure

```
nself-chat/
├── src/
│   ├── sdk/                          # TypeScript SDK
│   │   ├── index.ts                  # Main entry point
│   │   ├── client.ts                 # SDK client
│   │   ├── errors.ts                 # Error classes
│   │   ├── types/                    # Type definitions
│   │   ├── resources/                # API resources
│   │   │   ├── messages.ts
│   │   │   ├── channels.ts
│   │   │   ├── users.ts
│   │   │   ├── auth.ts
│   │   │   ├── webhooks.ts
│   │   │   ├── bots.ts
│   │   │   └── admin.ts
│   │   ├── examples/                 # Usage examples
│   │   └── README.md
│   │
│   └── cli/                          # CLI Tool
│       ├── index.ts                  # CLI entry point
│       ├── commands/                 # Command implementations
│       │   ├── dev.ts                # Development commands
│       │   ├── db.ts                 # Database commands
│       │   ├── user.ts               # User management
│       │   ├── channel.ts            # Channel management
│       │   ├── deploy.ts             # Deployment commands
│       │   ├── config.ts             # Config management
│       │   └── backup.ts             # Backup/restore
│       └── README.md
│
└── docs/
    ├── api/                          # API Documentation
    │   ├── README.md                 # API overview
    │   ├── authentication.md         # Auth guide
    │   ├── graphql-schema.md         # GraphQL schema
    │   ├── users.md                  # Users API
    │   ├── channels.md               # Channels API
    │   ├── messages.md               # Messages API
    │   └── ...
    │
    └── guides/
        └── development/              # Developer Guides
            ├── README.md             # Development overview
            ├── sdk-usage.md          # SDK guide
            └── cli-usage.md          # CLI guide
```

## 🎯 Common Use Cases

### Use Case 1: Building a Custom Bot

```typescript
import { NChatClient } from '@nchat/sdk'

const client = new NChatClient({
  apiUrl: 'https://api.nchat.example.com',
  apiKey: process.env.NCHAT_API_KEY,
})

// Create bot
const bot = await client.bots.create({
  name: 'Welcome Bot',
  username: 'welcomebot',
  description: 'Welcomes new members',
})

// Send welcome message
await client.bots.sendMessage(bot.id, {
  channelId: 'general',
  content: 'Welcome to the team! 👋',
})
```

### Use Case 2: Data Export Script

```bash
#!/bin/bash
# export-data.sh

# Create backup
nchat-cli backup create --include-media

# Export user data
nchat-cli admin export --format json --output ./export/

# Upload to S3
aws s3 cp ./export/ s3://backups/nchat/ --recursive
```

### Use Case 3: Automated Moderation

```typescript
import { NChatClient } from '@nchat/sdk'

const client = new NChatClient({ ... })

// Subscribe to new messages
const subscription = client.getApolloClient().subscribe({
  query: NEW_MESSAGE_SUBSCRIPTION,
  variables: { channelId: 'general' }
})

subscription.subscribe({
  next: async ({ data }) => {
    const message = data.nchat_messages[0]

    // Check for spam/inappropriate content
    if (containsSpam(message.content)) {
      // Delete message
      await client.messages.delete(message.id)

      // Warn user
      await client.users.warn(message.userId, 'Spam detected')
    }
  }
})
```

### Use Case 4: Custom Integration

```typescript
// Slack to nChat bridge
import { NChatClient } from '@nchat/sdk'
import { App } from '@slack/bolt'

const nchat = new NChatClient({ ... })
const slack = new App({ ... })

// Forward Slack messages to nChat
slack.message(async ({ message }) => {
  await nchat.messages.send({
    channelId: process.env.NCHAT_CHANNEL_ID,
    content: `[Slack] ${message.user}: ${message.text}`
  })
})

// Forward nChat messages to Slack
// (via webhook or subscription)
```

## 🔧 Development Setup

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker (for backend services)

### Installation

```bash
# Clone repository
git clone https://github.com/nself-chat/nself-chat.git
cd nself-chat

# Install dependencies
pnpm install

# Install CLI globally
pnpm install -g @nchat/cli

# Start backend services
nchat-cli dev backend

# Run migrations
nchat-cli db migrate

# Seed sample data
nchat-cli db seed --users 50 --channels 10 --messages 100

# Start development server
nchat-cli dev start
```

### Environment Variables

Create `.env.local`:

```bash
# Backend URLs
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/v1/graphql
NEXT_PUBLIC_AUTH_URL=http://localhost:4000/v1/auth
NEXT_PUBLIC_STORAGE_URL=http://localhost:9000/v1/storage

# Dev Mode
NEXT_PUBLIC_USE_DEV_AUTH=true
NEXT_PUBLIC_ENV=development

# API Keys
NCHAT_API_KEY=your-api-key
```

## 📖 API Reference

### REST API

Base URL: `https://api.nchat.example.com/api`

**Authentication Endpoints**:

- `POST /api/auth/signup` - Sign up new user
- `POST /api/auth/signin` - Sign in existing user
- `POST /api/auth/signout` - Sign out
- `POST /api/auth/refresh` - Refresh access token

**Channel Endpoints**:

- `GET /api/channels` - List channels
- `POST /api/channels` - Create channel
- `GET /api/channels/{id}` - Get channel
- `PATCH /api/channels/{id}` - Update channel
- `DELETE /api/channels/{id}` - Delete channel

**Message Endpoints**:

- `GET /api/channels/{id}/messages` - List messages
- `POST /api/messages` - Send message
- `PATCH /api/messages/{id}` - Update message
- `DELETE /api/messages/{id}` - Delete message

[Full REST API Reference →](README.md)

### GraphQL API

Endpoint: `https://api.nchat.example.com/graphql`

**Example Query**:

```graphql
query GetChannels {
  nchat_channels(limit: 10) {
    id
    name
    description
    member_count
  }
}
```

**Example Mutation**:

```graphql
mutation SendMessage($channelId: uuid!, $content: String!) {
  insert_nchat_messages_one(object: { channel_id: $channelId, content: $content }) {
    id
    content
    created_at
  }
}
```

**Example Subscription**:

```graphql
subscription OnNewMessage($channelId: uuid!) {
  nchat_messages(
    where: { channel_id: { _eq: $channelId } }
    limit: 1
    order_by: { created_at: desc }
  ) {
    id
    content
    user {
      display_name
    }
  }
}
```

[Full GraphQL Schema Reference →](../../api/graphql-schema.md)

## 🎨 SDK Examples

### Authentication

```typescript
// Sign up
const { user, token } = await client.auth.signUp({
  email: 'user@example.com',
  password: 'SecurePass123!',
  displayName: 'John Doe',
})

// Sign in
const { user, token } = await client.auth.signIn({
  email: 'user@example.com',
  password: 'password123',
})

// Enable 2FA
const { secret, qrCode } = await client.auth.enable2FA()
const { backupCodes } = await client.auth.verify2FA('123456')
```

### Channels

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

### Messages

```typescript
// Send message
const message = await client.messages.send({
  channelId: 'channel-123',
  content: 'Hello, world!',
})

// Add reaction
await client.messages.react(message.id, '👍')

// Reply in thread
await client.messages.send({
  channelId: 'channel-123',
  content: 'Reply',
  parentId: message.id,
})
```

### Webhooks

```typescript
// Create webhook
const webhook = await client.webhooks.create({
  name: 'My Webhook',
  url: 'https://example.com/webhook',
  events: ['message.created', 'channel.created'],
})

// Test webhook
const { success } = await client.webhooks.test(webhook.id)
```

[More SDK Examples →](./src/sdk/examples/)

## 🚀 CLI Examples

### Development

```bash
# Start everything
nchat-cli dev backend --detach
nchat-cli dev start

# Run tests
nchat-cli dev test --watch
nchat-cli dev test --coverage

# Build for production
nchat-cli dev build --analyze
```

### Database

```bash
# Migrations
nchat-cli db migrate
nchat-cli db migrate --down

# Seeding
nchat-cli db seed --users 100 --channels 20 --messages 200

# Backup/Restore
nchat-cli db backup
nchat-cli db restore ./backup.sql
```

### User Management

```bash
# Create user
nchat-cli user create \
  --email admin@example.com \
  --name "Admin User" \
  --role admin

# List users
nchat-cli user list --role admin

# Suspend user
nchat-cli user suspend user-123 --reason "Violation"
```

### Deployment

```bash
# Deploy to Vercel
nchat-cli deploy vercel --prod

# Deploy with Docker
nchat-cli deploy docker --tag v1.0.0 --push

# Deploy to Kubernetes
nchat-cli deploy k8s --namespace production
```

[More CLI Examples →](cli-usage.md)

## 🔐 Authentication

All API requests require authentication via:

1. **API Key** (Server-to-Server):

```bash
curl https://api.nchat.example.com/api/channels \
  -H "X-API-Key: your-api-key"
```

2. **JWT Token** (User Authentication):

```bash
curl https://api.nchat.example.com/api/channels \
  -H "Authorization: Bearer your-jwt-token"
```

[Authentication Guide →](../../api/authentication.md)

## 📊 Rate Limits

- **Authenticated requests**: 1000/minute
- **Unauthenticated requests**: 60/minute
- **Webhook deliveries**: 100/minute per webhook

## 🤝 Support

- **Documentation**: https://docs.nchat.example.com
- **Discord**: https://discord.gg/nchat
- **GitHub Issues**: https://github.com/nself-chat/nself-chat/issues
- **Email**: support@nchat.example.com

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

---

Made with ❤️ by the nChat Team
