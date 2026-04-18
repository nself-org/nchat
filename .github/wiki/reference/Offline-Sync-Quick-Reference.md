# Offline & Sync - Quick Reference

**Phase 17 Quick Reference** | Version 0.9.0

## Quick Start

### 1. Basic Offline Message Queue

```typescript
import { offlineDB } from '@/lib/offline/indexeddb'

// Queue a message
await offlineDB.addToMessageQueue({
  id: 'temp-123',
  channelId: 'channel-1',
  content: 'Hello offline!',
  contentType: 'text',
  createdAt: Date.now(),
  attempts: 0,
  status: 'pending',
})

// Get queue
const queue = await offlineDB.getMessageQueue('pending')
```

### 2. Optimistic UI

```typescript
import { useOptimisticMessages } from '@/hooks/use-optimistic-messages'

const { sendMessage, optimisticMessages } = useOptimisticMessages('channel-1')

await sendMessage({
  channelId: 'channel-1',
  content: 'Instant UI update!',
})
```

### 3. Settings Sync

```typescript
import { useSettingsSync } from '@/hooks/use-settings-sync'

const { settings, updateSettings } = useSettingsSync()

await updateSettings({
  theme: { preset: 'dark' },
})
```

### 4. Background Sync

```typescript
// Register background sync
if ('serviceWorker' in navigator) {
  const reg = await navigator.serviceWorker.ready
  await reg.sync.register('sync-messages')
}
```

## Common Patterns

### Send Message with Attachments

```typescript
const { sendMessage } = useOptimisticMessages()

const files = [new File(['content'], 'doc.pdf')]

await sendMessage({
  channelId: 'channel-1',
  content: 'Check this out!',
  attachments: files,
})
```

### Retry Failed Messages

```typescript
import { syncService } from '@/lib/offline/sync-service'

// Get failed messages
const stats = await syncService.getQueueStats()
console.log('Failed:', stats.messages.failed)

// Retry all
await syncService.retryFailed()
```

### Resolve Conflict

```typescript
import { ConflictResolver } from '@/lib/offline/conflict-resolver'

const resolver = new ConflictResolver()

// Auto-resolve
const resolution = await resolver.autoResolve(conflict)

// Manual resolve
const resolution = await resolver.resolve(conflict, 'local_wins')
```

### Check Storage Usage

```typescript
const estimate = await offlineDB.getStorageEstimate()
console.log(`Using ${estimate.percent.toFixed(2)}% of quota`)
```

## UI Components

### Offline Indicator

```tsx
import { OfflineIndicator } from '@/components/ui/offline-indicator'
;<OfflineIndicator position="top" detailed />
```

### Queue Viewer

```tsx
import { OfflineQueueViewer } from '@/components/offline/offline-queue-viewer'
;<OfflineQueueViewer asDialog open={show} onClose={() => setShow(false)} />
```

## Hooks

| Hook                    | Purpose                    |
| ----------------------- | -------------------------- |
| `useOptimisticMessages` | Optimistic message updates |
| `useSettingsSync`       | Settings synchronization   |
| `useOfflineStatus`      | Connection status          |

## API Endpoints

| Endpoint                  | Method  | Purpose       |
| ------------------------- | ------- | ------------- |
| `/api/messages`           | POST    | Send message  |
| `/api/upload`             | POST    | Upload file   |
| `/api/users/:id/settings` | GET/PUT | Sync settings |

## Status Codes

### Message Status

- `pending` - Queued, waiting to send
- `syncing` - Currently sending
- `sent` - Successfully delivered
- `failed` - Failed to send

### Upload Status

- `pending` - Queued for upload
- `uploading` - Currently uploading
- `uploaded` - Upload complete
- `failed` - Upload failed

### Sync Status

- `idle` - No sync in progress
- `syncing` - Sync in progress
- `paused` - Sync paused
- `error` - Sync failed

## Conflict Types

- `concurrent_edit` - Same item edited on multiple devices
- `delete_edit` - Deleted on one device, edited on another
- `duplicate` - Duplicate creation
- `version_mismatch` - Version conflict

## Resolution Strategies

- `last_write_wins` - Use most recent
- `server_wins` - Use server version
- `client_wins` - Use local version
- `merge` - Merge changes
- `user_prompt` - Ask user

## Events

### Sync Events

```typescript
syncService.addListener((status, progress) => {
  console.log('Status:', status)
  if (progress) {
    console.log(`${progress.completed}/${progress.total}`)
  }
})
```

### Service Worker Events

```typescript
navigator.serviceWorker.addEventListener('message', (event) => {
  switch (event.data.type) {
    case 'SYNC_STARTED':
    case 'SYNC_COMPLETED':
    case 'SYNC_FAILED':
    // Handle event
  }
})
```

## Configuration

### Sync Service Config

```typescript
syncService.configure({
  maxRetries: 3, // Max retry attempts
  retryDelay: 1000, // Initial delay (ms)
  maxRetryDelay: 30000, // Max delay (ms)
  batchSize: 10, // Items per batch
})
```

### Auto-Sync

```typescript
// Start (every 30s)
syncService.startAutoSync(30000)

// Stop
syncService.stopAutoSync()
```

## Debugging

### Check Queue

```typescript
const queue = await offlineDB.getMessageQueue()
console.table(queue)
```

### Check Conflicts

```typescript
const conflicts = await offlineDB.getConflicts()
console.log('Conflicts:', conflicts.length)
```

### Force Sync

```typescript
await syncService.sync()
```

### Clear Everything

```typescript
await syncService.clearQueues()
await offlineDB.clearAll()
```

## Performance Tips

1. **Batch Operations** - Process multiple items together
2. **Debounce Updates** - Don't sync on every change
3. **Limit Cache** - Keep cache size < 50MB
4. **Clean Up** - Remove old data periodically
5. **Monitor Storage** - Check `getStorageEstimate()`

## Browser Support

| Feature         | Support             |
| --------------- | ------------------- |
| IndexedDB       | All modern browsers |
| Service Workers | All modern browsers |
| Background Sync | Chrome, Edge only   |
| Periodic Sync   | Chrome, Edge only   |

## Error Handling

```typescript
try {
  await sendMessage({ channelId, content })
} catch (error) {
  if (!navigator.onLine) {
    // Will auto-retry when online
  } else {
    // Show error to user
    toast.error('Failed to send message')
  }
}
```

## Testing

```bash
# Run tests
npm test offline

# Chrome DevTools
# Network tab -> Throttling -> Offline
# Application tab -> Service Workers -> Sync
```

## Cheat Sheet

```typescript
// Initialize
await offlineDB.init()

// Queue message
await offlineDB.addToMessageQueue(msg)

// Sync
await syncService.sync()

// Stats
await syncService.getQueueStats()

// Retry
await syncService.retryFailed()

// Cleanup
syncService.destroy()
offlineDB.close()
```

## Related Docs

- [Full Guide](../features/Offline-Sync-Phase17.md)
- [Offline Mode v0.8.0](../Offline-Mode-v0.8.0.md)
- [PWA Guide](../features/PWA.md)
