# ɳChat Jobs Plugin

**Plugin Name**: `jobs`
**Version**: 1.0.0
**Category**: Infrastructure
**Status**: Production Ready
**Priority**: HIGH

---

## Overview

The Jobs Plugin provides background job processing and task scheduling for ɳChat. Built on BullMQ, it handles asynchronous tasks, scheduled jobs, and recurring operations with retry logic and monitoring.

---

## Features

### Core Features

- ✅ **Job Queue** - BullMQ-based job processing
- ✅ **Task Scheduling** - Cron-based scheduled tasks
- ✅ **Priority Queues** - High, normal, low priority
- ✅ **Retry Logic** - Automatic retry with exponential backoff
- ✅ **Job Tracking** - Status monitoring and history
- ✅ **Concurrency Control** - Configurable worker count
- ✅ **Job Priorities** - Critical, high, normal, low
- ✅ **Delayed Jobs** - Schedule jobs for future execution
- ✅ **Recurring Jobs** - Repeating tasks with cron expressions

### Advanced Features

- ✅ **Job Dependencies** - Chain jobs together
- ✅ **Job Cancellation** - Cancel pending/delayed jobs
- ✅ **Job Progress** - Track job progress (0-100%)
- ✅ **Bulk Operations** - Add multiple jobs at once
- ✅ **Queue Management** - Pause, resume, drain queues
- ✅ **Job Cleanup** - Automatic cleanup of old jobs
- ✅ **Dashboard** - BullMQ Dashboard for monitoring
- ✅ **Metrics** - Prometheus metrics export

---

## Installation

### Prerequisites

- Docker running
- nself CLI v0.9.8+
- Redis service (provided by nself stack)

### Install Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend
nself plugin install jobs
```

### Configuration

Add to `backend/.env.plugins`:

```bash
# Jobs Plugin
JOBS_ENABLED=true
JOBS_PORT=3105
JOBS_ROUTE=jobs.${BASE_DOMAIN:-localhost}
JOBS_MEMORY=256M

# Redis Configuration
JOBS_REDIS_HOST=redis
JOBS_REDIS_PORT=6379
JOBS_REDIS_DB=2
JOBS_REDIS_PASSWORD=${REDIS_PASSWORD:-}

# Queue Configuration
JOBS_CONCURRENCY=5
JOBS_MAX_RETRIES=3
JOBS_RETRY_DELAY=5000
JOBS_RETRY_BACKOFF=exponential
JOBS_BACKOFF_DELAY=1000

# Queue Limits
JOBS_MAX_JOBS_PER_QUEUE=10000
JOBS_MAX_JOBS_PER_WORKER=100

# Scheduled Jobs
JOBS_CLEANUP_OLD_MESSAGES_ENABLED=true
JOBS_CLEANUP_OLD_MESSAGES_SCHEDULE="0 2 * * *"
JOBS_CLEANUP_OLD_MESSAGES_DAYS=90

JOBS_GENERATE_ANALYTICS_ENABLED=true
JOBS_GENERATE_ANALYTICS_SCHEDULE="0 0 * * *"

JOBS_BACKUP_DATABASE_ENABLED=true
JOBS_BACKUP_DATABASE_SCHEDULE="0 3 * * 0"

JOBS_SEND_EMAIL_DIGEST_ENABLED=true
JOBS_SEND_EMAIL_DIGEST_SCHEDULE="0 9 * * *"

# Dashboard
JOBS_DASHBOARD_ENABLED=true
JOBS_DASHBOARD_PORT=4200
JOBS_DASHBOARD_ROUTE=queues.${BASE_DOMAIN:-localhost}
JOBS_DASHBOARD_AUTH_ENABLED=true
JOBS_DASHBOARD_USERNAME=admin
JOBS_DASHBOARD_PASSWORD=${JOBS_DASHBOARD_PASSWORD}

