# @nself-chat/ui — Migration Guide

Guide for migrating from direct `frontend/src/components/` imports to the shared `@nself-chat/ui` package.

## Why migrate

`@nself-chat/ui` extracts UI components into a standalone package so non-Next.js consumers (Capacitor, Tauri, Electron, React Native) can share the same components without importing the entire Next.js app. It also decouples components from Next.js-specific APIs (router, navigation) via injectable adapters.

## Step 1: Add the dependency

In any workspace package that needs UI components:

```bash
pnpm add @nself-chat/ui@workspace:*
```

Or add to `package.json` manually:

```json
{
  "dependencies": {
    "@nself-chat/ui": "workspace:*"
  }
}
```

## Step 2: Update import paths

Replace `@/components/...` paths with the appropriate entry point:

| Before | After |
|---|---|
| `import { Button } from '@/components/Button'` | `import { Button } from '@nself-chat/ui'` |
| `import { Avatar } from '@/components/Avatar'` | `import { Avatar } from '@nself-chat/ui'` |
| `import { Badge } from '@/components/ui/Badge'` | `import { Badge } from '@nself-chat/ui/primitives'` |
| `import { Spinner } from '@/components/ui/Spinner'` | `import { Spinner } from '@nself-chat/ui/primitives'` |
| `import { cn } from '@/lib/utils'` | `import { cn } from '@nself-chat/ui'` |
| `import { SearchModal } from '@/components/search/...'` | `import { SearchModal } from '@nself-chat/ui/search'` |
| `import { ChatLayout } from '@/components/layout/...'` | `import { ChatLayout } from '@nself-chat/ui/layout'` |
| `import { CallInterface } from '@/components/calls/...'` | `import { CallInterface } from '@nself-chat/ui/calls'` |
| `import { ... } from '@/components/auth/...'` | `import { ... } from '@nself-chat/ui/auth'` |
| `import { ... } from '@/components/settings/...'` | `import { ... } from '@nself-chat/ui/settings'` |
| `import { ... } from '@/components/files/...'` | `import { ... } from '@nself-chat/ui/files'` |
| `import { ... } from '@/components/admin/...'` | `import { ... } from '@nself-chat/ui/admin'` |

## Step 3: Wire up the router adapter

Any component that calls `useRouter()` internally (guards, onboarding, auth flows) requires a `RouterAdapterContext` at the tree root. Without it, a runtime error is thrown.

```tsx
// app/layout.tsx (Next.js 15 App Router)
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { RouterAdapterContext, type RouterAdapter } from '@nself-chat/ui/adapters'

export function UIProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const adapter: RouterAdapter = {
    push: (path) => router.push(path),
    replace: (path) => router.replace(path),
    back: () => router.back(),
    get query() {
      const q: Record<string, string | string[]> = {}
      searchParams.forEach((val, key) => { q[key] = val })
      return q
    },
    pathname,
  }

  return (
    <RouterAdapterContext.Provider value={adapter}>
      {children}
    </RouterAdapterContext.Provider>
  )
}
```

For Tauri or Electron apps (no browser router), implement the adapter against your in-app navigation state.

## Step 4: Update Tailwind config

The shared package ships component source with Tailwind class names. The consumer's Tailwind config must scan the compiled output:

```js
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
    // Add this line:
    './node_modules/@nself-chat/ui/dist/**/*.{js,mjs}',
  ],
}
```

Alternatively, use the shared preset:

```js
const uiPreset = require('@nself-chat/ui/tailwind.preset.cjs')
module.exports = { presets: [uiPreset], content: [...] }
```

## Step 5: Remove now-duplicated source files

Once imports are updated and tests pass, delete the corresponding source files from `frontend/src/components/` that have been fully replaced by `@nself-chat/ui`. Keep any files that have not yet been ported.

## Breaking changes from direct imports

- `useRouter()` no longer returns the Next.js router directly. It returns the `RouterAdapter` from context. Calls like `router.push('/path')` still work; Next.js-specific APIs (`router.prefetch`, `router.events`) are not on the adapter — refactor any code that uses them.
- Component prop APIs are the same. No prop changes were made during the port.
