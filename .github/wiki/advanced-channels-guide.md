# Advanced Channels UI Guide

Complete documentation for Discord guilds, Telegram communities, WhatsApp communities, and broadcast list UI components (Tasks 62-64).

## Table of Contents

1. [Discord Guild Components](#discord-guild-components)
2. [Telegram Supergroup Components](#telegram-supergroup-components)
3. [WhatsApp Community Components](#whatsapp-community-components)
4. [Broadcast List Components](#broadcast-list-components)
5. [Usage Examples](#usage-examples)
6. [Component Reference](#component-reference)

---

## Discord Guild Components

### GuildPicker

Discord-style server/guild picker displayed in the left sidebar.

**Features:**

- Server icon/initial display
- Active server indicator
- Unread notification badges
- Boost tier indicators
- Home button
- Add server and discover buttons
- Hover tooltips with server names

**Usage:**

```tsx
import { GuildPicker } from '@/components/channels/advanced-channels'

function Sidebar() {
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState('workspace-1')

  return (
    <GuildPicker
      workspaces={workspaces}
      currentWorkspaceId={currentWorkspaceId}
      onWorkspaceSelect={setCurrentWorkspaceId}
      onAddWorkspace={() => openAddServerModal()}
      onDiscoverWorkspaces={() => openDiscoveryModal()}
      showHome={true}
    />
  )
}
```

**Props:**

- `workspaces`: Array of workspace objects
- `currentWorkspaceId`: Currently selected workspace ID
- `onWorkspaceSelect`: Callback when workspace is selected
- `onAddWorkspace`: Callback to create new workspace
- `onDiscoverWorkspaces`: Callback to open discovery
- `showHome`: Show home/DM button at top

### GuildSettingsModal

Comprehensive server settings modal with tabbed interface.

**Features:**

- Overview tab: name, icon, banner, vanity URL
- Moderation tab: verification level, content filter, system channels
- Boost status tab: current tier, perks, progress

**Usage:**

```tsx
import { GuildSettingsModal } from '@/components/channels/advanced-channels'

function ServerHeader() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <Button onClick={() => setShowSettings(true)}>Server Settings</Button>

      <GuildSettingsModal
        workspace={currentWorkspace}
        open={showSettings}
        onOpenChange={setShowSettings}
        onSave={async (updates) => {
          await updateWorkspace(workspace.id, updates)
        }}
      />
    </>
  )
}
```

**Props:**

- `workspace`: Workspace object with guild enhancements
- `open`: Modal open state
- `onOpenChange`: Callback to control modal state
- `onSave`: Async callback to save changes

---

## Telegram Supergroup Components

### SupergroupHeader

Header for Telegram-style supergroups and channels.

**Features:**

- Group/channel name and avatar
- Member/subscriber count with online status
- Supergroup/gigagroup badge
- Admin indicator
- Mute/unmute toggle
- Search, invite, share, and settings actions
- Topic/description display

**Usage:**

```tsx
import { SupergroupHeader } from '@/components/channels/advanced-channels'

function ChannelView() {
  return (
    <SupergroupHeader
      channel={channel}
      isAdmin={currentUser.role === 'admin'}
      isMuted={mutedChannels.includes(channel.id)}
      onSearch={() => openSearch()}
      onInvite={() => openInviteDialog()}
      onShare={() => copyInviteLink()}
      onSettings={() => openSettings()}
      onToggleMute={() => toggleMute(channel.id)}
      onToggleNotifications={() => toggleNotifications(channel.id)}
    />
  )
}
```

**Props:**

- `channel`: Channel object
- `isAdmin`: Whether current user is admin
- `isMuted`: Whether channel is muted
- `onSearch`: Callback to open search
- `onInvite`: Callback to invite members
- `onShare`: Callback to share invite link
- `onSettings`: Callback to open settings
- `onToggleMute`: Callback to toggle mute
- `onToggleNotifications`: Callback to toggle notifications

### ChannelPostComposer

Admin-only post composer for channels and gigagroups.

**Features:**

- Rich text editor (4096 character limit)
- Media attachments
- Sign message with author name
- Disable comments option
- Silent post (no notifications)
- Schedule posting
- Character counter

**Usage:**

```tsx
import { ChannelPostComposer } from '@/components/channels/advanced-channels'

function ChannelComposer() {
  return (
    <ChannelPostComposer
      channel={channel}
      onPost={async (post) => {
        await createChannelPost({
          channelId: channel.id,
          ...post,
        })
      }}
      onSchedulePost={async (post, scheduledFor) => {
        await scheduleChannelPost({
          channelId: channel.id,
          scheduledFor,
          ...post,
        })
      }}
    />
  )
}
```

**Props:**

- `channel`: Channel object
- `onPost`: Async callback to post immediately
- `onSchedulePost`: Async callback to schedule post

---

## WhatsApp Community Components

### CommunityView

WhatsApp-style community view with announcement channel and groups.

**Features:**

- Community header with icon and description
- Announcement channel (read-only for members)
- List of sub-groups (up to 100)
- Group count and member count display
- Add group button (respects permissions)
- Community info panel
- Admin controls

**Usage:**

```tsx
import { CommunityView } from '@/components/channels/advanced-channels'

function CommunitySidebar() {
  const [selectedChannelId, setSelectedChannelId] = useState(null)

  return (
    <CommunityView
      community={community}
      isAdmin={currentUser.role === 'admin'}
      onSelectChannel={setSelectedChannelId}
      onAddGroup={() => openAddGroupDialog()}
      onInviteMembers={() => openInviteDialog()}
      onSettings={() => openSettings()}
      onViewEvents={() => openEventsView()}
      selectedChannelId={selectedChannelId}
    />
  )
}
```

**Props:**

- `community`: Community object with groups
- `isAdmin`: Whether current user is admin
- `onSelectChannel`: Callback when channel is selected
- `onAddGroup`: Callback to add new group
- `onInviteMembers`: Callback to invite members
- `onSettings`: Callback to open settings
- `onViewEvents`: Callback to view events
- `selectedChannelId`: Currently selected channel ID

### CommunitySettings

Community settings modal for admin configuration.

**Features:**

- Community info editing (name, description, icon)
- Who can add groups (admin/member)
- Members can invite toggle
- Approval required toggle
- Events enabled toggle
- Max groups and members limits
- Delete community (danger zone)

**Usage:**

```tsx
import { CommunitySettings } from '@/components/channels/advanced-channels'

function CommunityControls() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <Button onClick={() => setShowSettings(true)}>Community Settings</Button>

      <CommunitySettings
        community={community}
        open={showSettings}
        onOpenChange={setShowSettings}
        onSave={async (updates) => {
          await updateCommunity(community.id, updates)
        }}
        onDelete={async () => {
          await deleteCommunity(community.id)
          router.push('/communities')
        }}
      />
    </>
  )
}
```

**Props:**

- `community`: Community object
- `open`: Modal open state
- `onOpenChange`: Callback to control modal state
- `onSave`: Async callback to save changes
- `onDelete`: Async callback to delete community

---

## Broadcast List Components

### BroadcastListCreator

Three-step wizard to create new broadcast list.

**Features:**

- Step 1: Basic info (name, description, icon, subscription mode, max subscribers)
- Step 2: Add subscribers (search, select up to max, visual selection)
- Step 3: Settings (allow replies, show sender name, track delivery/reads)
- Progress indicator
- Validation at each step

**Usage:**

```tsx
import { BroadcastListCreator } from '@/components/channels/advanced-channels'

function BroadcastsPage() {
  const [showCreator, setShowCreator] = useState(false)

  return (
    <>
      <Button onClick={() => setShowCreator(true)}>Create Broadcast List</Button>

      <BroadcastListCreator
        workspaceId={currentWorkspace.id}
        open={showCreator}
        onOpenChange={setShowCreator}
        onCreate={async (data) => {
          const list = await createBroadcastList(data)
          await addSubscribers(list.id, data.subscriberIds)
        }}
      />
    </>
  )
}
```

**Props:**

- `workspaceId`: Current workspace ID
- `open`: Modal open state
- `onOpenChange`: Callback to control modal state
- `onCreate`: Async callback to create list

### BroadcastListManager

Main view to manage all broadcast lists.

**Features:**

- List overview with stats (subscribers, messages sent, last broadcast)
- Search and filter
- Aggregate stats (total lists, subscribers, messages)
- Quick actions (send, manage, edit, delete)
- Empty state with create button
- Settings badges display

**Usage:**

```tsx
import { BroadcastListManager } from '@/components/channels/advanced-channels'

function BroadcastsPage() {
  return (
    <BroadcastListManager
      workspaceId={currentWorkspace.id}
      broadcastLists={broadcastLists}
      onCreateList={() => setShowCreator(true)}
      onSendBroadcast={(listId) => {
        setSelectedListId(listId)
        setShowComposer(true)
      }}
      onEditList={(list) => {
        setEditingList(list)
        setShowEditor(true)
      }}
      onDeleteList={async (listId) => {
        await deleteBroadcastList(listId)
        await refreshLists()
      }}
      onManageSubscribers={(listId) => {
        setSelectedListId(listId)
        setShowSubscriberManager(true)
      }}
    />
  )
}
```

**Props:**

- `workspaceId`: Current workspace ID
- `broadcastLists`: Array of broadcast list objects
- `onCreateList`: Callback to create new list
- `onSendBroadcast`: Callback to send broadcast
- `onEditList`: Callback to edit list settings
- `onDeleteList`: Async callback to delete list
- `onManageSubscribers`: Callback to manage subscribers

### BroadcastComposer

Compose and send broadcast messages.

**Features:**

- Rich text editor (4096 character limit)
- Media attachments
- Silent mode toggle (no notifications)
- Schedule sending
- Broadcast settings preview
- Estimated delivery time
- Large broadcast warning
- Delivery tracking info

**Usage:**

```tsx
import { BroadcastComposer } from '@/components/channels/advanced-channels'

function SendBroadcast() {
  const [showComposer, setShowComposer] = useState(false)

  return (
    <>
      <Button onClick={() => setShowComposer(true)}>Send Broadcast</Button>

      <BroadcastComposer
        broadcastList={selectedList}
        open={showComposer}
        onOpenChange={setShowComposer}
        onSend={async (data) => {
          const message = await sendBroadcast(data)
          if (selectedList.trackDelivery) {
            trackBroadcastDelivery(message.id)
          }
        }}
      />
    </>
  )
}
```

**Props:**

- `broadcastList`: Broadcast list object
- `open`: Modal open state
- `onOpenChange`: Callback to control modal state
- `onSend`: Async callback to send broadcast

---

## Usage Examples

### Complete Discord Guild Setup

```tsx
import { GuildPicker, GuildSettingsModal } from '@/components/channels/advanced-channels'

function DiscordLayout() {
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId)

  return (
    <div className="flex h-screen">
      {/* Guild picker sidebar */}
      <GuildPicker
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        onWorkspaceSelect={setCurrentWorkspaceId}
        onAddWorkspace={() => createWorkspace()}
        onDiscoverWorkspaces={() => router.push('/discover')}
      />

      {/* Main content */}
      <div className="flex-1">
        {currentWorkspace && (
          <>
            <header>
              <Button onClick={() => setShowSettings(true)}>Server Settings</Button>
            </header>

            {/* Settings modal */}
            <GuildSettingsModal
              workspace={currentWorkspace}
              open={showSettings}
              onOpenChange={setShowSettings}
              onSave={updateWorkspace}
            />
          </>
        )}
      </div>
    </div>
  )
}
```

### Complete Telegram Channel Setup

```tsx
import { SupergroupHeader, ChannelPostComposer } from '@/components/channels/advanced-channels'

function TelegramChannel() {
  const isAdmin = channel.creatorId === currentUser.id

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <SupergroupHeader
        channel={channel}
        isAdmin={isAdmin}
        onSearch={() => setShowSearch(true)}
        onInvite={() => setShowInvite(true)}
        onSettings={() => setShowSettings(true)}
      />

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Admin-only composer */}
      {isAdmin && (
        <ChannelPostComposer channel={channel} onPost={createPost} onSchedulePost={schedulePost} />
      )}
    </div>
  )
}
```

### Complete WhatsApp Community Setup

```tsx
import { CommunityView, CommunitySettings } from '@/components/channels/advanced-channels'

function WhatsAppCommunity() {
  const [selectedChannelId, setSelectedChannelId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="flex h-screen">
      {/* Community sidebar */}
      <div className="w-80 border-r">
        <CommunityView
          community={community}
          isAdmin={isAdmin}
          onSelectChannel={setSelectedChannelId}
          onAddGroup={() => openAddGroupDialog()}
          onSettings={() => setShowSettings(true)}
          selectedChannelId={selectedChannelId}
        />
      </div>

      {/* Channel content */}
      <div className="flex-1">
        {selectedChannelId && <ChannelView channelId={selectedChannelId} />}
      </div>

      {/* Settings modal */}
      <CommunitySettings
        community={community}
        open={showSettings}
        onOpenChange={setShowSettings}
        onSave={updateCommunity}
        onDelete={deleteCommunity}
      />
    </div>
  )
}
```

### Complete Broadcast List Flow

```tsx
import {
  BroadcastListCreator,
  BroadcastListManager,
  BroadcastComposer,
} from '@/components/channels/advanced-channels'

function BroadcastsPage() {
  const [showCreator, setShowCreator] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [selectedList, setSelectedList] = useState(null)

  return (
    <>
      {/* Main manager view */}
      <BroadcastListManager
        workspaceId={workspace.id}
        broadcastLists={broadcastLists}
        onCreateList={() => setShowCreator(true)}
        onSendBroadcast={(listId) => {
          setSelectedList(broadcastLists.find((l) => l.id === listId))
          setShowComposer(true)
        }}
        onEditList={editList}
        onDeleteList={deleteList}
        onManageSubscribers={manageSubscribers}
      />

      {/* Create list wizard */}
      <BroadcastListCreator
        workspaceId={workspace.id}
        open={showCreator}
        onOpenChange={setShowCreator}
        onCreate={createBroadcastList}
      />

      {/* Send broadcast composer */}
      {selectedList && (
        <BroadcastComposer
          broadcastList={selectedList}
          open={showComposer}
          onOpenChange={setShowComposer}
          onSend={sendBroadcast}
        />
      )}
    </>
  )
}
```

---

## Component Reference

### Type Imports

```tsx
import type {
  // Discord
  GuildPickerProps,
  GuildItemProps,
  GuildSettingsModalProps,

  // Telegram
  SupergroupHeaderProps,
  ChannelPostComposerProps,
  PostData,

  // WhatsApp
  CommunityViewProps,
  CommunitySettingsProps,

  // Broadcast
  BroadcastListCreatorProps,
  BroadcastListInput,
  BroadcastListManagerProps,
  BroadcastComposerProps,
  BroadcastMessageData,
} from '@/components/channels/advanced-channels'
```

### Database Schema

See `/Users/admin/Sites/nself-nchat/backend/nself/migrations/20260203150000_advanced_channels.up.sql` for complete schema.

### API Types

See `/Users/admin/Sites/nself-chat/src/types/advanced-channels.ts` for complete type definitions.

### Related APIs

- `/api/communities` - Create and list communities
- `/api/communities/[id]` - Get, update, delete community
- `/api/communities/[id]/groups` - Manage community groups
- `/api/broadcasts` - Create and list broadcast lists
- `/api/broadcasts/[id]/send` - Send broadcast message

---

## Best Practices

1. **Permission Checks**: Always verify user permissions before showing admin-only components
2. **Loading States**: Show loading indicators during async operations
3. **Error Handling**: Implement proper error handling and user feedback
4. **Optimistic Updates**: Update UI immediately, then sync with server
5. **Rate Limiting**: Implement rate limiting for broadcast sends
6. **Delivery Tracking**: Only enable if needed to reduce server load
7. **Validation**: Validate all inputs before submission
8. **Accessibility**: Ensure keyboard navigation and screen reader support

---

## Testing

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GuildPicker } from '@/components/channels/advanced-channels'

describe('GuildPicker', () => {
  it('renders workspaces', () => {
    render(<GuildPicker workspaces={mockWorkspaces} />)
    expect(screen.getByText('Test Server')).toBeInTheDocument()
  })

  it('calls onWorkspaceSelect when clicked', async () => {
    const onSelect = jest.fn()
    render(<GuildPicker workspaces={mockWorkspaces} onWorkspaceSelect={onSelect} />)

    fireEvent.click(screen.getByText('Test Server'))
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('workspace-1')
    })
  })
})
```

---

## Migration Guide

### From Basic Channels to Advanced

```tsx
// Before (basic channels)
<ChannelList channels={channels} />

// After (Discord-style guilds)
<GuildPicker
  workspaces={workspaces}
  currentWorkspaceId={currentWorkspaceId}
  onWorkspaceSelect={setCurrentWorkspaceId}
/>

// After (Telegram-style supergroups)
<SupergroupHeader
  channel={channel}
  isAdmin={isAdmin}
  onSettings={openSettings}
/>

// After (WhatsApp communities)
<CommunityView
  community={community}
  onSelectChannel={setSelectedChannelId}
/>

// After (Broadcast lists)
<BroadcastListManager
  workspaceId={workspaceId}
  broadcastLists={broadcastLists}
  onSendBroadcast={sendBroadcast}
/>
```

---

## Troubleshooting

### Guild Picker Not Showing Servers

1. Check workspace data structure matches `Workspace` type
2. Verify `workspaces` array is not empty
3. Check console for React errors

### Broadcast Delivery Slow

1. Check subscriber count (>1000 may be slow)
2. Verify server has adequate resources
3. Consider implementing queue system
4. Use background jobs for large broadcasts

### Community Groups Not Showing

1. Verify community has `groups` array populated
2. Check `includeGroups` parameter in API call
3. Verify foreign key relationships in database

---

## Support

For issues or questions:

- Check `/Users/admin/Sites/nself-chat/docs/COMMON-ISSUES.md`
- Review component source code for inline documentation
- Consult database schema for data structure

---

**Version:** 1.0.0
**Last Updated:** February 3, 2026
**Tasks:** 62-64 (Complete)
