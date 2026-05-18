# Platform Presence Semantics

This document describes the presence, typing, and read receipt behaviors for each platform preset.

## Overview

The nself-chat platform presence system supports 6 presets:

| Platform | Presence           | Typing | Read Receipts         | Privacy Controls |
| -------- | ------------------ | ------ | --------------------- | ---------------- |
| WhatsApp | Online/Offline     | Yes    | Blue ticks            | Full             |
| Telegram | Online + Last Seen | Yes    | Green ticks (DM only) | Granular         |
| Signal   | Minimal            | Yes    | Optional              | Maximum          |
| Slack    | Active/Away/DND    | Yes    | Seen by X             | Minimal          |
| Discord  | Rich Presence      | Yes    | None (servers)        | Per-status       |
| Default  | Full               | Yes    | Full                  | Balanced         |

---

## WhatsApp Preset

### Presence

- **Online Status**: Shows "online" when user is active
- **Last Seen**: Shows "last seen X ago" when offline
- **Privacy**: User can hide last seen (everyone/contacts/nobody)
- **Custom Status**: Not supported (uses "About" bio instead)

### Typing Indicators

- Timeout: 5 seconds
- Shows in both DMs and groups
- Shows typer names: "Alice is typing...", "Alice and Bob are typing..."

### Read Receipts

- **Style**: Checkmarks
  - Single gray check: Sent
  - Double gray checks: Delivered
  - Double blue checks: Read
- **Groups**: Shows who read (count only)
- **Privacy**: Can be disabled, but then you can't see others' receipts
- **Colors**:
  - Sent/Delivered: `#9E9E9E` (gray)
  - Read: `#53BDEB` (WhatsApp blue)

### Visual Example

```
Sent:      ✓ (gray)
Delivered: ✓✓ (gray)
Read:      ✓✓ (blue)
Failed:    ⚠ (red)
```

---

## Telegram Preset

### Presence

- **Online Status**: Shows "online" when active
- **Last Seen**: Approximated for privacy
  - "recently" (within 1 day)
  - "within a week"
  - "within a month"
  - "a long time ago"
- **Privacy**: Granular control (everyone/contacts/nobody)
- **Custom Status**: Supported with emoji

### Typing Indicators

- Timeout: 5 seconds
- Shows "typing...", "recording audio...", "uploading..."
- Shows in both DMs and groups

### Read Receipts

- **Style**: Checkmarks
  - Single check: Sent
  - Double checks: Delivered/Read
- **Groups**: NO read receipts in groups (privacy)
- **DMs Only**: Double green checks when read
- **Cannot be disabled**: Always on for DMs
- **Colors**:
  - Sent/Delivered: `#A0B8C9` (gray-blue)
  - Read: `#4FAE4E` (Telegram green)

### Visual Example

```
Sent:      ✓ (gray)
Delivered: ✓✓ (gray)
Read:      ✓✓ (green) - DM only
Groups:    ✓✓ (gray) - no read status
```

---

## Signal Preset

### Presence

- **Online Status**: NOT shown (privacy-first)
- **Last Seen**: NOT shown
- **Custom Status**: Not supported
- Minimal presence information by design

### Typing Indicators

- Timeout: 4 seconds
- Shows only "typing..." (no names for privacy)
- Available in DMs and groups

### Read Receipts

- **Style**: Filled circles (not checkmarks)
  - Empty circle: Sending
  - Filled circle: Sent
  - Double filled: Read
- **Disabled by default**: User must opt-in
- **No group receipts**: Privacy
- **Reciprocal**: If you disable, you can't see others'
- **Colors**:
  - Sent: `#86898C` (gray)
  - Read: `#2C6BED` (Signal blue)

### Visual Example

```
Sending:   ○ (gray outline)
Sent:      ● (gray filled)
Read:      ●● (blue filled)
Failed:    ✕ (red)
```

---

## Slack Preset

### Presence

- **Status Dot**: Green (active), Yellow (away), Red (DND)
- **Auto-Away**: After 30 minutes of inactivity
- **Idle Detection**: After 10 minutes
- **Custom Status**: Emoji + text (e.g., "📅 In a meeting")
- **Activity Status**: Shows current activity

### Typing Indicators

- Timeout: 5 seconds
- Throttle: 3 seconds between broadcasts
- Shows full names
- Works in channels and DMs

### Read Receipts

- **Style**: "Seen by" with avatars
- **No delivery status**: Only read status
- **Group channels**: Shows "Seen by Alice, Bob, and 3 others"
- **Avatar display**: Up to 5 reader avatars
- **Always enabled**: Cannot be disabled

### Visual Example

```
Channel message:
  [Avatar] [Avatar] [Avatar] +2  Seen by Alice, Bob, and 3 others

DM message:
  ✓ Seen
```

### Status Presets

```typescript
const slackStatuses = [
  { emoji: "📅", text: "In a meeting" },
  { emoji: "🚗", text: "Commuting" },
  { emoji: "🤒", text: "Out sick" },
  { emoji: "🌴", text: "Vacationing" },
  { emoji: "🏠", text: "Working remotely" },
];
```

---

## Discord Preset

### Presence

- **Rich Presence**:
  - Online (green)
  - Idle (yellow) - Auto after 5 min
  - Do Not Disturb (red)
  - Invisible (appear offline)
