# New ɳPlugins Installation Guide

**Version**: ɳChat v0.9.1
**Date**: 2026-02-03
**Plugins**: Analytics, Advanced Search, Media Pipeline, AI Orchestration, Workflows

---

## Prerequisites

Before installing the new plugins, ensure you have:

- ✅ nself CLI v0.9.8 or higher
- ✅ Docker 20.10+ and Docker Compose 2.0+
- ✅ Minimum 8GB RAM available
- ✅ Minimum 100GB disk space
- ✅ Backend services running (`nself status`)

### Check Prerequisites

```bash
# Check nself CLI version
nself --version
# Expected: v0.9.8 or higher

# Check Docker
docker --version
docker-compose --version

# Check backend status
cd /Users/admin/Sites/nself-nchat/backend
nself status
# All core services should be "running"
```

---

## Installation Options

### Option 1: Automated Installation (Recommended)

```bash
cd /Users/admin/Sites/nself-chat

# Install all new plugins
./scripts/install-new-plugins.sh

# Or install specific plugins
./scripts/install-new-plugins.sh --plugins analytics,search,media
```

### Option 2: Manual Installation

Install plugins one at a time:

```bash
cd /Users/admin/Sites/nself-nchat/backend

# Analytics Plugin
nself plugin install analytics

# Advanced Search Plugin
nself plugin install advanced-search

# Media Pipeline Plugin
nself plugin install media-pipeline

# AI Orchestration Plugin
nself plugin install ai-orchestration

# Workflow Automation Plugin
nself plugin install workflows
```

---

## Step-by-Step Installation

### Step 1: Install Analytics Plugin

```bash
cd backend
nself plugin install analytics
```

**Expected Output**:

```
✓ Downloading plugin: analytics@1.0.0
✓ Extracting plugin files
✓ Installing dependencies
✓ Running migrations
✓ Plugin installed successfully
```

**Configure**:

Add to `backend/.env.plugins`:

```bash
# Analytics Plugin
ANALYTICS_ENABLED=true
ANALYTICS_PORT=3106
ANALYTICS_ROUTE=analytics.${BASE_DOMAIN:-localhost}
ANALYTICS_MEMORY=512M
ANALYTICS_CLICKHOUSE_HOST=clickhouse
ANALYTICS_RETENTION_DAYS=365
ANALYTICS_AGGREGATION_INTERVAL=300
```

**Verify**:

```bash
nself restart
sleep 10
curl http://analytics.localhost:3106/health
# Expected: {"status":"healthy","version":"1.0.0"}
```

---

### Step 2: Install Advanced Search Plugin

```bash
nself plugin install advanced-search
```

**Configure**:

```bash
# Advanced Search Plugin
SEARCH_ENABLED=true
SEARCH_PORT=3107
SEARCH_ENGINE=meilisearch
SEARCH_VECTOR_ENABLED=true
SEARCH_VECTOR_PROVIDER=qdrant
SEARCH_VECTOR_DIMENSION=1536
SEARCH_ENABLE_SUGGESTIONS=true
```

**Verify**:

```bash
nself restart
curl http://search.localhost:3107/health
```

**Index Existing Content** (optional):

```bash
curl -X POST http://search.localhost:3107/api/search/reindex
# This may take several minutes for large datasets
```

---

### Step 3: Install Media Pipeline Plugin

```bash
nself plugin install media-pipeline
```

**Configure**:

```bash
# Media Pipeline Plugin
MEDIA_PIPELINE_ENABLED=true
MEDIA_PIPELINE_PORT=3108
MEDIA_PIPELINE_MEMORY=2048M
MEDIA_VIDEO_CODEC=h264
MEDIA_HLS_ENABLED=true
MEDIA_NSFW_DETECTION=true
MEDIA_STORAGE_PROVIDER=s3
```

**Verify**:

```bash
nself restart
curl http://media.localhost:3108/health
```

---

### Step 4: Install AI Orchestration Plugin

```bash
nself plugin install ai-orchestration
```

**Configure**:

```bash
# AI Orchestration Plugin
AI_ORCHESTRATION_ENABLED=true
AI_ORCHESTRATION_PORT=3109
AI_OPENAI_ENABLED=true
AI_OPENAI_API_KEY=${OPENAI_API_KEY}
AI_ANTHROPIC_ENABLED=true
AI_ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
AI_DEFAULT_CHAT_MODEL=gpt-4o-mini
AI_USER_DAILY_LIMIT=1.00
AI_CACHE_ENABLED=true
```

**Important**: Add API keys to `~/Sites/.claude/vault.env`:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

**Verify**:

```bash
source ~/Sites/.claude/vault.env
nself restart
curl http://ai.localhost:3109/health
```

---

### Step 5: Install Workflow Automation Plugin

```bash
nself plugin install workflows
```

**Configure**:

```bash
# Workflow Automation Plugin
WORKFLOWS_ENABLED=true
WORKFLOWS_PORT=3110
WORKFLOWS_MAX_CONCURRENT=10
WORKFLOWS_TIMEOUT=300000
WORKFLOWS_ENABLE_CODE_ACTIONS=true
WORKFLOWS_ENABLE_HTTP_ACTIONS=true
```

**Verify**:

```bash
nself restart
curl http://workflows.localhost:3110/health
```

---

## Post-Installation

### 1. Verify All Plugins

```bash
nself plugin list --installed
```

**Expected Output**:

