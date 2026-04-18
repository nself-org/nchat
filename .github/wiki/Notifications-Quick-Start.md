# Notifications System - Quick Start Guide

**5-Minute Setup Guide** for developers working with the nself-chat notification system.

---

## Installation

✅ **Already installed!** The notifications system is fully integrated into nself-chat.

---

## Basic Usage

### 1. Display the Notification Bell

Add the notification bell to your header/navbar:

```tsx
import { NotificationBell } from '@/components/notifications/notification-bell'

export function Header() {
  return (
    <header>
      {/* Your other header content */}
      <NotificationBell onClick={() => console.log('Bell clicked')} />
    </header>
  )
}
```

### 2. Add the Notification Center

Show the inbox when the bell is clicked:

```tsx
import { useState } from 'react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { NotificationCenter } from '@/components/notifications/notification-center'

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header>
      <NotificationBell onClick={() => setShowNotifications(true)} />

      {showNotifications && (
        <NotificationCenter
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          position="dropdown"
        />
      )}
    </header>
  )
}
```

### 3. Send a Notification

Create notifications programmatically:

```tsx
import { useNotificationStore } from '@/stores/notification-store'

function MyComponent() {
  const addNotification = useNotificationStore((state) => state.addNotification)

  const sendNotification = () => {
    addNotification({
      id: crypto.randomUUID(),
      type: 'mention',
      priority: 'normal',
      title: 'You were mentioned',
      body: '@you - Can you review this?',
      actor: {
        id: 'user-123',
        name: 'John Doe',
        avatarUrl: '/avatars/john.jpg',
      },
      channelId: 'channel-123',
      channelName: '#general',
      isRead: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      actionUrl: '/chat/channel-123',
    })
  }

  return <button onClick={sendNotification}>Send Test Notification</button>
}
```

---

## Common Tasks

### Enable Desktop Notifications

```tsx
import { useNotifications } from '@/hooks/use-notifications'

function NotificationSettings() {
  const { requestDesktopPermission, desktopPermission } = useNotifications()

  return (
    <button onClick={requestDesktopPermission}>
      {desktopPermission === 'granted' ? 'Enabled' : 'Enable Desktop Notifications'}
    </button>
  )
}
```

### Play Notification Sound

```tsx
import { playNotificationSound } from '@/lib/notifications/notification-sounds'

playNotificationSound('mention', 80) // soundId, volume (0-100)
```

### Set Quiet Hours

```tsx
import { useNotificationStore } from '@/stores/notification-store'

function QuietHoursSettings() {
  const updatePreferences = useNotificationStore((state) => state.updatePreferences)

  const enableDND = () => {
    updatePreferences({
      dndSchedule: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        days: [0, 1, 2, 3, 4, 5, 6], // All days
        allowMentionsBreakthrough: true,
      },
    })
  }

  return <button onClick={enableDND}>Enable Quiet Hours</button>
}
```

### Create Keyword Alert

```tsx
import { createKeyword } from '@/lib/notifications/keyword-matcher'
import { useNotificationStore } from '@/stores/notification-store'

function KeywordSettings() {
  const updatePreferences = useNotificationStore((state) => state.updatePreferences)
  const preferences = useNotificationStore((state) => state.preferences)

  const addKeyword = () => {
    const keyword = createKeyword('deployment', {
      caseSensitive: false,
      wholeWord: true,
      enabled: true,
      highlightColor: '#ef4444',
      soundId: 'alert',
    })

    updatePreferences({
      keywords: [...preferences.keywords, keyword],
    })
  }

  return <button onClick={addKeyword}>Add Keyword Alert</button>
}
```

### Mute a Channel

```tsx
import { useNotificationStore } from '@/stores/notification-store'

function ChannelActions({ channelId }: { channelId: string }) {
  const muteChannel = useNotificationStore((state) => state.muteChannel)

  // Mute for 1 hour
  const handleMute = () => {
    const until = new Date()
    until.setHours(until.getHours() + 1)
    muteChannel(channelId, until.toISOString())
  }

  return <button onClick={handleMute}>Mute for 1 hour</button>
}
```

