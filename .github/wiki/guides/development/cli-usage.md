# CLI Usage Guide

Complete guide to using the nChat CLI for development, deployment, and management.

## Installation

```bash
# Install globally
npm install -g @nchat/cli

# Or use via npx (no installation required)
npx @nchat/cli --help

# Or use pnpm in the project
pnpm nchat-cli --help
```

## Getting Started

```bash
# Show version
nchat-cli --version

# Show help
nchat-cli --help

# Show help for a specific command
nchat-cli dev --help
nchat-cli db --help
```

## Development Commands

### Start Development Server

```bash
# Start development server on default port (3000)
nchat-cli dev start

# Start on custom port
nchat-cli dev start --port 3001

# Start with Turbopack (faster)
nchat-cli dev start --turbo
```

**Example Output**:

```
✓ Starting development server
🚀 Server will run on http://localhost:3000
```

### Start Backend Services

```bash
# Start all backend services (Hasura, PostgreSQL, etc.)
nchat-cli dev backend

# Start in detached mode (background)
nchat-cli dev backend --detach
```

**What This Does**:

- Starts PostgreSQL database
- Starts Hasura GraphQL engine
- Starts Nhost Auth service
- Starts any other configured services (Redis, MinIO, etc.)

**Example Output**:

```
✓ Backend services started
✓ Backend services are running
  Run `nself status` to check service status
  Run `nself logs` to view logs
```

### Build for Production

```bash
# Standard production build
nchat-cli dev build

# Build with bundle analyzer
nchat-cli dev build --analyze
```

### Run Tests

```bash
# Run all tests once
nchat-cli dev test

# Run in watch mode
nchat-cli dev test --watch

# Run with coverage report
nchat-cli dev test --coverage
```

## Database Commands

### Migrations

```bash
# Run migrations (migrate up to latest)
nchat-cli db migrate

# Migrate down (rollback last migration)
nchat-cli db migrate --down

# Migrate to specific version
nchat-cli db migrate --to 20240101000000
```

**Example**:

```bash
$ nchat-cli db migrate
✓ Running database migrations...
✓ Migrations completed successfully
  Applied: 20240101_create_users.sql
  Applied: 20240102_create_channels.sql
  Applied: 20240103_create_messages.sql
```

### Seed Database

```bash
# Seed with defaults (10 users, 5 channels, 50 messages per channel)
nchat-cli db seed

# Seed with custom counts
nchat-cli db seed --users 100 --channels 20 --messages 200
```

**Example Output**:

```
✓ Database seeded successfully
✓ Sample data created:
  - 100 users
  - 20 channels
  - 4000 messages
```

### Reset Database

**⚠️ WARNING**: This destroys all data!

```bash
# Reset with confirmation prompt
nchat-cli db reset

# Skip confirmation (use with caution)
nchat-cli db reset --force
```

### Database Status

```bash
# Check database connection and status
nchat-cli db status
```

**Example Output**:

```
✓ Database is connected
  Host: localhost:5432
  Database: nchat
  Status: healthy
  Tables: 42
```

### Backup and Restore

```bash
# Create backup (auto-named with timestamp)
nchat-cli db backup

# Create backup with custom path
nchat-cli db backup --output ./my-backup.sql

# Restore from backup
nchat-cli db restore ./backups/backup-2024-01-01.sql

# Force restore (skip confirmation)
nchat-cli db restore ./backup.sql --force
```

## User Management

### Create User

```bash
# Interactive mode (prompts for details)
nchat-cli user create

# With command-line options
nchat-cli user create \
  --email admin@example.com \
  --name "Admin User" \
  --password "SecurePass123!" \
  --role admin
```

**Available Roles**: `owner`, `admin`, `moderator`, `member`, `guest`

### List Users

```bash
# List all users (default limit: 50)
nchat-cli user list

# List with custom limit
nchat-cli user list --limit 100

# Filter by role
nchat-cli user list --role admin
```

**Example Output**:

```
┌────────────┬──────────────────────┬────────────┬───────────┬────────┐
│ ID         │ Email                │ Name       │ Role      │ Status │
├────────────┼──────────────────────┼────────────┼───────────┼────────┤
│ user-123   │ admin@example.com    │ Admin User │ admin     │ active │
│ user-456   │ john@example.com     │ John Doe   │ member    │ active │
└────────────┴──────────────────────┴────────────┴───────────┴────────┘
```

