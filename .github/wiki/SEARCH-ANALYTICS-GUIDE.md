# Search & Analytics Guide

**ɳChat v0.9.1 - Complete Documentation**

---

## Table of Contents

1. [Overview](#overview)
2. [MeiliSearch Integration](#meilisearch-integration)
3. [Search Features](#search-features)
4. [Analytics Dashboard](#analytics-dashboard)
5. [Usage Tracking](#usage-tracking)
6. [API Reference](#api-reference)
7. [Real-time Indexing](#real-time-indexing)
8. [Export & Reporting](#export--reporting)

---

## Overview

ɳChat provides comprehensive search and analytics capabilities powered by MeiliSearch and custom analytics aggregation.

### Key Features

- **Full-text search** across messages, files, users, and channels
- **Real-time indexing** via GraphQL subscriptions
- **Advanced filtering** with search operators
- **Analytics dashboard** with interactive charts
- **Usage tracking** with plan limit monitoring
- **Export functionality** (CSV, JSON)
- **Performance optimized** with caching and batch operations

---

## MeiliSearch Integration

### Architecture

```
┌─────────────────┐
│   Frontend      │
├─────────────────┤
│ Search API      │
│ /api/search     │
├─────────────────┤
│ Search Service  │
│ search.service  │
├─────────────────┤
│ Sync Service    │
│ sync.service    │
├─────────────────┤
│  MeiliSearch    │
│  Port: 7700     │
└─────────────────┘
```

### Indexes

ɳChat maintains 4 MeiliSearch indexes:

| Index            | Purpose         | Documents    | Searchable Fields                   |
| ---------------- | --------------- | ------------ | ----------------------------------- |
| `nchat_messages` | Message content | All messages | content, content_plain, author_name |
| `nchat_files`    | File metadata   | All files    | name, description, original_name    |
| `nchat_users`    | User profiles   | All users    | username, display_name, email, bio  |
| `nchat_channels` | Channel info    | All channels | name, description, topic            |

### Index Configuration

Each index is configured with:

- **Filterable attributes**: For precise filtering
- **Sortable attributes**: For ordering results
- **Ranking rules**: Custom relevance scoring
- **Stop words**: Common words to ignore
- **Typo tolerance**: Fuzzy matching for misspellings

---

## Search Features

### 1. Basic Search

```typescript
// GET /api/search?q=hello
const response = await fetch('/api/search?q=hello')
const data = await response.json()
```

### 2. Advanced Search with Filters

```typescript
// POST /api/search
const response = await fetch('/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'project update',
    types: ['messages', 'files'],
    channelIds: ['channel-id-1'],
    dateFrom: '2024-01-01',
    dateTo: '2024-12-31',
    limit: 20,
    offset: 0,
    sortBy: 'date',
    sortOrder: 'desc',
  }),
})
```

### 3. Search Operators

ɳChat supports Slack-style search operators:

| Operator  | Example             | Description          |
| --------- | ------------------- | -------------------- |
| `from:`   | `from:john`         | Filter by sender     |
| `in:`     | `in:general`        | Filter by channel    |
| `has:`    | `has:link`          | Messages with links  |
| `has:`    | `has:file`          | Messages with files  |
| `has:`    | `has:image`         | Messages with images |
| `before:` | `before:2024-01-01` | Before date          |
| `after:`  | `after:2024-01-01`  | After date           |
| `is:`     | `is:pinned`         | Pinned messages      |
| `is:`     | `is:starred`        | Starred messages     |

**Example:**

```
project from:alice in:engineering has:file after:2024-01-01
```

### 4. Auto-suggestions

```typescript
import { getSearchService } from '@/services/search'

const service = getSearchService()
const suggestions = await service.getSuggestions('proj', {
  limit: 10,
  types: ['messages', 'users', 'channels'],
})
```

### 5. Highlighting

Search results include highlighted matches:

```typescript
{
  "id": "msg-123",
  "content": "Let's discuss the project update",
  "highlight": "Let's discuss the <mark>project</mark> update",
  "score": 0.92
}
```

---

## Analytics Dashboard

### Components

The analytics dashboard consists of:

```
src/components/analytics/
├── overview/
│   ├── AnalyticsDashboard.tsx      # Main dashboard
│   ├── AnalyticsSummary.tsx        # Summary cards
│   ├── AnalyticsCards.tsx          # Quick stats
│   ├── AnalyticsHeader.tsx         # Header with filters
│   └── UsageTrackingDashboard.tsx  # Usage tracking
├── charts/
│   ├── MessageVolumeChart.tsx      # Message trends
│   ├── ActiveUsersChart.tsx        # User activity
│   ├── ChannelActivityChart.tsx    # Channel stats
│   ├── ReactionChart.tsx           # Popular reactions
│   ├── PeakHoursChart.tsx          # Activity by hour
│   ├── GrowthChart.tsx             # User growth
│   ├── FileUploadChart.tsx         # File uploads
│   ├── ResponseTimeChart.tsx       # Response times
│   └── UserEngagementChart.tsx     # Engagement metrics
├── tables/
│   ├── TopChannelsTable.tsx        # Most active channels
│   ├── TopUsersTable.tsx           # Most active users
│   ├── TopMessagesTable.tsx        # Popular messages
│   └── InactiveUsersTable.tsx      # Inactive users
├── views/
│   ├── MessageAnalytics.tsx        # Message-specific view
│   ├── UserAnalytics.tsx           # User-specific view
│   ├── ChannelAnalytics.tsx        # Channel-specific view
│   ├── FileAnalytics.tsx           # File-specific view
│   ├── SearchAnalytics.tsx         # Search-specific view
│   └── BotAnalytics.tsx            # Bot-specific view
└── export/
    └── AnalyticsExport.tsx         # Export functionality
```

### Metrics Tracked

#### Overview Tab

- Total messages (24h, 7d, 30d, all-time)
- Active users (online now, today, this week)
- New channels created
- Storage usage
- Top channels by activity

#### Messages Tab

- Messages over time (line chart)
- Messages by channel (bar chart)
- Messages by user (top 10)
- Message types breakdown (text, image, video, file)
- Peak hours analysis

#### Users Tab

- User growth (line chart)
- Active users trend (DAU/WAU/MAU)
- User roles breakdown (pie chart)
- Top contributors
- Inactive users (30+ days)

#### Files Tab

- Storage usage by type
- File uploads over time
- Largest files
- Files by channel
- File type distribution

#### Channels Tab

- Channel activity heatmap
- Most active channels
- Channel types breakdown
- Member growth by channel

### Using the Dashboard

```typescript
import { AnalyticsDashboard } from '@/components/analytics/overview/AnalyticsDashboard';

export default function AnalyticsPage() {
  return <AnalyticsDashboard className="container mx-auto py-6" />;
}
```

### Filters

The dashboard supports filtering by:

- **Date range**: Last 7/30/90 days, custom range
- **Granularity**: Hour, day, week, month
- **Channels**: Filter by specific channels
- **Users**: Filter by specific users
- **Include bots**: Toggle bot activity

---

## Usage Tracking

### Plan Limits

ɳChat tracks usage against plan limits:

| Metric        | Free    | Starter | Pro    | Enterprise |
| ------------- | ------- | ------- | ------ | ---------- |
| Members       | 50      | 100     | 500    | Unlimited  |
| Channels      | 15      | 50      | 200    | Unlimited  |
| Storage       | 10 GB   | 50 GB   | 500 GB | Unlimited  |
| API Calls     | 100k/mo | 500k/mo | 2M/mo  | Unlimited  |
| Video Minutes | 300/mo  | 1k/mo   | 5k/mo  | Unlimited  |

### Status Indicators

- **Safe** (0-74%): Green, healthy usage
- **Warning** (75-99%): Amber, approaching limit
- **Critical** (100%+): Red, limit reached

### Usage Dashboard

```typescript
import { UsageTrackingDashboard } from '@/components/analytics/overview/UsageTrackingDashboard';

export default function UsagePage() {
  const limits = {
    plan: 'free',
    members: { current: 45, limit: 50 },
    channels: { current: 12, limit: 15 },
    storage: { current: 8500, limit: 10240 },
    apiCalls: { current: 95000, limit: 100000 },
    videoMinutes: { current: 280, limit: 300 },
  };

  return (
    <UsageTrackingDashboard
      limits={limits}
      onUpgrade={() => router.push('/billing/upgrade')}
      onExport={(format) => console.log(`Exporting as ${format}`)}
    />
  );
}
```

---

## API Reference

### Search API

#### `GET /api/search`

Quick search across all types.

**Query Parameters:**

- `q` (required): Search query
- `limit` (optional): Results per page (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

#### `POST /api/search`

Advanced search with filters.

**Request Body:**

```json
{
  "query": "project update",
  "types": ["messages", "files"],
  "channelIds": ["channel-id-1"],
  "userIds": ["user-id-1"],
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31",
  "limit": 20,
  "offset": 0,
  "sortBy": "date",
  "sortOrder": "desc"
}
```

**Response:**

```json
{
  "success": true,
  "results": [...],
  "totals": {
    "messages": 50,
    "files": 10,
    "users": 5,
    "channels": 2,
    "total": 67
  },
  "query": "project update",
  "types": ["messages", "files"],
  "pagination": {...}
}
```

### Index Management API

#### `GET /api/search/index`

Get index status and health.

**Response:**

```json
{
  "success": true,
  "stats": {
    "messages": {
      "numberOfDocuments": 1000,
      "isIndexing": false
    },
    ...
  },
  "health": {
    "messages": {
      "healthy": true,
      "pendingTasks": 0,
      "failedTasks": 0
    },
    ...
  }
}
```

#### `POST /api/search/index`

Trigger reindexing (admin only).

**Request Body:**

```json
{
  "indexName": "messages",
  "forceRebuild": true
}
```

#### `DELETE /api/search/index`

Clear all indexes (admin only).

### Reindex API

#### `POST /api/search/reindex`

Trigger full reindexing of all or specific indexes.

**Request Body:**

```json
{
  "indexNames": ["messages", "files"],
  "forceRebuild": true,
  "batchSize": 100
}
```

#### `GET /api/search/reindex/status`

Get reindexing progress.

**Response:**

```json
{
  "success": true,
  "isReindexing": true,
  "stats": {...},
  "health": {...}
}
```

### Analytics API

#### `GET /api/analytics/dashboard`

Get aggregated dashboard data.

**Query Parameters:**

- `preset`: Date range preset (last7days, last30days, last90days)
- `start`: Custom start date (ISO 8601)
- `end`: Custom end date (ISO 8601)
- `granularity`: Time granularity (hour, day, week, month)
- `channels`: Comma-separated channel IDs
- `users`: Comma-separated user IDs
- `includeBots`: Include bot activity (true/false)

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {...},
    "messageVolume": [...],
    "activeUsers": {...},
    "channelActivity": [...],
    ...
  },
  "filters": {...},
  "meta": {
    "generatedAt": "2024-01-01T00:00:00Z",
    "cached": false
  }
}
```

#### `GET /api/analytics/messages`

Get message-specific analytics.

#### `GET /api/analytics/users`

Get user-specific analytics.

#### `GET /api/analytics/export`

Export analytics data.

**Query Parameters:**

- `format`: Export format (csv, json)
- `sections`: Comma-separated sections to export
- `preset`: Date range preset

---

## Real-time Indexing

### Architecture

```
GraphQL Subscription
        ↓
RealtimeSyncService
        ↓
    SyncService
        ↓
 MessageIndexer
        ↓
   MeiliSearch
```

### Setup

```typescript
import { getRealtimeSyncService } from '@/services/search/realtime-sync'
import { io } from 'socket.io-client'

// Initialize realtime sync
const realtimeSync = getRealtimeSyncService({
  enabled: true,
  batchInterval: 1000,
  maxBatchSize: 50,
  debug: false,
})

// Connect to Socket.io
const socket = io('http://localhost:4000')
realtimeSync.connect(socket)

// Subscribe to sync events
const unsubscribe = realtimeSync.onSync((result, event) => {
  console.log(`Indexed ${event.type}:`, result)
})

// Later: disconnect
realtimeSync.disconnect()
unsubscribe()
```

### Events

The sync service listens for these events:

- `message:created`
- `message:updated`
- `message:deleted`
- `channel:created`
- `channel:updated`
- `channel:deleted`
- `user:created`
- `user:updated`
- `user:deleted`
- `file:uploaded`
- `file:deleted`

### Manual Indexing

```typescript
import { getSyncService } from '@/services/search'

const syncService = getSyncService()

// Index a single message
await syncService.indexMessage(message, channel, author)

// Batch index messages
await syncService.batchIndexMessages([
  { message, channel, author },
  { message: message2, channel: channel2, author: author2 },
])

// Index other entities
await syncService.indexFile(file)
await syncService.indexUser(user)
await syncService.indexChannel(channel)
```

---

## Export & Reporting

### Export Formats

#### CSV Export

```typescript
import { exportFullReport } from '@/lib/analytics/analytics-export'

exportFullReport(data, {
  format: 'csv',
  sections: ['summary', 'messages', 'users'],
  dateRange,
  includeCharts: false,
})
```

Generated file: `analytics-report-2024-01-01.csv`

#### JSON Export

```typescript
exportFullReport(data, {
  format: 'json',
  sections: ['summary', 'messages', 'users'],
  dateRange,
  includeCharts: false,
})
```

Generated file: `analytics-report-2024-01-01.json`

### Scheduled Reports

```typescript
import { useAnalyticsStore } from '@/stores/analytics-store'

const { addScheduledReport } = useAnalyticsStore()

addScheduledReport({
  id: 'weekly-report',
  name: 'Weekly Analytics Report',
  schedule: 'weekly',
  format: 'csv',
  sections: ['summary', 'messages', 'users'],
  recipients: ['admin@example.com'],
  enabled: true,
})
```

---

## Performance Optimization

### Caching

- **Analytics aggregator**: 5-minute cache for dashboard data
- **Search results**: Client-side caching via SWR
- **Index stats**: 1-minute cache for index health

### Batch Operations

- **Message indexing**: Batched every 1 second or 50 messages
- **Bulk reindexing**: 100 documents per batch
- **API requests**: Paginated with max 100 results

### Rate Limiting

| Endpoint                       | Limit     |
| ------------------------------ | --------- |
| `GET /api/search`              | 60/minute |
| `POST /api/search`             | 60/minute |
| `POST /api/search/reindex`     | 10/minute |
| `GET /api/analytics/dashboard` | 30/minute |

---

## Troubleshooting

### Common Issues

#### 1. Search not working

**Problem**: Search returns no results.

**Solutions**:

- Check MeiliSearch is running: `docker ps | grep meilisearch`
- Verify indexes exist: `GET /api/search/index`
- Trigger reindex: `POST /api/search/reindex`

#### 2. Real-time indexing not working

**Problem**: New messages don't appear in search.

**Solutions**:

- Check Socket.io connection
- Verify GraphQL subscriptions are active
- Check console for sync errors

#### 3. Analytics data missing

**Problem**: Dashboard shows no data.

**Solutions**:

- Check analytics collector is running
- Verify database connection
- Clear cache: `analyticsAggregator.clearCache()`

#### 4. Slow search performance

**Problem**: Search takes too long.

**Solutions**:

- Reduce result limit
- Use specific types filter
- Add more MeiliSearch RAM
- Check index health

---

## Best Practices

### Search

1. **Use specific types** when possible to narrow results
2. **Implement pagination** for large result sets
3. **Provide suggestions** for better UX
4. **Show loading states** during searches
5. **Highlight matches** in results

### Analytics

1. **Use date range presets** for common queries
2. **Implement caching** for expensive aggregations
3. **Show comparison data** for context
4. **Export large datasets** instead of displaying all
5. **Monitor cache hit rates** to optimize TTL

### Indexing

1. **Use batch operations** for bulk indexing
2. **Monitor index health** regularly
3. **Set up alerts** for indexing failures
4. **Reindex periodically** to maintain consistency
5. **Use real-time sync** for immediate updates

---

## Additional Resources

- [MeiliSearch Documentation](https://docs.meilisearch.com/)
- [Recharts Documentation](https://recharts.org/)
- [Analytics Implementation Plan](./SEARCH-ANALYTICS-PLAN.md)
- [API Documentation](api/API.md)

---

**Last Updated**: 2026-02-03
**Version**: 0.9.1
