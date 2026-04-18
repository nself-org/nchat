# nself CLI - Quick Start Guide

**Time to Complete**: 5 minutes
**Version**: v1.0.9
**Prerequisites**: Docker installed, nself CLI installed

---

## Get Started in 5 Minutes

This guide will get you from zero to a fully functional backend in 5 minutes.

---

## Step 1: Verify Prerequisites (30 seconds)

```bash
# Check Docker
docker --version
# Should show: Docker version 20.10.0+

# Check nself CLI
nself --version
# Should show: nself version v1.0.9

# Check disk space (10GB+ recommended)
df -h
```

✅ **All green?** Continue to Step 2.

❌ **Missing something?** See [Installation Guide](./Installation.md)

---

## Step 2: Create Your Project (30 seconds)

```bash
# Create new project
nself init my-app

# What just happened?
# ✓ Created my-app/.backend directory
# ✓ Generated docker-compose.yml
# ✓ Created .env configuration
# ✓ Set up SSL certificates
# ✓ Configured nginx routing
```

**Output:**

```
🚀 Initializing new nself project: my-app
✓ Created directory structure
✓ Generated configuration files
✓ Created SSL certificates
✓ Set up database schema

📁 Project created at: ./my-app/.backend

Next steps:
  cd my-app/.backend
  nself start
```

---

## Step 3: Start Your Backend (2 minutes)

```bash
# Navigate to backend directory
cd my-app/.backend

# Start all services
nself start

# What's starting?
# ✓ PostgreSQL 16 (database)
# ✓ Hasura GraphQL Engine (API)
# ✓ Nhost Auth (authentication)
# ✓ MinIO (file storage)
# ✓ Storage Service (upload/download)
# ✓ Redis (caching)
# ✓ Mailpit (email testing)
# ✓ Nginx (reverse proxy)
```

**Output:**

```
🐳 Starting nself services...

[1/8] Starting PostgreSQL... ✓
[2/8] Starting Hasura... ✓
[3/8] Starting Auth... ✓
[4/8] Starting MinIO... ✓
[5/8] Starting Storage... ✓
[6/8] Starting Redis... ✓
[7/8] Starting Mailpit... ✓
[8/8] Starting Nginx... ✓

✓ All services started successfully!

🌐 Access URLs:
  GraphQL API: http://api.localhost/v1/graphql
  Hasura Console: http://localhost:8080/console
  Auth Service: http://auth.localhost/v1/auth
  Email Testing: http://localhost:8025

📚 Documentation: https://docs.nself.org
```

---

## Step 4: Verify Services (1 minute)

```bash
# Check service status
nself status
```

**Expected Output:**

```
Service     Status    Port    URL
──────────────────────────────────────────────────────
postgres    healthy   5432    localhost:5432
hasura      healthy   8080    http://localhost:8080
auth        healthy   4000    http://auth.localhost
minio       healthy   9000    http://storage.localhost
storage     healthy   5001    (internal)
redis       healthy   6379    localhost:6379
mailpit     healthy   8025    http://localhost:8025
nginx       healthy   80/443  http://localhost
```

All services showing **healthy**? Perfect! 🎉

---

## Step 5: Access Your Services (1 minute)

### Hasura Console (GraphQL API)

```bash
# Open Hasura Console
open http://localhost:8080/console

# Or use curl
curl http://api.localhost/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

### GraphQL Playground

Navigate to `http://localhost:8080/console` and try this query:

```graphql
query GetTables {
  __schema {
    types {
      name
      kind
    }
  }
}
```

### Email Testing (Mailpit)

```bash
# Open Mailpit UI
open http://localhost:8025

# Send test email
curl http://localhost:1025 \
  -H "Content-Type: text/plain" \
  --data-binary "Subject: Test Email
From: test@example.com
To: recipient@example.com

This is a test email from nself!"
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it my-app_postgres psql -U postgres -d my-app_dev

# Or use your favorite database tool
# Host: localhost
# Port: 5432
# Database: my-app_dev
# Username: postgres
# Password: postgres-dev-password
```

---

## Step 6: Create Your First Table (30 seconds)

Using Hasura Console:

1. Open http://localhost:8080/console
2. Go to **DATA** tab
3. Click **Create Table**
4. Table name: `users`
5. Add columns:
   - `id` (UUID, default: `gen_random_uuid()`, primary key)
   - `name` (Text)
   - `email` (Text, unique)
   - `created_at` (Timestamp, default: `now()`)
6. Click **Add Table**

**Or use SQL:**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Step 7: Test GraphQL API (30 seconds)

### Create a User (Mutation)

```graphql
mutation CreateUser {
  insert_users_one(object: { name: "Alice Johnson", email: "alice@example.com" }) {
    id
    name
    email
    created_at
  }
}
```

### Fetch Users (Query)

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

### Subscribe to Changes (Subscription)

```graphql
subscription WatchUsers {
  users {
    id
    name
    email
    created_at
  }
}
```

---

## Step 8: Connect Your Frontend (Optional)

### Next.js Example

**Install dependencies:**

```bash
npm install @apollo/client graphql
```

**Create Apollo Client** (`lib/apollo-client.ts`):

```typescript
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: 'http://api.localhost/v1/graphql',
  }),
  cache: new InMemoryCache(),
})

export default apolloClient
```

**Use in component:**

```typescript
'use client';

import { useQuery, gql } from '@apollo/client';

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      name
      email
    }
  }
`;

