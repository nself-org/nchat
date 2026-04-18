# nself CLI Documentation

**Complete documentation for the nself CLI backend infrastructure tool**

Version: v1.0.9 | Last Updated: April 18, 2026

---

## Quick Navigation

| Document                                    | Description                             | Lines       |
| ------------------------------------------- | --------------------------------------- | ----------- |
| **[Overview](./Overview.md)**               | What is nself CLI, why use it, features | 763         |
| **[Installation](./Installation.md)**       | How to install on macOS/Linux/Windows   | 836         |
| **[Quick Start](./Quick-Start.md)**         | Get started in 5 minutes                | 567         |
| **[Commands](./Commands.md)**               | Complete command reference              | 1,229       |
| **[Services](./Services.md)**               | All available services documentation    | 1,682       |
| **[Configuration](../configuration/Configuration.md)**     | How to configure nself projects         | Coming Soon |
| **[Migrations](./Migrations.md)**           | Database migration management           | Coming Soon |
| **[Troubleshooting](./Troubleshooting.md)** | Common issues and solutions             | Coming Soon |
| **[Architecture](../reference/Architecture.md)**       | How nself CLI works internally          | Coming Soon |
| **[API Reference](./API-Reference.md)**     | nself CLI API reference                 | Coming Soon |

**Total Documentation:** 5,077+ lines across 10 comprehensive guides

---

## What is nself CLI?

**nself CLI** is a comprehensive backend infrastructure tool that provides everything you need to build production-ready applications with a single command.

### One Command Infrastructure

```bash
nself init my-app
cd my-app/.backend
nself start
```

**You now have:**

- ✅ PostgreSQL 16 with 60+ extensions
- ✅ Hasura GraphQL Engine (instant API)
- ✅ Nhost Auth (complete authentication)
- ✅ MinIO (S3-compatible storage)
- ✅ Redis (caching and sessions)
- ✅ Nginx (reverse proxy + SSL)
- ✅ Mailpit (email testing)
- ✅ And more...

---

## Getting Started

### 1. **Prerequisites**

- Docker 20.10.0+
- Docker Compose v2.0.0+
- 16GB RAM (8GB minimum)
- 10GB free disk space

### 2. **Install nself CLI**

```bash
# macOS/Linux
curl -fsSL https://nself.org/install.sh | sh

# Verify installation
nself --version  # Should show v1.0.9
```

### 3. **Create Your First Project**

```bash
# Initialize project
nself init demo-app

# Start services
cd demo-app/.backend
nself start

# Check status
nself status

# View URLs
nself urls
```

### 4. **Access Your Services**

- **GraphQL API**: http://api.localhost/v1/graphql
- **Hasura Console**: http://localhost:8080/console
- **Auth API**: http://auth.localhost/v1/auth
- **Email Testing**: http://localhost:8025

---

## Documentation Overview

### For Beginners

1. **[Overview](./Overview.md)** - Understand what nself CLI is and why you should use it
2. **[Installation](./Installation.md)** - Install nself CLI on your system
3. **[Quick Start](./Quick-Start.md)** - Get up and running in 5 minutes

### For Developers

4. **[Services](./Services.md)** - Deep dive into each service (PostgreSQL, Hasura, Auth, etc.)
5. **[Commands](./Commands.md)** - Master all available commands
6. **[Configuration](../configuration/Configuration.md)** - Customize your stack
7. **[Migrations](./Migrations.md)** - Manage database schema changes

### For Advanced Users

8. **[Architecture](../reference/Architecture.md)** - Understand how nself CLI works internally
9. **[API Reference](./API-Reference.md)** - Complete API documentation
10. **[Troubleshooting](./Troubleshooting.md)** - Solve common issues

---

## Core Services

### PostgreSQL

**Production-grade relational database**

- Image: `postgres:16-alpine`
- Port: 5432
- Extensions: 60+ available (pgcrypto, uuid-ossp, pg_trgm, postgis, etc.)
- Features: Full-text search, JSON support, connection pooling