### Update User

```bash
# Update user name
nchat-cli user update user-123 --name "New Name"

# Update user role
nchat-cli user update user-123 --role moderator

# Update user status
nchat-cli user update user-123 --status suspended
```

### Delete User

```bash
# Delete with confirmation
nchat-cli user delete user-123

# Force delete (skip confirmation)
nchat-cli user delete user-123 --force
```

### Suspend/Unsuspend User

```bash
# Suspend user
nchat-cli user suspend user-123 --reason "Violated terms of service"

# Unsuspend user
nchat-cli user unsuspend user-123
```

## Channel Management

### Create Channel

```bash
# Interactive mode
nchat-cli channel create

# With options
nchat-cli channel create \
  --name general \
  --description "General discussion" \
  --type public
```

**Channel Types**: `public`, `private`

### List Channels

```bash
# List all channels
nchat-cli channel list

# Filter by type
nchat-cli channel list --type public

# Limit results
nchat-cli channel list --limit 20
```

### Delete Channel

```bash
# Delete with confirmation
nchat-cli channel delete channel-123

# Force delete
nchat-cli channel delete channel-123 --force
```

### Archive Channel

```bash
# Archive a channel (preserves data, hides from lists)
nchat-cli channel archive channel-123
```

## Deployment Commands

### Deploy to Vercel

```bash
# Deploy to preview
nchat-cli deploy vercel

# Deploy to production
nchat-cli deploy vercel --prod
```

**What This Does**:

1. Runs `next build`
2. Uploads build to Vercel
3. Deploys to preview or production environment
4. Returns deployment URL

### Docker Deployment

```bash
# Build Docker image
nchat-cli deploy docker --tag latest

# Build and push to registry
nchat-cli deploy docker --tag v1.0.0 --push

# Build with custom tag
nchat-cli deploy docker --tag production
```

**Generated Image**: `nchat:latest`

### Kubernetes Deployment

```bash
# Deploy with default manifests
nchat-cli deploy k8s

# Deploy to specific namespace
nchat-cli deploy k8s --namespace production

# Deploy specific manifest file
nchat-cli deploy k8s --file ./deploy/k8s/production.yaml
```

## Configuration Management

### Get Configuration

```bash
# Get all configuration
nchat-cli config get

# Get specific configuration key
nchat-cli config get branding.appName
nchat-cli config get theme.primaryColor
```

### Set Configuration

```bash
# Set configuration value
nchat-cli config set branding.appName "My Chat App"
nchat-cli config set theme.primaryColor "#6366f1"
```

### Export Configuration

```bash
# Export to JSON (default)
nchat-cli config export

# Export to specific file
nchat-cli config export --output my-config.json

# Export to YAML
nchat-cli config export --format yaml --output config.yaml
```

### Import Configuration

```bash
# Import and replace existing config
nchat-cli config import config.json

# Merge with existing config
nchat-cli config import config.json --merge
```

## Backup and Restore

### Create Full Backup

```bash
# Create full backup (database + config)
nchat-cli backup create

# Create backup with media files
nchat-cli backup create --include-media

# Custom output directory
nchat-cli backup create --output ./backups/
```

**Backup Contents**:

- Database dump
- App configuration
- Media files (if --include-media)
- User uploads

**Example Output**:

```
✓ Backup created: ./backups/full-backup-2024-01-15T10-30-00.tar.gz
  Size: 1.2 GB
  Includes: database, config, media
```

### List Backups

```bash
# List all backups
nchat-cli backup list

# Limit results
nchat-cli backup list --limit 10
```

**Example Output**:

```
┌───────────────────────────────────────┬──────────┬─────────────────────┐
│ File                                  │ Size     │ Date                │
├───────────────────────────────────────┼──────────┼─────────────────────┤
│ full-backup-2024-01-15T10-30-00.tar.gz│ 1.2 GB   │ 2024-01-15 10:30:00 │
│ full-backup-2024-01-14T10-30-00.tar.gz│ 1.1 GB   │ 2024-01-14 10:30:00 │
└───────────────────────────────────────┴──────────┴─────────────────────┘
```

### Restore from Backup

