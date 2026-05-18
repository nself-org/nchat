# @nself-chat/ui

Shared React component library for the nself-chat monorepo. Contains real, production-ready implementations of all UI components ported from `frontend/src/`, organized into domain-scoped entry points.

## Installation

This package is consumed from within the monorepo via workspace references:

```json
{
  "dependencies": {
    "@nself-chat/ui": "workspace:*"
  }
}
```

## Entry Points

| Import path | Contents |
|---|---|
| `@nself-chat/ui` | Core: `Button`, `Avatar`, `MessageBubble`, `ChannelListItem`, `cn` |
| `@nself-chat/ui/primitives` | `Badge`, `UnreadBadge`, `Spinner`, `Skeleton`, `EmptyState`, `ConfirmDialog`, `Kbd` |
| `@nself-chat/ui/adapters` | `RouterAdapterContext`, `useRouter`, `noopRouterAdapter`, `RouterAdapter` |
| `@nself-chat/ui/auth` | Onboarding wizard, auth guards, pin lock, 2FA, encryption badge, tour components |
| `@nself-chat/ui/chat` | Chat layout, sidebar, channel list, message bubble, composer |
| `@nself-chat/ui/layout` | `ChatLayout`, `Sidebar`, `ChannelHeader`, `ChannelCategory` |
| `@nself-chat/ui/calls` | `CallInterface`, `DeviceSelector`, `VoiceRecorder`, `WaveformVisualizer` |
| `@nself-chat/ui/search` | `SearchModal`, `SearchInput`, `SearchResults`, `QuickSwitcher` |
| `@nself-chat/ui/settings` | Profile, notification, theme, privacy, i18n settings panels |
| `@nself-chat/ui/files` | `FileAttachment`, `FileIcon`, `UploadZone`, `ForwardMessage` |
| `@nself-chat/ui/admin` | `ModerationQueue`, `AuditLog`, `AnalyticsDashboard`, `CompliancePanel` |

## Setup

### 1. Tailwind config

This package does not include a `tailwind.config.*`. The consuming app must include this package's `src/` in its Tailwind content glob and extend with the shared preset:

```js
// tailwind.config.js
const uiPreset = require('@nself-chat/ui/tailwind.preset.cjs')

module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@nself-chat/ui/dist/**/*.{js,mjs}',
  ],
  presets: [uiPreset],
}
```

### 2. Router adapter

Components that navigate (guards, onboarding steps, auth flows) require a `RouterAdapter` at the tree root. Without it they throw at runtime.

```tsx
import { RouterAdapterContext } from '@nself-chat/ui/adapters'

// Next.js App Router example
const nextjsAdapter = {
  push: (path) => router.push(path),
  replace: (path) => router.replace(path),
  back: () => router.back(),
  get query() { return Object.fromEntries(searchParams.entries()) },
  pathname: pathname,
}

export function Providers({ children }) {
  return (
    <RouterAdapterContext.Provider value={nextjsAdapter}>
      {children}
    </RouterAdapterContext.Provider>
  )
}
```

For components that don't navigate, use the provided no-op:

```tsx
import { noopRouterAdapter, RouterAdapterContext } from '@nself-chat/ui/adapters'

<RouterAdapterContext.Provider value={noopRouterAdapter}>
  <YourComponent />
</RouterAdapterContext.Provider>
```

## Storybook

```bash
pnpm storybook        # dev server on port 6006
pnpm build-storybook  # static build to storybook-static/
```

## Testing

```bash
pnpm test             # run tests once
pnpm test:watch       # watch mode
pnpm test:coverage    # coverage report (≥70% thresholds)
```

## Build

```bash
pnpm build        # compile to dist/ via tsup
pnpm build:watch  # watch mode
```

## Utilities

- `cn(...inputs)` — Tailwind class merger (`clsx` + `tailwind-merge`). Always use this instead of string concatenation when composing class names.
- `debounce(fn, ms)` — standard trailing-edge debounce. Useful for search inputs.
