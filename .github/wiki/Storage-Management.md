# Storage Management & Quotas

Complete documentation for the nself-chat storage management and quota system.

## Overview

The storage management system provides comprehensive quota tracking, usage monitoring, and automated cleanup for users, channels, and teams. It supports multi-tier storage plans, soft/hard limits, usage breakdowns, and proactive notifications.

## Architecture

### Core Components

1. **QuotaManager** (`src/lib/storage/quota-manager.ts`)
   - Central quota management service
   - Tracks usage per user/channel/team
   - Enforces limits and generates warnings
   - Supports cleanup policies

2. **Storage API** (`src/app/api/storage/route.ts`)
   - REST API for storage operations
   - GET: Fetch quota, usage, warnings
   - POST: Update quota, record uploads/deletions, apply cleanup
   - DELETE: Remove files and clear storage

3. **Admin UI** (`src/components/admin/StorageManagement.tsx`)
   - Team-wide storage overview
   - Usage breakdown by type/user/channel
   - Cleanup policy configuration
   - Storage tier management

4. **User UI** (`src/components/settings/StorageUsage.tsx`)
   - Personal storage quota display
   - Usage breakdown by file type
   - Quick cleanup actions
   - Plan upgrade prompts

## Features

### Storage Quotas

**Default Quotas:**

- User: 5 GB
- Channel: 10 GB
- Team: 100 GB

**Quota Tracking:**

```typescript
interface StorageQuota {
  entityId: string
  entityType: 'user' | 'channel' | 'team'
  limit: number // Total limit in bytes
  used: number // Current usage in bytes
  percentage: number // Usage percentage (0-100)
  softLimitThreshold: number // Warning threshold (default: 80%)
  softLimitExceeded: boolean // True if over soft limit
  hardLimitExceeded: boolean // True if over hard limit
  lastCalculated: Date // Last calculation timestamp
}
```

### Usage Breakdown

Track storage by:

- **Type**: Messages, files, images, videos, audio, documents, archives, code, cache
- **User**: Individual user contributions (team/channel view)
- **Channel**: Per-channel usage (team view)
- **Time**: Largest files, oldest files

```typescript
interface StorageUsageBreakdown {
  total: number
  byType: {
    messages: number
    files: number
    images: number
    videos: number
    audio: number
    documents: number
    archives: number
    code: number
    other: number
    cache: number
  }
  byUser?: Map<string, number>
  byChannel?: Map<string, number>
  largestFiles: Array<{...}>
  oldestFiles: Array<{...}>
}
```

### Storage Tiers

Four built-in tiers with upgrade paths:

| Tier         | Storage | Max File  | Retention | Price  |
| ------------ | ------- | --------- | --------- | ------ |
| Free         | 5 GB    | 10 MB     | 90 days   | $0     |
| Starter      | 25 GB   | 100 MB    | 1 year    | $9.99  |
| Professional | 100 GB  | 500 MB    | Unlimited | $29.99 |
| Enterprise   | 1 TB    | Unlimited | Unlimited | $99.99 |

### Quota Warnings

Three warning levels with automatic notifications:

1. **Approaching (80%)**: Yellow warning
   - "Storage quota approaching limit"
   - Suggests cleanup or upgrade

2. **Critical (95%)**: Orange warning
   - "Storage quota critical"
   - Recommends immediate action

3. **Exceeded (100%)**: Red error
   - "Storage quota exceeded"
   - Blocks new uploads

```typescript
interface QuotaWarning {
  id: string
  entityId: string
  entityType: 'user' | 'channel' | 'team'
  type: 'approaching' | 'exceeded' | 'critical'
  threshold: number
  message: string
  timestamp: Date
  acknowledged: boolean
}
```

### Cleanup Policies

Automated storage cleanup with configurable policies:

```typescript
interface CleanupPolicy {
  enabled: boolean
  deleteOlderThan?: number // Days
  compressImagesOlderThan?: number // Days
  archiveMessagesOlderThan?: number // Days
  deleteCacheOlderThan?: number // Days
  maintainFreeSpace?: number // Percentage
}
```

**Actions:**

- Delete old files
- Compress images
- Archive messages
- Clear cache
- Optimize storage

### Storage Statistics

Team-wide analytics:

```typescript
interface StorageStats {
  totalAllocated: number // Total storage limit
  totalUsed: number // Current usage
  totalAvailable: number // Remaining space
  fileCount: number // Total files
  userCount: number // Active users
  channelCount: number // Active channels
  averageFileSize: number // Avg file size
  largestFileSize: number // Largest file
  growthRate: number // Bytes/day
  daysUntilFull: number | null // Estimated days
}
```

## API Reference

### GET /api/storage

Retrieve storage information.

**Query Parameters:**

