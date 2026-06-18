/**
 * Purpose:    Component catalog data for /dev/components (the library index). Extracted from the
 *             legacy app/dev/components/page.tsx so the page file stays under the 300-line cap.
 * Inputs:     none — pure constant data.
 * Outputs:    CATEGORIES + COMPONENTS consumed by DevComponentsPage.
 * Constraints:Data only. SOT below.
 * SOT:        F-NCHAT-VITE-DEVTOOLS-CATALOG-01
 */
import {
  Layers,
  MessageSquare,
  Hash,
  User,
  Settings,
  Bell,
  FileIcon,
  Smile,
  Menu,
  type LucideIcon,
} from 'lucide-react'

export interface ComponentInfo {
  name: string
  description: string
  path: string
  category: string
  status: 'stable' | 'beta' | 'new'
}

export const CATEGORIES: ReadonlyArray<{ id: string; label: string; icon: LucideIcon }> = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'channel', label: 'Channels', icon: Hash },
  { id: 'user', label: 'Users', icon: User },
  { id: 'ui', label: 'UI', icon: Settings },
  { id: 'notification', label: 'Notifications', icon: Bell },
  { id: 'file', label: 'Files', icon: FileIcon },
  { id: 'emoji', label: 'Emoji', icon: Smile },
  { id: 'layout', label: 'Layout', icon: Menu },
]

const C = (
  name: string,
  description: string,
  path: string,
  category: string,
): ComponentInfo => ({ name, description, path, category, status: 'stable' })

export const COMPONENTS: ReadonlyArray<ComponentInfo> = [
  C('MessageList', 'Virtualized list of messages with grouping and infinite scroll', '/dev/components/messages', 'chat'),
  C('MessageItem', 'Individual message with reactions, threads, and actions', '/dev/components/messages', 'chat'),
  C('MessageInput', 'Rich text editor with TipTap, mentions, and attachments', '/dev/components/messages', 'chat'),
  C('MessageSkeleton', 'Loading placeholder for message list', '/dev/components/messages', 'chat'),
  C('MessageReactions', 'Emoji reactions display and picker', '/dev/components/messages', 'chat'),
  C('MessageThreadPreview', 'Thread reply preview with participant avatars', '/dev/components/messages', 'chat'),
  C('TypingIndicator', 'Shows users currently typing in channel', '/dev/components/messages', 'chat'),
  C('MessageSystem', 'System messages like joins, leaves, and announcements', '/dev/components/messages', 'chat'),
  C('ChannelList', 'Sidebar channel list with categories and search', '/dev/components/channels', 'channel'),
  C('ChannelHeader', 'Channel header with name, topic, and actions', '/dev/components/channels', 'channel'),
  C('ChannelItem', 'Individual channel item with unread badge', '/dev/components/channels', 'channel'),
  C('ChannelCategory', 'Collapsible category for organizing channels', '/dev/components/channels', 'channel'),
  C('ChannelInfoPanel', 'Detailed channel information sidebar', '/dev/components/channels', 'channel'),
  C('CreateChannelModal', 'Modal for creating new channels', '/dev/components/channels', 'channel'),
  C('UserAvatar', 'User avatar with presence indicator', '/dev/components/users', 'user'),
  C('UserAvatarGroup', 'Stacked avatar group with overflow count', '/dev/components/users', 'user'),
  C('UserProfileCard', 'User profile hover card with actions', '/dev/components/users', 'user'),
  C('UserPresenceDot', 'Online/offline/away/DND status indicator', '/dev/components/users', 'user'),
  C('RoleBadge', 'User role badge (owner, admin, moderator, etc.)', '/dev/components/users', 'user'),
  C('UserStatus', 'Custom status with emoji and text', '/dev/components/users', 'user'),
  C('Button', 'Versatile button with multiple variants and sizes', '/dev/components', 'ui'),
  C('Input', 'Text input with label and error states', '/dev/components', 'ui'),
  C('Dialog', 'Modal dialog with accessibility support', '/dev/components', 'ui'),
  C('DropdownMenu', 'Dropdown menu with submenus and checkboxes', '/dev/components', 'ui'),
  C('Tabs', 'Tabbed interface with keyboard navigation', '/dev/components', 'ui'),
  C('Tooltip', 'Hover tooltip with configurable positioning', '/dev/components', 'ui'),
  C('Card', 'Content container with header and footer', '/dev/components', 'ui'),
  C('Badge', 'Small status indicator label', '/dev/components', 'ui'),
  C('Switch', 'Toggle switch for boolean settings', '/dev/components', 'ui'),
  C('Select', 'Dropdown select with search', '/dev/components', 'ui'),
  C('NotificationBell', 'Notification bell icon with unread count', '/dev/components', 'notification'),
  C('UnreadBadge', 'Unread message count badge', '/dev/components', 'notification'),
  C('MentionBadge', 'Badge showing mention count', '/dev/components', 'notification'),
  C('FileIcon', 'File type icon based on mime type', '/dev/components', 'file'),
  C('MessageAttachments', 'File attachment display with preview', '/dev/components/messages', 'file'),
  C('EmojiButton', 'Emoji picker trigger button', '/dev/components', 'emoji'),
  C('ReactionPicker', 'Quick reaction picker menu', '/dev/components', 'emoji'),
  C('ReactionDisplay', 'Reaction display with users list', '/dev/components', 'emoji'),
  C('ChatLayout', 'Main chat layout with sidebar and content', '/dev/components', 'layout'),
  C('Sidebar', 'Application sidebar with navigation', '/dev/components', 'layout'),
  C('Header', 'Application header with user menu', '/dev/components', 'layout'),
  C('SettingsLayout', 'Settings page layout with navigation', '/dev/components', 'layout'),
]
