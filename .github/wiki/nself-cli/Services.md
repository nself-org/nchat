# nself CLI - Services Guide

**Version**: v0.4.2
**Last Updated**: February 1, 2026
**Complete service documentation for nself CLI stack**

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Core Services](#core-services)
   - [PostgreSQL](#postgresql)
   - [Hasura GraphQL Engine](#hasura-graphql-engine)
   - [Nhost Auth](#nhost-auth)
   - [Nginx](#nginx)
3. [Optional Services](#optional-services)
   - [MinIO](#minio)
   - [Redis](#redis)
   - [Hasura Storage](#hasura-storage)
   - [Mailpit](#mailpit)
   - [MeiliSearch](#meilisearch)
   - [Serverless Functions](#serverless-functions)
   - [MLflow](#mlflow)
4. [Monitoring Services](#monitoring-services)
5. [Administrative Services](#administrative-services)
6. [Service Integration](#service-integration)
7. [Best Practices](#best-practices)

---

## Service Overview

nself CLI provides a complete backend infrastructure stack with the following services:

### Service Tiers

| Tier           | Services    | Always Enabled | Enable Via                 |
| -------------- | ----------- | -------------- | -------------------------- |
| **Core**       | 4 services  | Yes            | Automatic                  |
| **Optional**   | 7 services  | No             | Environment variables      |
| **Monitoring** | 10 services | No             | `MONITORING_ENABLED=true`  |
| **Admin**      | 1 service   | No             | `NSELF_ADMIN_ENABLED=true` |

### Service Dependency Graph

```
nginx (Port 80/443)
  ├─→ hasura (Port 8080)
  │    └─→ postgres (Port 5432)
  ├─→ auth (Port 4000)
  │    ├─→ postgres
  │    └─→ hasura
  ├─→ storage (Port 5001)
  │    ├─→ minio (Port 9000)
  │    ├─→ postgres
  │    └─→ hasura
  └─→ minio (Console Port 9001)

redis (Port 6379) ── Independent
mailpit (Port 8025) ── Independent
meilisearch (Port 7700) ── Independent
```

---

## Core Services

These four services are always enabled and form the foundation of your backend.

---

### PostgreSQL

**Production-grade relational database with 60+ extensions**

#### Overview

| Property             | Value                                      |
| -------------------- | ------------------------------------------ |
| **Image**            | `postgres:16-alpine`                       |
| **Port**             | 5432                                       |
| **Data Location**    | `/var/lib/postgresql/data` (Docker volume) |
| **Default Database** | `{project_name}_dev`                       |
| **Default User**     | `postgres`                                 |
| **Health Check**     | `pg_isready -U postgres`                   |

#### Features

- **Latest PostgreSQL 16** - Modern SQL features
- **Alpine Linux** - Minimal image size (~80MB)
- **60+ Extensions** - pgcrypto, uuid-ossp, pg_trgm, etc.
- **Full-text Search** - Built-in FTS capabilities
- **JSON Support** - Native JSON and JSONB types
- **Connection Pooling** - Via PgBouncer (optional)
- **Replication** - Streaming replication support

#### Available Extensions

**Cryptography:**

```sql
CREATE EXTENSION pgcrypto;      -- Cryptographic functions
CREATE EXTENSION "uuid-ossp";   -- UUID generation
```

**Full-Text Search:**

```sql
CREATE EXTENSION pg_trgm;       -- Similarity search
CREATE EXTENSION pg_freespacemap;
CREATE EXTENSION btree_gin;     -- GIN indexes for full-text
CREATE EXTENSION btree_gist;    -- GIST indexes
```

**Performance:**

```sql
CREATE EXTENSION pg_stat_statements;  -- Query performance
CREATE EXTENSION pg_buffercache;     -- Cache stats
CREATE EXTENSION pg_prewarm;         -- Buffer prewarming
```

**Data Types:**

```sql
CREATE EXTENSION hstore;        -- Key-value store
CREATE EXTENSION ltree;         -- Hierarchical tree
CREATE EXTENSION citext;        -- Case-insensitive text
CREATE EXTENSION isn;           -- ISBN/ISSN/etc
```

**Geographic (Optional):**

```sql
CREATE EXTENSION postgis;       -- Geographic objects
CREATE EXTENSION postgis_topology;
CREATE EXTENSION address_standardizer;
```

**Time-Series (Optional):**

```sql
CREATE EXTENSION timescaledb;  -- Time-series optimization
```

**Job Scheduling (Optional):**

```sql
CREATE EXTENSION pg_cron;      -- Cron-like job scheduler
```

#### Configuration

**Default Configuration (.backend/.env):**

```bash
POSTGRES_DB=myapp_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres-dev-password
POSTGRES_PORT=5432
```

**Performance Tuning:**

For development (8GB RAM):

```bash
# Add to docker-compose.yml postgres service
command:
  - postgres
  - -c
  - shared_buffers=2GB
  - -c
  - effective_cache_size=6GB
  - -c
  - maintenance_work_mem=512MB
  - -c
  - checkpoint_completion_target=0.9
  - -c
  - wal_buffers=16MB
  - -c
  - default_statistics_target=100
  - -c
  - random_page_cost=1.1
  - -c
  - effective_io_concurrency=200
  - -c
  - work_mem=16MB
  - -c
  - min_wal_size=1GB
  - -c
  - max_wal_size=4GB
```

For production (32GB RAM):

```bash
command:
  - postgres
  - -c
  - shared_buffers=8GB
  - -c
  - effective_cache_size=24GB
  - -c
  - maintenance_work_mem=2GB
  - -c
  - work_mem=64MB
  - -c
  - max_connections=200
```

#### Connecting to PostgreSQL

**From Host Machine:**

```bash
# Using psql
psql -h localhost -p 5432 -U postgres -d myapp_dev

# Using Docker exec
nself exec postgres psql -U postgres -d myapp_dev
```

**From Application:**

```javascript
// Node.js (pg)
const { Pool } = require('pg')
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'myapp_dev',
  user: 'postgres',
  password: 'postgres-dev-password',
})

// Connection string
const connectionString = 'postgresql://postgres:postgres-dev-password@localhost:5432/myapp_dev'
```

**GUI Tools:**

- **pgAdmin 4**: Free, feature-rich
- **TablePlus**: Modern, beautiful UI (paid)
- **DBeaver**: Open-source, Java-based
- **Postico**: macOS native (paid)

#### Backup and Restore

**Create Backup:**

```bash
# Using nself CLI
nself db:dump backup.sql

# Manual backup
docker exec myapp_postgres pg_dump -U postgres myapp_dev > backup.sql

# Compressed backup
docker exec myapp_postgres pg_dump -U postgres myapp_dev | gzip > backup.sql.gz
```

**Restore Backup:**

```bash
# Using nself CLI
nself db:restore backup.sql

# Manual restore
cat backup.sql | docker exec -i myapp_postgres psql -U postgres -d myapp_dev

# From compressed
gunzip < backup.sql.gz | docker exec -i myapp_postgres psql -U postgres -d myapp_dev
```

#### Common Tasks

**Create Database:**

```sql
CREATE DATABASE my_new_db;
```

**Create User:**

```sql
CREATE USER myuser WITH PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE myapp_dev TO myuser;
```

**List Databases:**

```sql
\l
-- or
SELECT datname FROM pg_database;
```

**List Tables:**

```sql
\dt
-- or
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

**Table Size:**

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

### Hasura GraphQL Engine

**Instant GraphQL API for your PostgreSQL database**

#### Overview

| Property         | Value                           |
| ---------------- | ------------------------------- |
| **Image**        | `hasura/graphql-engine:v2.44.0` |
| **Port**         | 8080                            |
| **Console**      | http://localhost:8080/console   |
| **API Endpoint** | http://api.localhost/v1/graphql |
| **Admin Secret** | `hasura-admin-secret-dev` (dev) |
| **Health Check** | http://localhost:8080/healthz   |

#### Features

- **Auto-Generated API** - CRUD operations from database schema
- **Real-time Subscriptions** - Live data updates via WebSocket
- **Authorization** - Row-level permissions and role-based access
- **Event Triggers** - React to database changes
- **Remote Schemas** - Combine multiple GraphQL APIs
- **Actions** - Custom business logic endpoints
- **RESTified Endpoints** - Convert GraphQL to REST
- **Query Caching** - Response caching for performance
- **API Limits** - Rate limiting and depth limiting

#### Configuration

**Environment Variables:**

```bash
HASURA_GRAPHQL_DATABASE_URL=postgres://postgres:postgres-dev-password@postgres:5432/myapp_dev
HASURA_GRAPHQL_ADMIN_SECRET=hasura-admin-secret-dev
HASURA_GRAPHQL_JWT_SECRET={"type":"HS256","key":"development-secret-key-minimum-32-characters-long"}
HASURA_GRAPHQL_ENABLE_CONSOLE=true
HASURA_GRAPHQL_DEV_MODE=true
HASURA_GRAPHQL_ENABLED_LOG_TYPES=startup,http-log,webhook-log,websocket-log
HASURA_GRAPHQL_ENABLE_TELEMETRY=false
HASURA_GRAPHQL_CORS_DOMAIN=*
HASURA_GRAPHQL_UNAUTHORIZED_ROLE=public
```

#### Using the Console

**Access Console:**

```bash
# Direct access
open http://localhost:8080/console

# Or via nself CLI
nself console
```

**Console Features:**

- **DATA**: Manage tables, relationships, permissions
- **ACTIONS**: Define custom GraphQL mutations
- **REMOTE SCHEMAS**: Integrate external GraphQL APIs
- **EVENTS**: Set up event triggers and scheduled triggers
- **API**: GraphQL playground
- **SETTINGS**: Metadata management

#### GraphQL Queries

**Basic Query:**

```graphql
query GetUsers {
  users {
    id
    name
    email
    created_at
  }
}
```

**Filtered Query:**

```graphql
query GetActiveUsers {
  users(where: { active: { _eq: true } }) {
    id
    name
  }
}
```

**Pagination:**

```graphql
query GetUsersPaginated {
  users(limit: 10, offset: 0, order_by: { created_at: desc }) {
    id
    name
  }
}
```

**Relationships:**

```graphql
query GetUsersWithPosts {
  users {
    id
    name
    posts {
      id
      title
      content
    }
  }
}
```

**Aggregations:**

```graphql
query GetUserStats {
  users_aggregate {
    aggregate {
      count
      max {
        created_at
      }
      min {
        created_at
      }
    }
  }
}
```

#### Mutations

**Insert:**

```graphql
mutation CreateUser {
  insert_users_one(object: { name: "John Doe", email: "john@example.com" }) {
    id
    name
  }
}
```

**Update:**

```graphql
mutation UpdateUser {
  update_users_by_pk(pk_columns: { id: "123" }, _set: { name: "Jane Doe" }) {
    id
    name
  }
}
```

**Delete:**

```graphql
mutation DeleteUser {
  delete_users_by_pk(id: "123") {
    id
  }
}
```

**Batch Insert:**

```graphql
mutation CreateMultipleUsers {
  insert_users(
    objects: [
      { name: "Alice", email: "alice@example.com" }
      { name: "Bob", email: "bob@example.com" }
    ]
  ) {
    affected_rows
    returning {
      id
      name
    }
  }
}
```

#### Subscriptions

**Subscribe to Table:**

```graphql
subscription WatchUsers {
  users {
    id
    name
    email
  }
}
```

**Filtered Subscription:**

```graphql
subscription WatchActiveUsers {
  users(where: { active: { _eq: true } }) {
    id
    name
    status
  }
}
```

**Subscribe to Specific Record:**

```graphql
subscription WatchUser($userId: uuid!) {
  users_by_pk(id: $userId) {
    id
    name
    email
    updated_at
  }
}
```

#### Permissions

**Define Permissions in Console:**

1. Go to DATA → [table] → Permissions
2. Add role (e.g., "user")
3. Configure operations:

**Select Permission (Read):**

```json
{
  "id": {
    "_eq": "X-Hasura-User-Id"
  }
}
```

**Insert Permission (Create):**

```json
{
  "user_id": {
    "_eq": "X-Hasura-User-Id"
  }
}
```

**Update Permission:**

```json
{
  "id": {
    "_eq": "X-Hasura-User-Id"
  }
}
```

**Delete Permission:**

```json
{
  "id": {
    "_eq": "X-Hasura-User-Id"
  }
}
```

#### Event Triggers

**Create Event Trigger:**

1. Go to EVENTS → Event Triggers → Create
2. Configure:
   - **Table**: users
   - **Operation**: Insert
   - **Webhook**: http://myapp:3000/webhooks/user-created

**Payload:**

```json
{
  "event": {
    "op": "INSERT",
    "data": {
      "old": null,
      "new": {
        "id": "123",
        "name": "John",
        "email": "john@example.com"
      }
    }
  },
  "created_at": "2026-02-01T12:00:00Z",
  "id": "event-id",
  "trigger": {
    "name": "user_created"
  },
  "table": {
    "schema": "public",
    "name": "users"
  }
}
```

#### Actions

**Define Custom Action:**

```graphql
type Mutation {
  sendEmail(to: String!, subject: String!, body: String!): SendEmailOutput
}

type SendEmailOutput {
  success: Boolean!
  messageId: String
}
```

**Handler Endpoint:**

```javascript
// POST /actions/send-email
app.post('/actions/send-email', async (req, res) => {
  const { to, subject, body } = req.body.input

  // Send email logic
  const result = await sendEmail(to, subject, body)

  res.json({
    success: true,
    messageId: result.id,
  })
})
```

#### Remote Schemas

**Add Remote Schema:**

1. Go to REMOTE SCHEMAS → Add
2. GraphQL Server URL: `https://api.github.com/graphql`
3. Headers:
   ```json
   {
     "Authorization": "Bearer YOUR_GITHUB_TOKEN"
   }
   ```

**Query Remote Schema:**

```graphql
query {
  github_viewer {
    login
    name
    repositories(first: 5) {
      nodes {
        name
        description
      }
    }
  }
}
```

#### Metadata Management

**Export Metadata:**

```bash
# Using Hasura CLI
hasura metadata export

# Using nself
nself exec hasura hasura-cli metadata export
```

**Apply Metadata:**

```bash
hasura metadata apply
```

**Reload Metadata:**

```bash
hasura metadata reload
```

---

### Nhost Auth

**Complete authentication service with social providers**

#### Overview

| Property          | Value                              |
| ----------------- | ---------------------------------- |
| **Image**         | `nhost/hasura-auth:0.36.0`         |
| **Port**          | 4000                               |
| **API Endpoint**  | http://auth.localhost/v1/auth      |
| **Health Check**  | http://localhost:4001/healthz      |
| **JWT Algorithm** | HS256                              |
| **Token Expiry**  | 15 min (access), 30 days (refresh) |

#### Features

- **Email/Password** - Traditional authentication
- **Magic Links** - Passwordless email login
- **Social OAuth** - Google, GitHub, Apple, Facebook, etc.
- **Multi-Factor Auth** - TOTP (Google Authenticator)
- **Email Verification** - Confirm email addresses
- **Password Reset** - Secure password recovery
- **Session Management** - JWT tokens with refresh
- **WebAuthn** - Biometric authentication (optional)
- **Anonymous Users** - Guest access

#### Supported Auth Providers

**OAuth Providers:**

- Google
- GitHub
- Facebook
- Apple
- Microsoft
- LinkedIn
- Twitter
- GitLab
- Bitbucket
- Discord
- Twitch
- Spotify
- ID.me (for military/veterans)

#### Configuration

**Enable Providers (.backend/.env):**

```bash
# Email/Password (always enabled)
AUTH_EMAIL_SIGNIN_EMAIL_VERIFIED_REQUIRED=false

# Magic Links
AUTH_EMAIL_PASSWORDLESS_ENABLED=true

# Google OAuth
AUTH_PROVIDER_GOOGLE_ENABLED=true
AUTH_PROVIDER_GOOGLE_CLIENT_ID=your-client-id
AUTH_PROVIDER_GOOGLE_CLIENT_SECRET=your-client-secret

# GitHub OAuth
AUTH_PROVIDER_GITHUB_ENABLED=true
AUTH_PROVIDER_GITHUB_CLIENT_ID=your-client-id
AUTH_PROVIDER_GITHUB_CLIENT_SECRET=your-client-secret

# Apple OAuth
AUTH_PROVIDER_APPLE_ENABLED=true
AUTH_PROVIDER_APPLE_CLIENT_ID=your-client-id
AUTH_PROVIDER_APPLE_TEAM_ID=your-team-id
AUTH_PROVIDER_APPLE_KEY_ID=your-key-id
AUTH_PROVIDER_APPLE_PRIVATE_KEY=your-private-key

# Multi-Factor Auth
AUTH_MFA_ENABLED=true
AUTH_MFA_TOTP_ISSUER=MyApp
```

#### API Endpoints

**Sign Up (Email/Password):**

```bash
POST http://auth.localhost/v1/auth/signup/email-password

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "options": {
    "userData": {
      "displayName": "John Doe"
    }
  }
}
```

**Sign In (Email/Password):**

```bash
POST http://auth.localhost/v1/auth/signin/email-password

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**

```json
{
  "session": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "accessTokenExpiresIn": 900,
    "refreshToken": "uuid-refresh-token",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "John Doe",
      "emailVerified": false,
      "phoneNumber": null,
      "createdAt": "2026-02-01T12:00:00Z"
    }
  }
}
```

**Magic Link (Passwordless):**

```bash
POST http://auth.localhost/v1/auth/signin/passwordless/email

{
  "email": "user@example.com",
  "options": {
    "redirectTo": "http://myapp.localhost/auth/callback"
  }
}
```

**OAuth Sign In:**

```bash
# Redirect user to:
GET http://auth.localhost/v1/auth/signin/provider/google?redirectTo=http://myapp.localhost/auth/callback

# User authorizes, then redirected back with:
http://myapp.localhost/auth/callback?refreshToken=uuid-refresh-token
```

**Refresh Token:**

```bash
POST http://auth.localhost/v1/auth/token

{
  "refreshToken": "uuid-refresh-token"
}
```

**Sign Out:**

```bash
POST http://auth.localhost/v1/auth/signout

{
  "refreshToken": "uuid-refresh-token"
}
```

**Change Password:**

```bash
POST http://auth.localhost/v1/auth/user/password

Headers:
  Authorization: Bearer {accessToken}

{
  "newPassword": "NewSecurePassword123!"
}
```

**Request Password Reset:**

```bash
POST http://auth.localhost/v1/auth/user/password/reset

{
  "email": "user@example.com",
  "options": {
    "redirectTo": "http://myapp.localhost/auth/reset-password"
  }
}
```

#### Client Integration

**JavaScript/TypeScript:**

```typescript
import { NhostClient } from '@nhost/nhost-js'

const nhost = new NhostClient({
  subdomain: 'localhost',
  region: '',
  authUrl: 'http://auth.localhost/v1/auth',
  graphqlUrl: 'http://api.localhost/v1/graphql',
  storageUrl: 'http://storage.localhost/v1/storage',
})

// Sign up
const { session, error } = await nhost.auth.signUp({
  email: 'user@example.com',
  password: 'SecurePassword123!',
})

// Sign in
const { session, error } = await nhost.auth.signIn({
  email: 'user@example.com',
  password: 'SecurePassword123!',
})

// Get user
const user = nhost.auth.getUser()

// Sign out
await nhost.auth.signOut()
```

**React:**

```typescript
import { NhostProvider, useAuth, useSignInEmailPassword } from '@nhost/react';

function App() {
  return (
    <NhostProvider nhost={nhost}>
      <AuthComponent />
    </NhostProvider>
  );
}

function AuthComponent() {
  const { isAuthenticated, user } = useAuth();
  const { signInEmailPassword, isLoading, error } = useSignInEmailPassword();

  const handleSignIn = async () => {
    await signInEmailPassword('user@example.com', 'password');
  };

  if (isAuthenticated) {
    return <div>Welcome {user?.displayName}!</div>;
  }

  return <button onClick={handleSignIn}>Sign In</button>;
}
```

#### JWT Token Structure

**Access Token (decoded):**

```json
{
  "sub": "user-uuid",
  "iat": 1706788800,
  "exp": 1706789700,
  "https://hasura.io/jwt/claims": {
    "x-hasura-allowed-roles": ["user", "me"],
    "x-hasura-default-role": "user",
    "x-hasura-user-id": "user-uuid",
    "x-hasura-user-is-anonymous": "false"
  }
}
```

#### User Metadata

**Default User Fields:**

- `id` - UUID
- `email` - Email address
- `displayName` - User's display name
- `phoneNumber` - Phone number (optional)
- `avatarUrl` - Profile picture URL
- `emailVerified` - Email verification status
- `phoneNumberVerified` - Phone verification status
- `locale` - User's preferred locale
- `createdAt` - Account creation timestamp
- `metadata` - Custom JSON metadata

**Update User Metadata:**

```bash
POST http://auth.localhost/v1/auth/user

Headers:
  Authorization: Bearer {accessToken}

{
  "metadata": {
    "customField": "value",
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  }
}
```

---

### Nginx

**Reverse proxy with SSL/TLS termination**

#### Overview

| Property      | Value                        |
| ------------- | ---------------------------- |
| **Image**     | `nginx:alpine`               |
| **Ports**     | 80 (HTTP), 443 (HTTPS)       |
| **Config**    | `.backend/nginx/nginx.conf`  |
| **Sites**     | `.backend/nginx/conf.d/`     |
| **SSL Certs** | `.backend/ssl/certificates/` |

#### Features

- **Reverse Proxy** - Route requests to services
- **SSL/TLS** - Automatic HTTPS
- **Load Balancing** - Distribute traffic
- **Static Files** - Serve frontend assets
- **WebSocket** - Proxy WebSocket connections
- **Compression** - Gzip compression
- **Caching** - Response caching
- **Rate Limiting** - Prevent abuse

#### Configuration

**Main Config (.backend/nginx/nginx.conf):**

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml application/atom+xml image/svg+xml
               text/x-component text/x-cross-domain-policy;

    # Include site configurations
    include /etc/nginx/conf.d/*.conf;
}
```

**Site Config (.backend/nginx/conf.d/default.conf):**

```nginx
# API subdomain
server {
    listen 80;
    server_name api.localhost;

    location / {
        proxy_pass http://hasura:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Auth subdomain
server {
    listen 80;
    server_name auth.localhost;

    location / {
        proxy_pass http://auth:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Storage subdomain
server {
    listen 80;
    server_name storage.localhost;

    location / {
        proxy_pass http://storage:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # File upload settings
        client_max_body_size 100M;
        proxy_request_buffering off;
    }
}
```

#### SSL Configuration

**Enable HTTPS:**

```nginx
server {
    listen 443 ssl http2;
    server_name api.localhost;

    ssl_certificate /etc/nginx/ssl/localhost/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/localhost/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://hasura:8080;
        # ... proxy settings
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.localhost;
    return 301 https://$server_name$request_uri;
}
```

---

## Optional Services

Enable these services via environment variables in `.backend/.env`.

---

### MinIO

**S3-compatible object storage**

**Enable:** `MINIO_ENABLED=true`

| Property         | Value                 |
| ---------------- | --------------------- |
| **Image**        | `minio/minio:latest`  |
| **API Port**     | 9000                  |
| **Console Port** | 9001                  |
| **Console URL**  | http://localhost:9001 |
| **Access Key**   | `minioadmin`          |
| **Secret Key**   | `minioadmin`          |

#### Features

- **S3 Compatible** - Works with AWS S3 SDKs
- **Bucket Management** - Create/delete buckets
- **Object Versioning** - Track file versions
- **Lifecycle Policies** - Auto-delete old files
- **Access Control** - Bucket and object policies
- **Encryption** - Server-side encryption
- **Browser UI** - Web console for management

#### Configuration

**Create Bucket:**

```bash
# Using MinIO Client (mc)
docker exec -it myapp_minio mc mb /data/my-bucket

# Or via MinIO console
open http://localhost:9001
```

**Upload File:**

```bash
# Using mc
docker exec -it myapp_minio mc cp /path/to/file /data/my-bucket/

# Using AWS S3 SDK
```

**Access Control Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": ["*"] },
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::my-bucket/*"]
    }
  ]
}
```

#### Client Integration

**JavaScript (AWS SDK):**

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
})

// Upload file
await s3.send(
  new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: 'file.txt',
    Body: fileBuffer,
  })
)
```

---

### Redis

**High-performance in-memory data store**

**Enable:** `REDIS_ENABLED=true`

| Property        | Value            |
| --------------- | ---------------- |
| **Image**       | `redis:7-alpine` |
| **Port**        | 6379             |
| **Persistence** | RDB + AOF        |
| **Eviction**    | allkeys-lru      |

#### Features

- **Caching** - Lightning-fast cache layer
- **Session Storage** - User sessions
- **Pub/Sub** - Message broker
- **Rate Limiting** - Request throttling
- **Job Queues** - Background jobs (with Bull)
- **Sorted Sets** - Leaderboards, rankings
- **Geospatial** - Location-based queries

#### Use Cases

**Session Storage:**

```javascript
import Redis from 'ioredis'
const redis = new Redis(6379, 'localhost')

// Store session
await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(userData))

// Get session
const session = await redis.get(`session:${sessionId}`)
```

**Caching:**

```javascript
// Cache API response
await redis.setex(`cache:users:${userId}`, 300, JSON.stringify(userData))

// Get cached data
const cached = await redis.get(`cache:users:${userId}`)
if (cached) return JSON.parse(cached)
```

**Rate Limiting:**

```javascript
// Increment request count
const count = await redis.incr(`ratelimit:${ip}:${minute}`)
await redis.expire(`ratelimit:${ip}:${minute}`, 60)

if (count > 100) {
  throw new Error('Rate limit exceeded')
}
```

**Pub/Sub:**

```javascript
// Publisher
await redis.publish(
  'notifications',
  JSON.stringify({
    type: 'new_message',
    userId: '123',
  })
)

// Subscriber
redis.subscribe('notifications')
redis.on('message', (channel, message) => {
  console.log('Received:', JSON.parse(message))
})
```

---

### Hasura Storage

**File upload/download service**

**Enable:** Automatically enabled with MinIO

| Property         | Value                               |
| ---------------- | ----------------------------------- |
| **Image**        | `nhost/hasura-storage:0.6.1`        |
| **Port**         | 5001                                |
| **API Endpoint** | http://storage.localhost/v1/storage |
| **Backend**      | MinIO                               |

#### Features

- **File Upload** - Direct uploads to S3/MinIO
- **Access Control** - Permission-based access
- **Image Transformation** - Resize, crop, format
- **Pre-signed URLs** - Temporary download links
- **Virus Scanning** - Optional ClamAV integration

#### Upload File

**HTTP:**

```bash
POST http://storage.localhost/v1/storage/files

Headers:
  Authorization: Bearer {accessToken}

Body (multipart/form-data):
  file: [file data]
  bucketId: "public"
```

**JavaScript:**

```javascript
import { NhostClient } from '@nhost/nhost-js';

const nhost = new NhostClient({...});

const { fileMetadata, error } = await nhost.storage.upload({
  file,
  bucketId: 'public',
});
```

#### Download File

```bash
GET http://storage.localhost/v1/storage/files/{fileId}
```

#### Image Transformation

```bash
GET http://storage.localhost/v1/storage/files/{fileId}?w=300&h=300&q=80
```

Parameters:

- `w` - Width
- `h` - Height
- `q` - Quality (0-100)
- `b` - Blur
- `fit` - Fit mode (cover, contain, fill)

---

### Mailpit

**Email testing for development**

**Enable:** `MAILPIT_ENABLED=true` (enabled by default in dev)

| Property      | Value                    |
| ------------- | ------------------------ |
| **Image**     | `axllent/mailpit:latest` |
| **SMTP Port** | 1025                     |
| **UI Port**   | 8025                     |
| **Web UI**    | http://localhost:8025    |

#### Features

- **Email Capture** - Catch all outgoing emails
- **Web UI** - View emails in browser
- **API Access** - Programmatic access
- **Search** - Full-text search emails
- **Attachments** - View email attachments
- **No Auth** - No login required (dev only)

#### Send Email

**SMTP:**

```javascript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransporter({
  host: 'localhost',
  port: 1025,
  secure: false,
  auth: false,
})

await transporter.sendMail({
  from: 'noreply@myapp.com',
  to: 'user@example.com',
  subject: 'Test Email',
  html: '<h1>Hello!</h1><p>This is a test email.</p>',
})
```

**View Emails:**

```bash
open http://localhost:8025
```

---

### MeiliSearch

**Lightning-fast full-text search**

**Enable:** `MEILISEARCH_ENABLED=true`

| Property         | Value                         |
| ---------------- | ----------------------------- |
| **Image**        | `getmeili/meilisearch:latest` |
| **Port**         | 7700                          |
| **API Endpoint** | http://localhost:7700         |

#### Features

- **Instant Search** - Search-as-you-type
- **Typo Tolerance** - Handles spelling errors
- **Faceted Search** - Filter and facet results
- **Ranking** - Custom ranking rules
- **Multi-Language** - 100+ languages
- **Synonyms** - Define search synonyms

#### Index Documents

**HTTP:**

```bash
POST http://localhost:7700/indexes/users/documents

[
  {"id": 1, "name": "Alice", "email": "alice@example.com"},
  {"id": 2, "name": "Bob", "email": "bob@example.com"}
]
```

**JavaScript:**

```javascript
import { MeiliSearch } from 'meilisearch'

const client = new MeiliSearch({
  host: 'http://localhost:7700',
})

const index = client.index('users')
await index.addDocuments([
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
])
```

#### Search

```javascript
const results = await index.search('ali', {
  limit: 10,
  attributesToHighlight: ['name'],
  filter: 'active = true',
})
```

---

### Serverless Functions

**Custom business logic endpoints**

**Enable:** `FUNCTIONS_ENABLED=true`

| Property       | Value                      |
| -------------- | -------------------------- |
| **Runtime**    | Node.js, Python, Go        |
| **Deployment** | Hot reload in dev          |
| **Endpoint**   | http://functions.localhost |

#### Function Structure

```
functions/
├── hello.js          # Simple function
├── email.js          # Send email function
└── package.json      # Dependencies
```

#### Example Function

**functions/hello.js:**

```javascript
export default async (req, res) => {
  const { name } = req.body

  res.json({
    message: `Hello, ${name}!`,
    timestamp: new Date().toISOString(),
  })
}
```

**Call Function:**

```bash
POST http://functions.localhost/hello

{"name": "World"}
```

---

### MLflow

**Machine learning experiment tracking**

**Enable:** `MLFLOW_ENABLED=true`

| Property      | Value                  |
| ------------- | ---------------------- |
| **Image**     | `mlflow/mlflow:latest` |
| **Port**      | 5000                   |
| **UI**        | http://localhost:5000  |
| **Backend**   | PostgreSQL             |
| **Artifacts** | MinIO                  |

#### Log Experiment

```python
import mlflow

mlflow.set_tracking_uri('http://localhost:5000')
mlflow.set_experiment('my-experiment')

with mlflow.start_run():
    mlflow.log_param('learning_rate', 0.01)
    mlflow.log_metric('accuracy', 0.95)
    mlflow.log_artifact('model.pkl')
```

---

## Monitoring Services

**Enable:** `MONITORING_ENABLED=true`

Enables 10 services for complete observability:

| Service        | Port  | Purpose             |
| -------------- | ----- | ------------------- |
| Prometheus     | 9090  | Metrics collection  |
| Grafana        | 3000  | Dashboards          |
| Loki           | 3100  | Log aggregation     |
| Promtail       | 9080  | Log collection      |
| Alertmanager   | 9093  | Alerts              |
| Node Exporter  | 9100  | Host metrics        |
| cAdvisor       | 8080  | Container metrics   |
| Jaeger         | 16686 | Distributed tracing |
| Tempo          | 3200  | Trace storage       |
| OTEL Collector | 4317  | Telemetry           |

---

## Administrative Services

### nself-admin

**Web-based administration panel**

**Enable:** `NSELF_ADMIN_ENABLED=true`

| Property | Value                 |
| -------- | --------------------- |
| **Port** | 3021 (NOT 3100)       |
| **URL**  | http://localhost:3021 |

**Features:**

- Service health dashboard
- Log viewer
- Database browser
- User management
- Configuration editor
- Metrics overview

---

## Service Integration

### Full Stack Example

**Backend:** nself CLI
**Frontend:** Next.js
**Features:** Auth, GraphQL API, File Storage, Search

**Frontend Integration:**

```typescript
// lib/nhost.ts
import { NhostClient } from '@nhost/nhost-js';

export const nhost = new NhostClient({
  subdomain: 'localhost',
  authUrl: 'http://auth.localhost/v1/auth',
  graphqlUrl: 'http://api.localhost/v1/graphql',
  storageUrl: 'http://storage.localhost/v1/storage',
});

// app/providers.tsx
import { NhostProvider } from '@nhost/nextjs';

export function Providers({ children }) {
  return (
    <NhostProvider nhost={nhost}>
      {children}
    </NhostProvider>
  );
}
```

---

## Best Practices

### Development

1. **Use Dev Secrets** - Don't use production secrets locally
2. **Enable Console** - Hasura console for rapid development
3. **Hot Reload** - Enable file watching
4. **Mailpit** - Test emails without sending
5. **Log Verbosity** - Enable detailed logs

### Production

1. **Disable Console** - Turn off Hasura console
2. **Strong Secrets** - Use 32+ character random strings
3. **Enable SSL** - Always use HTTPS
4. **Resource Limits** - Set memory/CPU limits
5. **Monitoring** - Enable full monitoring stack

### Security

1. **Change Default Passwords** - Never use defaults in production
2. **JWT Secrets** - Use strong, unique secrets
3. **CORS** - Restrict to your domains
4. **Rate Limiting** - Protect against abuse
5. **Firewall** - Restrict database access

### Performance

1. **Connection Pooling** - Use PgBouncer
2. **Caching** - Enable Redis for sessions
3. **CDN** - Use CDN for static assets
4. **Compression** - Enable gzip in nginx
5. **Indexes** - Add database indexes

---

## Next Steps

- **Configuration Guide** → [Configuration.md](../configuration/Configuration.md)
- **Database Migrations** → [Migrations.md](./Migrations.md)
- **Troubleshooting** → [Troubleshooting.md](./Troubleshooting.md)
- **Architecture Deep Dive** → [Architecture.md](../reference/Architecture.md)

---

**Questions?** Check the [FAQ](./Troubleshooting.md#faq) or join our [Discord](https://discord.gg/nself).
