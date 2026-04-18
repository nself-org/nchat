# nself-chat v0.2 Planning

This document outlines the roadmap for version 0.2, including internal module refactoring, plugin architecture planning, and features to implement.

---

## v0.1 Status (Current Release)

### Completed

- Full project structure with Next.js 15 + React 19
- 9-step setup wizard UI
- White-label branding system with 10+ theme presets
- AppConfig data model and localStorage persistence
- Authentication system (dev mode with 8 test users)
- Database schema with RBAC (PostgreSQL + Hasura)
- 4 platform templates (Slack, Discord, WhatsApp, Telegram)
- 70+ UI components (Radix UI based)
- Documentation for GitHub Wiki
- CI/CD pipelines (GitHub Actions)
- Docker support
- Platform build configs (Electron, Tauri, Capacitor, React Native)

### Known Issues in v0.1

- TypeScript strict mode warnings (non-blocking)
- ESLint warnings in some files (non-blocking)
- E2E tests skipped (requires backend)
- Vercel deployment not configured
- Some type mismatches in API routes

---

## v0.2 Goals

### 1. Internal Module Architecture

Refactor code into modular, testable units while keeping them internal to nself-chat.

#### Core Modules

```
src/modules/
├── auth/           # Authentication module
│   ├── providers/  # Auth providers (email, Google, GitHub, etc.)
│   ├── hooks/      # useAuth, useSession
│   └── services/   # AuthService interface
├── messaging/      # Core messaging
│   ├── hooks/      # useMessages, useChannels
│   ├── services/   # MessageService
│   └── stores/     # Zustand stores
├── realtime/       # Real-time features
│   ├── socket/     # Socket.io integration
│   ├── presence/   # User presence
│   └── typing/     # Typing indicators
├── files/          # File handling
│   ├── upload/     # Upload service
│   ├── storage/    # Storage adapters
│   └── preview/    # File previews
├── notifications/  # Notification system
│   ├── push/       # Push notifications
│   ├── email/      # Email notifications
│   └── in-app/     # In-app notifications
└── config/         # Configuration module
    ├── app-config/ # AppConfig management
    ├── themes/     # Theme system
    └── branding/   # White-label config
```

### 2. Future nself Plugins

These are candidates for extraction as generic `@nself/plugin-*` packages for use in other nself projects.

#### High Priority (Generic Use)

| Plugin                    | Description                    | Status |
| ------------------------- | ------------------------------ | ------ |
| `@nself/plugin-auth`      | OAuth2/OIDC providers          | Plan   |
| `@nself/plugin-idme`      | ID.me verification             | Plan   |
| `@nself/plugin-storage`   | S3/MinIO/R2 storage            | Plan   |
| `@nself/plugin-realtime`  | Socket.io wrapper              | Plan   |
| `@nself/plugin-search`    | Full-text search (MeiliSearch) | Plan   |
| `@nself/plugin-analytics` | Usage analytics                | Plan   |
| `@nself/plugin-audit`     | Audit logging                  | Plan   |

#### Medium Priority (Chat-Specific but Extractable)

| Plugin                    | Description            | Status |
| ------------------------- | ---------------------- | ------ |
| `@nself/plugin-voice`     | Voice messages         | Plan   |
| `@nself/plugin-video`     | Video calling (WebRTC) | Plan   |
| `@nself/plugin-polls`     | Polls and voting       | Plan   |
| `@nself/plugin-reactions` | Emoji reactions        | Plan   |
| `@nself/plugin-threads`   | Threaded conversations | Plan   |
| `@nself/plugin-bots`      | Bot SDK                | Plan   |

#### Lower Priority (Internal First)

| Plugin                    | Description          | Status |
| ------------------------- | -------------------- | ------ |
| `@nself/plugin-webhooks`  | Webhook management   | Plan   |
| `@nself/plugin-workflows` | Automation workflows | Plan   |
| `@nself/plugin-commands`  | Slash commands       | Plan   |
| `@nself/plugin-stickers`  | Sticker packs        | Plan   |
| `@nself/plugin-gifs`      | GIF picker           | Plan   |

---

## v0.2 Implementation Plan

### Phase 1: Fix TypeScript Issues

- [ ] Fix type mismatches in API routes
- [ ] Add proper types for all props
- [ ] Enable strict mode progressively
- [ ] Fix ESLint errors

### Phase 2: Module Extraction

- [ ] Create `src/modules/` directory structure
- [ ] Extract auth into module
- [ ] Extract messaging into module
- [ ] Extract config into module
- [ ] Update imports across codebase

### Phase 3: Real-time Integration

- [ ] Complete Socket.io integration
- [ ] Add presence indicators
- [ ] Add typing indicators
- [ ] Add real-time message updates

### Phase 4: Production Auth

- [ ] Complete Nhost auth integration
- [ ] Add session management
- [ ] Add refresh token handling
- [ ] Add logout functionality

### Phase 5: File Upload

- [ ] Complete MinIO integration
- [ ] Add file upload UI
- [ ] Add file preview
- [ ] Add image optimization

### Phase 6: Testing

- [ ] Set up E2E test environment
- [ ] Write component tests
- [ ] Write integration tests
- [ ] Add API tests

---

## Plugin API Design (Future)

When extracting plugins, they should follow this interface:

```typescript
interface NselfPlugin {
  name: string
  version: string

  // Lifecycle hooks
  onInit?: (context: PluginContext) => Promise<void>
  onDestroy?: () => Promise<void>

  // UI Components
  components?: Record<string, React.ComponentType>

  // API Routes
  routes?: RouteDefinition[]

  // GraphQL Extensions
  schema?: string
  resolvers?: Record<string, any>

  // Event Handlers
  handlers?: EventHandler[]

  // Configuration Schema
  configSchema?: ZodSchema
}
```

---

## Breaking Changes Planned for v0.2

1. **Module structure** - Imports will change from `@/components/*` to `@/modules/*` for core features
2. **Config format** - AppConfig may be restructured for better organization
3. **Auth interface** - AuthService interface may change for better extensibility

---

## Contributing

See [docs/Contributing.md](Contributing.md) for how to contribute to nself-chat.

---

## Timeline

- **v0.2-alpha**: Module refactoring complete
- **v0.2-beta**: Real-time features working
- **v0.2-rc**: All tests passing
- **v0.2.0**: Production-ready release

---

_Last updated: 2026-01-29_
