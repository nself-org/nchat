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
pnpm build        # generate:routes, then tsc --noEmit && vite build
pnpm type-check   # generate:routes, then tsc --noEmit
pnpm test         # generate:routes, then vitest
pnpm generate:routes   # rebuild src/routes.generated.tsx (runs automatically before the above)
```

`src/routes.generated.tsx` is gitignored (`*.generated.*`) and rebuilt from the `F-NCHAT-VITE-ROUTE`
header in each `src/pages/*Page.tsx` by `scripts/generate-routes.mjs`. A new page needs that header;
a public (no-auth) page also needs its path added to `PUBLIC_PATHS` in `scripts/routes-lib.mjs`.

### Building from a clean clone

`@nself/*` are `link:../../packages/@nself/<name>` deps, so `nself-org/packages` must sit next to
this repo (`<parent>/nchat`, `<parent>/packages`). Install both, then build the linked packages
once so `tsconfig.json` can resolve their `dist/index.d.ts`:

```bash
pnpm install --frozen-lockfile                   # in nchat
pnpm --dir ../packages install --frozen-lockfile
pnpm --dir ../packages --filter @nself/errors --filter @nself/auth-core \
  --filter @nself/graphql-client --filter @nself/i18n --filter @nself/ui build
pnpm --filter @nchat/frontend-vite build
```

CI runs exactly this in `.github/workflows/frontend-vite.yml`.

### i18n note

The app imports only `@nself/i18n` (`NselfI18nProvider`); it has no `i18next` / `react-i18next`
imports of its own, so there is one i18n context today. `@nself/i18n` carries its own
i18next 23 (the declared `react-i18next` here is unused). If the app ever calls `useTranslation`
directly, dedupe `i18next` + `react-i18next` first (vite `resolve.dedupe`) or the two copies
will have separate contexts.

## Layout

```
src/
  main.tsx              entry: urql + ReactQuery + Router + auth + i18n providers
  App.tsx               root <Routes>: public flat, protected under RequireAuth + AppLayout
  routes.generated.tsx  GENERATED (gitignored) route table, one lazy page per src/pages file
  components/           RequireAuth, AppLayout, PlaceholderScreen
  lib/graphql-client.ts urql singleton via @nself/graphql-client
  pages/                107 lazy page placeholders (one per legacy page group)
```
