# ɳSelf Plugins System

**Version**: 0.9.1
**Status**: Production Ready
**Type**: Modular Plugin Architecture

---

## Overview

The **ɳSelf Plugins System** provides a modular, extensible architecture for adding functionality to ɳChat without modifying core code. Plugins are self-contained modules that can be installed, configured, and removed independently.

---

## Available Plugins

### Core Plugins (Built-in)

| Plugin                          | Description                                     | Status    | Documentation                                     |
| ------------------------------- | ----------------------------------------------- | --------- | ------------------------------------------------- |
| **@nself/plugin-realtime**      | WebSocket-based realtime messaging and presence | ✅ Stable | [Realtime Plugin](../Plugins.md)           |
| **@nself/plugin-jobs**          | Background job processing with BullMQ           | ✅ Stable | [Jobs Plugin](../Plugins.md)                   |
| **@nself/plugin-search**        | Full-text search with MeiliSearch               | ✅ Stable | [Search Plugin](../Plugins.md)               |
| **@nself/plugin-storage**       | File storage with MinIO/S3                      | ✅ Stable | [Storage Plugin](../Plugins.md)             |
| **@nself/plugin-analytics**     | Event tracking and analytics                    | ✅ Stable | [Analytics Plugin](../Plugins.md)         |
| **@nself/plugin-notifications** | Push notifications and email                    | ✅ Stable | [Notifications Plugin](../Plugins.md) |

### Community Plugins

| Plugin                          | Description                                    | Status    | Maintainer |
| ------------------------------- | ---------------------------------------------- | --------- | ---------- |
| **@nself/plugin-ai-moderation** | AI-powered content moderation                  | 🚧 Beta   | ɳSelf Team |
| **@nself/plugin-translations**  | Automatic message translation                  | 🚧 Beta   | ɳSelf Team |
| **@nself/plugin-webhooks**      | Incoming/outgoing webhooks                     | ✅ Stable | ɳSelf Team |
| **@nself/plugin-integrations**  | Third-party integrations (Slack, GitHub, etc.) | 🚧 Beta   | ɳSelf Team |
| **@nself/plugin-e2ee**          | End-to-end encryption with Signal Protocol     | ✅ Stable | ɳSelf Team |

---

## Installation

### Install a Plugin

```bash
# Using pnpm (recommended)
pnpm add @nself/plugin-realtime

# Using npm
npm install @nself/plugin-realtime

# Using yarn
yarn add @nself/plugin-realtime
```

### Register the Plugin

Add the plugin to your `src/config/plugins.ts`:

```typescript
import { PluginRegistry } from '@/lib/plugins'
import { RealtimePlugin } from '@nself/plugin-realtime'

// Register plugin
PluginRegistry.register(
  new RealtimePlugin({
    // Plugin configuration
    websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
    autoConnect: true,
    reconnectAttempts: 5,
  })
)
```

### Initialize on App Start

The plugin registry automatically initializes all registered plugins when the app starts.

---

## Plugin Development

### Creating a Plugin

All plugins must implement the `Plugin` interface:

```typescript
import { Plugin, PluginContext } from '@nself/plugin-core'

export class MyCustomPlugin implements Plugin {
  // Required properties
  name = 'my-custom-plugin'
  version = '1.0.0'
  description = 'My custom plugin description'

  // Optional properties
  dependencies = ['@nself/plugin-realtime'] // Other plugins this depends on

  // Lifecycle hooks
  async onInstall(context: PluginContext) {
    // Called when plugin is first installed
    console.log('Plugin installed')
  }

  async onEnable(context: PluginContext) {
    // Called when plugin is enabled
    console.log('Plugin enabled')
  }

  async onDisable(context: PluginContext) {
    // Called when plugin is disabled
    console.log('Plugin disabled')
  }

  async onUninstall(context: PluginContext) {
    // Called when plugin is uninstalled
    console.log('Plugin uninstalled')
  }

  // Plugin functionality
  async execute(action: string, payload: any) {
    // Handle plugin-specific actions
    switch (action) {
      case 'doSomething':
        return this.doSomething(payload)
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  private async doSomething(payload: any) {
    // Plugin logic here
    return { success: true, data: payload }
  }
}
```

### Plugin Context

The `PluginContext` provides access to the ɳChat application:

