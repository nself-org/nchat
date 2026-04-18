# Phase 17: Offline & Sync - Complete Guide

**Version:** 0.9.0
**Status:** ✅ Complete
**Tasks:** 118-120

## Overview

Phase 17 implements comprehensive offline support with automatic synchronization, conflict resolution, and optimistic UI updates. Users can continue working while offline, with all changes automatically synced when connectivity is restored.

## Features

### 1. Offline Message Queue (Task 118)

Messages sent while offline are queued and automatically sent when connectivity is restored.

#### IndexedDB Storage

```typescript
import { offlineDB } from '@/lib/offline/indexeddb'

// Add message to queue
await offlineDB.addToMessageQueue({
  id: 'temp-msg-123',
  channelId: 'channel-1',
  content: 'Message sent offline',
  contentType: 'text',
  createdAt: Date.now(),
  attempts: 0,
  status: 'pending',
})

// Get pending messages
const pending = await offlineDB.getMessageQueue('pending')

// Update message status
await offlineDB.updateMessageQueueItem('temp-msg-123', {
  status: 'syncing',
  attempts: 1,
})

// Remove after sync
await offlineDB.removeFromMessageQueue('temp-msg-123')
```

#### Upload Queue

```typescript
// Queue file upload
const file = new File(['content'], 'document.pdf')

await offlineDB.addToUploadQueue({
  id: 'upload-123',
  file,
  channelId: 'channel-1',
  progress: 0,
  attempts: 0,
  status: 'pending',
})

// Track upload progress
await offlineDB.updateUploadQueueItem('upload-123', {
  progress: 50,
  status: 'uploading',
})
```

#### Message Cache

```typescript
// Cache message for offline viewing
await offlineDB.cacheMessage({
  id: 'msg-123',
  channelId: 'channel-1',
  content: 'Cached message',
  userId: 'user-1',
  createdAt: Date.now(),
  version: 1,
  lastSynced: Date.now(),
})

// Retrieve cached messages
const messages = await offlineDB.getCachedMessages('channel-1')
```

### 2. Conflict Resolution (Task 119)

Automatically resolves conflicts when offline edits conflict with server changes.

#### Conflict Strategies

1. **Last Write Wins** (Default)
   - Uses the most recently modified version
   - Best for simple updates

2. **Server Wins**
   - Always uses server version
   - Best for authoritative server data

3. **Client Wins**
   - Always uses local version
   - Best for user preferences

4. **Three-Way Merge**
   - Merges compatible changes
   - Best for complex objects

5. **Manual Resolution**
   - Prompts user to choose
   - Best for critical conflicts

#### Usage

```typescript
import { ConflictResolver } from '@/lib/offline/conflict-resolver'

const resolver = new ConflictResolver()

// Auto-resolve conflict
const conflict = {
  id: 'msg-123',
  type: 'concurrent_edit',
  itemType: 'message',
  local: { content: 'Local edit', updatedAt: Date.now() },
  remote: { content: 'Server edit', updatedAt: Date.now() - 5000 },
  localTimestamp: new Date(),
  remoteTimestamp: new Date(Date.now() - 5000),
}

const resolution = await resolver.autoResolve(conflict)

if (resolution.resolved) {
  console.log('Conflict resolved:', resolution.result)
} else {
  console.log('Manual resolution needed')
}
```

#### Three-Way Merge

```typescript
const base = { theme: 'light', lang: 'en' }
const local = { theme: 'dark', lang: 'en' } // Changed theme
const server = { theme: 'light', lang: 'fr' } // Changed language

const conflict = {
  id: 'settings',
  type: 'concurrent_edit',
  itemType: 'settings',
  local,
  remote: server,
  ancestor: base,
  localTimestamp: new Date(),
  remoteTimestamp: new Date(),
}

const resolution = await resolver.resolve(conflict, 'merge')

// Result: { theme: 'dark', lang: 'fr' }
// Merged both changes!
```

### 3. Settings & Preferences Sync (Task 120)

User settings automatically sync across devices with conflict resolution.

#### Settings Sync Hook

