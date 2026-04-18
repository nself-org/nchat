# Message Actions - Quick Reference

Quick reference for implementing message actions in nself-chat.

## 🚀 Quick Start

```tsx
import { useMessageActions } from '@/hooks'
import { MessageActions, MessageContextMenu } from '@/components/chat'

function ChatMessage({ message }) {
  const { handleAction, getPermissions } = useMessageActions({
    channelId: message.channelId,
  })

  const permissions = getPermissions(message)

  return (
    <MessageContextMenu
      message={message}
      permissions={permissions}
      onAction={(action, data) => handleAction(action, message, data)}
    >
      <div className="group relative">
        <MessageItem message={message} />
        <MessageActions
          message={message}
          permissions={permissions}
          onAction={(action, data) => handleAction(action, message, data)}
        />
      </div>
    </MessageContextMenu>
  )
}
```

## 📋 Hook Options

```tsx
useMessageActions({
  channelId: string              // Required
  onReplyMessage?: (msg) => void
  onOpenThread?: (msg) => void
  onEditMessage?: (msg) => void
  onDeleteMessage?: (id) => Promise<void>
  onForwardMessage?: (msg) => void
  onReportMessage?: (msg) => void
  onViewMessageDetails?: (msg) => void
  enableBulkOperations?: boolean
})
```

## 🎯 Available Actions

| Action        | Description        | Permission Required |
| ------------- | ------------------ | ------------------- |
| `react`       | Add emoji reaction | `canReact`          |
| `reply`       | Reply to message   | `canReply`          |
| `thread`      | Start/view thread  | `canThread`         |
| `edit`        | Edit message       | `canEdit`           |
| `delete`      | Delete message     | `canDelete`         |
| `pin`         | Pin to channel     | `canPin`            |
| `unpin`       | Unpin from channel | `canPin`            |
| `bookmark`    | Save message       | `canBookmark`       |
| `unbookmark`  | Unsave message     | `canBookmark`       |
| `forward`     | Forward message    | `canForward`        |
| `copy`        | Copy text          | `canCopy`           |
| `copy-link`   | Copy message link  | `canCopy`           |
| `report`      | Report message     | `canReport`         |
| `mark-unread` | Mark as unread     | `canMarkUnread`     |

## 🔒 Permissions by Role

| Permission | Guest | Member | Moderator | Owner |
| ---------- | ----- | ------ | --------- | ----- |
| React      | ❌    | ✅     | ✅        | ✅    |
| Reply      | ❌    | ✅     | ✅        | ✅    |
| Thread     | ❌    | ✅     | ✅        | ✅    |
| Edit       | ❌    | Own    | Own       | Own   |
| Delete     | ❌    | Own    | ✅        | ✅    |
| Pin        | ❌    | ❌     | ✅        | ✅    |
| Bookmark   | ❌    | ✅     | ✅        | ✅    |
| Forward    | ❌    | ✅     | ✅        | ✅    |
| Report     | ❌    | ✅     | ✅        | ✅    |
| Copy       | ✅    | ✅     | ✅        | ✅    |

## 🎨 Component Variants

### MessageActions

```tsx
// Default - Hover action bar
<MessageActions variant="default" position="right" />

// Compact - Inline actions
<MessageActions variant="compact" />

// Mobile - Floating sheet
<MessageActions variant="mobile" onClose={() => {}} />
```

### MessageContextMenu

```tsx
// Full - Complete menu
<MessageContextMenu showAdvanced={true} />

// Simple - Minimal menu
<SimpleMessageContextMenu />
```

## 🔧 Common Patterns

### With Callbacks

```tsx
const { handleAction } = useMessageActions({
  channelId,
  onReplyMessage: (msg) => {
    setReplyTo(msg)
    focusInput()
  },
  onDeleteMessage: async (id) => {
    await deleteMessageMutation({ variables: { id } })
  },
})
```

### With Bulk Operations

```tsx
const { selection, bulkHandlers } = useMessageActions({
  channelId,
  enableBulkOperations: true,
})

// Enter selection mode
selection.enterSelectionMode()

// Select messages
selection.toggleSelection(messageId)
selection.selectAll(messageIds)

// Bulk delete
await bulkHandlers.onBulkDelete(Array.from(selection.selectedMessages))

// Exit selection mode
selection.exitSelectionMode()
```

### With GraphQL

```tsx
const [deleteMessage] = useMutation(DELETE_MESSAGE)

const { handleAction } = useMessageActions({
  channelId,
  onDeleteMessage: async (id) => {
    await deleteMessage({
      variables: { id },
      update(cache) {
        cache.evict({ id: cache.identify({ __typename: 'Message', id }) })
      },
    })
  },
})
```

## ⌨️ Keyboard Shortcuts

| Key     | Action      |
| ------- | ----------- |
| **⌘C**  | Copy text   |
| **⌘⇧C** | Copy link   |
| **R**   | Reply       |
| **T**   | Thread      |
| **E**   | Edit        |
| **P**   | Pin/Unpin   |
| **S**   | Save        |
| **⌘F**  | Forward     |
| **U**   | Mark unread |
| **⌘⌫**  | Delete      |

## 📱 Mobile Usage

```tsx
function MobileMessage({ message }) {
  const [showActions, setShowActions] = useState(false)

  return (
    <>
      <div onTouchStart={() => setShowActions(true)}>
        <MessageItem message={message} />
      </div>

      {showActions && (
        <MessageActions
          variant="mobile"
          message={message}
          permissions={getPermissions(message)}
          onAction={handleAction}
          onClose={() => setShowActions(false)}
        />
      )}
    </>
  )
}
```

## 🎯 Bulk Selection UI

```tsx
{selection.isSelectionMode && (
  <BulkMessageActions
    selectedCount={selection.selectedMessages.size}
    onDelete={() => bulkHandlers.onBulkDelete([...])}
    onForward={() => bulkHandlers.onBulkForward([...])}
    onCopy={() => bulkHandlers.onBulkCopy([...])}
    onClearSelection={selection.clearSelection}
  />
)}
```

## 🔍 Permission Checking

```tsx
// Get all permissions
const permissions = getPermissions(message)

// Check specific permission
if (permissions.canEdit) {
  // Show edit UI
}

// Check action availability
if (canPerformAction('delete', message)) {
  // Allow delete
}
```

## 🎭 Loading States

```tsx
const { isLoading } = useMessageActions({ channelId })

{
  isLoading && <LoadingSpinner />
}
```

## 🎨 Custom Styling

```tsx
<MessageActions
  className="custom-class"
  message={message}
  permissions={permissions}
  onAction={handleAction}
/>
```

## 🔗 Import Paths

```tsx
// Hook
import { useMessageActions } from '@/hooks'

// Components
import {
  MessageActions,
  CompactMessageActions,
  MobileMessageActions,
  BulkMessageActions,
  MessageContextMenu,
  SimpleMessageContextMenu,
} from '@/components/chat'

// Types
import type { Message, MessageAction, MessageActionPermissions } from '@/types/message'
```

## ⚠️ Common Pitfalls

1. **Don't forget to check permissions** before showing actions
2. **Always provide onClose** for mobile variant
3. **Use selection.exitSelectionMode()** after bulk operations
4. **Wrap with MessageContextMenu** for right-click support
5. **Handle loading states** for async actions

## 📚 Full Documentation

- [Complete Usage Guide](Message-Actions-Usage.md)
- [Implementation Details](../implementation/Message-Actions-Implementation.md)
- [Examples](/src/components/chat/MessageItemWithActions.example.tsx)

---

**Last Updated**: February 1, 2026
