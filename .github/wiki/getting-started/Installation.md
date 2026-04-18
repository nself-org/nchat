# Installation Guide

Complete installation guide for nself-chat v0.3.0. This guide covers all installation methods from quick development setup to production deployment.

---

## Table of Contents

- [Quick Install (Development)](#quick-install-development)
- [Full Install (Production)](#full-install-production)
- [Plugin Licenses](#plugin-licenses)
- [Backend Setup (nself CLI)](#backend-setup-nself-cli)
- [Database Migrations](#database-migrations)
- [Environment Variables](#environment-variables)
- [Platform-Specific Install](#platform-specific-install)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Plugin Licenses

ɳChat's advanced features run on ɳSelf plugins. There are two tiers:

### Free Plugins (15 included)

The 15 free plugins install automatically with `nself start` — no license key needed. They cover the full core messaging stack:

| Plugin | Feature |
| --- | --- |
| postgres | Database |
| hasura | GraphQL API |
| auth | Authentication |
| storage | File storage (MinIO) |
| search | Full-text search (MeiliSearch) |
| redis | Caching and queues |
| mail | Transactional email |
| notifications | Push notifications |
| presence | Online status |
| reactions | Emoji reactions |
| threads | Threaded replies |
| media | Image and video processing |
| webhooks | Outbound webhooks |
| audit | Audit logging |
| rbac | Role-based access control |

### Pro Plugins (49 — license required)

Pro plugins unlock advanced capabilities: video calls, E2E encryption, AI assistant, advanced moderation, bots, SSO, analytics, and more. A license key is required.

**Get a license:** [nself.org/pricing](https://nself.org/pricing) — Basic tier starts at $0.99/month ($9.99/year), all 59 Pro Plugins included. Higher tiers add AI suite, priority support, and managed DevOps.

#### Option 1: Set via CLI (recommended)

```bash
cd .backend

# Set your license key
nself license set nself_pro_xxxxx...

# Install the plugins you want
nself plugin install livekit recording moderation bots ai access-controls auth analytics

# Build with plugins included
nself build

# Start
nself start
```

The CLI validates the key against `ping.nself.org/license/validate` and caches the result for 24 hours (offline-capable).

#### Option 2: Set via environment variable

Add to `backend/.env`:

```bash
NSELF_PLUGIN_LICENSE_KEY=nself_pro_xxxxx...
```

Then run `nself build && nself start`. The key is read automatically at build time.

#### Key format

License keys start with `nself_pro_` followed by 32+ characters:

```
nself_pro_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

#### Without a license

All 15 free plugins work fully. Pro features are gracefully absent — buttons are hidden, no hard errors. The app detects feature availability at runtime via environment variables set during `nself build`.

---

## Quick Install (Development)

For local development with test users. **Fastest way to get started.**

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Git

### Steps

```bash
# 1. Clone repository
git clone https://github.com/nself-org/nchat.git
cd nself-chat

# 2. Install dependencies
pnpm install

# 3. Create development environment file
cp .env.example .env.local

# 4. Start development server
pnpm dev

# 5. Open browser
open http://localhost:3000
```

**Development mode features:**

- 8 pre-configured test users
- Auto-login as owner@nself.org
- No backend setup required initially
- Hot module reloading

**[See Quick Start Guide for more details →](QUICK-START)**

---

## Full Install (Production)

For production deployment with real authentication and database.

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose (for backend)
- PostgreSQL (if not using Docker)
- Domain name (for production)
- SSL certificate (Let's Encrypt recommended)

### Architecture

```
┌──────────────────────────────────────────────────────┐
│  nself-chat Frontend (Next.js)                       │
│  Port: 3000                                          │
└──────────────────────────────────────────────────────┘
                       ↓ GraphQL
┌──────────────────────────────────────────────────────┐
│  nself Backend (Hasura + Auth + Storage)             │
│  Hasura: 8080, Auth: 4000, Storage: 9000            │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│  PostgreSQL Database                                 │
│  Port: 5432                                          │
└──────────────────────────────────────────────────────┘
```

### Step 1: Clone Repository

```bash
git clone https://github.com/nself-org/nchat.git
cd nself-chat
```

### Step 2: Setup Backend with nself CLI

The backend uses [nself CLI](https://github.com/nself-org/cli) v0.4.2+ for complete backend infrastructure.

```bash
# Install nself CLI globally
npm install -g @nself/cli

# Initialize backend (in project root)
nself init

# Follow prompts:
# - Project name: nself-chat-backend
# - Environment: production
# - Enable services: PostgreSQL, Hasura, Auth, MinIO, MeiliSearch
# - Enable monitoring: Yes (recommended)

# This creates a .backend/ directory
```

**Alternative: Use Docker Compose directly**

```bash
# If you don't want to use nself CLI
cd .backend
docker-compose up -d
```

### Step 3: Configure Environment Variables

Create `.env.local` in the project root:

```bash
# Production mode (real authentication)
NEXT_PUBLIC_USE_DEV_AUTH=false
NEXT_PUBLIC_ENV=production

# Backend URLs (adjust to your domain)
NEXT_PUBLIC_GRAPHQL_URL=https://api.yourdomain.com/v1/graphql
NEXT_PUBLIC_AUTH_URL=https://auth.yourdomain.com/v1/auth
NEXT_PUBLIC_STORAGE_URL=https://storage.yourdomain.com/v1/storage

# App configuration
NEXT_PUBLIC_APP_NAME=YourTeamName
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Search (MeiliSearch)
NEXT_PUBLIC_MEILISEARCH_URL=https://search.yourdomain.com
MEILISEARCH_API_KEY=your-master-key-here

# GIFs (Tenor API - optional)
NEXT_PUBLIC_TENOR_API_KEY=your-tenor-api-key

# Social Media (optional)
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Social Media Encryption Key (generate with: openssl rand -hex 32)
SOCIAL_MEDIA_ENCRYPTION_KEY=your-32-byte-hex-key

# Sentry (Error tracking - optional)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token

# Database (for backend)
POSTGRES_PASSWORD=secure-password-here
HASURA_GRAPHQL_ADMIN_SECRET=another-secure-password
```

**[See Environment Variables Guide for all options →](configuration/Environment-Variables)**

### Step 4: Install Dependencies

```bash
pnpm install
```

### Step 5: Run Database Migrations

```bash
cd .backend

# Option 1: Using nself CLI
nself db migrate up

# Option 2: Using psql directly
psql -U postgres -d nchat_production -f migrations/001_initial_schema.sql
psql -U postgres -d nchat_production -f migrations/002_rbac_system.sql
# ... repeat for all migrations
```

**v0.3.0 migrations to apply:**

- `012_advanced_messaging_features.sql`
- `012_gifs_stickers.sql`
- `012_polls_system.sql`
- `012_2fa_system.sql`
- `012_pin_lock_security.sql`
- `007_search_features.sql`
- `012_bot_infrastructure.sql`
- `012_social_media_integration.sql`

### Step 6: Build for Production

```bash
# Build the Next.js application
pnpm build

# Test production build locally
pnpm start
```

### Step 7: Deploy

Choose your deployment method:

- **[Docker Deployment →](deployment/Deployment-Docker)**
- **[Kubernetes Deployment →](deployment/Deployment-Kubernetes)**
- **[Vercel Deployment →](#vercel-deployment)**
- **[Traditional VPS →](#traditional-vps-deployment)**

---

## Backend Setup (nself CLI)

### What is nself CLI?

nself CLI is a complete backend-as-a-service toolkit that provides:

- PostgreSQL with 60+ extensions
- Hasura GraphQL engine
- Nhost authentication
- MinIO object storage
- MeiliSearch full-text search
- Redis caching
- Monitoring stack (optional)

### Installation

```bash
# Install globally
npm install -g @nself/cli

# Verify installation
nself --version
# Should show: 0.4.2 or higher
```

### Initialize Project

```bash
# In your nself-chat root directory
nself init

# Interactive prompts:
# ✓ Project name: nself-chat-backend
# ✓ Environment: production
# ✓ Database name: nchat_production
# ✓ Enable PostgreSQL: Yes
# ✓ Enable Hasura: Yes
# ✓ Enable Auth: Yes
# ✓ Enable MinIO: Yes
# ✓ Enable MeiliSearch: Yes
# ✓ Enable Redis: Yes
# ✓ Enable Monitoring: Yes (recommended)
```

### Start Services

```bash
cd .backend

# Start all services
nself start

# Check status
nself status

# View service URLs
nself urls

# View logs
nself logs hasura
```

### Service Ports

| Service        | Port | Description                    |
| -------------- | ---- | ------------------------------ |
| Hasura GraphQL | 8080 | GraphQL API endpoint           |
| Auth           | 4000 | Authentication service         |
| PostgreSQL     | 5432 | Database                       |
| MinIO          | 9000 | Object storage (S3-compatible) |
| MinIO Console  | 9001 | MinIO web UI                   |
| MeiliSearch    | 7700 | Search engine                  |
| Redis          | 6379 | Cache and job queue            |
| nself Admin    | 3021 | Admin dashboard                |
| Grafana        | 3000 | Monitoring dashboards          |

### Configuration

Edit `.backend/.env` for backend configuration:

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure-password
POSTGRES_DB=nchat_production

# Hasura
HASURA_GRAPHQL_ADMIN_SECRET=admin-secret-key
HASURA_GRAPHQL_JWT_SECRET={"type":"HS256","key":"jwt-secret-key"}

# Auth
AUTH_JWT_SECRET_KEY=jwt-secret-key
AUTH_SMTP_HOST=smtp.sendgrid.net
AUTH_SMTP_USER=apikey
AUTH_SMTP_PASS=your-sendgrid-api-key

# MinIO
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=secure-password

# MeiliSearch
MEILI_MASTER_KEY=master-key-at-least-16-chars
```

---

## Database Migrations

### Migration Files

All migration files are located in `.backend/migrations/`:

```
.backend/migrations/
├── 001_initial_schema.sql
├── 002_rbac_system.sql
├── 003_channels_messages.sql
├── 004_reactions_threads.sql
├── 005_file_uploads.sql
├── 006_notifications.sql
├── 007_search_features.sql         # v0.3.0
├── 012_advanced_messaging_features.sql  # v0.3.0
├── 012_gifs_stickers.sql           # v0.3.0
├── 012_polls_system.sql            # v0.3.0
├── 012_2fa_system.sql              # v0.3.0
├── 012_pin_lock_security.sql       # v0.3.0
├── 012_bot_infrastructure.sql      # v0.3.0
└── 012_social_media_integration.sql # v0.3.0
```

### Running Migrations

**Method 1: Using nself CLI (Recommended)**

```bash
cd .backend

# Run all pending migrations
nself db migrate up

# Check migration status
nself db migrate status

# Rollback last migration (if needed)
nself db migrate down
```

**Method 2: Using psql**

```bash
cd .backend

# Connect to database
psql -U postgres -d nchat_production

# Run migrations manually
\i migrations/001_initial_schema.sql
\i migrations/002_rbac_system.sql
# ... etc
```

**Method 3: Using Docker exec**

```bash
# If database is in Docker
docker exec -i nself-postgres psql -U postgres -d nchat_production < migrations/001_initial_schema.sql
```

### Verify Migrations

```bash
# Check tables exist
psql -U postgres -d nchat_production -c "\dt"

# Should show all nchat_* tables:
# - nchat_users
# - nchat_channels
# - nchat_messages
# - nchat_reactions
# - nchat_polls
# - nchat_2fa_settings
# - ... etc
```

---

## Environment Variables

### Frontend (.env.local)

```bash
# ============================================
# ENVIRONMENT
# ============================================
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_USE_DEV_AUTH=false

# ============================================
# BACKEND URLS
# ============================================
NEXT_PUBLIC_GRAPHQL_URL=https://api.yourdomain.com/v1/graphql
NEXT_PUBLIC_AUTH_URL=https://auth.yourdomain.com/v1/auth
NEXT_PUBLIC_STORAGE_URL=https://storage.yourdomain.com/v1/storage

# ============================================
# APP CONFIGURATION
# ============================================
NEXT_PUBLIC_APP_NAME=YourTeamName
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_PRIMARY_COLOR=#6366f1

# ============================================
# FEATURES (v0.3.0)
# ============================================
NEXT_PUBLIC_FEATURE_GIF_PICKER=true
NEXT_PUBLIC_FEATURE_STICKERS=true
NEXT_PUBLIC_FEATURE_POLLS=true
NEXT_PUBLIC_FEATURE_2FA=true
NEXT_PUBLIC_FEATURE_PIN_LOCK=true
NEXT_PUBLIC_FEATURE_ENHANCED_SEARCH=true
NEXT_PUBLIC_FEATURE_BOT_API=true
NEXT_PUBLIC_FEATURE_SOCIAL_INTEGRATION=true

# ============================================
# SEARCH (MeiliSearch)
# ============================================
NEXT_PUBLIC_MEILISEARCH_URL=https://search.yourdomain.com
MEILISEARCH_API_KEY=your-master-key

# ============================================
# GIFS (Tenor API)
# ============================================
NEXT_PUBLIC_TENOR_API_KEY=your-tenor-api-key

# ============================================
# SOCIAL MEDIA INTEGRATION
# ============================================
# Twitter/X
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# Instagram
INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret

# LinkedIn
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Encryption key for social tokens (32 bytes hex)
SOCIAL_MEDIA_ENCRYPTION_KEY=generate-with-openssl-rand-hex-32

# ============================================
# MONITORING (Sentry)
# ============================================
NEXT_PUBLIC_SENTRY_DSN=https://key@org.ingest.sentry.io/project
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
NEXT_PUBLIC_RELEASE_VERSION=0.3.0
```

**[Complete Environment Variables Reference →](configuration/Environment-Variables)**

---

## Platform-Specific Install

### Docker Deployment

```bash
# Build Docker image
docker build -t nself-chat:0.3.0 .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f nself-chat
```

**[Full Docker Guide →](deployment/Deployment-Docker)**

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f deploy/k8s/

# Or use Helm
helm install nself-chat deploy/helm/nself-chat/
```

**[Full Kubernetes Guide →](deployment/Deployment-Kubernetes)**

### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Traditional VPS Deployment

```bash
# On your VPS
git clone https://github.com/nself-org/nchat.git
cd nself-chat
pnpm install
pnpm build

# Use PM2 for process management
npm install -g pm2
pm2 start npm --name "nself-chat" -- start
pm2 save
pm2 startup
```

---

## Verification

### Frontend Verification

```bash
# Check dev server is running
curl http://localhost:3000

# Check production build
pnpm build && pnpm start
curl http://localhost:3000
```

### Backend Verification

```bash
# Check all services are running
cd .backend
nself status

# Test GraphQL endpoint
curl http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# Test Auth endpoint
curl http://localhost:4000/v1/auth/status
```

### Database Verification

```bash
# Connect to database
psql -U postgres -d nchat_production

# Check tables
\dt nchat_*

# Check users table
SELECT COUNT(*) FROM nchat_users;
```

### MeiliSearch Verification

```bash
# Check MeiliSearch is running
curl http://localhost:7700/health

# Check indexes
curl -H "Authorization: Bearer YOUR_KEY" \
  http://localhost:7700/indexes
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 pnpm dev
```

### pnpm Version Mismatch

```bash
# Enable corepack
corepack enable

# Use specific pnpm version
corepack prepare pnpm@9.15.4 --activate

# Verify
pnpm --version
```

### Backend Services Not Starting

```bash
# Check Docker is running
docker ps

# Check logs
cd .backend
nself logs

# Restart services
nself stop
nself start
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $NEXT_PUBLIC_GRAPHQL_URL

# Test direct connection
psql -U postgres -d nchat_production
```

### TypeScript Errors

```bash
# Run type checking
pnpm type-check

# Fix linting issues
pnpm lint:fix

# Clean and rebuild
rm -rf .next node_modules
pnpm install
pnpm build
```

### Build Failures

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Try building again
pnpm build
```

---

## Post-Installation

### Initial Configuration

1. **Complete Setup Wizard**: Visit `/setup` to configure branding, themes, and features
2. **Create First User**: Register with the owner email specified in setup
3. **Enable Features**: Configure which v0.3.0 features to enable
4. **Setup Integrations**: Configure GIFs, search, social media

### Security Checklist

- [ ] Change default passwords
- [ ] Enable 2FA for all admin accounts
- [ ] Configure allowed email domains
- [ ] Set up SSL certificates
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Review audit logs regularly

**[Full Production Checklist →](deployment/Production-Deployment-Checklist)**

---

## Next Steps

- [Configuration Guide](CONFIGURATION) - Configure all features
- [User Guide](guides/USER-GUIDE) - Learn how to use nself-chat
- [Admin Guide](deployment/DEPLOYMENT#administration) - Manage your instance
- [API Reference](API-REFERENCE) - Build integrations

---

## Getting Help

- [Troubleshooting Guide](TROUBLESHOOTING)
- [FAQ](troubleshooting/FAQ)
- [GitHub Issues](https://github.com/nself-org/nchat/issues)
- [Email Support](mailto:support@nself.org)

---

**Installation complete!** 🎉 You're ready to use nself-chat.

**[Back to Documentation →](README)**