```typescript
interface PluginContext {
  // GraphQL client
  graphql: ApolloClient

  // Authentication
  auth: {
    getCurrentUser: () => Promise<User | null>
    isAuthenticated: () => boolean
  }

  // Storage
  storage: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
    delete: (key: string) => Promise<void>
  }

  // Events
  events: {
    on: (event: string, handler: Function) => void
    off: (event: string, handler: Function) => void
    emit: (event: string, data: any) => void
  }

  // Logger
  logger: {
    info: (message: string, meta?: any) => void
    warn: (message: string, meta?: any) => void
    error: (message: string, meta?: any) => void
  }
}
```

### Plugin Events

Plugins can listen to and emit application events:

```typescript
export class MyPlugin implements Plugin {
  async onEnable(context: PluginContext) {
    // Listen to events
    context.events.on('message:created', this.handleMessage)
    context.events.on('user:online', this.handleUserOnline)
  }

  async onDisable(context: PluginContext) {
    // Clean up event listeners
    context.events.off('message:created', this.handleMessage)
    context.events.off('user:online', this.handleUserOnline)
  }

  private handleMessage = async (message: Message) => {
    // React to new messages
    console.log('New message:', message)
  }

  private handleUserOnline = async (user: User) => {
    // React to user presence changes
    console.log('User online:', user)
  }
}
```

### Available Events

| Event             | Payload          | Description         |
| ----------------- | ---------------- | ------------------- |
| `message:created` | `Message`        | New message created |
| `message:updated` | `Message`        | Message edited      |
| `message:deleted` | `{ id: string }` | Message deleted     |
| `channel:created` | `Channel`        | New channel created |
| `channel:updated` | `Channel`        | Channel updated     |
| `user:online`     | `User`           | User came online    |
| `user:offline`    | `User`           | User went offline   |
| `call:started`    | `Call`           | Call started        |
| `call:ended`      | `Call`           | Call ended          |

---

## Configuration

### Plugin Configuration File

Create a `plugins.config.ts` file:

```typescript
import { PluginConfig } from '@nself/plugin-core'

export const pluginConfig: PluginConfig = {
  // Automatically install and enable these plugins
  autoload: ['@nself/plugin-realtime', '@nself/plugin-jobs', '@nself/plugin-search'],

  // Plugin-specific configuration
  plugins: {
    '@nself/plugin-realtime': {
      websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
      autoConnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
    },
    '@nself/plugin-jobs': {
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      concurrency: 10,
    },
    '@nself/plugin-search': {
      host: process.env.MEILISEARCH_HOST,
      apiKey: process.env.MEILISEARCH_API_KEY,
      indexPrefix: 'nchat_',
    },
  },
}
```

### Environment Variables

```bash
# Realtime Plugin
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001

# Jobs Plugin
REDIS_HOST=localhost
REDIS_PORT=6379

# Search Plugin
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=masterKey

# Storage Plugin
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

---

## Plugin Registry

### Managing Plugins Programmatically

```typescript
import { PluginRegistry } from '@/lib/plugins'

// List all plugins
const plugins = PluginRegistry.listAll()

// Get a specific plugin
const plugin = PluginRegistry.get('my-plugin')

// Enable a plugin
await PluginRegistry.enable('my-plugin')

// Disable a plugin
await PluginRegistry.disable('my-plugin')

// Uninstall a plugin
await PluginRegistry.uninstall('my-plugin')

// Check plugin status
const isEnabled = PluginRegistry.isEnabled('my-plugin')
```

### Admin UI

Manage plugins through the admin dashboard:

1. Navigate to **Admin > Plugins**
2. View installed plugins
3. Enable/disable plugins with a toggle
4. Configure plugin settings
5. View plugin logs and status

---

## Best Practices

### 1. Dependency Management

Always declare plugin dependencies:

```typescript
export class MyPlugin implements Plugin {
  dependencies = ['@nself/plugin-realtime', '@nself/plugin-jobs']

  async onEnable(context: PluginContext) {
    // This plugin requires realtime and jobs to be enabled
    // The registry will ensure they are loaded first
  }
}
```

### 2. Error Handling

Handle errors gracefully:

```typescript
export class MyPlugin implements Plugin {
  async execute(action: string, payload: any) {
    try {
      // Plugin logic
      return { success: true }
    } catch (error) {
      context.logger.error('Plugin error', { error, action, payload })
      return { success: false, error: error.message }
    }
  }
}
```

### 3. Resource Cleanup

Clean up resources in `onDisable`:

```typescript
export class MyPlugin implements Plugin {
  private interval: NodeJS.Timeout | null = null

  async onEnable(context: PluginContext) {
    // Set up periodic task
    this.interval = setInterval(() => {
      // Do something periodically
    }, 60000)
  }

