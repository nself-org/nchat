# ɳChat Architecture

**Version**: 1.0.9
**Last Updated**: 2026-04-18

## Overview

ɳChat (nself-chat) is a FOSS team communication platform built as a **reference implementation** of what can be achieved with the [nSelf CLI](https://github.com/nself/nself) backend infrastructure. This document describes the architectural decisions, patterns, and setup instructions for both standalone and monorepo deployments.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [System Architecture](#system-architecture)
3. [Deployment Models](#deployment-models)
4. [Per-App RBAC/ACL](#per-app-rbacacl)
5. [Authentication Architecture](#authentication-architecture)
6. [Database Schema](#database-schema)
7. [Frontend Architecture](#frontend-architecture)
8. [Backend Services](#backend-services)
9. [Security Model](#security-model)
10. [Monorepo Setup Guide](#monorepo-setup-guide)

---

## Core Principles

### 1. Backend Exclusivity
ɳChat uses **nSelf CLI exclusively** for all backend operations:
- ✅ Database: PostgreSQL via nSelf
- ✅ GraphQL: Hasura via nSelf
- ✅ Authentication: Nhost Auth via nSelf
- ✅ Storage: MinIO/S3 via nSelf
- ✅ Search: MeiliSearch via nSelf
- ✅ Real-time: WebSocket subscriptions via Hasura

**We do NOT use**: Custom Express servers, Firebase, Supabase Auth, or any non-nSelf backend services.

### 2. Deployment Flexibility
The application supports two deployment models:

**Standalone**
```
user@host:~$ git clone nself-chat
user@host:~$ cd nself-chat
user@host:~$ nself start
user@host:~$ pnpm dev
```
One app, one backend, independent deployment.

**Monorepo ("One of Many")**
```
monorepo/
├── backend/          # Shared nSelf backend
├── nchat/            # This app
├── ntv/              # Another app
└── nfamily/          # Another app
```
Multiple apps, one backend, shared authentication, per-app roles.

### 3. Per-App RBAC/ACL
In monorepo deployments, users authenticate once but can have **different roles in different apps**:
- Admin in ɳChat, regular user in ɳTV
- Owner in ɳFamily, guest in ɳChat
- Moderator in ɳTV, member in ɳFamily

This is implemented via three PostgreSQL tables:
- `apps` - Registry of all applications
- `app_user_roles` - User roles per app
- `app_role_permissions` - Permissions per role per app

---

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   Web    │  │  Mobile  │  │ Desktop  │  │  Admin   │        │
│  │ Next.js  │  │Capacitor │  │ Electron │  │  Panel   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │              │             │              │
│       └─────────────┴──────────────┴─────────────┘              │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │   Nginx Reverse     │
                │       Proxy         │
                └──────────┬──────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
│    Hasura      │ │  Nhost Auth │ │  MinIO Storage  │
│  GraphQL API   │ │   Service   │ │   (S3-compat)   │
└───────┬────────┘ └──────┬──────┘ └────────┬────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                   ┌───────▼────────┐
                   │   PostgreSQL   │
                   │   Database     │
                   └────────────────┘
```

### Technology Stack

**Frontend**
- Framework: Next.js 15.1.6 (App Router)
- UI: React 19 + Radix UI + Tailwind CSS
- State: Zustand + Apollo Client
- Real-time: GraphQL subscriptions + Socket.io
- Editor: TipTap 2.11.2
- Forms: React Hook Form + Zod

**Backend (via nSelf CLI)**
- Database: PostgreSQL 15+ with 60+ extensions
- GraphQL: Hasura Engine
- Auth: Nhost Authentication
- Storage: MinIO (S3-compatible)
- Search: MeiliSearch
- Cache: Redis
- Monitoring: Grafana + Prometheus + Loki

---

## Deployment Models

### Standalone Deployment

**Use Case**: Independent installation, single team/organization.

**Directory Structure**:
```
nself-chat/
├── backend/              # nSelf CLI project
│   ├── migrations/       # DB migrations
│   ├── docker-compose.yml
│   └── .env
├── frontend/             # Next.js app
│   ├── src/
│   ├── platforms/
│   └── package.json
└── README.md
```

**Setup**:
```bash
# 1. Initialize backend
cd backend
nself init
nself start

# 2. Start frontend
cd ../frontend
pnpm install
pnpm dev
```

**Environment**:
```bash
# frontend/.env.local
NEXT_PUBLIC_APP_ID=nchat
NEXT_PUBLIC_GRAPHQL_URL=http://api.localhost/v1/graphql
NEXT_PUBLIC_AUTH_URL=http://auth.localhost/v1/auth
NEXT_PUBLIC_STORAGE_URL=http://storage.localhost/v1/storage
```

---

### Monorepo Deployment ("One of Many")

**Use Case**: Multiple applications sharing authentication and users.

**Directory Structure**:
```
monorepo/
├── backend/                # Shared nSelf backend
│   ├── migrations/
│   │   ├── 001_create_users.sql
│   │   ├── 002_add_nchat_tables.sql
│   │   ├── 003_add_ntv_tables.sql
│   │   └── 004_add_per_app_rbac.sql
│   └── docker-compose.yml
├── nchat/                  # ɳChat app
│   ├── frontend/
│   └── package.json
├── ntv/                    # ɳTV app (example)
│   ├── frontend/
│   └── package.json
└── nfamily/                # ɳFamily app (example)
    ├── frontend/
    └── package.json
```

**Setup**:
```bash
# 1. Initialize shared backend
cd backend
nself init --demo
nself start

# 2. Run migrations for all apps
nself exec postgres psql -U postgres -d nself < migrations/001_create_users.sql
nself exec postgres psql -U postgres -d nself < migrations/002_add_nchat_tables.sql
nself exec postgres psql -U postgres -d nself < migrations/003_add_ntv_tables.sql
nself exec postgres psql -U postgres -d nself < migrations/004_add_per_app_rbac.sql

# 3. Start each app
cd ../nchat/frontend && pnpm dev
cd ../ntv/frontend && pnpm dev --port 3001
cd ../nfamily/frontend && pnpm dev --port 3002
```

**App Environment Configuration**:
```bash
# nchat/frontend/.env.local
NEXT_PUBLIC_APP_ID=nchat
NEXT_PUBLIC_APP_NAME=ɳChat
NEXT_PUBLIC_GRAPHQL_URL=http://api.localhost/v1/graphql
NEXT_PUBLIC_AUTH_URL=http://auth.localhost/v1/auth

# ntv/frontend/.env.local
NEXT_PUBLIC_APP_ID=ntv
NEXT_PUBLIC_APP_NAME=ɳTV
NEXT_PUBLIC_GRAPHQL_URL=http://api.localhost/v1/graphql
NEXT_PUBLIC_AUTH_URL=http://auth.localhost/v1/auth

# nfamily/frontend/.env.local
NEXT_PUBLIC_APP_ID=nfamily
NEXT_PUBLIC_APP_NAME=ɳFamily
NEXT_PUBLIC_GRAPHQL_URL=http://api.localhost/v1/graphql
NEXT_PUBLIC_AUTH_URL=http://auth.localhost/v1/auth
```

---

## Per-App RBAC/ACL

### Overview

The per-app RBAC system allows users to have **different roles in different applications** while sharing a single user account and authentication session.

### Database Schema

**`apps` Table**
```sql
CREATE TABLE public.apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT UNIQUE NOT NULL,        -- 'nchat', 'ntv', 'nfamily'
    app_name TEXT NOT NULL,             -- 'ɳChat', 'ɳTV', 'ɳFamily'
    app_url TEXT,                       -- 'https://chat.nself.org'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`app_user_roles` Table**
```sql
CREATE TABLE public.app_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL REFERENCES apps(app_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,                 -- 'owner', 'admin', 'moderator', 'member', 'guest'
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,             -- Optional expiration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(app_id, user_id, role)
);
```

**`app_role_permissions` Table**
```sql
CREATE TABLE public.app_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL REFERENCES apps(app_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    permission TEXT NOT NULL,           -- 'channels.create', 'messages.delete'
    resource TEXT,                      -- Optional: specific resource ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(app_id, role, permission, resource)
);
```

### Role Types

| Role | Description | Example Permissions |
|------|-------------|-------------------|
| **owner** | Complete control | All permissions, billing, settings |
| **admin** | User/channel management | Manage users, create/delete channels, moderation |
| **moderator** | Content moderation | Delete messages, warn/timeout users, pin content |
| **member** | Standard user | Send messages, join channels, upload files |
| **guest** | Limited access | View channels, read messages (no posting) |

### Permission Format

Permissions use dot notation:
- `app.admin` - Full app administration
- `users.manage` - User management
- `users.ban` - Ban users
- `channels.create` - Create channels
- `channels.delete` - Delete channels
- `messages.send` - Send messages
- `messages.delete` - Delete own messages
- `messages.delete.any` - Delete any message
- `files.upload` - Upload files
- `settings.manage` - Manage app settings
- `billing.manage` - Manage billing

### Helper Functions

```sql
-- Check if user has role in app
SELECT user_has_app_role(
    'user-uuid',
    'nchat',
    'admin'
);

-- Check if user has permission in app
SELECT user_has_app_permission(
    'user-uuid',
    'nchat',
    'channels.delete',
    NULL  -- resource ID (optional)
);

-- Get all user roles for app
SELECT * FROM get_user_app_roles(
    'user-uuid',
    'nchat'
);
```

### Frontend Integration

**Hook Usage**:
```typescript
import { useAppPermissions } from '@/hooks/use-app-permissions'

function DeleteChannelButton({ channelId }: { channelId: string }) {
  const { hasPermission, isAdmin, loading } = useAppPermissions()

  if (loading) return <Skeleton />
  if (!hasPermission('channels.delete')) return null

  return (
    <button onClick={() => deleteChannel(channelId)}>
      Delete Channel
    </button>
  )
}
```

**Context Access**:
```typescript
import { useAuth } from '@/contexts/auth-context'

function UserProfile() {
  const { user } = useAuth()

  return (
    <div>
      <h2>{user.displayName}</h2>
      <p>Roles in {process.env.NEXT_PUBLIC_APP_NAME}:</p>
      <ul>
        {user.appRoles?.map(role => (
          <li key={role}>{role}</li>
        ))}
      </ul>
    </div>
  )
}
```

### GraphQL Queries

```graphql
# Get user's roles in current app
query GetUserAppRoles($userId: uuid!, $appId: String!) {
  app_user_roles(
    where: {
      user_id: { _eq: $userId }
      app_id: { _eq: $appId }
      _or: [
        { expires_at: { _is_null: true } }
        { expires_at: { _gt: "now()" } }
      ]
    }
  ) {
    role
    granted_at
    expires_at
  }
}

# Grant a role to a user
mutation GrantUserRole(
  $appId: String!
  $userId: uuid!
  $role: String!
  $grantedBy: uuid
) {
  insert_app_user_roles_one(
    object: {
      app_id: $appId
      user_id: $userId
      role: $role
      granted_by: $grantedBy
    }
  ) {
    id
    role
  }
}
```

---

## Authentication Architecture

### Single Sign-On (SSO) in Monorepo

When multiple apps share a backend:

1. **User logs in to ɳChat** → Nhost creates session
2. **User visits ɳTV** → Session is valid (same auth service)
3. **User visits ɳFamily** → Session is valid (same auth service)

All apps use the same:
- `auth.users` table
- Nhost JWT tokens
- Session storage

### App-Specific Context

While authentication is shared, **app context is unique**:

```typescript
// User logs in once
user.id = "123"
user.email = "alice@example.com"

// Context varies by app
// In ɳChat:
user.appRoles = ["admin"]
user.appContext.permissions = ["channels.delete", "users.ban"]

// In ɳTV (same user):
user.appRoles = ["member"]
user.appContext.permissions = ["videos.view", "videos.upload"]

// In ɳFamily (same user):
user.appRoles = ["owner"]
user.appContext.permissions = ["*"]  // All permissions
```

### Development Mode

For local development, ɳChat supports a **test authentication mode**:

```bash
# Enable test auth (8 predefined users)
NEXT_PUBLIC_USE_DEV_AUTH=true
```

Test users:
- `owner@nself.org` (owner role)
- `admin@nself.org` (admin role)
- `moderator@nself.org` (moderator role)
- `member@nself.org` (member role)
- `guest@nself.org` (guest role)

Password for all: `password123`

**IMPORTANT**: Never use `NEXT_PUBLIC_USE_DEV_AUTH=true` in production!

---

## Database Schema

### Core Tables

| Table | Purpose | Rows (typical) |
|-------|---------|----------------|
| `auth.users` | User accounts | 1K-1M+ |
| `nchat_channels` | Chat channels | 10-10K |
| `nchat_messages` | Messages | 100K-10M+ |
| `nchat_roles` | Role definitions | 5-20 |
| `nchat_role_permissions` | RBAC permissions | 50-200 |
| `apps` | App registry | 1-50 |
| `app_user_roles` | Per-app roles | 1K-1M+ |
| `app_role_permissions` | Per-app permissions | 100-1K |

### Migration Strategy

**Standalone**:
```bash
cd backend
nself exec postgres psql -U postgres -d nself < migrations/init.sql
```

**Monorepo**:
```bash
# Order matters - run in sequence
cd backend
nself exec postgres psql -U postgres -d nself < migrations/001_create_users.sql
nself exec postgres psql -U postgres -d nself < migrations/002_add_per_app_rbac.sql
nself exec postgres psql -U postgres -d nself < migrations/003_add_nchat_tables.sql
nself exec postgres psql -U postgres -d nself < migrations/004_add_ntv_tables.sql
```

### Row-Level Security (RLS)

All tables use RLS policies:

```sql
-- Example: Messages are viewable by channel members
CREATE POLICY "Users can view messages in their channels"
ON nchat_messages FOR SELECT
USING (
    channel_id IN (
        SELECT channel_id FROM nchat_channel_members
        WHERE user_id = auth.uid()
    )
);

-- Example: Apps are viewable by active app users
CREATE POLICY "Users can view their app roles"
ON app_user_roles FOR SELECT
USING (user_id = auth.uid());
```

---

## Frontend Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Auth pages
│   │   ├── chat/              # Main chat UI
│   │   ├── setup/             # Setup wizard
│   │   └── settings/          # User settings
│   ├── components/
│   │   ├── chat/              # Chat components
│   │   ├── ui/                # Radix UI wrappers
│   │   └── layout/            # Header, Sidebar
│   ├── contexts/
│   │   ├── auth-context.tsx   # Auth state
│   │   └── app-config-context.tsx
│   ├── hooks/
│   │   ├── use-channels.ts
│   │   ├── use-messages.ts
│   │   └── use-app-permissions.ts  # RBAC hook
│   ├── graphql/
│   │   ├── queries/
│   │   ├── mutations/
│   │   └── app-rbac.ts        # RBAC queries
│   ├── types/
│   │   ├── app-rbac.ts        # RBAC types
│   │   └── index.ts
│   └── lib/
│       ├── apollo-client.ts
│       └── utils.ts
├── platforms/
│   ├── mobile/                # Capacitor (iOS/Android)
│   ├── desktop/               # Electron/Tauri
│   └── README.md
├── public/                    # Static assets
├── tests/                     # Jest + Playwright
└── package.json
```

### State Management

**Global State (Zustand)**:
- User preferences
- Theme settings
- UI state (modals, sidebars)

**Server State (Apollo Client)**:
- Channels
- Messages
- Users
- App configuration

**Real-time (GraphQL Subscriptions)**:
```typescript
subscription OnNewMessage($channelId: uuid!) {
  nchat_messages(
    where: { channel_id: { _eq: $channelId } }
    order_by: { created_at: desc }
    limit: 1
  ) {
    id
    content
    user {
      id
      displayName
      avatarUrl
    }
    created_at
  }
}
```

---

## Shared Packages (Monorepo)

Six workspace packages under `packages/` provide shared logic consumed by the web frontend, Electron desktop, and Capacitor mobile platforms.

| Package | npm name | Status | Depends on |
|---------|----------|--------|------------|
| `packages/core` | `@nself-chat/core` | Active — logger stub, shared types, utils | (none) |
| `packages/api` | `@nself-chat/api` | Active — Apollo client factory, ApolloProvider re-export | `@nself-chat/core` |
| `packages/state` | `@nself-chat/state` | Active — Zustand stores | `@nself-chat/core`, `@nself-chat/api` |
| `packages/ui` | `@nself-chat/ui` | Active — shared React components, global CSS | `@nself-chat/core` |
| `packages/config` | `@nself-chat/config` | Active — runtime configuration | `@nself-chat/core` |
| `packages/testing` | `@nself-chat/testing` | Stub — testing utilities added in future sprint | (none) |

### Dependency Direction

Packages are strictly layered. Dependencies only flow downward:

```
@nself-chat/state  ──> @nself-chat/api  ──> @nself-chat/core
@nself-chat/ui     ──────────────────────────────────────────> @nself-chat/core
@nself-chat/config ──────────────────────────────────────────> @nself-chat/core
@nself-chat/testing ──> (no workspace deps)
```

No package may import from `frontend/` or from a platform (`desktop/`, `mobile/`). Platforms consume packages — never the reverse.

### Build

Packages are resolved via Vite aliases (source-level) during platform builds — no pre-build step required for local development. Each package ships `src/index.ts` as its source entry.

```bash
# Build all packages (TypeScript declarations + JS)
pnpm --filter "@nself-chat/*" build

# Build specific platform (resolves packages via vite aliases)
pnpm --filter @nself-chat/desktop build
pnpm --filter @nself-chat/mobile build
```

### Adding a New Package

1. Create `packages/<name>/` with `package.json` (`name: "@nself-chat/<name>"`), `src/index.ts`, and `tsconfig.json` extending `../../tsconfig.json`.
2. Add `"@nself-chat/<name>": "workspace:*"` to any consumer's `package.json` `dependencies`.
3. Add a vite alias in the consumer's `vite.config.ts`: `'@nself-chat/<name>': resolve(__dirname, '../../packages/<name>/src')`.
4. Add a `paths` entry in the consumer's `tsconfig.json`: `"@nself-chat/<name>/*": ["../../../packages/<name>/src/*"]`.

---

## Backend Services

### nSelf CLI Services

| Service | Port | Purpose |
|---------|------|---------|
| Hasura | 8080 | GraphQL API |
| Auth | 4000 | Authentication |
| PostgreSQL | 5432 | Database |
| MinIO | 9000/9001 | S3 storage |
| MeiliSearch | 7700 | Full-text search |
| Redis | 6379 | Cache/sessions |
| Grafana | 3000 | Monitoring |
| Prometheus | 9090 | Metrics |
| Loki | 3100 | Logs |

### Service Communication

```
Frontend ─┬─> Hasura (8080) ────> PostgreSQL (5432)
          ├─> Auth (4000) ───────> PostgreSQL (5432)
          ├─> MinIO (9000) ──────> S3 buckets
          └─> MeiliSearch (7700) ─> Search indices
```

All services run via Docker Compose generated by nSelf CLI:

```bash
cd backend
nself start        # Start all services
nself stop         # Stop all services
nself status       # Show status
nself logs hasura  # View logs
nself urls         # List all service URLs
```

---

## Security Model

### Authentication Flow

1. **User submits credentials** → Frontend sends to Nhost Auth
2. **Nhost validates** → Returns JWT access token + refresh token
3. **Frontend stores tokens** → Secure HTTP-only cookies (production)
4. **Subsequent requests** → Include JWT in Authorization header
5. **Hasura validates JWT** → Decodes user ID, enforces RLS

### Authorization Layers

**Layer 1: Hasura JWT Validation**
- All requests include JWT
- Hasura verifies signature
- Extracts `x-hasura-user-id` and `x-hasura-role`

**Layer 2: Row-Level Security (RLS)**
- PostgreSQL policies enforce data access
- Uses `auth.uid()` from JWT claims
- Cannot be bypassed by GraphQL

**Layer 3: Application Permissions (RBAC)**
- Frontend checks `app_user_roles` and `app_role_permissions`
- UI hides/disables unauthorized actions
- Backend validates via RLS policies

### Rate Limiting

```yaml
# Hasura console > API Limits
api_limits:
  depth_limit:
    global: 10
    per_role:
      user: 7
      anonymous: 5
  node_limit:
    global: 50
    per_role:
      user: 30
      anonymous: 10
  rate_limit:
    global:
      max_reqs_per_min: 120
      unique_params: IP
    per_role:
      user:
        max_reqs_per_min: 60
        unique_params: ["x-hasura-user-id"]
```

---

## Monorepo Setup Guide

### Step 1: Create Directory Structure

```bash
mkdir -p monorepo/{backend,nchat,ntv,nfamily}
cd monorepo
```

### Step 2: Initialize Shared Backend

```bash
cd backend
nself init --demo
# Follow prompts:
# - Enable: PostgreSQL, Hasura, Auth, MinIO, MeiliSearch, Redis
# - Enable: Monitoring (Grafana + Prometheus + Loki)
# - Set admin password
# - Configure domain (e.g., api.localhost)
```

### Step 3: Clone Apps

```bash
cd ..
git clone https://github.com/nself/nself-chat.git nchat
git clone https://github.com/nself/nself-tv.git ntv
git clone https://github.com/nself/nself-family.git nfamily
```

### Step 4: Run Migrations

```bash
cd backend

# Core tables (users, auth)
nself exec postgres psql -U postgres -d nself < ../nchat/backend/db/migrations/20260212_add_per_app_rbac.sql

# App-specific tables
nself exec postgres psql -U postgres -d nself < ../nchat/backend/db/migrations/init_nchat.sql
nself exec postgres psql -U postgres -d nself < ../ntv/backend/db/migrations/init_ntv.sql
nself exec postgres psql -U postgres -d nself < ../nfamily/backend/db/migrations/init_nfamily.sql
```

### Step 5: Configure Apps

```bash
# ɳChat
cd ../nchat/frontend
cp .env.example .env.local
# Edit NEXT_PUBLIC_APP_ID=nchat

# ɳTV
cd ../../ntv/frontend
cp .env.example .env.local
# Edit NEXT_PUBLIC_APP_ID=ntv

# ɳFamily
cd ../../nfamily/frontend
cp .env.example .env.local
# Edit NEXT_PUBLIC_APP_ID=nfamily
```

### Step 6: Start Services

```bash
# Terminal 1: Backend
cd backend
nself start

# Terminal 2: ɳChat
cd nchat/frontend
pnpm dev

# Terminal 3: ɳTV
cd ntv/frontend
pnpm dev --port 3001

# Terminal 4: ɳFamily
cd nfamily/frontend
pnpm dev --port 3002
```

### Step 7: Register Apps

Visit Hasura console (http://localhost:8080) and run:

```sql
INSERT INTO public.apps (app_id, app_name, app_url, is_active) VALUES
  ('nchat', 'ɳChat', 'http://localhost:3000', true),
  ('ntv', 'ɳTV', 'http://localhost:3001', true),
  ('nfamily', 'ɳFamily', 'http://localhost:3002', true);
```

### Step 8: Assign Initial Roles

```sql
-- Make first user an owner in all apps
INSERT INTO public.app_user_roles (app_id, user_id, role) VALUES
  ('nchat', 'user-uuid-here', 'owner'),
  ('ntv', 'user-uuid-here', 'owner'),
  ('nfamily', 'user-uuid-here', 'owner');
```

---

## Troubleshooting

### Issue: "User has no roles in this app"

**Solution**: Assign default role to new users via trigger:

```sql
CREATE OR REPLACE FUNCTION assign_default_app_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign 'member' role in all active apps
  INSERT INTO public.app_user_roles (app_id, user_id, role)
  SELECT app_id, NEW.id, 'member'
  FROM public.apps
  WHERE is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_app_role();
```

### Issue: "Permission denied for app_user_roles"

**Solution**: Grant Hasura access:

```sql
GRANT SELECT ON public.app_user_roles TO hasura;
GRANT SELECT ON public.app_role_permissions TO hasura;
GRANT EXECUTE ON FUNCTION public.user_has_app_role TO hasura;
GRANT EXECUTE ON FUNCTION public.user_has_app_permission TO hasura;
```

### Issue: "Apps not showing in GraphQL"

**Solution**: Track tables in Hasura:

```bash
cd backend
nself exec hasura hasura-cli metadata reload
```

Or via console:
1. Visit http://localhost:8080
2. Data tab → Schema → public
3. Track tables: `apps`, `app_user_roles`, `app_role_permissions`

---

## Additional Resources

- [nSelf CLI Documentation](https://nself.org/docs)
- [ɳChat README](./README.md)
- [Hasura Docs](https://hasura.io/docs/)
- [Nhost Auth Docs](https://docs.nhost.io/authentication)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

---

## Changelog

**v0.9.2** (February 12, 2026)
- Added per-app RBAC/ACL system
- Updated README with FOSS mission
- Created ARCHITECTURE.md
- Added monorepo setup documentation

**v0.9.0** (February 6, 2026)
- Restructured frontend to nself-family pattern
- Fixed all TypeScript errors
- Achieved 98%+ test pass rate
- Production-ready build

---

## Desktop Platform — Tauri 2

**Added:** S12 (P103 sprint). Replaces the Electron shell at `platforms/desktop/`.

### Stack

| Layer | Technology |
|---|---|
| Renderer | React/Vite (`@nself-chat/web` workspace package) |
| Shell | Rust + Tauri 2 |
| IPC | Tauri `invoke()` commands (18 channels) |
| Packaging | Tauri `bundle` → DMG (macOS), MSI/NSIS (Windows), AppImage/deb (Linux) |
| Distribution | GitHub Releases + S3 updater feed at `packages.nself.org` |

### Workspace package

`nchat/desktop/` — `@nself-chat/desktop`. All Tauri 2 source lives here, separate from the
legacy Electron shell at `platforms/desktop/` (removed in T19).

### Key features

- Native menus (File/Edit/View/Window) with keyboard shortcuts
- System tray with hide-to-tray on macOS close
- Deep-link handler for `nchat://chat/<room>` and `nchat://invite/<token>`
- Window state persistence (size, position, maximized, fullscreen)
- Auto-updater with semver downgrade guard
- macOS dock badge via `app_set_badge_count`
- Optional crash reporting via sentry-tauri (DSN from env)

### Build

```bash
cd nchat && pnpm install
cd desktop && pnpm tauri:dev     # dev mode
cd desktop && pnpm tauri:build   # release build
cd desktop && pnpm test          # vitest unit tests
cd desktop && pnpm ipc-parity    # IPC channel parity check
cd desktop && pnpm test:e2e      # Playwright e2e (requires built binary)
```

### CI workflows

| Workflow | Trigger | Notes |
|---|---|---|
| `.github/workflows/desktop-macos.yml` | tag push, PR, dispatch | arm64 + x64 matrix; bundle size gate (≤90 MB); e2e job |
| `.github/workflows/desktop-linux.yml` | tag push, PR, dispatch | Ubuntu 22.04; libwebkit2gtk-4.1-dev; Wayland DMA-BUF disabled |
| `.github/workflows/desktop-windows.yml` | tag push, PR, dispatch | x64; EV signing via SSL.com eSigner |

Full documentation: [DESKTOP.md](./DESKTOP.md)

---

## License

MIT License - See [LICENSE](./LICENSE) file for details.

---

**Questions?** Open an issue on [GitHub](https://github.com/nself/nself-chat/issues).
