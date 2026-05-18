# @nself-chat/ui — Architecture

## Overview

`@nself-chat/ui` is a standalone React component library extracted from the nchat `frontend/src/` directory. It is compiled by tsup into a set of domain-scoped entry points (ESM + CJS) that non-Next.js consumers can import without pulling in the full Next.js app.

## Design principles

### 1. No framework coupling

Components must not import from `next/navigation`, `next/router`, `next/link`, or any other framework-specific module. This allows the same components to be used in Tauri, Electron, Capacitor, and React Native shells.

### 2. Injectable adapters

Platform-specific behavior (routing, storage) is injected via React context rather than called directly.

- **`RouterAdapter`** — provides `push`, `replace`, `back`, `query`, and `pathname`. Consumers wire up the adapter at the tree root using `RouterAdapterContext.Provider`. Components call `useRouter()` which reads from this context.

New adapters follow the same pattern: define an interface, create a context, export a `useX()` hook that throws if the context is null, export a no-op adapter for testing.

### 3. Domain-scoped entry points

Source is split into 9 domain folders, each with its own `index.ts` that becomes a separate build output:

```
packages/ui/src/
  index.ts          → @nself-chat/ui        (core: Button, Avatar, MessageBubble, ChannelListItem, cn)
  primitives/       → @nself-chat/ui/primitives  (Badge, Spinner, Skeleton, EmptyState, ConfirmDialog, Kbd)
  adapters/         → @nself-chat/ui/adapters    (RouterAdapter, RouterAdapterContext, useRouter)
  auth/             → @nself-chat/ui/auth         (onboarding, guards, pin lock, 2FA, tour)
  chat/             → @nself-chat/ui/chat         (chat layout, message bubble, composer, channel list)
  layout/           → @nself-chat/ui/layout       (ChatLayout, Sidebar, ChannelHeader, ChannelCategory)
  calls/            → @nself-chat/ui/calls        (CallInterface, VoiceRecorder, DeviceSelector)
  search/           → @nself-chat/ui/search       (SearchModal, QuickSwitcher, SearchResults)
  settings/         → @nself-chat/ui/settings     (profile, notifications, theme, privacy, i18n panels)
  files/            → @nself-chat/ui/files        (FileAttachment, FileIcon, UploadZone)
  admin/            → @nself-chat/ui/admin        (ModerationQueue, AuditLog, AnalyticsDashboard)
```

This structure means consumers only pay for the modules they import — tree-shaking works per entry point.

### 4. Tailwind as peer dependency

Tailwind CSS is a peer dependency. This package ships source class names but no compiled stylesheet. The consuming app runs Tailwind's JIT compiler across its own source AND this package's dist output. The shared `tailwind.preset.cjs` carries the color theme, spacing overrides, and plugin configuration so all consumers share the same design system without forking the config.

### 5. CVA for variants

All components with visual variants use `class-variance-authority` (CVA) for type-safe variant APIs. Base classes are always applied; variant slots override them. The `cn()` utility (clsx + tailwind-merge) resolves conflicts in callers.

## Build pipeline

```
src/*.{ts,tsx}  →  tsup  →  dist/
                              ├── index.js        (CJS)
                              ├── index.mjs       (ESM)
                              ├── index.d.ts      (types)
                              ├── auth/index.{js,mjs,d.ts}
                              └── ... (one set per entry point)
```

tsup processes all entry points in a single pass. Source maps are emitted. Declaration maps are emitted for IDE go-to-definition across workspace boundaries.

## Testing

Tests live co-located next to source files (`foo.tsx` + `foo.test.tsx`) using Vitest + jsdom + Testing Library. Coverage is tracked against the 9 highest-value source files (pure utils, adapter logic, primitives, atomic components) using the v8 provider. Coverage thresholds are set at 70% lines/functions/branches/statements on those files only — not across all 111 source files, which avoids the untested-file dilution problem.

**Known jsdom quirks:**

- `svgElement.className` returns `SVGAnimatedString`, not a plain string. Use `element.getAttribute('class')` in tests that check SVG class lists.
- `img` elements with `alt=""` have ARIA role `presentation` and are excluded from accessible queries. Use `container.querySelector('img')` to select them directly.

## Storybook

Stories live at `src/**/*.stories.{ts,tsx}`. Storybook uses the `react-vite` builder (same Vite config as Vitest) with addons: essentials, interactions, a11y. The preview applies the nSelf dark theme (gray-950 background) to all stories. `autodocs` is enabled — any component tagged with `'autodocs'` in its meta gets a generated docs page.

## Dependency rules

- **Runtime dependencies:** Radix UI primitives, CVA, clsx, tailwind-merge, lucide-react. All versioned with caret ranges.
- **Peer dependencies:** React 19, react-dom 19, tailwindcss 3.4. The consuming app provides these; they must NOT be bundled.
- **Dev dependencies:** Storybook, Vitest, Testing Library, tsup, TypeScript.
- **No direct Zustand, Apollo, or Socket.io imports.** State dependencies are injected via props or context adapters.