```typescript
import { useSettingsSync } from '@/hooks/use-settings-sync'

function SettingsPage() {
  const {
    settings,
    isLoading,
    isSyncing,
    hasUnsyncedChanges,
    conflict,
    updateSettings,
    syncSettings,
    resolveConflict,
  } = useSettingsSync()

  // Update settings
  const handleThemeChange = async (theme: string) => {
    await updateSettings({
      theme: { preset: theme },
    })
    // Auto-syncs in background
  }

  // Manually trigger sync
  const handleSync = async () => {
    await syncSettings()
  }

  // Resolve conflict
  const handleResolve = async () => {
    if (conflict) {
      await resolveConflict('local') // or 'server' or 'custom'
    }
  }

  return (
    <div>
      {hasUnsyncedChanges && (
        <button onClick={handleSync}>Sync Now</button>
      )}

      {conflict && (
        <div>
          <p>Conflict detected!</p>
          <button onClick={() => handleResolve()}>
            Use Local Version
          </button>
        </div>
      )}
    </div>
  )
}
```

#### Settings Structure

```typescript
interface UserSettings {
  userId: string
  theme: {
    mode: 'light' | 'dark' | 'system'
    preset: string
    customColors?: Record<string, string>
  }
  notifications: {
    enabled: boolean
    sound: boolean
    desktop: boolean
    email: boolean
    channels: Record<string, boolean>
  }
  preferences: {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: '12h' | '24h'
    compactMode: boolean
    showAvatars: boolean
    emojiStyle: 'native' | 'twitter' | 'google'
  }
  privacy: {
    showOnlineStatus: boolean
    showReadReceipts: boolean
    allowDirectMessages: boolean
  }
  accessibility: {
    fontSize: 'small' | 'medium' | 'large'
    highContrast: boolean
    reduceMotion: boolean
    screenReaderOptimized: boolean
  }
  version: number
  updatedAt: Date
  syncedAt?: Date
}
```

### 4. Optimistic UI Updates

Messages appear instantly in the UI while syncing in the background.

#### Optimistic Messages Hook

```typescript
import { useOptimisticMessages } from '@/hooks/use-optimistic-messages'

function MessageInput({ channelId }: { channelId: string }) {
  const { sendMessage, optimisticMessages, pendingCount } = useOptimisticMessages(channelId)

  const handleSend = async (content: string) => {
    // Message appears in UI immediately
    await sendMessage({
      channelId,
      content,
      contentType: 'text',
    })
    // Syncs in background
  }

  return (
    <div>
      {pendingCount > 0 && (
        <div>Sending {pendingCount} messages...</div>
      )}

      <input
        onKeyPress={(e) => {
          if (e.key === 'Enter' && e.currentTarget.value) {
            handleSend(e.currentTarget.value)
            e.currentTarget.value = ''
          }
        }}
      />
    </div>
  )
}
```

#### Message States

- **Optimistic**: Message just sent, showing in UI
- **Sending**: Message being sent to server
- **Sent**: Message successfully delivered
- **Failed**: Message failed to send (with retry option)

### 5. Automatic Sync Service

Background service that automatically syncs when online.

#### Sync Service

```typescript
import { syncService } from '@/lib/offline/sync-service'

// Configure sync options
syncService.configure({
  maxRetries: 3,
  retryDelay: 1000,
  maxRetryDelay: 30000,
  batchSize: 10,
})

// Listen to sync events
syncService.addListener((status, progress) => {
  console.log('Sync status:', status)
  if (progress) {
    console.log(`Progress: ${progress.completed}/${progress.total}`)
  }
})

// Start auto-sync
syncService.startAutoSync(30000) // Every 30 seconds

// Manual sync
await syncService.sync()

// Get queue statistics
const stats = await syncService.getQueueStats()
console.log('Pending messages:', stats.messages.pending)
console.log('Failed uploads:', stats.uploads.failed)

// Retry failed items
await syncService.retryFailed()
```

### 6. Service Worker Background Sync

Service worker automatically syncs data when connectivity is restored, even if the app is closed.

#### Registration

```typescript
// In your app initialization
if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
  const registration = await navigator.serviceWorker.ready

  // Register background sync
  await registration.sync.register('sync-messages')
  await registration.sync.register('sync-uploads')
  await registration.sync.register('sync-settings')
}
```

#### Service Worker (public/sw.js)

The service worker automatically:

- Syncs pending messages
- Syncs pending uploads
- Syncs user settings
- Notifies the app of sync results

