/**
 * User Components
 *
 * Complete set of user and profile-related React components for nchat.
 * Includes avatars, status displays, profile cards, modals, and user management.
 */

// Avatar components
export { UserAvatar, UserAvatarGroup, userAvatarVariants } from "./user-avatar";
export type { UserAvatarProps, UserAvatarGroupProps } from "./user-avatar";

// Presence indicator
export { UserPresenceDot, presenceDotVariants } from "./user-presence-dot";
export type { UserPresenceDotProps } from "./user-presence-dot";

// Status display
export { UserStatus, UserStatusBadge, userStatusVariants } from "./user-status";
export type { UserStatusProps, UserStatusBadgeProps } from "./user-status";

// Role badge
export { RoleBadge, roleBadgeVariants } from "./role-badge";
export type { RoleBadgeProps } from "./role-badge";

// Profile card (hover card)
export { UserProfileCard, UserProfileCardTrigger } from "./user-profile-card";
export type {
  UserProfileCardProps,
  UserProfileCardTriggerProps,
} from "./user-profile-card";

// Profile modal
export { UserProfileModal } from "./user-profile-modal";
export type {
  UserProfileModalProps,
  SharedChannel,
  SharedFile,
} from "./user-profile-modal";

// Edit profile form
export { EditProfileForm } from "./edit-profile-form";
export type {
  EditProfileFormProps,
  ProfileFormData,
} from "./edit-profile-form";

// Set status modal
export { SetStatusModal } from "./set-status-modal";
export type { SetStatusModalProps } from "./set-status-modal";

// Presence selector
export { PresenceSelector } from "./presence-selector";
export type { PresenceSelectorProps } from "./presence-selector";

// Member list item
export {
  MemberListItem,
  MemberListSection,
  memberListItemVariants,
} from "./member-list-item";
export type {
  MemberListItemProps,
  MemberListSectionProps,
} from "./member-list-item";

// User search
export { UserSearch, UserSearchInput } from "./user-search";
export type { UserSearchProps, UserSearchInputProps } from "./user-search";

// User mention
export {
  UserMention,
  EveryoneMention,
  HereMention,
  ChannelMention,
  userMentionVariants,
  parseMentions,
} from "./user-mention";
export type {
  UserMentionProps,
  EveryoneMentionProps,
  HereMentionProps,
  ChannelMentionProps,
  ParsedMention,
} from "./user-mention";

// Settings page
export { UserSettingsPage } from "./user-settings-page";
export type { UserSettingsPageProps } from "./user-settings-page";

// Block user modal
export { BlockUserModal } from "./block-user-modal";
export type { BlockUserModalProps } from "./block-user-modal";

// Blocked users list
export { BlockedUsersList } from "./blocked-users-list";
export type { BlockedUsersListProps } from "./blocked-users-list";

// Report user modal
export { ReportUserModal } from "./report-user-modal";
export type { ReportUserModalProps } from "./report-user-modal";
