# ɳPlugins Installation Guide

**Version**: ɳChat v0.9.1
**Date**: 2026-02-03
**nself CLI**: v0.9.8

---

## Prerequisites

1. **Docker Running**: Ensure Docker Desktop is running
2. **Backend Services**: Core services must be operational
3. **nself CLI**: Version 0.9.8 or higher

---

## Installation Process

### Step 1: Verify Environment

```bash
# Check nself CLI version
nself --version

# Verify Docker is running
docker ps

# Check backend status
cd /Users/admin/Sites/nself-nchat/backend
nself status
```

### Step 2: Prepare Configuration

```bash
# Copy plugin configuration example
cd /Users/admin/Sites/nself-nchat/backend
cp ../. backend/.env.plugins.example .env.plugins

# Edit plugin configuration
# Update any plugin-specific environment variables
```

### Step 3: Install Core Plugins (Phase 1)

#### 3.1 Realtime Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend

# Install the plugin
nself plugin install realtime

# Verify installation
nself plugin list --installed | grep realtime

# Check plugin status
nself plugin status realtime
```

**Configuration** (in `.env.plugins`):

```bash
REALTIME_ENABLED=true
REALTIME_PORT=3101
REALTIME_WEBSOCKET_MAX_CONNECTIONS=10000
REALTIME_PRESENCE_TIMEOUT=30000
REALTIME_TYPING_TIMEOUT=3000
```

**Test Health**:

```bash
curl http://realtime.localhost:3101/health
```

---

#### 3.2 Notifications Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend

# Install the plugin
nself plugin install notifications

# Verify installation
nself plugin list --installed | grep notifications

# Check plugin status
nself plugin status notifications
```

**Configuration** (in `.env.plugins`):

```bash
NOTIFICATIONS_ENABLED=true
NOTIFICATIONS_PORT=3102
NOTIFICATIONS_EMAIL_PROVIDER=mailpit
NOTIFICATIONS_FROM_EMAIL=noreply@nchat.local
```

**Test Health**:

```bash
curl http://notifications.localhost:3102/health
```

---

#### 3.3 Jobs Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend

# Install the plugin
nself plugin install jobs

# Verify installation
nself plugin list --installed | grep jobs

# Check plugin status
nself plugin status jobs
```

**Configuration** (in `.env.plugins`):

```bash
JOBS_ENABLED=true
JOBS_PORT=3105
JOBS_CONCURRENCY=5
JOBS_MAX_RETRIES=3
JOBS_CLEANUP_OLD_MESSAGES_ENABLED=true
```

**Test Health**:

```bash
curl http://jobs.localhost:3105/health

# Access BullMQ Dashboard
open http://queues.localhost:4200
```

---

#### 3.4 File Processing Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend

# Install the plugin
nself plugin install file-processing

# Verify installation
nself plugin list --installed | grep file-processing

# Check plugin status
nself plugin status file-processing
```

**Configuration** (in `.env.plugins`):

```bash
FILE_PROCESSING_ENABLED=true
FILE_PROCESSING_PORT=3104
FILE_PROCESSING_IMAGE_MAX_WIDTH=2048
FILE_PROCESSING_IMAGE_QUALITY=85
FILE_PROCESSING_VIDEO_THUMBNAIL_ENABLED=true
```

**Test Health**:

```bash
curl http://files.localhost:3104/health
```

---

### Step 4: Restart Services

```bash
cd /Users/admin/Sites/nself-nchat/backend

# Restart to load plugins
nself restart

# Wait for all services to be healthy
nself status --watch
```

---

### Step 5: Verify Plugin Integration

```bash
# Check all plugin health
nself plugin status

# View plugin logs
nself logs realtime
nself logs notifications
nself logs jobs
nself logs file-processing
```

---

## Phase 2: Authentication Plugins

### ID.me Plugin

**Prerequisites**:

- ID.me developer account
- OAuth application credentials

```bash
cd /Users/admin/Sites/nself-nchat/backend

# Install the plugin
nself plugin install idme

# Configure in .env.plugins
echo "IDME_ENABLED=true" >> .env.plugins
echo "IDME_CLIENT_ID=your_client_id" >> .env.plugins
echo "IDME_CLIENT_SECRET=your_client_secret" >> .env.plugins

# Restart services
nself restart

# Test
curl http://localhost/api/auth/oauth/providers | grep idme
```

---

## Phase 3: Integration Plugins (Future)

### Stripe Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend

# Install when billing is needed
nself plugin install stripe

# Configure with Stripe API keys
echo "STRIPE_SECRET_KEY=sk_test_..." >> .env.plugins
echo "STRIPE_PUBLISHABLE_KEY=pk_test_..." >> .env.plugins

# Restart services
nself restart
```

---

### GitHub Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend

# Install for repository integration
nself plugin install github

# Configure with GitHub OAuth App
echo "GITHUB_CLIENT_ID=your_client_id" >> .env.plugins
echo "GITHUB_CLIENT_SECRET=your_client_secret" >> .env.plugins

# Restart services
nself restart
```

---

### Shopify Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend

# Install for e-commerce features
nself plugin install shopify