- `action`: Operation type
  - `stats` - Overall statistics
  - `quota` - Entity quota (requires `entityId`, `entityType`)
  - `breakdown` - Usage breakdown (requires `entityId`, `entityType`)
  - `warnings` - Quota warnings (requires `entityId`, `entityType`)
  - `check-upload` - Check if upload allowed (requires `entityId`, `entityType`, `fileSize`)

**Examples:**

```typescript
// Get team statistics
const stats = await fetch('/api/storage?action=stats').then((res) => res.json())

// Get user quota
const quota = await fetch('/api/storage?action=quota&entityId=user-123&entityType=user').then(
  (res) => res.json()
)

// Check if upload allowed
const check = await fetch(
  '/api/storage?action=check-upload&entityId=user-123&entityType=user&fileSize=5242880'
).then((res) => res.json())
```

### POST /api/storage

Update storage or trigger actions.

**Request Body:**

```typescript
{
  action: string,
  entityId?: string,
  entityType?: 'user' | 'channel' | 'team',
  // Additional params based on action
}
```

**Actions:**

1. **update-quota**: Change quota limit

```typescript
{
  action: 'update-quota',
  entityId: 'user-123',
  entityType: 'user',
  newLimit: 10737418240 // 10 GB
}
```

2. **record-upload**: Track file upload

```typescript
{
  action: 'record-upload',
  entityId: 'user-123',
  entityType: 'user',
  fileSize: 5242880 // 5 MB
}
```

3. **record-deletion**: Track file deletion

```typescript
{
  action: 'record-deletion',
  entityId: 'user-123',
  entityType: 'user',
  fileSize: 5242880
}
```

4. **cleanup**: Apply cleanup policy

```typescript
{
  action: 'cleanup',
  entityId: 'user-123',
  entityType: 'user',
  policy: {
    enabled: true,
    deleteOlderThan: 90,
    compressImagesOlderThan: 30
  }
}
```

5. **optimize**: Optimize storage

```typescript
{
  action: 'optimize',
  entityId: 'team-1',
  entityType: 'team'
}
```

6. **delete-old-files**: Delete old files

```typescript
{
  action: 'delete-old-files',
  entityId: 'user-123',
  entityType: 'user',
  olderThanDays: 90
}
```

7. **archive-messages**: Archive old messages

```typescript
{
  action: 'archive-messages',
  entityId: 'channel-123',
  entityType: 'channel',
  olderThanDays: 180
}
```

8. **clear-cache**: Clear cached data

```typescript
{
  action: 'clear-cache',
  entityId: 'user-123',
  entityType: 'user'
}
```

9. **acknowledge-warning**: Dismiss warning

```typescript
{
  action: 'acknowledge-warning',
  warningId: 'user:user-123:approaching'
}
```

### DELETE /api/storage

Delete files or clear storage.

**Query Parameters:**

- `entityId`: Entity ID (required)
- `entityType`: Entity type (required)
- `fileId`: Specific file to delete (optional)

**Examples:**

```typescript
// Delete specific file
await fetch('/api/storage?entityId=user-123&entityType=user&fileId=file-456', { method: 'DELETE' })

// Clear all storage
await fetch('/api/storage?entityId=user-123&entityType=user', { method: 'DELETE' })
```

## Usage Examples

### Check Quota Before Upload

```typescript
import { quotaManager } from '@/lib/storage/quota-manager'

async function handleFileUpload(userId: string, file: File) {
  // Check if upload is allowed
  const check = await quotaManager.canUpload(userId, 'user', file.size)

  if (!check.allowed) {
    console.error('Upload blocked:', check.reason)
    return
  }

  // Proceed with upload
  // ...

  // Record upload
  await quotaManager.recordUpload(userId, 'user', file.size)
}
```

### Display User Quota

```typescript
import { StorageUsage } from '@/components/settings/StorageUsage'

export function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <StorageUsage />
    </div>
  )
}
```

### Admin Storage Dashboard

```typescript
import { StorageManagement } from '@/components/admin/StorageManagement'

export function AdminStoragePage() {
  return (
    <div>
      <h1>Storage Management</h1>
      <StorageManagement />
    </div>
  )
}
```

### Format Storage Size

```typescript
import { formatBytes } from '@/lib/storage/quota-manager'

const size = 5242880 // bytes
console.log(formatBytes(size)) // "5 MB"
console.log(formatBytes(size, 0)) // "5 MB"
console.log(formatBytes(size, 3)) // "5.000 MB"
```

### Get Quota Status

```typescript
import { getQuotaStatus } from '@/lib/storage/quota-manager'

const used = 4.5 * 1024 * 1024 * 1024 // 4.5 GB
const limit = 5 * 1024 * 1024 * 1024 // 5 GB

const status = getQuotaStatus(used, limit)
// Returns: 'critical' (90% used)

// Status can be: 'ok' | 'warning' | 'critical' | 'exceeded'
```