[Learn more →](./Services.md#postgresql)

### Hasura GraphQL Engine

**Instant GraphQL API for your database**

- Image: `hasura/graphql-engine:v2.44.0`
- Port: 8080
- Features: Auto-generated CRUD, real-time subscriptions, permissions, event triggers
- Console: http://localhost:8080/console

[Learn more →](./Services.md#hasura-graphql-engine)

### Nhost Auth

**Complete authentication service**

- Image: `nhost/hasura-auth:0.36.0`
- Port: 4000
- Providers: Email/password, magic links, Google, GitHub, Apple, Facebook, and more
- Features: JWT tokens, MFA, email verification, password reset

[Learn more →](./Services.md#nhost-auth)

### Nginx

**Reverse proxy with SSL/TLS**

- Image: `nginx:alpine`
- Ports: 80 (HTTP), 443 (HTTPS)
- Features: Automatic routing, SSL termination, WebSocket support, compression

[Learn more →](./Services.md#nginx)

---

## Optional Services

Enable additional services as needed:

| Service         | Enable Via                 | Purpose                                |
| --------------- | -------------------------- | -------------------------------------- |
| **MinIO**       | `MINIO_ENABLED=true`       | S3-compatible object storage           |
| **Redis**       | `REDIS_ENABLED=true`       | Caching and session management         |
| **Mailpit**     | `MAILPIT_ENABLED=true`     | Email testing (dev)                    |
| **MeiliSearch** | `MEILISEARCH_ENABLED=true` | Full-text search                       |
| **Functions**   | `FUNCTIONS_ENABLED=true`   | Serverless functions                   |
| **MLflow**      | `MLFLOW_ENABLED=true`      | ML experiment tracking                 |
| **Monitoring**  | `MONITORING_ENABLED=true`  | Full observability stack (10 services) |
| **nself-admin** | `NSELF_ADMIN_ENABLED=true` | Web admin panel (port 3021)            |

[Learn more →](./Services.md#optional-services)

---

## Quick Reference

### Common Commands

```bash
# Service management
nself start              # Start all services
nself stop               # Stop all services
nself restart            # Restart all services
nself status             # Check service health
nself logs               # View logs
nself logs -f hasura     # Follow specific service logs

# Development
nself console            # Open Hasura console
nself urls               # Show all service URLs
nself doctor             # Diagnose issues

# Database
nself db:migrate up      # Apply migrations
nself db:dump backup.sql # Create backup
nself db:reset           # Reset database (WARNING!)

# Utilities
nself exec postgres psql -U postgres  # Access PostgreSQL
nself clean              # Clean up Docker resources
nself upgrade            # Update nself CLI
```

[Full command reference →](./Commands.md)

### Service URLs

| Service            | URL                                 | Purpose                  |
| ------------------ | ----------------------------------- | ------------------------ |
| **GraphQL API**    | http://api.localhost/v1/graphql     | Main API endpoint        |
| **Hasura Console** | http://localhost:8080/console       | GraphQL admin UI         |
| **Auth API**       | http://auth.localhost/v1/auth       | Authentication endpoints |
| **Storage API**    | http://storage.localhost/v1/storage | File upload/download     |
| **Email Testing**  | http://localhost:8025               | Mailpit web UI           |
| **MinIO Console**  | http://localhost:9001               | Object storage admin     |
| **PostgreSQL**     | localhost:5432                      | Database connection      |
| **Redis**          | localhost:6379                      | Cache connection         |

### Default Credentials

| Service          | Username   | Password                |
| ---------------- | ---------- | ----------------------- |
| **PostgreSQL**   | postgres   | postgres-dev-password   |
| **Hasura Admin** | -          | hasura-admin-secret-dev |
| **MinIO**        | minioadmin | minioadmin              |

---

## Architecture

### Service Communication

```
┌─────────────────────────────────────────────────────────┐
│                     Nginx (Port 80/443)                 │
│                   SSL/TLS Termination                   │
│                   Reverse Proxy + Router                │
└────────────┬────────────────────────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌─────────┐
│ Hasura  │      │  Auth   │
│  :8080  │◄────►│  :4000  │
└────┬────┘      └────┬────┘
     │                │
     │    ┌───────────┴────────┐
     │    │                    │
     ▼    ▼                    ▼
┌──────────────┐          ┌─────────┐
│  PostgreSQL  │          │  MinIO  │
│    :5432     │          │  :9000  │
└──────────────┘          └─────────┘
     ▲                         ▲
     │                         │
     │    ┌───────────┬────────┘
     │    │           │
     ▼    ▼           ▼
┌─────────┐      ┌─────────┐
│  Redis  │      │ Storage │
│  :6379  │      │  :5001  │
└─────────┘      └─────────┘
```

[Full architecture details →](../reference/Architecture.md)

---

## Use Cases

### 1. SaaS Application

```yaml
Stack:
  - Frontend: Next.js, React, Vue
  - Backend: nself CLI (GraphQL API)
  - Database: PostgreSQL (multi-tenant)
  - Auth: Social login + email
  - Storage: User uploads to MinIO
  - Cache: Redis for sessions
  - Search: MeiliSearch
```

### 2. E-commerce Platform

```yaml
Features:
  - Product catalog (PostgreSQL)
  - Image storage (MinIO)
  - Search (MeiliSearch)
  - User accounts (Nhost Auth)
  - Shopping cart (Redis)
  - Order processing (Functions)
```

### 3. Content Management System

```yaml
Stack:
  - Content: PostgreSQL
  - Media: MinIO
  - API: Hasura GraphQL
  - Search: MeiliSearch
  - Drafts: Redis
  - Publishing: Functions
```

[More use cases →](./Overview.md#use-cases)

---

## Best Practices

### Development

- ✅ Use development secrets
- ✅ Enable Hasura console
- ✅ Enable verbose logging
- ✅ Use Mailpit for email testing
- ✅ Keep services updated

### Production

- ✅ Disable Hasura console
- ✅ Use strong secrets (32+ characters)
- ✅ Enable SSL/HTTPS
- ✅ Set resource limits
- ✅ Enable monitoring stack
- ✅ Regular backups
- ✅ Use connection pooling

### Security

- ✅ Change default passwords
- ✅ Use unique JWT secrets
- ✅ Restrict CORS domains
- ✅ Enable rate limiting
- ✅ Firewall database access
- ✅ Regular security audits

[More best practices →](./Services.md#best-practices)

---

## Comparison with Alternatives

| Feature        | nself CLI   | Firebase    | Supabase   | AWS Amplify |
| -------------- | ----------- | ----------- | ---------- | ----------- |
| **Hosting**    | Self-hosted | Cloud only  | Both       | AWS only    |
| **Cost**       | Free        | Pay per use | Free tier  | Pay per use |
| **Lock-in**    | None        | High        | Low        | High        |
| **Database**   | PostgreSQL  | Firestore   | PostgreSQL | DynamoDB    |
| **GraphQL**    | Hasura      | No          | PostgREST  | AppSync     |
| **Setup Time** | 2 minutes   | 5 minutes   | 10 minutes | 30 minutes  |

[Detailed comparison →](./Overview.md#comparison-with-alternatives)

---

## Example Projects

Explore real-world implementations:

- **[nself-chat](../..)** - Full-featured team communication platform (this project!)
- **nself-cms** - Headless content management system
- **nself-shop** - E-commerce starter
- **nself-social** - Social network boilerplate

---

## Troubleshooting

### Common Issues

**Services won't start:**

```bash
# Check Docker is running
docker ps

# Check for port conflicts
lsof -i :5432

# View logs
nself logs
```

**Can't access URLs:**

```bash
# Check nginx
docker ps | grep nginx

# Restart Docker network
nself restart
```

**Out of memory:**

```bash
# Increase Docker memory
# Docker Desktop → Settings → Resources → Memory → 8GB+
```

[Full troubleshooting guide →](./Troubleshooting.md)

---

## Community and Support

### Get Help

- **Discord**: https://discord.gg/nself (5,000+ developers)
- **GitHub Discussions**: https://github.com/nself/nself/discussions
- **GitHub Issues**: https://github.com/nself/nself/issues
- **Twitter**: https://twitter.com/nself_dev

### Resources

- **Website**: https://nself.org
- **Documentation**: https://docs.nself.org
- **Blog**: https://nself.org/blog
- **YouTube**: Video tutorials and demos

### Contributing

We welcome contributions!

- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation
- Share your projects

---

## License

nself CLI is open source under the MIT License.

---

## Next Steps

1. **Install nself CLI** → [Installation Guide](./Installation.md)
2. **Create your first project** → [Quick Start](./Quick-Start.md)
3. **Explore services** → [Services Guide](./Services.md)
4. **Master commands** → [Commands Reference](./Commands.md)
5. **Build your application!**

---

**Ready to build?** Start with the [Installation Guide](./Installation.md)!

---

_This documentation is for nself CLI v1.0.9. Last updated: April 18, 2026._
