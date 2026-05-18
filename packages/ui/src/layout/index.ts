/**
 * Layout domain — sidebar, channel list, header, chat shell.
 *
 * @module layout
 */

// Types
export type {
  ChannelType,
  ChannelMember,
  Channel,
  ChannelCategory as ChannelCategoryData,
  SortOrder,
  UserRole,
  LayoutUser,
} from './types'

// Channel item
export { ChannelItem } from './channel-item'
export type { ChannelItemAdapter, ChannelItemProps } from './channel-item'

// Channel category
export { ChannelCategory, ChannelCategoryHeader } from './channel-category'
export type {
  ChannelCategoryAdapter,
  ChannelCategoryProps,
  ChannelCategoryHeaderProps,
} from './channel-category'

// Channel header
export { ChannelHeader } from './channel-header'
export type { ChannelHeaderAdapter, ChannelHeaderProps } from './channel-header'

// Channel skeleton
export {
  ChannelItemSkeleton,
  ChannelCategorySkeleton,
  SidebarSkeleton,
  ChannelHeaderSkeleton,
} from './channel-skeleton'
export type {
  ChannelItemSkeletonProps,
  ChannelCategorySkeletonProps,
  SidebarSkeletonProps,
} from './channel-skeleton'

// Channel list
export { ChannelList } from './channel-list'
export type { ChannelListAdapter, ChannelListProps } from './channel-list'

// Direct message list
export { DirectMessageList, DirectMessageItem } from './direct-message-list'
export type {
  DirectMessageListAdapter,
  DirectMessageListProps,
  DirectMessageItemProps,
} from './direct-message-list'

// Sidebar
export { Sidebar } from './sidebar'
export type { SidebarAdapter, SidebarProps } from './sidebar'

// Chat layout
export {
  ChatLayoutProvider,
  ChatLayout,
  ChatLayoutRoot,
  useChatLayout,
} from './chat-layout'
export type {
  ChatLayoutState,
  ChatLayoutActions,
  ChatLayoutProviderProps,
  ChatLayoutProps,
  ChatLayoutRootProps,
} from './chat-layout'