# Configure with Shopify credentials
echo "SHOPIFY_API_KEY=your_api_key" >> .env.plugins
echo "SHOPIFY_API_SECRET=your_api_secret" >> .env.plugins

# Restart services
nself restart
```

---

## Troubleshooting

### Plugin Installation Fails

```bash
# Refresh plugin registry
nself plugin refresh

# Try again with verbose logging
nself plugin install <name> --verbose
```

### Plugin Won't Start

```bash
# Check logs
nself logs <plugin-name>

# Verify dependencies
nself status | grep -E "(redis|minio|postgres)"

# Run diagnostics
nself doctor
```

### Port Conflicts

```bash
# Check what's using the port
lsof -i :3101  # Example for realtime plugin

# Kill conflicting process or change port in .env.plugins
```

### Health Check Fails

```bash
# Wait for service to be ready
sleep 10
curl http://<plugin>.localhost:<port>/health

# Check service logs
nself logs <plugin-name> --tail 50
```

---

## Verification Checklist

### Core Plugins (Phase 1)

- [ ] Realtime plugin installed and healthy
- [ ] Notifications plugin installed and healthy
- [ ] Jobs plugin installed and healthy
- [ ] File Processing plugin installed and healthy
- [ ] All plugins listed in `nself plugin list --installed`
- [ ] All plugin health endpoints responding
- [ ] BullMQ Dashboard accessible at http://queues.localhost:4200

### Auth Plugins (Phase 2)

- [ ] ID.me plugin installed and configured
- [ ] ID.me OAuth flow working

### Integration Plugins (Phase 3)

- [ ] Stripe plugin installed (when needed)
- [ ] GitHub plugin installed (when needed)
- [ ] Shopify plugin installed (when needed)

---

## Next Steps

After successful installation:

1. ✅ Verify all plugins are running: `nself plugin status`
2. ✅ Test health endpoints
3. ✅ Wire frontend integration (see INTEGRATION-GUIDE.md)
4. ✅ Run integration tests
5. ✅ Update PROGRESS.md with completion evidence

---

## Plugin Management Commands

```bash
# List all available plugins
nself plugin list

# List installed plugins
nself plugin list --installed

# Filter by category
nself plugin list --category communication

# Check for updates
nself plugin updates

# Update a specific plugin
nself plugin update <name>

# Update all plugins
nself plugin update --all

# Remove a plugin
nself plugin remove <name>

# Remove but keep database tables
nself plugin remove <name> --keep-data

# Check plugin status
nself plugin status [name]

# Run plugin actions
nself plugin <name> <action>

# Get plugin help
nself plugin <name> --help
```

---

## Resource Requirements

### Minimum (Development)

- **CPU**: 4 cores
- **RAM**: 8 GB
- **Disk**: 10 GB

### Recommended (Production)

- **CPU**: 8+ cores
- **RAM**: 16+ GB
- **Disk**: 50+ GB SSD

### Per-Plugin Resources

| Plugin          | CPU  | RAM  | Notes                   |
| --------------- | ---- | ---- | ----------------------- |
| Realtime        | 0.5  | 256M | Scales with connections |
| Notifications   | 0.25 | 128M | Email heavy             |
| Jobs            | 0.5  | 256M | Depends on concurrency  |
| File Processing | 1.0  | 512M | Image/video intensive   |
| ID.me           | 0.1  | 64M  | Lightweight             |
| Stripe          | 0.1  | 64M  | Lightweight             |
| GitHub          | 0.1  | 64M  | Lightweight             |
| Shopify         | 0.1  | 64M  | Lightweight             |

---

## Security Notes

1. **Secrets Management**: Never commit `.env.plugins` to git
2. **API Keys**: Store in `.env.secrets` for production
3. **HTTPS Only**: Production must use HTTPS for OAuth plugins
4. **Webhook Secrets**: Generate strong secrets for webhook verification
5. **Rate Limiting**: Configure rate limits for public endpoints

---

## Monitoring

### Plugin Health Checks

```bash
# Auto-check every 30 seconds
PLUGIN_HEALTH_CHECK_INTERVAL=30

# Timeout after 5 seconds
PLUGIN_HEALTH_CHECK_TIMEOUT=5

# Auto-restart on failure
PLUGIN_AUTO_RESTART=true
PLUGIN_RESTART_DELAY=5
```

### Plugin Metrics (Prometheus)

```bash
# Enable metrics endpoint
PLUGIN_METRICS_ENABLED=true
PLUGIN_METRICS_PORT=9090

# Access metrics
curl http://localhost:9090/metrics
```

### Plugin Logs

```bash
# JSON formatted logs
PLUGIN_LOG_LEVEL=info
PLUGIN_LOG_FORMAT=json

# View logs
nself logs <plugin-name> --follow
```

---

## Support

- **Documentation**: https://nself.org/docs/plugins
- **Plugin Registry**: https://plugins.nself.org
- **GitHub**: https://github.com/nself-org/plugins
- **Issues**: https://github.com/nself-org/plugins/issues

---

## Success Criteria

✅ All core plugins (4) installed and running
✅ All plugin health checks passing
✅ Plugin configuration documented
✅ Frontend integration ready
✅ Tests passing
✅ Documentation updated
