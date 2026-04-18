# nself CLI - Commands Reference

**Version**: v1.0.9
**Last Updated**: April 18, 2026
**Complete command reference for nself CLI**

---

## Table of Contents

1. [Global Options](#global-options)
2. [Project Commands](#project-commands)
3. [Service Commands](#service-commands)
4. [Database Commands](#database-commands)
5. [Development Commands](#development-commands)
6. [Utility Commands](#utility-commands)
7. [Advanced Commands](#advanced-commands)
8. [Environment Variables](#environment-variables)

---

## Global Options

Available for all commands:

```bash
nself [command] [options]

Global Flags:
  --help, -h          Show help for any command
  --version, -v       Show nself CLI version
  --verbose           Enable verbose output
  --quiet, -q         Suppress non-error output
  --config FILE       Use custom config file
  --project-dir DIR   Specify project directory (default: .backend)
```

---

## Project Commands

### `nself init`

Initialize a new nself project.

**Syntax:**

```bash
nself init [PROJECT_NAME] [options]
```

**Options:**

```bash
--template, -t TEMPLATE    Use project template (default, minimal, full)
--demo                     Initialize with demo data
--no-ssl                   Skip SSL certificate generation
--domain DOMAIN           Set custom domain (default: localhost)
--env ENV                 Set environment (dev, staging, prod)
```

**Examples:**

```bash
# Basic initialization
nself init my-app

# Initialize with demo data
nself init my-app --demo

# Minimal setup (core services only)
nself init my-app --template minimal

# Full setup (all services enabled)
nself init my-app --template full

# Custom domain
nself init my-app --domain myapp.local

# Production environment
nself init my-app --env prod
```

**Generated Structure:**

```
PROJECT_NAME/
└── .backend/
    ├── .env                      # Environment variables
    ├── docker-compose.yml        # Service definitions
    ├── hasura/
    │   ├── metadata/            # Hasura metadata
    │   └── migrations/          # Database migrations
    ├── nginx/
    │   ├── nginx.conf           # Nginx config
    │   └── conf.d/              # Site configs
    ├── postgres/
    │   └── init/                # Init scripts
    └── ssl/
        └── certificates/        # SSL certs
```

---

### `nself build`

Generate or update docker-compose.yml file.

**Syntax:**

```bash
nself build [options]
```

**Options:**

```bash
--update                Update existing configuration
--force                 Overwrite without confirmation
--services SERVICES     Enable specific services (comma-separated)
--monitoring           Enable monitoring bundle
--output FILE          Output to specific file
```

**Examples:**

```bash
# Regenerate docker-compose.yml
nself build

# Update with new services
nself build --update --services redis,minio

# Enable monitoring
nself build --monitoring

# Force overwrite
nself build --force
```

---

## Service Commands

### `nself start`

Start all or specific services.

**Syntax:**

```bash
nself start [SERVICE...] [options]
```

**Options:**

```bash
--detach, -d           Run in background (default)
--build               Build images before starting
--force-recreate      Recreate containers
--no-deps             Don't start linked services
--scale SERVICE=NUM   Scale service to NUM instances
--wait                Wait for services to be healthy
```

**Examples:**

```bash
# Start all services
nself start

# Start specific services
nself start postgres hasura

# Start with rebuild
nself start --build

# Start and wait for healthy
nself start --wait

# Scale Hasura to 3 instances
nself start --scale hasura=3

# Start in foreground (view logs)
nself start --no-detach
```

**Service Names:**

- `postgres` - PostgreSQL database
- `hasura` - Hasura GraphQL Engine
- `auth` - Nhost Auth service
- `nginx` - Nginx reverse proxy
- `minio` - MinIO object storage
- `storage` - Hasura Storage service
- `redis` - Redis cache
- `mailpit` - Email testing
- `functions` - Serverless functions
- `meilisearch` - Full-text search
- `mlflow` - ML tracking

---

### `nself stop`

Stop all or specific services.

**Syntax:**

```bash
nself stop [SERVICE...] [options]
```

**Options:**

```bash
--timeout, -t SECONDS   Shutdown timeout (default: 10)
```

**Examples:**

```bash
# Stop all services
nself stop

# Stop specific services
nself stop hasura auth

# Stop with 30s timeout
nself stop --timeout 30

# Stop immediately (force)
nself stop --timeout 0
```

---

### `nself restart`

Restart all or specific services.

**Syntax:**

```bash
nself restart [SERVICE...] [options]
```

**Options:**

```bash
--timeout, -t SECONDS   Shutdown timeout
--no-deps              Don't restart linked services
```

**Examples:**

```bash
# Restart all services
nself restart

# Restart specific service
nself restart hasura

# Restart with quick timeout
nself restart --timeout 5
```

---

### `nself status`

Show status of all services.

**Syntax:**

```bash
nself status [options]
```

**Options:**

```bash
--format FORMAT    Output format (table, json, yaml)
--watch, -w        Continuously watch status
```

**Examples:**

```bash
# Show status (default table format)
nself status

# JSON output
nself status --format json

# Watch status (refresh every 2s)
nself status --watch

# YAML output
nself status --format yaml
```

**Output:**

```
Service     Status    Health    Port    Uptime
─────────────────────────────────────────────────
postgres    running   healthy   5432    2h 15m
hasura      running   healthy   8080    2h 14m
auth        running   healthy   4000    2h 14m
nginx       running   healthy   80/443  2h 14m
redis       running   healthy   6379    2h 14m
minio       running   healthy   9000    2h 14m
storage     running   healthy   5001    2h 13m
mailpit     running   healthy   8025    2h 13m
```

---

### `nself logs`

View service logs.

**Syntax:**

```bash
nself logs [SERVICE...] [options]
```

**Options:**

```bash
--follow, -f          Follow log output
--tail LINES          Number of lines to show (default: 100)
--since TIME          Show logs since timestamp
--until TIME          Show logs until timestamp
--timestamps, -t      Show timestamps
--no-color            Disable colored output
```

**Examples:**

```bash
# View all logs
nself logs

# Follow specific service
nself logs -f hasura

# Last 50 lines
nself logs --tail 50

# Multiple services
nself logs postgres hasura auth

# Since 1 hour ago
nself logs --since 1h

# With timestamps
nself logs -f -t hasura

# Last 30 minutes
nself logs --since 30m --until now
```

---

### `nself ps`

List running containers.

**Syntax:**

```bash
nself ps [options]
```

**Options:**

```bash
--all, -a        Show all containers (including stopped)
--quiet, -q      Only show container IDs
--services       Show service names
```

**Examples:**

```bash
# List running containers
nself ps

# Show all (including stopped)
nself ps --all

# Just container IDs
nself ps --quiet

# Service names only
nself ps --services
```

---

### `nself down`

Stop and remove containers.

**Syntax:**

```bash
nself down [options]
```

**Options:**

```bash
--volumes, -v          Remove volumes
--remove-orphans       Remove orphaned containers
--timeout SECONDS      Shutdown timeout
```

**Examples:**

```bash
# Stop and remove containers
nself down

# Also remove volumes (WARNING: deletes data!)
nself down --volumes

# Remove orphaned containers
nself down --remove-orphans

# Quick shutdown
nself down --timeout 0
```

---

### `nself exec`

Execute command in a running service.

**Syntax:**

```bash
nself exec [SERVICE] [COMMAND]
```

**Options:**

```bash
--user, -u USER     Run as user
--workdir DIR       Working directory
--env KEY=VALUE     Set environment variable
--detach, -d        Detached mode
--interactive, -i   Interactive mode
--tty, -t          Allocate pseudo-TTY
```

**Examples:**

```bash
# Open PostgreSQL shell
nself exec postgres psql -U postgres

# Run Hasura console command
nself exec hasura hasura-cli console

# Interactive shell
nself exec -it postgres bash

# Run as specific user
nself exec --user postgres postgres psql

# Execute with environment variable
nself exec --env DEBUG=true hasura node index.js
```

---

## Database Commands

### `nself db:migrate`

Run database migrations.

**Syntax:**

```bash
nself db:migrate [DIRECTION] [options]
```

**Directions:**

- `up` - Apply migrations (default)
- `down` - Rollback migrations
- `status` - Show migration status
- `version` - Show current version

**Options:**

```bash
--step, -s NUMBER     Number of migrations to apply/rollback
--version VERSION     Migrate to specific version
--all                Apply all pending migrations
--dry-run            Show what would be executed
```

**Examples:**

```bash
# Apply all pending migrations
nself db:migrate up

# Rollback last migration
nself db:migrate down

# Rollback 3 migrations
nself db:migrate down --step 3

# Migrate to specific version
nself db:migrate --version 20260101120000

# Show migration status
nself db:migrate status

# Dry run
nself db:migrate up --dry-run
```

---

### `nself db:create`

Create new database migration.

**Syntax:**

```bash
nself db:create [NAME] [options]
```

**Options:**

```bash
--sql FILE          Use SQL file
--type TYPE         Migration type (sql, hasura)
--timestamp         Add timestamp to name
```

**Examples:**

```bash
# Create migration
nself db:create create_users_table

# From SQL file
nself db:create --sql schema.sql add_users

# Hasura migration
nself db:create --type hasura add_permissions
```

---

### `nself db:seed`

Seed database with data.

**Syntax:**

```bash
nself db:seed [FILE] [options]
```

**Options:**

```bash
--env ENV          Environment (dev, staging, prod)
--force           Overwrite existing data
```

**Examples:**

```bash
# Run default seed file
nself db:seed

# Specific seed file
nself db:seed seeds/users.sql

# Force seed (clear existing)
nself db:seed --force
```

---

### `nself db:reset`

Reset database (WARNING: destructive!).

**Syntax:**

```bash
nself db:reset [options]
```

**Options:**

```bash
--force          Skip confirmation
--seed          Run seeds after reset
```

**Examples:**

```bash
# Reset database (will ask confirmation)
nself db:reset

# Reset and seed
nself db:reset --seed

# Force reset (no confirmation)
nself db:reset --force
```

---

### `nself db:dump`

Backup database to file.

**Syntax:**

```bash
nself db:dump [FILE] [options]
```

**Options:**

```bash
--format FORMAT      Output format (sql, custom, tar)
--compress          Compress output
--schema-only       Only dump schema
--data-only         Only dump data
```

**Examples:**

```bash
# Dump to default file
nself db:dump

# Dump to specific file
nself db:dump backup.sql

# Compressed backup
nself db:dump backup.sql.gz --compress

# Schema only
nself db:dump schema.sql --schema-only
```

---

### `nself db:restore`

Restore database from backup.

**Syntax:**

```bash
nself db:restore [FILE] [options]
```

**Options:**

```bash
--force          Drop existing database
--clean         Clean before restore
```

**Examples:**

```bash
# Restore from file
nself db:restore backup.sql

# Force restore (drop existing)
nself db:restore backup.sql --force

# Clean restore
nself db:restore backup.sql --clean
```

---

## Development Commands

### `nself console`

Open Hasura Console.

**Syntax:**

```bash
nself console [options]
```

**Options:**

```bash
--port PORT         Console port (default: 9695)
--no-browser       Don't open browser
```

**Examples:**

```bash
# Open console
nself console

# Custom port
nself console --port 9696

# Don't auto-open browser
nself console --no-browser
```

---

### `nself urls`

Show all service URLs.

**Syntax:**

```bash
nself urls [options]
```

**Options:**

```bash
--format FORMAT    Output format (table, json, list)
```

**Examples:**

```bash
# Show URLs (table format)
nself urls

# JSON format
nself urls --format json

# Simple list
nself urls --format list
```

**Output:**

```
Service          URL
────────────────────────────────────────────────
GraphQL API      http://api.localhost/v1/graphql
Hasura Console   http://localhost:8080/console
Auth API         http://auth.localhost/v1/auth
Storage API      http://storage.localhost/v1/storage
MinIO Console    http://localhost:9001
Email Testing    http://localhost:8025
PostgreSQL       localhost:5432
Redis            localhost:6379
```

---

### `nself doctor`

Diagnose common issues.

**Syntax:**

```bash
nself doctor [options]
```

**Options:**

```bash
--fix             Attempt to fix issues
--verbose        Show detailed diagnostics
```

**Examples:**

```bash
# Run diagnostics
nself doctor

# Fix issues automatically
nself doctor --fix

# Verbose output
nself doctor --verbose
```

**Checks:**

- Docker installation
- Docker Compose version
- Port availability
- Disk space
- Memory available
- Service health
- Network connectivity
- Configuration validity

---

### `nself dev`

Start development mode with hot reload.

**Syntax:**

```bash
nself dev [options]
```

**Options:**

```bash
--watch           Watch for file changes
--reload          Auto-reload on changes
```

**Examples:**

```bash
# Start dev mode
nself dev

# With file watching
nself dev --watch

# Auto-reload services
nself dev --reload
```

---

## Utility Commands

### `nself config`

Manage configuration.

**Syntax:**

```bash
nself config [SUBCOMMAND] [options]
```

**Subcommands:**

```bash
get KEY             Get configuration value
set KEY VALUE       Set configuration value
list                List all configuration
edit                Edit configuration file
validate            Validate configuration
reset               Reset to defaults
```

**Examples:**

```bash
# List all config
nself config list

# Get specific value
nself config get PROJECT_NAME

# Set value
nself config set REDIS_ENABLED true

# Edit config file
nself config edit

# Validate config
nself config validate

# Reset to defaults
nself config reset
```

---

### `nself env`

Manage environment variables.

**Syntax:**

```bash
nself env [SUBCOMMAND]
```

**Subcommands:**

```bash
list                List all variables
get KEY             Get variable value
set KEY VALUE       Set variable value
unset KEY           Remove variable
export              Export to .env file
import FILE         Import from file
```

**Examples:**

```bash
# List all env vars
nself env list

# Get value
nself env get DATABASE_URL

# Set value
nself env set REDIS_ENABLED true

# Export to file
nself env export > .env.backup

# Import from file
nself env import .env.backup
```

---

### `nself backup`

Create backup of project.

**Syntax:**

```bash
nself backup [options]
```

**Options:**

```bash
--output DIR        Output directory
--compress         Compress backup
--database-only    Only backup database
--config-only      Only backup configuration
```

**Examples:**

```bash
# Full backup
nself backup

# Backup to specific directory
nself backup --output backups/

# Compressed backup
nself backup --compress

# Database only
nself backup --database-only
```

---

### `nself restore`

Restore from backup.

**Syntax:**

```bash
nself restore [BACKUP_FILE] [options]
```

**Options:**

```bash
--force           Overwrite existing
--database-only   Only restore database
--config-only     Only restore config
```

**Examples:**

```bash
# Restore from backup
nself restore backup-2026-02-01.tar.gz

# Force restore
nself restore backup.tar.gz --force

# Database only
nself restore backup.tar.gz --database-only
```

---

### `nself clean`

Clean up Docker resources.

**Syntax:**

```bash
nself clean [options]
```

**Options:**

```bash
--all              Remove all resources
--volumes          Remove volumes
--images           Remove images
--force            Skip confirmation
```

**Examples:**

```bash
# Clean stopped containers
nself clean

# Clean everything (WARNING!)
nself clean --all

# Remove volumes
nself clean --volumes

# Force clean
nself clean --all --force
```

---

### `nself upgrade`

Upgrade nself CLI.

**Syntax:**

```bash
nself upgrade [options]
```

**Options:**

```bash
--version VERSION    Upgrade to specific version
--check             Only check for updates
```

**Examples:**

```bash
# Upgrade to latest
nself upgrade

# Check for updates
nself upgrade --check

# Upgrade to specific version
nself upgrade --version v0.4.2
```

---

## Advanced Commands

### `nself network`

Manage Docker networks.

**Syntax:**

```bash
nself network [SUBCOMMAND]
```

**Subcommands:**

```bash
create              Create network
remove              Remove network
inspect             Inspect network
list                List networks
```

**Examples:**

```bash
# List networks
nself network list

# Inspect network
nself network inspect

# Recreate network
nself network remove
nself network create
```

---

### `nself volume`

Manage Docker volumes.

**Syntax:**

```bash
nself volume [SUBCOMMAND]
```

**Subcommands:**

```bash
list                List volumes
inspect VOLUME      Inspect volume
remove VOLUME       Remove volume
prune              Remove unused volumes
```

**Examples:**

```bash
# List volumes
nself volume list

# Inspect postgres volume
nself volume inspect postgres_data

# Remove specific volume
nself volume remove redis_data

# Remove unused volumes
nself volume prune
```

---

### `nself metrics`

View service metrics.

**Syntax:**

```bash
nself metrics [SERVICE] [options]
```

**Options:**

```bash
--interval SECONDS   Update interval (default: 5)
--format FORMAT     Output format (table, json)
```

**Examples:**

```bash
# View all metrics
nself metrics

# Specific service
nself metrics postgres

# JSON output
nself metrics --format json

# Update every 2 seconds
nself metrics --interval 2
```

---

## Environment Variables

### Configuration Variables

```bash
# Project Settings
PROJECT_NAME=my-app
BASE_DOMAIN=localhost
ENV=dev

# Service Ports
POSTGRES_PORT=5432
HASURA_PORT=8080
REDIS_PORT=6379
MINIO_PORT=9000

# Optional Services
REDIS_ENABLED=true
MINIO_ENABLED=true
MAILPIT_ENABLED=true
MEILISEARCH_ENABLED=false
FUNCTIONS_ENABLED=false
MONITORING_ENABLED=false
NSELF_ADMIN_ENABLED=false

# Database
POSTGRES_DB=myapp_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres-dev-password

# Hasura
HASURA_GRAPHQL_ADMIN_SECRET=hasura-admin-secret-dev
HASURA_GRAPHQL_ENABLE_CONSOLE=true
HASURA_GRAPHQL_DEV_MODE=true

# Auth
AUTH_JWT_REFRESH_TOKEN_EXPIRES_IN=2592000
AUTH_JWT_ACCESS_TOKEN_EXPIRES_IN=900

# Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# Development
AUTO_FIX=true
COMPOSE_PROJECT_NAME=${PROJECT_NAME}
```

---

## Exit Codes

```bash
0   Success
1   General error
2   Misuse of shell command
126 Command cannot execute
127 Command not found
130 Script terminated by Ctrl+C
```

---

## Tips and Tricks

### Command Aliases

Add to your shell rc file (`.bashrc`, `.zshrc`):

```bash
# Short aliases
alias ns='nself'
alias nss='nself status'
alias nsl='nself logs -f'
alias nsr='nself restart'

# Quick commands
alias nsup='nself start'
alias nsdown='nself stop'
alias nslogs='nself logs -f --tail 100'
```

### Watch Status

```bash
# Continuously monitor status
watch -n 2 nself status

# Or use built-in watch
nself status --watch
```

### Quick Database Access

```bash
# Create shell function
db() {
  nself exec postgres psql -U postgres -d ${PROJECT_NAME}_dev
}

# Usage
db
```

### Log Multiple Services

```bash
# View logs from multiple services
nself logs -f postgres hasura auth | grep ERROR
```

### Backup Before Changes

```bash
# Always backup before major changes
nself db:dump backup-before-change.sql
nself db:migrate up
```

---

## Next Steps

- **Learn about Services** → [Services.md](./Services.md)
- **Configuration Guide** → [Configuration.md](../configuration/Configuration.md)
- **Database Migrations** → [Migrations.md](./Migrations.md)
- **Troubleshooting** → [Troubleshooting.md](./Troubleshooting.md)

---

**Need help?** Run `nself --help` or `nself [command] --help` for detailed information.
