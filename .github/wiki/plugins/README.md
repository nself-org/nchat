# ɳPlugins System for ɳChat

**Version**: ɳChat v0.9.1
**Date**: 2026-02-03
**Status**: Phase 2 Complete - Ready for Installation

---

## Overview

ɳChat uses the ɳSelf plugin system to extend backend functionality. Plugins are Docker-based microservices that integrate seamlessly with the nself CLI stack.

**Architecture**:

```
Next.js Frontend (Port 3000)
    ↓
API Routes (/app/api/*)
    ↓
ɳPlugins (Docker Services)
    ↓
ɳSelf Core (PostgreSQL, Hasura, Auth)
```

---

## Quick Start

### 1. Prerequisites

```bash
# Check nself CLI
nself --version  # Should be v0.9.8+

# Check Docker
docker ps

# Navigate to backend
cd /Users/admin/Sites/nself-nchat/backend
```

### 2. Install Core Plugins

```bash
# Option A: Automated (recommended)
cd /Users/admin/Sites/nself-chat
./scripts/install-plugins.sh --core-only

# Option B: Manual
cd backend
nself plugin install realtime
nself plugin install notifications
nself plugin install jobs
nself plugin install file-processing
nself restart
```

### 3. Verify Installation

```bash
# Check installed plugins
nself plugin list --installed

# Check health
nself plugin status

# Test endpoints
curl http://realtime.localhost:3101/health
curl http://notifications.localhost:3102/health
curl http://jobs.localhost:3105/health
curl http://files.localhost:3104/health
```

### 4. Configure Frontend

Add to `.env.local`:

```bash
# Core Plugins
NEXT_PUBLIC_REALTIME_URL=http://realtime.localhost:3101
NEXT_PUBLIC_REALTIME_WS_URL=ws://realtime.localhost:3101
NEXT_PUBLIC_NOTIFICATIONS_URL=http://notifications.localhost:3102
NEXT_PUBLIC_JOBS_URL=http://jobs.localhost:3105
NEXT_PUBLIC_FILE_PROCESSING_URL=http://files.localhost:3104
NEXT_PUBLIC_BULLMQ_DASHBOARD_URL=http://queues.localhost:4200

# Feature Flags
NEXT_PUBLIC_REALTIME_ENABLED=true
NEXT_PUBLIC_NOTIFICATIONS_ENABLED=true
NEXT_PUBLIC_JOBS_ENABLED=true
NEXT_PUBLIC_FILE_PROCESSING_ENABLED=true
```

---

## Available Plugins

### Core Plugins (Required)

| Plugin              | Port | Purpose                      | Status   |
| ------------------- | ---- | ---------------------------- | -------- |
| **realtime**        | 3101 | WebSocket, presence, typing  | ✅ Ready |
| **notifications**   | 3102 | Push, email, SMS             | ✅ Ready |
| **jobs**            | 3105 | Background tasks, scheduling | ✅ Ready |
| **file-processing** | 3104 | Image/video processing       | ✅ Ready |

### Auth Plugins (Optional)

| Plugin   | Purpose                                              | Status        |
| -------- | ---------------------------------------------------- | ------------- |
| **idme** | Identity verification (military, students, teachers) | ✅ Documented |

### Integration Plugins (Future)

| Plugin      | Purpose                           | Status        |
| ----------- | --------------------------------- | ------------- |
| **stripe**  | Payment processing, subscriptions | ✅ Documented |
| **github**  | Repository integration, CI/CD     | ✅ Documented |
| **shopify** | E-commerce integration            | ✅ Documented |

---

## Plugin Details

### 1. Realtime Plugin

**Purpose**: Real-time communication infrastructure

**Features**:

- WebSocket server for instant messaging
- Presence tracking (online/away/dnd/offline)
- Typing indicators
- Live message delivery
- Room management

**API Routes**:

- `GET /api/realtime` - Health check
- `GET /api/realtime/presence?channelId=xxx` - Get presence
- `POST /api/realtime/presence` - Update presence
- `POST /api/realtime/typing` - Send typing indicator

**Frontend Integration**:

```typescript
import { useRealtime } from '@/hooks/use-realtime'

function ChatRoom({ channelId }) {
  const { joinChannel, sendTyping } = useRealtime()

  useEffect(() => {
    joinChannel(channelId)
  }, [channelId])

  // Use typing indicators
  const handleTyping = (isTyping) => {
    sendTyping(channelId, isTyping)
  }
}
```

**Environment Variables**:

```bash
REALTIME_ENABLED=true
REALTIME_PORT=3101
REALTIME_WEBSOCKET_MAX_CONNECTIONS=10000
REALTIME_PRESENCE_TIMEOUT=30000
REALTIME_TYPING_TIMEOUT=3000
```