# Monitoring
JOBS_METRICS_ENABLED=true
JOBS_HEALTH_CHECK_INTERVAL=30
```

### Start Service

```bash
nself restart
```

---

## API Endpoints

### Health Check

```bash
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "service": "jobs",
  "version": "1.0.0",
  "uptime": 86400,
  "queues": [
    {
      "name": "default",
      "waiting": 10,
      "active": 2,
      "completed": 1000,
      "failed": 5
    },
    {
      "name": "high-priority",
      "waiting": 0,
      "active": 1,
      "completed": 500,
      "failed": 1
    }
  ],
  "dependencies": {
    "redis": {
      "status": "connected",
      "latency": 1
    }
  }
}
```

### Schedule Job

```bash
POST /schedule
Content-Type: application/json

{
  "type": "send-notification",
  "payload": {
    "userId": "user-123",
    "channel": "email",
    "content": {
      "subject": "Hello",
      "body": "World"
    }
  },
  "options": {
    "priority": "high",
    "delay": 60000,
    "retry": {
      "attempts": 3,
      "delay": 5000
    }
  }
}
```

**Response:**

```json
{
  "jobId": "job-abc123",
  "queueName": "high-priority",
  "status": "waiting",
  "createdAt": "2026-02-03T12:00:00Z",
  "runAt": "2026-02-03T12:01:00Z"
}
```

### Schedule Recurring Job

```bash
POST /schedule
Content-Type: application/json