---

## Testing

### Add Test Button (Development)

```tsx
import { TestNotificationButton } from '@/components/notifications/test-notification-button'

export function DevTools() {
  return (
    <div>
      <h3>Testing Tools</h3>
      <TestNotificationButton variant="outline" />
    </div>
  )
}
```

### Access Test Templates

The test button includes 11 pre-built notification templates:

- Mention (Normal, Urgent)
- Direct Message (Normal, High)
- Thread Reply
- Reaction
- Channel Invite/Update
- System
- Announcement
- Keyword Alert

---

## Settings Panel

### Add Full Settings UI

```tsx
import { NotificationSettings } from '@/components/notifications/NotificationSettings'

export function SettingsPage() {
  return (
    <div>
      <h1>Notification Settings</h1>
      <NotificationSettings />
    </div>
  )
}
```

Settings include:

- Global enable/disable
- Desktop notifications
- Mobile push
- Email notifications
- Sound settings
- Quiet hours
- Per-channel settings
- Keyword alerts
- Mention settings

---

## API Integration

### Fetch Notifications from Server

```tsx
async function fetchNotifications(userId: string) {
  const response = await fetch(`/api/notifications?userId=${userId}&limit=20&filter=all`)

  const data = await response.json()

  if (data.success) {
    console.log('Notifications:', data.data.notifications)
    console.log('Unread count:', data.data.unreadCount)
  }
}
```

### Create Notification via API

```tsx
async function createNotification(notification: any) {
  const response = await fetch('/api/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(notification),
  })

  const data = await response.json()

  if (data.success) {
    console.log('Created:', data.data)
  }
}
```

### Mark Notifications as Read

```tsx
async function markAsRead(notificationIds: string[]) {
  const response = await fetch('/api/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notificationIds,
      isRead: true,
    }),
  })

  const data = await response.json()
  console.log(`Marked ${data.data.affectedRows} as read`)
}
```

---

## Real-Time Updates

### Subscribe to New Notifications (GraphQL)

```tsx
import { useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'

const NOTIFICATION_SUBSCRIPTION = gql`
  subscription OnNewNotification($userId: uuid!) {
    nchat_notifications(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      id
      type
      title
      body
      created_at
    }
  }
`

function NotificationListener({ userId }: { userId: string }) {
  const { data } = useSubscription(NOTIFICATION_SUBSCRIPTION, {
    variables: { userId },
  })

  // Handle new notification
  if (data) {
    const notification = data.nchat_notifications[0]
    console.log('New notification:', notification)
  }

  return null
}
```

---

## Sound System

### Play Different Sounds

```tsx
import { playNotificationSound, NOTIFICATION_SOUNDS } from '@/lib/notifications/notification-sounds'

// Play built-in sounds
playNotificationSound('mention', 80)
playNotificationSound('dm', 70)
playNotificationSound('alert', 90)

// List available sounds
console.log(NOTIFICATION_SOUNDS)
// [
//   { id: 'mention', name: 'Mention', url: '/sounds/mention.mp3', ... },
//   { id: 'dm', name: 'Direct Message', url: '/sounds/dm.mp3', ... },
//   ...
// ]
```

### Upload Custom Sound

```tsx
import { uploadCustomSound } from '@/lib/notifications/sounds'

async function handleSoundUpload(file: File) {
  const sound = await uploadCustomSound({
    name: 'My Custom Sound',
    file: file,
  })

  if (sound) {
    console.log('Uploaded:', sound.id)
    // Use the sound
    playNotificationSound(sound.id, 80)
  }
}
```

### Create Sound Profile

```tsx
import { createSoundProfile, setActiveProfile } from '@/lib/notifications/sounds'

// Create custom sound theme
const profile = createSoundProfile(
  'My Theme',
  {
    mention: 'chime',
    direct_message: 'ding',
    thread_reply: 'subtle',
    reaction: 'pop',
    // ... other notification types
  },
  {
    description: 'My custom sound theme',
    volume: 70,
  }
)

// Activate the profile
setActiveProfile(profile.id)
```

