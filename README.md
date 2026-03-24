# ɳChat

**Self-hosted team communication platform built on nSelf.**

Technical name: `nself-chat` | Package: `@nself/chat` | Short name: `nchat` | **Version**: `0.9.2`

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.9.2-blue)](https://github.com/nself-org/chat/releases)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)

Powered by [nSelf CLI](https://github.com/nself-org/cli) for backend infrastructure.

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/nself-org/chat.git
cd nself-chat

# 2. Start the backend (PostgreSQL, Hasura, Auth, Storage, etc.)
cd backend && nself start

# 3. Start the frontend (in a new terminal)
cd frontend && pnpm install && pnpm dev
```

Your app is now running at **http://localhost:3000**.

### Service URLs

- **Chat App**: http://localhost:3000
- **GraphQL API**: https://api.local.nself.org
- **Auth**: https://auth.local.nself.org
- **Storage**: https://storage.local.nself.org
- **Email (dev)**: https://mail.local.nself.org
- **Admin**: http://localhost:3021

### Demo Users (Local Development)

| # | Email | Password | Role | Access |
|---|-------|----------|------|--------|
| 1 | owner@nself.org | `password` | **Owner** | Top level, all access |
| 2 | admin@nself.org | `password` | **Admin** | High-level administration |
| 3 | mod@nself.org | `password` | **Moderator** | Content moderation |
| 4 | support@nself.org | `password` | **Support** | User support with limited admin |
| 5 | helper@nself.org | `password` | **Helper** | Community helper with limited mod |
| 6 | user@nself.org | `password` | *(no role)* | Regular user |

Sign up through the UI at http://localhost:3000, or run:
```bash
cd backend && ./scripts/create-demo-users.sh
cd backend && ./scripts/seed.sh
```

### Prerequisites

- **Docker Desktop** (20.10+) - [Install Docker](https://www.docker.com/get-started)
- **Node.js** (20.0+) - [Install Node](https://nodejs.org/)
- **nSelf CLI** (0.9.9+) - Install: `curl -sSL https://install.nself.org | bash`

---

## Project Structure

```
nself-chat/
├── backend/          # nSelf CLI backend (PostgreSQL + Hasura + Auth)
├── frontend/         # Next.js 15 web app (single app, not a monorepo)
│   └── src/
│       ├── app/      # Next.js App Router
│       ├── components/
│       ├── config/   # AppConfig + feature flags
│       ├── contexts/
│       ├── graphql/
│       ├── hooks/
│       ├── lib/
│       ├── platforms/ # Capacitor, Electron, Tauri configs
│       └── types/
├── tests/            # E2E tests (Playwright)
├── integration_test/ # Backend integration tests (Bats)
└── .github/          # CI/CD workflows
```

---

## What is nChat?

Build your own Slack, Discord, or Teams alternative. Clone it, customize it with the 12-step setup wizard, and deploy it on your own infrastructure.

**100% powered by nSelf CLI** for backend infrastructure: PostgreSQL, Hasura GraphQL, Nhost Auth, MinIO Storage, Redis, MeiliSearch, LiveKit, and a monitoring stack.

### Core Features (free, always on)

- Real-time messaging with channels, DMs, threads, reactions
- Rich text editor (TipTap), markdown, code blocks
- File sharing and image previews
- Full-text search (MeiliSearch)
- Typing indicators, read receipts, online presence
- 27 theme presets with light/dark modes
- 12-step white-label setup wizard
- RBAC: owner, admin, moderator, member, guest
- E2E encryption (Double Ratchet algorithm, Web Crypto API)

### Pro Features (require nSelf Pro license key)

| Feature | Plugin | Without a license |
|---------|--------|-------------------|
| Voice and video calls | `livekit` | Set up WebRTC manually |
| AI chat moderation | `ai`, `moderation` | Build custom moderation |
| Stripe billing | `stripe` | Implement Stripe yourself |
| Bot framework | `bots` | Write custom bot endpoints |
| Live streaming | `streaming` | Set up RTMP/HLS manually |
| Advanced analytics | `analytics` | Build custom analytics |

The Basic tier ($0.99/mo or $9.99/yr) covers all 59 Pro Plugins. See [nself.org/pricing](https://nself.org/pricing).

---

## Current Status (v0.9.2)

**Build**: Passing | **TypeScript**: 0 errors | **Completion**: ~80%

### What Works

- Real-time messaging, channels, DMs, threads
- WebRTC voice/video calls with screen sharing (via LiveKit plugin)
- E2E encryption (Double Ratchet, not Signal library)
- Authentication with 11 OAuth providers configured
- 222 database tables, all `nchat_` prefixed
- 27 theme presets, white-label setup wizard
- Full-text search via MeiliSearch

### What Needs Work

- Stripe payments: server integration real, client uses mocked payment intents
- Video processing: images work, videos not yet transcoded
- Mobile apps: configured but not tested on real devices
- Desktop apps: working but missing branded icons
- OAuth: 11 providers configured, individual edge-case testing needed

### Test Status

The frontend contains ~3,700 test files across unit, integration, and E2E suites. The `tests/e2e/` directory has Playwright smoke tests. Exact pass rates depend on backend availability. Coverage measurement is not yet enabled.

### Path to v1.0.0

1. Real Stripe.js client integration
2. Device testing for mobile apps
3. Security audit
4. Video transcoding (FFmpeg)

---

## Deployment

### Standalone

```bash
git clone https://github.com/nself-org/chat.git
cd nself-chat
cd backend && nself start
cd ../frontend && pnpm install && pnpm dev
```

### Monorepo (sharing a backend with other apps)

```bash
monorepo/
├── backend/          # Shared nSelf CLI backend
├── apps/
│   ├── nchat/        # This app
│   └── other-app/    # Your custom app
```

One backend, shared authentication, per-app roles, centralized data.

---

## Documentation

See `.github/wiki/` for full documentation:

- [Quick Start](.github/wiki/getting-started/Quick-Start.md)
- [Architecture](.github/wiki/Architecture-Overview.md)
- [Security](.github/wiki/SECURITY-RUNBOOK.md)
- [Contributing](.github/wiki/CONTRIBUTING.md)

---

## Live Demo

Try the full stack with Pro Plugins active: **[chat.nself.org](https://chat.nself.org)**

---

## Part of nSelf

- [nSelf CLI](https://github.com/nself-org/cli) - Self-hosted backend platform
- [nAdmin](https://github.com/nself-org/admin) - Admin dashboard
- [nChat](https://github.com/nself-org/chat) - Real-time chat (this project)
- [nPlugins](https://github.com/nself-org/plugins) - Plugin marketplace

Learn more at [nself.org](https://nself.org)

---

## License

MIT License - see [LICENSE](LICENSE) for details.