#### Listening for Sync Events

```typescript
// In your React component
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_COMPLETED') {
        console.log('Background sync completed:', event.data.category)
        console.log('Success:', event.data.success)
        console.log('Failed:', event.data.failed)
      }
    })
  }
}, [])
```

### 7. Offline Indicator UI

Visual indicator showing connection status and pending operations.

#### Full Indicator

```typescript
import { OfflineIndicator } from '@/components/ui/offline-indicator'

function AppLayout() {
  return (
    <>
      <OfflineIndicator
        position="top"
        detailed={true}
        dismissible={false}
        autoHide={true}
      />

      {/* Your app content */}
    </>
  )
}
```

#### Compact Indicator

```typescript
import { OfflineIndicatorCompact } from '@/components/ui/offline-indicator'

function AppLayout() {
  return (
    <>
      {/* Your app content */}

      <OfflineIndicatorCompact />
    </>
  )
}
```

#### Banner Indicator

```typescript
import { OfflineBanner } from '@/components/ui/offline-indicator'

function AppLayout() {
  return (
    <>
      <OfflineBanner />

      {/* Your app content */}
    </>
  )
}
```

### 8. Queue Viewer

View and manage queued operations.

```typescript
import { OfflineQueueViewer } from '@/components/offline/offline-queue-viewer'

function SettingsPage() {
  const [showQueue, setShowQueue] = useState(false)

  return (
    <>
      <button onClick={() => setShowQueue(true)}>
        View Offline Queue
      </button>

      <OfflineQueueViewer
        asDialog
        open={showQueue}
        onClose={() => setShowQueue(false)}
      />
    </>
  )
}
```

## API Reference

### IndexedDB (`offlineDB`)

```typescript
// Message Queue
await offlineDB.addToMessageQueue(message)
await offlineDB.getMessageQueue(status?)
await offlineDB.updateMessageQueueItem(id, updates)
await offlineDB.removeFromMessageQueue(id)
await offlineDB.clearMessageQueue()

// Upload Queue
await offlineDB.addToUploadQueue(upload)
await offlineDB.getUploadQueue(status?)
await offlineDB.updateUploadQueueItem(id, updates)
await offlineDB.removeFromUploadQueue(id)

// Message Cache
await offlineDB.cacheMessage(message)
await offlineDB.getCachedMessages(channelId)
await offlineDB.getCachedMessage(id)

// Sync Metadata
await offlineDB.setSyncMetadata(metadata)
await offlineDB.getSyncMetadata(entityType, entityId)
await offlineDB.getConflicts()
await offlineDB.resolveConflict(entityType, entityId)

// Settings
await offlineDB.saveSettings(settings)
await offlineDB.getSettings(userId)

// Utilities
await offlineDB.getStorageEstimate()
await offlineDB.clearAll()
offlineDB.close()
```

### Sync Service

```typescript
// Configuration
syncService.configure(options)

// Events
syncService.addListener(callback)

// Sync
await syncService.sync()
syncService.startAutoSync(intervalMs)
syncService.stopAutoSync()
syncService.pauseSync()

// Queue Management
await syncService.getQueueStats()
await syncService.retryFailed()
await syncService.clearQueues()

// Status
const status = syncService.getStatus()
const isOnline = syncService.isConnected()

// Cleanup
syncService.destroy()
```

### Conflict Resolver

```typescript
// Resolve Conflict
const resolution = await resolver.resolve(conflict, strategy)
const resolution = await resolver.autoResolve(conflict)

// Batch Resolution
const resolutions = await resolver.resolveMany(conflicts, strategy)

// Conflict Detection
const conflict = resolver.detectConflict(local, remote)

// Conflict Summary
const summary = resolver.getConflictSummary(conflict)

// Manual Resolution Callback
resolver.setUserChoiceCallback(async (conflict) => {
  // Show UI and return user's choice
  return selectedVersion
})
```

## Best Practices

### 1. Message Handling

✅ **Do:**

- Use optimistic updates for instant feedback
- Queue messages when offline
- Show sync status to users
- Handle failures gracefully
- Retry failed operations

❌ **Don't:**

- Block UI waiting for sync
- Lose messages on failure
- Hide sync failures from users

### 2. Conflict Resolution

✅ **Do:**