{
  "type": "cleanup-expired",
  "payload": {
    "targetType": "messages",
    "olderThan": 90
  },
  "schedule": "0 2 * * *",
  "options": {
    "priority": "low"
  }
}
```

### Get Job Status

```bash
GET /jobs/:jobId
```

**Response:**

```json
{
  "jobId": "job-abc123",
  "type": "send-notification",
  "status": "completed",
  "progress": 100,
  "result": {
    "success": true,
    "notificationId": "notif-xyz"
  },
  "createdAt": "2026-02-03T12:00:00Z",
  "startedAt": "2026-02-03T12:00:05Z",
  "completedAt": "2026-02-03T12:00:07Z",
  "attempts": 1,
  "queue": "high-priority"
}
```

### Cancel Job

```bash
DELETE /jobs/:jobId
```

**Response:**

```json
{
  "success": true,
  "jobId": "job-abc123",
  "message": "Job cancelled"
}
```

### Retry Failed Job

```bash
POST /jobs/:jobId/retry
```

### List Jobs

```bash
GET /jobs?queue=default&status=active&limit=20
```

**Response:**

```json
{
  "jobs": [
    {
      "jobId": "job-1",
      "type": "send-email",
      "status": "active",
      "progress": 50,
      "createdAt": "2026-02-03T12:00:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

### Queue Management

#### Get Queue Stats

```bash
GET /queues/:queueName
```

**Response:**

```json
{
  "name": "default",
  "counts": {
    "waiting": 10,
    "active": 2,
    "completed": 1000,
    "failed": 5,
    "delayed": 3,
    "paused": 0
  },
  "isPaused": false,
  "processingRate": 100
}
```

#### Pause Queue

```bash
POST /queues/:queueName/pause
```

#### Resume Queue

```bash
POST /queues/:queueName/resume
```

#### Drain Queue

```bash
POST /queues/:queueName/drain
```

Removes all waiting jobs from queue.

#### Clean Queue

```bash
POST /queues/:queueName/clean
Content-Type: application/json

{
  "grace": 86400000,
  "status": "completed",
  "limit": 1000
}
```

Removes old completed/failed jobs.

---

## Job Types

### Built-in Job Types

#### send-notification

```typescript
{
  "type": "send-notification",
  "payload": {
    "userId": "user-123",
    "channel": "email",
    "to": { "email": "user@example.com" },
    "content": { "subject": "Hello", "body": "World" }
  }
}
```

#### send-email-digest

```typescript
{
  "type": "send-email-digest",
  "payload": {
    "userId": "user-123",
    "frequency": "daily",
    "since": "2026-02-02T09:00:00Z"
  }
}
```

#### cleanup-expired

```typescript
{
  "type": "cleanup-expired",
  "payload": {
    "targetType": "messages",
    "olderThan": 90
  }
}
```

#### generate-analytics

```typescript
{
  "type": "generate-analytics",
  "payload": {
    "date": "2026-02-03",
    "metrics": ["messages", "users", "channels"]
  }
}
```

#### backup-database

```typescript
{
  "type": "backup-database",
  "payload": {
    "destination": "s3",
    "retention": 30
  }
}
```

#### scheduled-message

```typescript
{
  "type": "scheduled-message",
  "payload": {
    "scheduledMessageId": "msg-123",
    "channelId": "channel-456",
    "userId": "user-789",
    "content": "This message was scheduled"
  },
  "runAt": "2026-02-04T10:00:00Z"
}
```

### Custom Job Types

Register custom job processors:

```typescript
// In your application
import { registerJobProcessor } from '@/services/jobs'

registerJobProcessor('custom-task', async (job) => {
  const { data } = job
  // Process job
  await job.updateProgress(50)
  // Complete
  return { success: true }
})
```

---

## Queues

### Available Queues

1. **default** - General purpose jobs
2. **high-priority** - Time-sensitive jobs
3. **low-priority** - Background cleanup tasks
4. **scheduled** - Scheduled and recurring jobs

### Queue Selection

Jobs are automatically routed to appropriate queues:

```typescript
const queueMapping = {
  'send-notification': 'high-priority',
  'scheduled-message': 'scheduled',
  'cleanup-expired': 'low-priority',
  // default: 'default'
}
```

Or specify explicitly:

```typescript
{
  "type": "custom-task",
  "payload": {},
  "options": {
    "queue": "high-priority"
  }
}
```

---

## Frontend Integration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_JOBS_URL=http://jobs.localhost:3105
NEXT_PUBLIC_BULLMQ_DASHBOARD_URL=http://queues.localhost:4200
NEXT_PUBLIC_JOBS_ENABLED=true
```

### React Hook

```typescript
import { useJobStatus } from '@/hooks/use-job-status'

function ScheduledMessage({ messageId }) {
  const { status, progress, result } = useJobStatus(messageId)

  return (
    <div>
      <span>Status: {status}</span>
      {progress > 0 && <span>Progress: {progress}%</span>}
    </div>
  )
}
```

### Service Layer

```typescript
import { JobQueueService } from '@/services/jobs'

const jobQueue = new JobQueueService()

// Schedule a job
const job = await jobQueue.addJob(
  'send-notification',
  {
    userId: 'user-123',
    channel: 'email',
    content: { subject: 'Hello' },
  },
  {
    priority: 'high',
    delay: 5000,
  }
)

// Get job status
const status = await jobQueue.getJobStatus(job.jobId)

// Cancel job
await jobQueue.cancelJob(job.jobId)

// Retry failed job
await jobQueue.retryJob(job.jobId)
```

---

## BullMQ Dashboard

### Access Dashboard

```bash
open http://queues.localhost:4200
```

### Features

- View all queues and their status
- Monitor active, waiting, failed jobs
- View job details and logs
- Retry failed jobs
- Clean up old jobs
- View queue metrics and charts
- Real-time updates

### Authentication

If dashboard auth is enabled:

- **Username**: admin
- **Password**: Set in `JOBS_DASHBOARD_PASSWORD`

---

## Scheduled Tasks

### Built-in Scheduled Tasks

#### Daily Message Cleanup

```bash
# Runs daily at 2 AM
JOBS_CLEANUP_OLD_MESSAGES_ENABLED=true
JOBS_CLEANUP_OLD_MESSAGES_SCHEDULE="0 2 * * *"
JOBS_CLEANUP_OLD_MESSAGES_DAYS=90
```

#### Daily Analytics Generation

```bash
# Runs daily at midnight
JOBS_GENERATE_ANALYTICS_ENABLED=true
JOBS_GENERATE_ANALYTICS_SCHEDULE="0 0 * * *"
```

#### Weekly Database Backup

```bash
# Runs Sundays at 3 AM
JOBS_BACKUP_DATABASE_ENABLED=true
JOBS_BACKUP_DATABASE_SCHEDULE="0 3 * * 0"
```

#### Daily Email Digests

```bash
# Runs daily at 9 AM
JOBS_SEND_EMAIL_DIGEST_ENABLED=true
JOBS_SEND_EMAIL_DIGEST_SCHEDULE="0 9 * * *"
```

### Cron Expression Format

```
┌────────────── second (optional, 0-59)
│ ┌──────────── minute (0-59)
│ │ ┌────────── hour (0-23)
│ │ │ ┌──────── day of month (1-31)
│ │ │ │ ┌────── month (1-12)
│ │ │ │ │ ┌──── day of week (0-7)
│ │ │ │ │ │
* * * * * *
```

Examples:

- `0 9 * * *` - Every day at 9:00 AM
- `*/15 * * * *` - Every 15 minutes
- `0 */4 * * *` - Every 4 hours
- `0 0 * * 0` - Every Sunday at midnight
- `0 0 1 * *` - First day of every month

---

## Testing

### Health Check

```bash
curl http://jobs.localhost:3105/health
```

### Schedule Test Job

```bash
curl -X POST http://jobs.localhost:3105/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "type": "custom",
    "payload": { "action": "test", "data": {} },
    "options": { "priority": "normal" }
  }'
```

### View Job Status

```bash
curl http://jobs.localhost:3105/jobs/job-abc123
```

---

## Monitoring

### Metrics

Available at `/metrics`:

- `jobs_total` - Total jobs processed
- `jobs_active` - Currently active jobs
- `jobs_waiting` - Jobs waiting to be processed
- `jobs_completed` - Successfully completed jobs
- `jobs_failed` - Failed jobs
- `jobs_latency_ms` - Job processing latency
- `jobs_retry_count` - Number of retries

### Logs

```bash
nself logs jobs --follow
```

---

## Troubleshooting

### Jobs Not Processing

1. Check Redis connection: `/health`
2. Verify worker is running: `nself status jobs`
3. Check queue is not paused: `GET /queues/default`
4. Review logs: `nself logs jobs`

### High Failure Rate

1. Check job payload validity
2. Review retry configuration
3. Check dependent services (e.g., notifications plugin)
4. Increase worker concurrency if needed

### Queue Backed Up

1. Check worker concurrency setting
2. Increase workers: `JOBS_CONCURRENCY=10`
3. Scale horizontally (multiple instances)
4. Review slow jobs
5. Clean old completed jobs

---

## Best Practices

1. **Idempotency**: Ensure jobs can be retried safely
2. **Timeouts**: Set reasonable timeouts for long-running jobs
3. **Progress Tracking**: Update progress for long jobs
4. **Error Handling**: Use proper error messages
5. **Monitoring**: Track job metrics and set alerts
6. **Cleanup**: Regularly clean old completed/failed jobs
7. **Testing**: Test jobs in isolation before deployment

---

## Changelog

### Version 1.0.0 (2026-02-03)

- Initial release
- BullMQ-based job processing
- Multiple priority queues
- Scheduled and recurring jobs
- Retry logic with backoff
- BullMQ Dashboard
- Metrics and monitoring

---

## Support

- **Documentation**: https://nself.org/docs/plugins/jobs
- **Issues**: https://github.com/nself-org/plugins/issues

---

## Related Documentation

- [Notifications Plugin](./NOTIFICATIONS-PLUGIN.md)
- [File Processing Plugin](./FILE-PROCESSING-PLUGIN.md)
- [Integration Guide](./INTEGRATION-GUIDE.md)