```
✓ analytics (1.0.0) - Running on port 3106
✓ advanced-search (1.0.0) - Running on port 3107
✓ media-pipeline (1.0.0) - Running on port 3108
✓ ai-orchestration (1.0.0) - Running on port 3109
✓ workflows (1.0.0) - Running on port 3110
```

### 2. Check Service Health

```bash
nself doctor
```

This will check:

- Plugin health endpoints
- Database connections
- Redis connectivity
- Storage access
- API availability

### 3. Configure Frontend

Add to `/Users/admin/Sites/nself-chat/.env.local`:

```bash
# New Plugins
NEXT_PUBLIC_ANALYTICS_URL=http://analytics.localhost:3106
NEXT_PUBLIC_ANALYTICS_ENABLED=true

NEXT_PUBLIC_ADVANCED_SEARCH_URL=http://search.localhost:3107
NEXT_PUBLIC_SEMANTIC_SEARCH_ENABLED=true

NEXT_PUBLIC_MEDIA_PIPELINE_URL=http://media.localhost:3108
NEXT_PUBLIC_VIDEO_TRANSCODING_ENABLED=true

NEXT_PUBLIC_AI_ORCHESTRATION_URL=http://ai.localhost:3109
NEXT_PUBLIC_AI_FEATURES_ENABLED=true

NEXT_PUBLIC_WORKFLOWS_URL=http://workflows.localhost:3110
NEXT_PUBLIC_WORKFLOWS_ENABLED=true
```

### 4. Restart Frontend

```bash
cd /Users/admin/Sites/nself-chat
pnpm dev
```

### 5. Test Integration

Visit:

- Analytics: http://localhost:3000/admin/analytics
- Search: http://localhost:3000/search (try semantic search)
- Media: Upload a file and check for thumbnails
- AI: Try AI-powered features (summarization, moderation)
- Workflows: http://localhost:3000/admin/workflows

---

## Troubleshooting

### Plugin Won't Start

**Symptom**: Plugin status shows "stopped" or "error"

**Solution**:

```bash
# Check logs
nself logs <plugin-name> --tail 50

# Common issues:
# - Port conflict: Change port in .env.plugins
# - Missing dependency: Check nself doctor output
# - Permission error: Check Docker permissions

# Restart plugin
nself restart <plugin-name>
```

### Health Check Fails

**Symptom**: `curl http://<plugin>.localhost:<port>/health` returns error

**Solution**:

```bash
# Wait for startup
sleep 30

# Check if service is running
docker ps | grep <plugin-name>

# Check if port is bound
lsof -i :<port>

# Review logs
nself logs <plugin-name>
```

### Database Migration Fails

**Symptom**: "Migration failed" error during installation

**Solution**:

```bash
# Check database connectivity
nself exec postgres psql -U postgres -c "SELECT 1"

# Retry migration
nself plugin migrate <plugin-name>

# If still failing, check migration logs
nself logs <plugin-name> | grep migration
```

### High Resource Usage

**Symptom**: Server running slowly after plugin installation

**Solution**:

```bash
# Check resource usage
docker stats

# Reduce memory limits in .env.plugins
ANALYTICS_MEMORY=256M  # Instead of 512M
MEDIA_PIPELINE_MEMORY=1024M  # Instead of 2048M

# Disable unused features
MEDIA_NSFW_DETECTION=false
SEARCH_VECTOR_ENABLED=false

# Restart with new limits
nself restart
```

### API Key Errors (AI Orchestration)

**Symptom**: "Invalid API key" or "Unauthorized" errors

**Solution**:

```bash
# Verify API keys are set
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# If empty, add to vault
nano ~/Sites/.claude/vault.env
# Add: export OPENAI_API_KEY="sk-..."
# Save and source
source ~/Sites/.claude/vault.env

# Restart AI plugin
nself restart ai-orchestration
```

---

## Uninstallation

### Remove a Single Plugin

```bash
cd backend
nself plugin remove <plugin-name>
```

**Options**:

- `--keep-data`: Keep database tables and data
- `--force`: Force removal even if plugin is running

### Remove All New Plugins

```bash
nself plugin remove analytics advanced-search media-pipeline ai-orchestration workflows
```

---

## Resource Requirements

### Minimum (Development)

- CPU: 4 cores
- RAM: 8GB
- Disk: 50GB
- Network: 10Mbps

### Recommended (Production)

- CPU: 8+ cores
- RAM: 16GB+
- Disk: 200GB+ SSD
- Network: 100Mbps+

### Per-Plugin Resources

| Plugin           | CPU | Memory | Storage |
| ---------------- | --- | ------ | ------- |
| Analytics        | 1.0 | 512MB  | 10GB+   |
| Advanced Search  | 0.5 | 1024MB | 5GB+    |
| Media Pipeline   | 2.0 | 2048MB | 50GB+   |
| AI Orchestration | 0.5 | 512MB  | 1GB     |
| Workflows        | 0.5 | 512MB  | 2GB     |

---

## Next Steps

1. ✅ **Configure Plugins**: Review and adjust environment variables
2. ✅ **Test Features**: Try each plugin's core functionality
3. ✅ **Integration Testing**: Run integration tests
4. ✅ **Documentation**: Review plugin-specific documentation
5. ✅ **Production Deployment**: Deploy to staging/production

---

**Support**:

- Documentation: `/docs/plugins/`
- Issues: https://github.com/nself-org/plugins/issues
- Discord: https://discord.gg/nself
