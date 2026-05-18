/**
 * Channel Components
 *
 * Complete set of channel-related components for the nself-chat application.
 * These components implement a Slack/Discord/Telegram-like channel system.
 */

// Core Channel Components
export { ChannelList } from "./channel-list";
export { ChannelItem, type ChannelItemProps } from "./channel-item";
export { ChannelCategory, type ChannelCategoryProps } from "./channel-category";
export { ChannelHeader } from "./channel-header";

// Info and Members
export { ChannelInfoPanel } from "./channel-info-panel";
export { ChannelMembers } from "./channel-members";
export { PinnedMessages } from "./pinned-messages";

// Modals
export { ChannelSettingsModal } from "./channel-settings-modal";
export { CreateChannelModal } from "./create-channel-modal";
export { ChannelInviteModal } from "./channel-invite-modal";
export { CreateDmModal } from "./create-dm-modal";

// Direct Messages
export { DirectMessageList } from "./direct-message-list";

// Loading States
export {
  ChannelSkeleton,
  ChannelListSkeleton,
  ChannelHeaderSkeleton,
  ChannelInfoPanelSkeleton,
  ChannelMembersSkeleton,
} from "./channel-skeleton";