  async onDisable(context: PluginContext) {
    // Clean up
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}
```

### 4. Configuration Validation

Validate configuration on enable:

```typescript
import { z } from 'zod'

const ConfigSchema = z.object({
  apiKey: z.string(),
  endpoint: z.string().url(),
  timeout: z.number().positive().optional(),
})

export class MyPlugin implements Plugin {
  private config: z.infer<typeof ConfigSchema>

  constructor(config: unknown) {
    // Validate config with Zod
    this.config = ConfigSchema.parse(config)
  }
}
```

---

## Testing Plugins

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest'
import { MyPlugin } from './my-plugin'

describe('MyPlugin', () => {
  it('should handle actions correctly', async () => {
    const plugin = new MyPlugin({ apiKey: 'test' })

    const mockContext = {
      graphql: vi.fn(),
      auth: { getCurrentUser: vi.fn(), isAuthenticated: vi.fn() },
      storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }

    await plugin.onEnable(mockContext)

    const result = await plugin.execute('doSomething', { data: 'test' })

    expect(result.success).toBe(true)
  })
})
```

### Integration Tests

```typescript
import { PluginRegistry } from '@/lib/plugins'
import { MyPlugin } from './my-plugin'

describe('MyPlugin Integration', () => {
  it('should integrate with plugin registry', async () => {
    // Register plugin
    PluginRegistry.register(new MyPlugin({ apiKey: 'test' }))

    // Enable plugin
    await PluginRegistry.enable('my-plugin')

    // Verify plugin is enabled
    expect(PluginRegistry.isEnabled('my-plugin')).toBe(true)

    // Disable plugin
    await PluginRegistry.disable('my-plugin')

    // Verify plugin is disabled
    expect(PluginRegistry.isEnabled('my-plugin')).toBe(false)
  })
})
```

---

## Publishing Plugins

### Package Structure

```
my-plugin/
├── src/
│   ├── index.ts          # Main plugin export
│   ├── plugin.ts         # Plugin implementation
│   └── types.ts          # TypeScript types
├── tests/
│   └── plugin.test.ts    # Unit tests
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### package.json

```json
{
  "name": "@nself/plugin-my-plugin",
  "version": "1.0.0",
  "description": "My custom ɳSelf plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "prepublishOnly": "pnpm build && pnpm test"
  },
  "peerDependencies": {
    "@nself/plugin-core": "^0.9.0"
  },
  "keywords": ["nself", "plugin", "chat"],
  "author": "Your Name",
  "license": "MIT"
}
```

### Publishing to npm

```bash
# Build the plugin
pnpm build

# Test the plugin
pnpm test

# Publish to npm
npm publish --access public
```

---

## Troubleshooting

### Plugin Not Loading

**Symptom**: Plugin doesn't appear in the registry

**Solution**:

1. Check that the plugin is properly registered in `plugins.config.ts`
2. Verify the plugin implements the `Plugin` interface
3. Check for errors in the console during app startup

### Plugin Conflicts

**Symptom**: Two plugins interfere with each other

**Solution**:

1. Check plugin dependencies and load order
2. Use namespaced events to avoid conflicts
3. Review plugin documentation for compatibility notes

### Performance Issues

**Symptom**: App becomes slow after installing a plugin

**Solution**:

1. Check plugin's `onEnable` hook for expensive operations
2. Move heavy tasks to background jobs
3. Profile the plugin with browser dev tools
4. Consider lazy-loading the plugin

---

## Examples

See the [Plugin Examples](./examples/) directory for complete plugin implementations:

- [Simple Plugin](../Plugins.md) - Basic plugin structure
- [Event-Driven Plugin](../Plugins.md) - Using events
- [Storage Plugin](../Plugins.md) - File storage integration
- [AI Plugin](../Plugins.md) - AI/ML integration

---

## Resources

- **[Plugin Core API](../Plugins.md)** - Complete API reference
- **[Plugin Registry](../Plugins.md)** - Registry API documentation
- **[Plugin Context](../Plugins.md)** - Context API reference
- **[Plugin Events](../Plugins.md)** - Available events
- **[Plugin Examples](./examples/)** - Example implementations

---

## Support

- **Issues**: [GitHub Issues](https://github.com/nself-org/nchat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nself-org/nchat/discussions)
- **Discord**: [Join our community](https://discord.gg/nself)
- **Email**: plugins@nself.org

---

## License

MIT License - See [LICENSE](../../../LICENSE) for details.

---

**[← Back to Features](../README.md)** | **[View Plugin List →](../Plugins-List.md)**