```bash
# Restore with confirmation
nchat-cli backup restore ./backups/full-backup-2024-01-15.tar.gz

# Force restore (skip confirmation)
nchat-cli backup restore ./backup.tar.gz --force
```

### Delete Backup

```bash
# Delete backup with confirmation
nchat-cli backup delete ./backup.tar.gz

# Force delete
nchat-cli backup delete ./backup.tar.gz --force
```

## Global Options

Available for all commands:

```bash
# Enable verbose output
nchat-cli <command> --verbose

# Disable colored output
nchat-cli <command> --no-color

# Show version
nchat-cli --version

# Show help
nchat-cli --help
```

## Configuration File

Create `.nchatrc.json` in your project root for default options:

```json
{
  "apiUrl": "https://api.nchat.example.com",
  "apiKey": "your-api-key",
  "database": {
    "backupDir": "./backups"
  },
  "deploy": {
    "vercel": {
      "project": "my-nchat-app"
    },
    "docker": {
      "registry": "docker.io/mycompany"
    }
  }
}
```

## Environment Variables

Set these environment variables to customize CLI behavior:

```bash
# API Configuration
export NCHAT_API_URL="https://api.nchat.example.com"
export NCHAT_API_KEY="your-api-key"

# Database
export NCHAT_DB_URL="postgresql://user:pass@localhost:5432/nchat"

# Debug Mode
export NCHAT_DEBUG=true

# Custom backend directory
export NCHAT_BACKEND_DIR="./.backend"
```

## Common Workflows

### 1. Initial Setup

```bash
# Start backend services
nchat-cli dev backend

# Run migrations
nchat-cli db migrate

# Seed sample data
nchat-cli db seed --users 50 --channels 10

# Start dev server
nchat-cli dev start
```

### 2. Daily Development

```bash
# Start everything
nchat-cli dev backend --detach
nchat-cli dev start

# Run tests in watch mode (separate terminal)
nchat-cli dev test --watch
```

### 3. Pre-Production Deployment

```bash
# Create backup
nchat-cli backup create --include-media

# Run tests
nchat-cli dev test --coverage

# Build for production
nchat-cli dev build

# Deploy to staging
nchat-cli deploy vercel
```

### 4. Production Deployment

```bash
# Run tests
nchat-cli dev test

# Build
nchat-cli dev build

# Create backup
nchat-cli backup create

# Deploy to production
nchat-cli deploy vercel --prod

# Or deploy via Docker
nchat-cli deploy docker --tag v1.0.0 --push
nchat-cli deploy k8s --namespace production
```

### 5. Database Maintenance

```bash
# Check status
nchat-cli db status

# Create backup before changes
nchat-cli db backup

# Run migrations
nchat-cli db migrate

# Verify everything works
nchat-cli dev test
```

## Troubleshooting

### Backend Won't Start

```bash
# Check what's running
cd .backend && nself status

# View logs
cd .backend && nself logs

# Restart services
cd .backend && nself stop
cd .backend && nself start
```

### Database Connection Issues

```bash
# Check database status
nchat-cli db status

# Try resetting (WARNING: loses data)
nchat-cli db reset --force
nchat-cli db migrate
nchat-cli db seed
```

### Build Failures

```bash
# Clean everything
pnpm clean

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Try building again
nchat-cli dev build
```

### Migration Errors

```bash
# Check migration status
cd .backend && nself db migrate status

# Rollback last migration
nchat-cli db migrate --down

# Fix the migration file, then migrate up
nchat-cli db migrate
```

## Tips and Best Practices

### 1. Use Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias nchat="nchat-cli"
alias nchat-dev="nchat-cli dev start"
alias nchat-test="nchat-cli dev test --watch"
```

### 2. Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
nchat-cli dev test
if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

### 3. Scheduled Backups

Create a cron job:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/nchat && nchat-cli backup create --include-media
```

### 4. CI/CD Integration

GitHub Actions example:

```yaml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install -g @nchat/cli
      - run: nchat-cli dev test --coverage
      - run: nchat-cli dev build
```

## Next Steps

- [SDK Usage Guide](./sdk-usage.md)
- [API Reference](../../api/README.md)
- [Deployment Guide](../deployment/README.md)
- [Contributing Guide](../../CONTRIBUTING.md)