- Use appropriate strategy for data type
- Provide manual resolution for critical data
- Log conflicts for debugging
- Test conflict scenarios

❌ **Don't:**

- Silently overwrite user data
- Ignore conflicts
- Use complex strategies for simple data

### 3. Settings Sync

✅ **Do:**

- Sync settings periodically
- Use debouncing for frequent updates
- Version settings for conflict detection
- Validate settings before sync

❌ **Don't:**

- Sync on every keystroke
- Overwrite newer settings
- Sync sensitive data without encryption

### 4. Performance

✅ **Do:**

- Batch sync operations
- Use background sync when available
- Limit cache size
- Clean up old data

❌ **Don't:**

- Sync everything at once
- Keep unlimited cache
- Sync on every network change

## Testing

```bash
# Run offline tests
npm test src/lib/offline/__tests__/offline-phase17.test.ts

# Test with network throttling
# Chrome DevTools -> Network -> Throttling -> Offline

# Test background sync
# Chrome DevTools -> Application -> Service Workers -> Sync
```

## Troubleshooting

### Messages Not Syncing

1. Check network connection
2. Verify service worker is active
3. Check IndexedDB for queued messages
4. Check browser console for errors

```typescript
// Debug queue
const queue = await offlineDB.getMessageQueue()
console.log('Pending messages:', queue)

// Force sync
await syncService.sync()
```

### Conflicts Not Resolving

1. Check conflict strategy
2. Verify sync metadata exists
3. Check for errors in resolution

```typescript
// Debug conflicts
const conflicts = await offlineDB.getConflicts()
console.log('Conflicts:', conflicts)

// Force resolution
await offlineDB.resolveConflict('message', 'msg-id')
```

### Settings Not Syncing

1. Verify user is authenticated
2. Check settings version
3. Verify API endpoint

```typescript
// Debug settings
const settings = await offlineDB.getSettings(userId)
console.log('Local settings:', settings)
```

## Browser Support

| Feature         | Chrome | Firefox | Safari | Edge |
| --------------- | ------ | ------- | ------ | ---- |
| IndexedDB       | ✅     | ✅      | ✅     | ✅   |
| Service Workers | ✅     | ✅      | ✅     | ✅   |
| Background Sync | ✅     | ❌      | ❌     | ✅   |
| Periodic Sync   | ✅     | ❌      | ❌     | ✅   |

**Note:** Background Sync gracefully degrades to manual sync on unsupported browsers.

## Migration Guide

### From v0.8.0 to v0.9.0

1. **Update imports:**

   ```typescript
   // Old
   import { offlineDB } from '@/lib/offline/offline-storage'

   // New
   import { offlineDB } from '@/lib/offline/indexeddb'
   ```

2. **Update queue methods:**

   ```typescript
   // Old
   await queueStorage.add(message)

   // New
   await offlineDB.addToMessageQueue(message)
   ```

3. **Update sync service:**

   ```typescript
   // Old
   import { syncManager } from '@/lib/offline/sync-manager'

   // New
   import { syncService } from '@/lib/offline/sync-service'
   ```

## Performance Metrics

- **Queue Size:** < 1000 items
- **Sync Time:** < 5 seconds for 100 messages
- **IndexedDB Size:** < 50MB recommended
- **Sync Interval:** 30 seconds default
- **Retry Delay:** 1s, 2s, 4s, 8s, 16s, 30s (exponential backoff)

## Security Considerations

1. **Data Encryption:** Sensitive data is encrypted before storage
2. **API Authentication:** All sync requests are authenticated
3. **Data Validation:** Server validates all synced data
4. **Rate Limiting:** Sync requests are rate-limited
5. **Conflict Logging:** Conflicts are logged for audit

## Related Documentation

- [Offline Mode v0.8.0](../Offline-Mode-v0.8.0.md)
- [Offline Integration Guide](../OFFLINE-INTEGRATION-GUIDE.md)
- [Offline Sync Implementation](../OFFLINE-SYNC-IMPLEMENTATION.md)
- [PWA Guide](./PWA.md)
- [Service Workers](./Service-Workers.md)

## Support

For issues or questions:

- GitHub Issues: [nself-chat/issues](https://github.com/nself/nself-chat/issues)
- Documentation: [docs/](../README.md)