---

### 2. Notifications Plugin

**Purpose**: Multi-channel notification delivery

**Features**:

- Push notifications (FCM for Android, APNS for iOS)
- Email notifications (SMTP, SendGrid, Mailgun)
- SMS notifications (Twilio)
- In-app notification center
- Notification preferences per user

**Frontend Integration**:

```typescript
import { NotificationService } from '@/services/notifications'

const notificationService = new NotificationService()

// Send notification
await notificationService.sendNotification({
  userId: 'user-123',
  type: 'message',
  title: 'New message from Alice',
  body: 'Hey, how are you?',
  channels: ['push', 'email'],
})
```

**Environment Variables**:

```bash
NOTIFICATIONS_ENABLED=true
NOTIFICATIONS_PORT=3102
NOTIFICATIONS_EMAIL_PROVIDER=mailpit
NOTIFICATIONS_SMTP_HOST=mailpit
NOTIFICATIONS_SMTP_PORT=1025
```

---

### 3. Jobs Plugin

**Purpose**: Background job processing and scheduling

**Features**:

- BullMQ-based job queue
- Scheduled tasks (cron)
- Job retry logic
- Job prioritization
- Dashboard (BullMQ Dashboard)

**Scheduled Tasks**:

- Message cleanup (daily at 2am)
- Database backups (weekly on Sunday)
- Analytics generation (daily at midnight)
- Email digests (configurable)

**Frontend Integration**:

```typescript
import { JobQueueService } from '@/services/jobs'

const jobQueue = new JobQueueService()

// Schedule a job
await jobQueue.scheduleJob({
  type: 'send-email-digest',
  payload: { userId: 'user-123', frequency: 'daily' },
  runAt: new Date('2026-02-04T00:00:00Z'),
})
```

**Dashboard**: http://queues.localhost:4200

**Environment Variables**:

```bash
JOBS_ENABLED=true
JOBS_PORT=3105
JOBS_CONCURRENCY=5
JOBS_MAX_RETRIES=3
JOBS_CLEANUP_OLD_MESSAGES_ENABLED=true
JOBS_CLEANUP_OLD_MESSAGES_SCHEDULE="0 2 * * *"
```

---

### 4. File Processing Plugin

**Purpose**: File transformation and optimization

**Features**:

- Image resizing and optimization
- Video thumbnail generation
- Document preview (PDF, Office)
- EXIF metadata stripping
- Virus scanning (optional)

**Frontend Integration**:

```typescript
import { FileUploadService } from '@/services/files'

const fileUpload = new FileUploadService()

// Upload and process
const result = await fileUpload.uploadAndProcess(file, {
  resize: true,
  optimize: true,
  thumbnail: true,
  stripMetadata: true,
})
```

**Environment Variables**:

```bash
FILE_PROCESSING_ENABLED=true
FILE_PROCESSING_PORT=3104
FILE_PROCESSING_IMAGE_MAX_WIDTH=2048
FILE_PROCESSING_IMAGE_QUALITY=85
FILE_PROCESSING_VIDEO_THUMBNAIL_ENABLED=true
```

---

### 5. ID.me Plugin

**Purpose**: Identity verification for specialized communities

**Features**:

- Identity verification
- OAuth 2.0 integration
- Group affiliation (military, first responders, students, teachers)
- Secure credential verification

**Setup Required**:

1. Create ID.me developer account: https://developer.id.me
2. Create OAuth application
3. Add credentials to `.env.plugins`:
   ```bash
   IDME_ENABLED=true
   IDME_CLIENT_ID=your_client_id
   IDME_CLIENT_SECRET=your_client_secret
   ```

**Frontend Integration**:

```typescript
// Auth provider automatically appears in login UI when enabled
// See src/config/auth.config.ts
```

---

## Installation Guides

### Detailed Documentation

- **Plugin Inventory**: [PLUGIN-INVENTORY.md](../PLUGIN-INVENTORY.md)
- **Installation Guide**: [INSTALLATION-GUIDE.md](./INSTALLATION-GUIDE.md)
- **Integration Guide**: [INTEGRATION-GUIDE.md](./INTEGRATION-GUIDE.md)

### Installation Script

```bash
cd /Users/admin/Sites/nself-chat

# Install core plugins only
./scripts/install-plugins.sh --core-only

# Install core + auth plugins
./scripts/install-plugins.sh --with-auth

# Interactive installation (prompts for optional plugins)
./scripts/install-plugins.sh

# Skip service restart (useful for testing)
./scripts/install-plugins.sh --skip-restart

# Help
./scripts/install-plugins.sh --help
```