## UI Components

### Admin: StorageManagement

Full storage management dashboard for administrators.

**Features:**

- Storage overview (total, used, growth rate)
- Usage breakdown by type
- User and channel breakdowns
- Cleanup policy configuration
- Storage tier management
- Quick actions

**Props:**

```typescript
interface StorageManagementProps {
  className?: string
}
```

**Usage:**

```tsx
<StorageManagement className="my-4" />
```

### User: StorageUsage

Personal storage usage widget for user settings.

**Features:**

- Quota display with progress bar
- Usage breakdown by type
- Quick cleanup actions
- Current plan details
- Upgrade prompts

**Props:**

```typescript
interface StorageUsageProps {
  className?: string
}
```

**Usage:**

```tsx
<StorageUsage className="my-4" />
```

## Testing

Run storage quota tests:

```bash
# Run all storage tests
pnpm test src/lib/storage/__tests__/quota-manager.test.ts

# Run with coverage
pnpm test:coverage src/lib/storage/__tests__/quota-manager.test.ts

# Watch mode
pnpm test:watch src/lib/storage/__tests__/quota-manager.test.ts
```

## Database Schema

Storage tracking requires the following tables:

```sql
-- Storage quotas
CREATE TABLE storage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'channel', 'team')),
  limit_bytes BIGINT NOT NULL,
  soft_limit_threshold INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, entity_type)
);

-- Storage usage tracking
CREATE TABLE storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  file_id TEXT,
  file_name TEXT,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  file_category TEXT, -- 'message', 'image', 'video', etc.
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  INDEX idx_storage_entity (entity_id, entity_type),
  INDEX idx_storage_uploaded (uploaded_at),
  INDEX idx_storage_deleted (deleted_at)
);

-- Quota warnings
CREATE TABLE storage_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  warning_type TEXT NOT NULL CHECK (warning_type IN ('approaching', 'critical', 'exceeded')),
  threshold INTEGER NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  INDEX idx_warnings_entity (entity_id, entity_type),
  INDEX idx_warnings_acknowledged (acknowledged)
);

-- Cleanup policies
CREATE TABLE cleanup_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  delete_older_than_days INTEGER,
  compress_images_older_than_days INTEGER,
  archive_messages_older_than_days INTEGER,
  delete_cache_older_than_days INTEGER,
  maintain_free_space_percentage INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, entity_type)
);
```

## GraphQL Queries

Example queries for storage data:

```graphql
# Get user storage quota
query GetUserStorageQuota($userId: String!) {
  storage_quotas(where: { entity_id: { _eq: $userId }, entity_type: { _eq: "user" } }) {
    limit_bytes
    soft_limit_threshold
  }

  storage_usage_aggregate(
    where: {
      entity_id: { _eq: $userId }
      entity_type: { _eq: "user" }
      deleted_at: { _is_null: true }
    }
  ) {
    aggregate {
      sum {
        file_size
      }
      count
    }
  }
}

# Get usage by type
query GetStorageByType($entityId: String!, $entityType: String!) {
  storage_usage(
    where: {
      entity_id: { _eq: $entityId }
      entity_type: { _eq: $entityType }
      deleted_at: { _is_null: true }
    }
  ) {
    file_category
    file_size
  }
}

# Get largest files
query GetLargestFiles($entityId: String!, $limit: Int = 10) {
  storage_usage(
    where: { entity_id: { _eq: $entityId }, deleted_at: { _is_null: true } }
    order_by: { file_size: desc }
    limit: $limit
  ) {
    id
    file_name
    file_size
    mime_type
    uploaded_at
    uploaded_by
  }
}
```

## Future Enhancements

- [ ] **Smart Compression**: Automatically compress images and videos
- [ ] **Deduplication**: Detect and remove duplicate files
- [ ] **Cold Storage**: Move rarely-accessed files to cheaper storage
- [ ] **Version History**: Track file versions with rollback
- [ ] **Storage Analytics**: Detailed trends and predictions
- [ ] **Custom Tiers**: Allow custom storage plans
- [ ] **Storage API**: External storage providers (S3, GCS, Azure)
- [ ] **Quota Inheritance**: Hierarchical quota management
- [ ] **Storage Policies**: Fine-grained retention rules
- [ ] **Audit Trail**: Complete storage activity logs

## Related Documentation

- [File Upload System](./File-Upload.md)
- [Media Management](./Media-Management.md)
- [Data Retention](./Data-Retention.md)
- [Backup & Recovery](./Backup-Recovery.md)

## Support

For issues or questions about storage management:

1. Check the [Common Issues](../COMMON-ISSUES.md) guide
2. Review the [Storage API](api/API.md#storage) documentation
3. Search existing [GitHub Issues](https://github.com/your-org/nself-chat/issues)
4. Create a new issue with the `storage` label