---

## Utility Functions

### Check if in Quiet Hours

```tsx
import { isInQuietHours } from '@/lib/notifications/quiet-hours'
import { useNotificationStore } from '@/stores/notification-store'

function shouldShowNotification() {
  const preferences = useNotificationStore((state) => state.preferences)
  return !isInQuietHours(preferences.dndSchedule)
}
```

### Get Unread Count

```tsx
import { useNotificationStore } from '@/stores/notification-store'

function UnreadBadge() {
  const unreadCount = useNotificationStore((state) => state.unreadCounts.total)

  if (unreadCount === 0) return null

  return <span>{unreadCount}</span>
}
```

### Filter Notifications

```tsx
import { useNotificationStore } from '@/stores/notification-store'

function MentionsList() {
  const notifications = useNotificationStore((state) =>
    state.notifications.filter((n) => n.type === 'mention' && !n.isRead)
  )

  return (
    <div>
      {notifications.map((notification) => (
        <div key={notification.id}>{notification.title}</div>
      ))}
    </div>
  )
}
```

---

## TypeScript Types

### Notification Type

```typescript
interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  body: string
  actor?: {
    id: string
    name: string
    avatarUrl?: string
  }
  channelId?: string
  channelName?: string
  messageId?: string
  threadId?: string
  isRead: boolean
  isArchived: boolean
  createdAt: string
  readAt?: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}
```

### Notification Types

```typescript
type NotificationType =
  | 'mention'
  | 'direct_message'
  | 'thread_reply'
  | 'reaction'
  | 'channel_invite'
  | 'channel_update'
  | 'system'
  | 'announcement'
  | 'keyword'

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
```

---

## Common Patterns

### Show Toast on New Notification

```tsx
import { useEffect } from 'react'
import { useNotificationStore } from '@/stores/notification-store'
import { toast } from '@/hooks/use-toast'

function NotificationToast() {
  const notifications = useNotificationStore((state) => state.notifications)

  useEffect(() => {
    const latest = notifications[0]
    if (latest && !latest.isRead) {
      toast({
        title: latest.title,
        description: latest.body,
      })
    }
  }, [notifications])

  return null
}
```

### Badge Component

```tsx
import { useNotificationStore } from '@/stores/notification-store'

function ChannelBadge({ channelId }: { channelId: string }) {
  const unread = useNotificationStore(
    (state) => state.unreadCounts.byChannel[channelId]?.unread || 0
  )

  if (unread === 0) return null

  return <span className="badge">{unread > 99 ? '99+' : unread}</span>
}
```

---

## Troubleshooting

### Desktop Notifications Not Working?

```tsx
// 1. Check permission
const permission = Notification.permission
console.log('Permission:', permission)

// 2. Request permission
if (permission === 'default') {
  await Notification.requestPermission()
}

// 3. Check browser support
if (!('Notification' in window)) {
  console.error('Browser does not support notifications')
}
```

### Sounds Not Playing?

```tsx
// 1. Check volume
const preferences = useNotificationStore.getState().preferences
console.log('Volume:', preferences.soundVolume)

// 2. Check if enabled
console.log('Sound enabled:', preferences.soundEnabled)

// 3. Test sound manually
playNotificationSound('mention', 80)
```

---

## Next Steps

- 📖 Read the [Complete Documentation](./Notifications-System.md)
- 🧪 Run tests: `pnpm test`
- 🎨 Customize the UI components
- 🔊 Add custom notification sounds to `public/sounds/`
- 📊 Integrate with your GraphQL backend
- 🚀 Deploy and monitor in production

---

## Quick Links

- [Complete Documentation](./Notifications-System.md)
- [Implementation Summary](./Notifications-Implementation-Summary.md)
- [API Documentation](api/API.md)
- [Common Issues](../COMMON-ISSUES.md)

---

**Version**: 0.9.0
**Last Updated**: February 1, 2026

Happy coding! 🎉