export default function UserList() {
  const { data, loading, error } = useQuery(GET_USERS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {data.users.map((user) => (
        <li key={user.id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
}
```

### React Example

```typescript
import { ApolloProvider } from '@apollo/client';
import apolloClient from './lib/apollo-client';
import UserList from './components/UserList';

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <UserList />
    </ApolloProvider>
  );
}
```

### Vue Example

```typescript
import { createApp, provide, h } from 'vue'
import { DefaultApolloClient } from '@vue/apollo-composable'
import { ApolloClient, InMemoryCache } from '@apollo/client/core'

const apolloClient = new ApolloClient({
  uri: 'http://api.localhost/v1/graphql',
  cache: new InMemoryCache(),
})

const app = createApp({
  setup() {
    provide(DefaultApolloClient, apolloClient)
  },
  render: () => h(App),
})
```

---

## Common Commands

### Service Management

```bash
# Start all services
nself start

# Stop all services
nself stop

# Restart all services
nself restart

# Check status
nself status

# View logs
nself logs

# View specific service logs
nself logs postgres
nself logs hasura
```

### Development

```bash
# Open Hasura Console
nself console

# View all URLs
nself urls

# Run database migrations
nself migrate up

# Reset database (WARNING: deletes all data!)
nself db:reset
```

### Cleanup

```bash
# Stop and remove containers
nself down

# Stop, remove containers, and delete volumes (WARNING!)
nself down --volumes
```

---

## Activating the nChat Bundle

nself-chat's advanced features (voice/video calls, recording, moderation, bots, SSO) require the **nChat pro plugin bundle**. Install it after your backend is running:

```bash
cd chat/.backend

# Set your membership key (obtain at https://nself.org/pricing)
nself license set nself_pro_xxxxx...

# Install all 7 plugins in one call
nself plugin install chat livekit recording moderation bots realtime auth

# Rebuild and start
nself build && nself start
```

Without a license, core messaging runs on the 25 free plugins. Pro features hide gracefully via runtime detection.

See [nChat Bundle](../plugins/nChat-Bundle.md) for full plugin reference and env-var details.

---

## What's Next?

### Learn More

1. **Explore Services** → [Services.md](./Services.md)
   - PostgreSQL configuration
   - Hasura features
   - Authentication setup
   - File storage

2. **Master Commands** → [Commands.md](./Commands.md)
   - All available commands
   - Command options
   - Advanced usage

3. **Configure Your Stack** → [Configuration.md](../configuration/Configuration.md)
   - Enable optional services
   - Customize ports
   - Set environment variables
   - Configure SSL

4. **Database Migrations** → [Migrations.md](./Migrations.md)
   - Create migrations
   - Apply migrations
   - Rollback changes
   - Migration best practices

### Build Your Application

Now that your backend is running:

1. ✅ **Define your data model** in PostgreSQL
2. ✅ **Set up authentication** with Nhost Auth
3. ✅ **Configure permissions** in Hasura
4. ✅ **Build your frontend** with your favorite framework
5. ✅ **Deploy to production** (see Deployment guide)

---

## Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker ps

# Check for port conflicts
lsof -i :5432  # PostgreSQL
lsof -i :8080  # Hasura
lsof -i :6379  # Redis

# Check logs
nself logs
```

### Can't Access URLs

```bash
# Check nginx is running
docker ps | grep nginx

# Test localhost resolution
ping api.localhost

# Check /etc/hosts (Linux/macOS)
cat /etc/hosts

# Restart Docker network
nself restart
```

### Database Connection Error

```bash
# Check PostgreSQL is healthy
docker ps | grep postgres

# Check logs
nself logs postgres

# Test connection
docker exec -it my-app_postgres pg_isready -U postgres
```

### Out of Memory

```bash
# Check Docker resources
docker stats

# Increase Docker memory (Docker Desktop)
# Settings → Resources → Memory → 8GB+

# Restart Docker Desktop
```

---

## Quick Reference

### Service URLs

| Service            | URL                                 | Purpose                  |
| ------------------ | ----------------------------------- | ------------------------ |
| **GraphQL API**    | http://api.localhost/v1/graphql     | Main API endpoint        |
| **Hasura Console** | http://localhost:8080/console       | GraphQL admin UI         |
| **Auth API**       | http://auth.localhost/v1/auth       | Authentication endpoints |
| **Storage API**    | http://storage.localhost/v1/storage | File upload/download     |
| **Email Testing**  | http://localhost:8025               | Mailpit web UI           |
| **MinIO Console**  | http://localhost:9001               | Object storage admin     |

### Default Credentials

| Service          | Username   | Password                |
| ---------------- | ---------- | ----------------------- |
| **PostgreSQL**   | postgres   | postgres-dev-password   |
| **Hasura Admin** | -          | hasura-admin-secret-dev |
| **MinIO**        | minioadmin | minioadmin              |

### Important Files

| File                          | Purpose               |
| ----------------------------- | --------------------- |
| `.backend/.env`               | Environment variables |
| `.backend/docker-compose.yml` | Service definitions   |
| `.backend/hasura/metadata/`   | Hasura configuration  |
| `.backend/hasura/migrations/` | Database migrations   |
| `.backend/nginx/nginx.conf`   | Nginx configuration   |
| `.backend/ssl/certificates/`  | SSL certificates      |

---

## Next Steps

🎯 **Ready to build?**

1. Read the [Services Guide](./Services.md) to understand each component
2. Check out [Commands Reference](./Commands.md) for all available commands
3. Learn about [Configuration](../configuration/Configuration.md) to customize your stack
4. Explore [nself-chat source code](../..) to see a real-world example

---

**Questions?** Join our [Discord community](https://discord.gg/nself) or check the [FAQ](./Troubleshooting.md#faq).

**Found a bug?** [Report it on GitHub](https://github.com/nself/nself/issues/new).