---

## Management Commands

### List Plugins

```bash
# List all available plugins
nself plugin list

# List installed plugins only
nself plugin list --installed

# Filter by category
nself plugin list --category communication
nself plugin list --category billing
nself plugin list --category devops
```

### Install/Remove

```bash
# Install a plugin
nself plugin install <name>

# Remove a plugin
nself plugin remove <name>

# Remove but keep database tables
nself plugin remove <name> --keep-data
```

### Updates

```bash
# Check for plugin updates
nself plugin updates

# Update a specific plugin
nself plugin update <name>

# Update all plugins
nself plugin update --all
```

### Status & Health

```bash
# Check all plugin status
nself plugin status

# Check specific plugin
nself plugin status realtime

# Run diagnostics
nself doctor
```

---

## Troubleshooting

### Plugin Won't Start

```bash
# Check logs
nself logs <plugin-name>

# Verify dependencies
nself status | grep -E "(redis|minio|postgres)"

# Run diagnostics
nself doctor
```

### Health Check Fails

```bash
# Wait for service to be ready
sleep 10
curl http://<plugin>.localhost:<port>/health

# Check service logs
nself logs <plugin-name> --tail 50
```

### Port Conflicts

```bash
# Check what's using the port
lsof -i :3101  # Example for realtime plugin

# Kill conflicting process or change port in .env.plugins
```

---

## Resource Requirements

### Development Environment

- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Disk**: 10+ GB

### Production Environment

- **CPU**: 8+ cores
- **RAM**: 16+ GB
- **Disk**: 50+ GB SSD

### Per-Plugin Resources

| Plugin          | CPU  | RAM  | Scaling Notes           |
| --------------- | ---- | ---- | ----------------------- |
| realtime        | 0.5  | 256M | Scales with connections |
| notifications   | 0.25 | 128M | Email heavy             |
| jobs            | 0.5  | 256M | Depends on concurrency  |
| file-processing | 1.0  | 512M | Image/video intensive   |
| idme            | 0.1  | 64M  | Lightweight             |

---

## Security

### Best Practices

1. **Secrets Management**: Use `.env.secrets` for production credentials
2. **HTTPS Only**: Production must use HTTPS for OAuth plugins
3. **Webhook Secrets**: Generate strong secrets for webhook verification
4. **Rate Limiting**: Configure rate limits for public endpoints
5. **API Keys**: Rotate API keys regularly

### Environment Separation

```bash
# Development
backend/.env          # Local development config
backend/.env.plugins  # Plugin config

# Production
backend/.env.prod     # Production config
backend/.env.secrets  # Secrets (git-ignored)
```

---

## Monitoring

### Health Checks

```bash
# Auto-check every 30 seconds
PLUGIN_HEALTH_CHECK_INTERVAL=30
PLUGIN_HEALTH_CHECK_TIMEOUT=5

# Auto-restart on failure
PLUGIN_AUTO_RESTART=true
PLUGIN_RESTART_DELAY=5
```

### Metrics (Prometheus)

```bash
# Enable metrics
PLUGIN_METRICS_ENABLED=true
PLUGIN_METRICS_PORT=9090

# Access metrics
curl http://localhost:9090/metrics
```

### Logging

```bash
# JSON logs for production
PLUGIN_LOG_LEVEL=info
PLUGIN_LOG_FORMAT=json

# View logs
nself logs <plugin-name> --follow
```

---

## Support & Resources

- **nself CLI Documentation**: https://nself.org/docs
- **Plugin Registry**: https://plugins.nself.org
- **GitHub**: https://github.com/nself-org/plugins
- **Issues**: https://github.com/nself-org/plugins/issues

---

## Next Steps

1. ✅ **Install Core Plugins**: Run `./scripts/install-plugins.sh --core-only`
2. ✅ **Configure Frontend**: Add environment variables to `.env.local`
3. ✅ **Test Integration**: Verify health endpoints
4. ✅ **Run Tests**: Execute integration tests
5. ✅ **Deploy**: Deploy to staging/production

---

## Success Criteria

- [x] All core plugins (4) documented
- [x] Installation guides created
- [x] Integration guides created
- [x] API routes implemented
- [x] Service layers wired
- [x] Automated installation script
- [x] Troubleshooting guide
- [ ] Docker running
- [ ] Plugins installed
- [ ] Health checks passing
- [ ] Frontend integration tested
- [ ] Production deployment

**Current Status**: Phase 2 Complete - Ready for Installation

**Next Phase**: Start Docker, install plugins, test integration
