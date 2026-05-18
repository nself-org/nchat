/**
 * Presence Components - User presence and status UI components
 */

// Core indicators
export {
  PresenceIndicator,
  presenceIndicatorVariants,
} from "./PresenceIndicator";
export type { PresenceIndicatorProps } from "./PresenceIndicator";

// Status display
export {
  PresenceStatus,
  presenceStatusVariants,
  StatusBadge,
} from "./PresenceStatus";
export type { PresenceStatusProps, StatusBadgeProps } from "./PresenceStatus";

// Status picker
export {
  StatusPicker,
  CompactStatusPicker,
  StatusButton,
  default as StatusPickerDefault,
} from "./StatusPicker";
export type {
  StatusPickerProps,
  CompactStatusPickerProps,
  StatusButtonProps,
} from "./StatusPicker";

// Custom status
export {
  CustomStatus,
  CustomStatusBadge,
  CustomStatusPreview,
  default as CustomStatusDefault,
} from "./CustomStatus";
export type {
  CustomStatusProps,
  CustomStatusBadgeProps,
  CustomStatusPreviewProps,
} from "./CustomStatus";

// Custom status picker
export {
  CustomStatusPicker,
  QuickStatusPicker,
  default as CustomStatusPickerDefault,
} from "./CustomStatusPicker";
export type {
  CustomStatusPickerProps,
  QuickStatusPickerProps,
} from "./CustomStatusPicker";

// Duration
export {
  StatusDurationPicker,
  DurationBadge,
  DurationDisplay,
  default as StatusDurationDefault,
} from "./StatusDuration";
export type {
  StatusDurationPickerProps,
  DurationBadgeProps,
  DurationDisplayProps,
} from "./StatusDuration";

// Activity
export {
  ActivityStatus,
  ActivityListItem,
  ActivityGrid,
  ActivityBadge,
  AllActivities,
  default as ActivityStatusDefault,
} from "./ActivityStatus";
export type {
  ActivityStatusProps,
  ActivityListItemProps,
  ActivityGridProps,
  ActivityBadgeProps,
  AllActivitiesProps,
} from "./ActivityStatus";

// Typing indicator
export {
  TypingIndicator,
  TypingDots,
  InlineTypingIndicator,
  CompactTypingIndicator,
  default as TypingIndicatorDefault,
} from "./TypingIndicator";
export type {
  TypingIndicatorProps,
  TypingDotsProps,
  InlineTypingIndicatorProps,
  CompactTypingIndicatorProps,
} from "./TypingIndicator";

// Last seen
export {
  LastSeen,
  LastSeenBadge,
  LastActive,
  RelativeTime,
  default as LastSeenDefault,
} from "./LastSeen";
export type {
  LastSeenProps,
  LastSeenBadgeProps,
  LastActiveProps,
  RelativeTimeProps,
} from "./LastSeen";

// Online users
export {
  OnlineUsers,
  OnlineUsersCount,
  OnlineUsersAvatars,
  CompactOnlineUsers,
  default as OnlineUsersDefault,
} from "./OnlineUsers";
export type {
  OnlineUsersProps,
  OnlineUserItem,
  OnlineUsersCountProps,
  OnlineUsersAvatarsProps,
  CompactOnlineUsersProps,
} from "./OnlineUsers";

// Presence badge
export {
  PresenceBadge,
  presenceBadgeVariants,
  StatusPill,
  MiniBadge,
} from "./PresenceBadge";
export type {
  PresenceBadgeProps,
  StatusPillProps,
  MiniBadgeProps,
} from "./PresenceBadge";
