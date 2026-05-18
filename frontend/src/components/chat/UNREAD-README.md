# Unread Messages & Jump Navigation - Quick Start

Complete unread message tracking and navigation system for nself-chat.

## 📦 Files Implemented

- ✅ `src/lib/messaging/unread-tracker.ts` - Core tracking logic
- ✅ `src/hooks/use-unread.ts` - React hooks for unread state
- ✅ `src/components/chat/UnreadIndicator.tsx` - Visual indicators
- ✅ `src/components/chat/JumpToUnread.tsx` - Navigation buttons
- ✅ `src/components/chat/UnreadIntegrationExample.tsx` - Usage examples
- ✅ `docs/Unread-System.md` - Full documentation

## 🚀 Quick Start

### 1. Basic Usage

```tsx
import { useUnread } from "@/hooks/use-unread";
import { JumpToUnreadButton } from "@/components/chat/JumpToUnread";
import { UnreadLine } from "@/components/chat/UnreadIndicator";

function ChatView({ channelId, messages }) {
  const {
    unreadCount,
    mentionCount,
    firstUnreadMessageId,
    hasUnread,
    markChannelAsRead,
  } = useUnread({
    channelId,
    messages,
    autoMarkRead: true,
  });

  const handleJumpToUnread = () => {
    // Scroll to first unread message
    scrollToMessage(firstUnreadMessageId);
  };

  return (
    <div>
      <MessageList messages={messages} />

      <JumpToUnreadButton
        hasUnread={hasUnread}
        unreadCount={unreadCount}
        mentionCount={mentionCount}
        onJumpToUnread={handleJumpToUnread}
      />
    </div>
  );
}
```

### 2. Channel Sidebar with Badges

```tsx
import { SidebarUnread } from "@/components/chat/UnreadIndicator";
import { useAllUnread } from "@/hooks/use-unread";

function ChannelList({ channels, onSelect }) {
  const { allStates } = useAllUnread();

  return (
    <div>
      {channels.map((channel) => (
        <SidebarUnread
          key={channel.id}
          channelName={channel.name}
          channelType={channel.type}
          unreadCount={allStates[channel.id]?.unreadCount || 0}
          mentionCount={allStates[channel.id]?.mentionCount || 0}
          onClick={() => onSelect(channel.id)}
        />
      ))}
    </div>
  );
}
```

### 3. Unread Line in Messages

```tsx
import { UnreadLine } from "@/components/chat/UnreadIndicator";

// In your message list rendering
{
  messages.map((message, index) => (
    <React.Fragment key={message.id}>
      {/* Show unread line before first unread message */}
      {message.id === firstUnreadMessageId && (
        <UnreadLine count={messages.length - index} />
      )}

      <MessageItem message={message} />
    </React.Fragment>
  ));
}
```

## 🎯 Features

### Tracking

- [x] Per-channel last read position
- [x] Unread message counts
- [x] Unread mention tracking
- [x] Persistent storage (localStorage)
- [x] Cross-tab synchronization
- [x] Auto mark-as-read on scroll
- [x] Manual mark as read/unread

### UI Components

- [x] **UnreadBadge** - Count badge for channels
- [x] **UnreadDot** - Minimal dot indicator
- [x] **UnreadLine** - Horizontal divider in messages
- [x] **SidebarUnread** - Channel list item with badge
- [x] **InlineUnread** - Compact inline indicator
- [x] **MentionHighlight** - Highlight mentioned messages

### Navigation

- [x] **JumpToUnreadButton** - Jump to first unread
- [x] **JumpToChannel** - Navigate between unread channels
- [x] **JumpToMention** - Jump to next mention
- [x] **UnreadNavigation** - Combined navigation controls

### Keyboard Shortcuts

- `Alt+Shift+U` - Jump to first unread
- `Alt+Shift+M` - Jump to next mention
- `Alt+Shift+↑` - Previous unread channel
- `Alt+Shift+↓` - Next unread channel

## 📚 Components

### UnreadIndicator

Visual indicators for unread messages:

```tsx
// Badge with count
<UnreadBadge unreadCount={5} mentionCount={2} />

// Minimal dot
<UnreadDot unreadCount={3} />

// Unread line in message list
<UnreadLine count={10} label="New Messages" />

// Sidebar channel item
<SidebarUnread
  channelName="general"
  unreadCount={5}
  mentionCount={2}
  isActive={true}
/>

// Inline with tooltip
<InlineUnread unreadCount={3} mentionCount={1} />

// Highlight mentioned messages
<MentionHighlight isMentioned={true}>
  <MessageItem message={message} />
</MentionHighlight>
```

### JumpToUnread

Navigation buttons:

```tsx
// Basic jump button
<JumpToUnreadButton
  hasUnread={true}
  unreadCount={5}
  mentionCount={2}
  onJumpToUnread={handleJump}
/>

// Compact variant
<JumpToUnreadButton variant="compact" {...props} />

// Minimal variant
<JumpToUnreadButton variant="minimal" {...props} />

// Channel navigation
<JumpToChannel
  onNextUnread={handleNext}
  onPrevUnread={handlePrev}
  hasUnreadChannels={true}
  unreadChannelCount={3}
/>

// Combined navigation
<UnreadNavigation
  messageUnread={{...}}
  channelUnread={{...}}
  isAtBottom={false}
/>
```

## 🪝 Hooks

### useUnread

Track unread in a specific channel:

