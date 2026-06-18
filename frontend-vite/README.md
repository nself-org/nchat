# @nchat/frontend-vite

ɳChat client as a **Vite SPA** (React 19 + React Router 7), migrated from the legacy Next.js
`frontend/`. This is the P3 stack-standardization target per
`~/Sites/nself/.claude/phases/current/p3/migration-plan-nchat-admin.md` (Wave N-1 scaffold).

## Status

Routing skeleton complete: all **107** legacy `frontend/src/app` page groups have a 1:1
react-router `<Route>`. Pages currently render the `@nself/ui` `AsyncScreen` empty state
(placeholders) and are ported one batch at a time in later N-3..N sprints. The legacy
`frontend/` stays in place as the parity reference until migration completes.

## Stack (canonical-patterns.md)

- GraphQL: `@nself/graphql-client` (urql) talking to Hasura directly — no hand-rolled API routes.
- Auth: `@nself/auth-core` cookie web strategy (`createWebAuthStrategy`).
- UI: `@nself/ui` (`AsyncScreen`, `ErrorBoundary`).
- i18n / RTL: `@nself/i18n` + `html[dir]` eager set in `main.tsx`.
- Errors: `@nself/errors` (`Result<T,E>`).

## Commands

```bash
pnpm dev          # vite dev server on :3000
pnpm build        # tsc --noEmit && vite build
pnpm type-check   # tsc --noEmit
```

## Layout

```
src/
  main.tsx              entry: urql + ReactQuery + Router + auth + i18n providers
  App.tsx               root <Routes>: public flat, protected under RequireAuth + AppLayout
  routes.generated.tsx  GENERATED route table (107 lazy pages) — regenerate, don't hand-edit
  components/           RequireAuth, AppLayout, PlaceholderScreen
  lib/graphql-client.ts urql singleton via @nself/graphql-client
  pages/                107 lazy page placeholders (one per legacy page group)
```
