# Environment Variables Reference

> **nself-chat (nchat)** — Self-hosted messaging platform

This page documents all environment variables used by the nchat frontend, backend, and CI.

---

## Frontend (`frontend/.env.*`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_HASURA_GRAPHQL_URL` | Yes | — | Hasura GraphQL endpoint URL |
| `NEXT_PUBLIC_NHOST_SUBDOMAIN` | Yes | — | Nhost subdomain for Auth/Storage |
| `NEXT_PUBLIC_NHOST_REGION` | Yes | — | Nhost region |
| `NEXT_PUBLIC_USE_DEV_AUTH` | No | `false` | Enable FauxAuth (dev only) |
| `NEXT_PUBLIC_ENV` | No | `development` | Environment tag (`development`, `staging`, `production`) |
| `NEXT_PUBLIC_LIVEKIT_URL` | No | — | LiveKit server URL (enables voice/video; requires ɳChat bundle) |
| `NEXT_PUBLIC_AI_ENABLED` | No | `false` | Enable AI assistant features (requires ɳChat bundle) |
| `HASURA_ADMIN_SECRET` | CI only | — | Hasura admin secret (build gate check; never exposed to browser) |

## Backend (`.backend/.env` / `backend/.env.example`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | Yes | — | PostgreSQL root password |
| `HASURA_GRAPHQL_ADMIN_SECRET` | Yes | — | Hasura admin secret |
| `HASURA_GRAPHQL_JWT_SECRET` | Yes | — | JWT signing secret for Hasura |
| `NHOST_JWT_SECRET` | Yes | — | Nhost JWT secret |
| `NHOST_WEBHOOK_SECRET` | Yes | — | Nhost webhook validation secret |
| `SMTP_HOST` | No | — | SMTP server for transactional email |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `MINIO_ROOT_USER` | No | — | MinIO root user (object storage) |
| `MINIO_ROOT_PASSWORD` | No | — | MinIO root password |
| `LIVEKIT_API_KEY` | No | — | LiveKit API key (ɳChat bundle) |
| `LIVEKIT_API_SECRET` | No | — | LiveKit API secret (ɳChat bundle) |
| `STRIPE_API_KEY` | No | — | Stripe API key (use test key for dev/staging) |
| `STRIPE_WEBHOOK_SECRET` | No | — | Stripe webhook signing secret |

## CI Secrets

| Secret | Used by | Description |
|---|---|---|
| `HASURA_ADMIN_SECRET` | Build, Lighthouse CI | Passes Next.js build gate; no real DB access in CI |
| `CODECOV_TOKEN` | Unit Tests | Coverage upload to Codecov |
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI | GitHub App token for LHCI status |
| `TAURI_SIGNING_PRIVATE_KEY` | Desktop Linux | Signs Tauri app bundles |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Desktop Linux | Password for Tauri signing key |
| `HETZNER_S3_ACCESS_KEY` | Desktop Linux | Hetzner Object Storage access (updater feed) |
| `HETZNER_S3_SECRET_KEY` | Desktop Linux | Hetzner Object Storage secret |

---

## Cascade / Precedence

```
.env.dev → .env.local → .env.secrets → .env
```

`.env.local` and `.env.secrets` are gitignored. Never commit real secrets.

See `backend/.env.example` for a full template with all variables documented.