- **Activity Status**: "Playing...", "Listening to...", "Watching..."
- **Custom Status**: Emoji + text with expiry

### Typing Indicators

- Timeout: 8 seconds
- Shows up to 4 typers
- Works in channels, DMs, and threads

### Read Receipts

- **Servers**: NO read receipts
- **DMs**: Minimal (no visual indicator)
- **Focus on real-time**: If you're in channel, you've seen it
- **Cannot be enabled**: Privacy by design

### Status Colors

```typescript
const discordColors = {
  online: "#43B581", // Green
  idle: "#FAA61A", // Yellow
  dnd: "#F04747", // Red
  offline: "#747F8D", // Gray
  invisible: "#747F8D", // Gray (same as offline)
};
```

### Activity Types

```
Playing Minecraft        - 2 hours
Listening to Spotify     - Yellow Brick Road
Watching Netflix         - Breaking Bad
Streaming Twitch         - (purple dot)
```

---

## Default Preset

### Presence

- **Full features**: All presence states available
- **Auto-away**: After 5 minutes
- **Idle detection**: After 5 minutes
- **Custom status**: Emoji + text + expiry
- **All statuses**: online, away, busy, dnd, invisible, offline

### Typing Indicators

- Standard 5-second timeout
- Shows typer names
- Works everywhere

### Read Receipts

- **Full support**: Sent, delivered, read
- **User can opt-out**: Per-setting or per-conversation
- **Group receipts**: Avatars + "Seen by X"
- **Checkmark style**: Like WhatsApp

### Privacy Defaults

```typescript
const defaultPrivacy = {
  lastSeenVisibility: "everyone",
  onlineStatusVisibility: "everyone",
  sendReadReceipts: true,
  sendTypingIndicators: true,
};
```

---

## Implementation Guide

### Using Platform Presets

```typescript
import { usePlatformPresence } from '@/hooks/use-platform-presence'

function MessageList({ conversationId }) {
  const { presence, typing, receipts } = usePlatformPresence(
    conversationId,
    { platform: 'whatsapp' }
  )

  return (
    <div>
      {/* Typing indicator */}
      {typing.isAnyoneTyping && (
        <TypingIndicator text={typing.typingText} />
      )}

      {/* Message with receipt */}
      <Message>
        <MessageReceiptIndicator
          status={receipts.getDeliveryStatus(message.id)}
          platform="whatsapp"
        />
      </Message>
    </div>
  )
}
```

### Customizing Privacy

```typescript
const { presence } = usePlatformPresence(conversationId, {
  platform: "telegram",
  privacySettings: {
    lastSeenVisibility: "contacts",
    sendReadReceipts: true,
    sendTypingIndicators: true,
  },
});

// Per-conversation override
presence.setConversationOverride(conversationId, {
  readReceipts: false, // Disable for this chat only
});
```

### Platform Detection

```typescript
import { getPlatformConfig } from "@/lib/presence/platform-presence";

const config = getPlatformConfig("slack");

if (config.receipts.groupReceipts) {
  // Show "Seen by" in groups
}

if (config.presence.activityStatus) {
  // Show "In a meeting" status
}
```

---

## Comparison Table

| Feature          | WhatsApp | Telegram | Signal | Slack   | Discord | Default |
| ---------------- | -------- | -------- | ------ | ------- | ------- | ------- |
| Online dot       | Yes      | Yes      | No     | Yes     | Yes     | Yes     |
| Last seen        | Yes      | Approx   | No     | No      | No      | Yes     |
| Auto-away        | No       | No       | No     | 30min   | 10min   | 5min    |
| DND mode         | No       | No       | No     | Yes     | Yes     | Yes     |
| Invisible        | No       | Yes      | No     | No      | Yes     | Yes     |
| Activity         | No       | No       | No     | Yes     | Yes     | No      |
| Custom status    | Bio only | Yes      | No     | Yes     | Yes     | Yes     |
| Typing DM        | Yes      | Yes      | Yes    | Yes     | Yes     | Yes     |
| Typing group     | Yes      | Yes      | Yes    | Yes     | Yes     | Yes     |
| Sent ✓           | Gray     | Gray     | Circle | No      | No      | Gray    |
| Delivered ✓✓     | Gray     | Gray     | Circle | No      | No      | Gray    |
| Read ✓✓          | Blue     | Green    | Blue   | Seen    | No      | Blue    |
| Group receipts   | Count    | No       | No     | Avatars | No      | Avatars |
| Opt-out receipts | Yes\*    | No       | Yes    | No      | N/A     | Yes     |

\*WhatsApp: Disabling receipts means you can't see others' either

---

## Migration Guide

### From Generic to Platform-Specific

```typescript
// Before (generic)
const { isTyping, typingUsers } = useTyping(channelId);

// After (platform-specific)
const { typing } = usePlatformPresence(channelId, { platform: "slack" });
const { isAnyoneTyping, typingText } = typing;
```

### Switching Platforms

```typescript
// Configuration-driven
const platform = useAppConfig().theme.preset; // 'slack' | 'discord' | etc.

const { presence, typing, receipts } = usePlatformPresence(conversationId, {
  platform,
});
```

---

## Testing Platform Behaviors

See `/src/lib/presence/__tests__/platform-presence.test.ts` for comprehensive tests covering:

- All platform configurations
- Privacy setting combinations
- Receipt status transitions
- Typing indicator behaviors
- Last seen formatting per platform