```tsx
const {
  // Counts
  unreadCount,
  mentionCount,
  hasUnread,
  hasMentions,

  // Position
  firstUnreadMessageId,
  lastReadPosition,

  // Actions
  markAsRead,
  markChannelAsRead,
  markAsUnread,
  resetUnread,
  isMessageUnread,
  recalculate,
} = useUnread({
  channelId: "channel-123",
  messages: messages,
  autoMarkRead: true,
  autoMarkReadDelay: 1000,
});
```

### useAllUnread

Track unread across all channels:

```tsx
const {
  allStates, // Record<channelId, UnreadState>
  totalUnread, // Total unread count
  totalMentions, // Total mention count
  markAllAsRead, // Mark all channels as read
} = useAllUnread();
```

### useUnreadNavigation

Navigate between unread channels:

```tsx
const {
  unreadChannels,
  mentionChannels,
  hasUnreadChannels,
  hasMentionChannels,
  getNextUnreadChannel,
  getPreviousUnreadChannel,
} = useUnreadNavigation(currentChannelId);

// Jump to next unread channel
const next = getNextUnreadChannel();
if (next) navigateToChannel(next);

// Jump to next mention
const nextMention = getNextUnreadChannel(true); // onlyMentions
```

## 🔧 Core Library

### UnreadTracker

Low-level tracking API:

```tsx
import { getUnreadTracker } from "@/lib/messaging/unread-tracker";

const tracker = getUnreadTracker();

// Initialize with user ID
tracker.initialize(userId);

// Mark as read
tracker.markAsRead(channelId, messageId, messageTimestamp);

// Mark as unread
tracker.markAsUnread(channelId, messageId, messageTimestamp);

// Calculate unread
const { unreadCount, mentionCount, firstUnreadMessageId } =
  tracker.calculateUnread(channelId, messages, currentUserId);

// Subscribe to changes
const unsubscribe = tracker.subscribe(channelId, () => {
  console.log("Unread state changed");
});
```

## 🎨 Styling

All components use Tailwind CSS and integrate with the app theme system.

### Customization

```tsx
// Custom colors for mentions
<UnreadBadge
  mentionCount={5}
  className="bg-purple-500 hover:bg-purple-600"
/>

// Custom position
<JumpToUnreadButton
  position="bottom-right"
  className="bottom-8 right-8"
/>

// Custom size
<UnreadDot size="lg" className="h-4 w-4" />
```

## 🔄 State Management

### Architecture

```
React Components
      ↓
useUnread Hook
      ↓
UnreadTracker (singleton)
      ↓
localStorage + BroadcastChannel
      ↓
NotificationStore (Zustand)
```

### Data Flow

1. **User scrolls/interacts** → Component
2. **Component calls hook** → useUnread
3. **Hook updates tracker** → UnreadTracker
4. **Tracker persists** → localStorage
5. **Tracker syncs** → Other tabs via BroadcastChannel
6. **Tracker notifies** → Subscribed hooks
7. **Hooks update** → React state
8. **Components re-render** → UI updates

## 🧪 Testing

### Unit Tests

```tsx
import { renderHook, act } from "@testing-library/react";
import { useUnread } from "@/hooks/use-unread";

test("tracks unread messages", () => {
  const { result } = renderHook(() =>
    useUnread({
      channelId: "test",
      messages: mockMessages,
    }),
  );

  expect(result.current.unreadCount).toBe(5);
});

test("marks as read", () => {
  const { result } = renderHook(() =>
    useUnread({
      channelId: "test",
      messages: mockMessages,
    }),
  );

  act(() => {
    result.current.markChannelAsRead();
  });

  expect(result.current.unreadCount).toBe(0);
});
```

## 📖 Full Documentation

See `/docs/Unread-System.md` for complete documentation including:

- Architecture details
- Advanced features
- Integration guide
- Performance optimization
- Troubleshooting
- API reference

## 📝 Examples

See `/src/components/chat/UnreadIntegrationExample.tsx` for complete examples:

- Channel sidebar with unread badges
- Message list with unread line
- Complete chat interface
- Custom message items
- Browser badge updates

## 🚧 Integration Checklist

- [ ] Initialize tracker in app root with user ID
- [ ] Add useUnread to message views
- [ ] Add UnreadIndicators to channel list
- [ ] Add JumpToUnread buttons to message lists
- [ ] Add unread line to message list rendering
- [ ] Add keyboard shortcuts
- [ ] Add browser/desktop badge updates
- [ ] Test cross-tab sync
- [ ] Test persistence across sessions

## 🔗 Related

- **Notification System**: `/src/stores/notification-store.ts`
- **Channel Management**: `/src/stores/channel-store.ts`
- **Message Types**: `/src/types/message.ts`
- **Keyboard Shortcuts**: `/src/hooks/use-hotkey.ts`

## 💡 Best Practices

1. **Initialize Early**: Initialize tracker in app root when user logs in
2. **Sync Stores**: Keep notification store in sync with unread tracker
3. **Auto Mark Read**: Use `autoMarkRead` option for better UX
4. **Handle Edge Cases**: Filter out own messages, deleted messages
5. **Optimize Performance**: Use memoization, debounced updates
6. **Accessibility**: Add proper ARIA labels and keyboard shortcuts

## 🐛 Common Issues

**Unread counts not updating?**
→ Ensure messages are passed to useUnread hook

**Cross-tab sync not working?**
→ BroadcastChannel not supported (gracefully degrades)

**Auto-mark not working?**
→ Check autoMarkRead option and scroll position

**Storage quota exceeded?**
→ Old data auto-cleaned after 30 days

## 📄 License

Part of nself-chat project.
