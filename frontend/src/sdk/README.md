# nChat SDK

Official TypeScript/JavaScript SDK for nChat - the white-label team communication platform.

## Installation

```bash
npm install @nchat/sdk
# or
yarn add @nchat/sdk
# or
pnpm add @nchat/sdk
```

## Quick Start

```typescript
import { NChatClient } from "@nchat/sdk";

// Initialize the client
const client = new NChatClient({
  apiUrl: "https://api.nchat.example.com",
  apiKey: "your-api-key",
});

// Authenticate
const { user, token } = await client.auth.signIn({
  email: "user@example.com",
  password: "password123",
});

// Update client with user token
client.setToken(token);

// Send a message
const message = await client.messages.send({
  channelId: "channel-123",
  content: "Hello, world!",
});
```

## Features

- ✅ **Type-Safe** - Full TypeScript support with comprehensive type definitions
- ✅ **GraphQL & REST** - Supports both GraphQL and REST APIs
- ✅ **Authentication** - Built-in auth handling with token management
- ✅ **Error Handling** - Custom error classes for different failure scenarios
- ✅ **Pagination** - Easy pagination support for list operations
- ✅ **Retry Logic** - Automatic retry with configurable options
- ✅ **Debug Mode** - Optional request/response logging

## Configuration

### Basic Configuration

```typescript
const client = new NChatClient({
  apiUrl: "https://api.nchat.example.com",
  apiKey: "your-api-key",
});
```

### Advanced Configuration

```typescript
const client = new NChatClient({
  apiUrl: "https://api.nchat.example.com",
  graphqlUrl: "https://api.nchat.example.com/graphql", // Optional
  apiKey: "your-api-key",
  token: "user-jwt-token", // Optional
  debug: true, // Enable debug logging
  timeout: 30000, // Request timeout (ms)
  headers: {
    "X-Custom-Header": "value",
  },
  retry: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
  },
});
```

## API Resources

The SDK is organized into resource classes:

- **auth** - Authentication and authorization
- **messages** - Message operations
- **channels** - Channel management
- **users** - User operations
- **webhooks** - Webhook configuration
- **bots** - Bot management
- **admin** - Administrative operations

## Usage Examples

### Authentication

```typescript
// Sign in
const { user, token } = await client.auth.signIn({
  email: "user@example.com",
  password: "password123",
});

client.setToken(token);

// Sign up
const { user, token } = await client.auth.signUp({
  email: "newuser@example.com",
  password: "password123",
  displayName: "New User",
});

// Sign out
await client.auth.signOut();
```

### Channels

```typescript
// Create a channel
const channel = await client.channels.create({
  name: "general",
  description: "General discussion",
  type: "public",
});

// List channels
const { data: channels } = await client.channels.list({
  limit: 50,
});

// Join a channel
await client.channels.join(channel.id);

// Get members
const { data: members } = await client.channels.getMembers(channel.id);
```

### Messages

```typescript
// Send a message
const message = await client.messages.send({
  channelId: "channel-123",
  content: "Hello, world!",
});

// Send with mentions
await client.messages.send({
  channelId: "channel-123",
  content: "Hey @john!",
  mentions: ["user-456"],
});

// List messages
const { data: messages } = await client.messages.list("channel-123", {
  limit: 50,
  orderBy: "created_at",
  orderDirection: "desc",
});

// React to message
await client.messages.react(message.id, "👍");

// Update message
await client.messages.update(message.id, {
  content: "Updated content",
});
```

### Users

```typescript
// Get current user
const user = await client.users.me();

// Search users
const { data: users } = await client.users.search("john");

// Update profile
await client.users.update({
  displayName: "John Doe",
  avatarUrl: "https://example.com/avatar.jpg",
});

// Update presence
await client.users.updatePresence("online");
```

### Webhooks

```typescript
// Create webhook
const webhook = await client.webhooks.create({
  name: "My Webhook",
  url: "https://example.com/webhook",
  events: ["message.created", "channel.created"],
});

// Test webhook
const { success } = await client.webhooks.test(webhook.id);

// Regenerate secret
const { secret } = await client.webhooks.regenerateSecret(webhook.id);
```

### Bots

```typescript
// Create bot
const bot = await client.bots.create({
  name: "Helper Bot",
  username: "helperbot",
  description: "A helpful bot",
});

// Send message as bot
await client.bots.sendMessage(bot.id, {
  channelId: "channel-123",
  content: "Hello from bot!",
});
```

### Admin Operations

```typescript
// Get stats (requires admin role)
const stats = await client.admin.getStats();

// Update user role
await client.admin.updateUserRole("user-123", {
  role: "moderator",
});

// Suspend user
await client.admin.suspendUser("user-456", "Violated ToS");

// Export data
const { downloadUrl } = await client.admin.exportData("json");
```

## Error Handling

```typescript
import {
  NChatError,
  AuthenticationError,
  ValidationError,
  RateLimitError
} from '@nchat/sdk'

try {
  await client.messages.send({ ... })
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Not authenticated')
  } else if (error instanceof ValidationError) {
    console.error('Validation errors:', error.errors)
  } else if (error instanceof RateLimitError) {
    console.error('Rate limited. Retry after:', error.retryAfter)
  } else if (error instanceof NChatError) {
    console.error('API error:', error.message, error.statusCode)
  }
}
```

## Pagination

```typescript
// First page
const { data, pagination } = await client.messages.list("channel-123", {
  limit: 50,
});

// Next page
if (pagination.hasMore) {
  const { data: nextPage } = await client.messages.list("channel-123", {
    limit: 50,
    offset: pagination.offset + pagination.limit,
  });
}

// Or use cursor-based pagination
if (pagination.nextCursor) {
  const { data: nextPage } = await client.messages.list("channel-123", {
    limit: 50,
    cursor: pagination.nextCursor,
  });
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  User,
  Channel,
  Message,
  Webhook,
  Bot,
  PaginatedResult
} from '@nchat/sdk'

// Types are automatically inferred
const message: Message = await client.messages.send({ ... })
const channels: PaginatedResult<Channel> = await client.channels.list()
```

## Examples

See the [examples directory](./examples) for more comprehensive examples:

- [Basic Usage](./examples/basic-usage.ts)
- Advanced patterns
- Real-time subscriptions
- Webhook handling

## Documentation

For complete API documentation, see:

- [SDK Usage Guide](../../docs/guides/development/sdk-usage.md)
- [API Reference](../../docs/api/README.md)
- [GraphQL Schema](../../docs/api/graphql-schema.md)

## Support

- Documentation: https://docs.nchat.example.com
- Issues: https://github.com/nself-chat/nself-chat/issues
- Discord: https://discord.gg/nchat

## License

MIT License - see [LICENSE](../../LICENSE) for details
