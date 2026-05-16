# @nself-chat/core

Zero-dependency shared types and pure utility functions for the ɳChat monorepo.

This package is framework-agnostic — no React, no Electron, no Capacitor deps.

## Exports

### Types

- `Message` — chat message shape
- `Channel` — channel shape
- `User` — user shape
- `Workspace` — workspace shape

> Authoritative copies live in `frontend/src/types/`. These stubs are synced in S05.

### Utils

- `formatTimestamp(date: Date): string` — human-readable time string
- `slugify(text: string): string` — URL-safe slug from arbitrary text
- `assertUnreachable(x: never): never` — compile-time exhaustiveness helper

## Build

```bash
pnpm --filter @nself-chat/core build
pnpm --filter @nself-chat/core type-check
```
