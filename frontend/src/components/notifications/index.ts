/**
 * Notification Components - nself-chat
 *
 * Complete notification system for Slack/Discord/Telegram-style chat application.
 *
 * Components:
 * - NotificationCenter: Main notification panel with filters
 * - NotificationItem: Individual notification display
 * - NotificationBell: Header bell icon with badge
 * - NotificationToast: Toast notifications
 * - NotificationPreferences: Settings page
 * - ChannelNotificationSettings: Per-channel settings
 * - MentionBadge: Red mention count badge
 * - UnreadBadge: Simple unread indicator
 * - NotificationEmpty: Empty state display
 *
 * Hooks (in this folder):
 * - useDesktopNotification: Desktop notification API
 * - useNotificationSound: Sound playback
 *
 * Hooks (in /hooks folder):
 * - useNotifications: Main notification hook
 * - useUnreadCounts: Unread count tracking
 *
 * Store:
 * - useNotificationStore: Zustand store for notification state
 */

// Main components
export {
  NotificationCenter,
  NotificationCenterDropdown,
  type NotificationCenterProps,
} from "./notification-center";

export {
  NotificationItem,
  type NotificationItemProps,
} from "./notification-item";

export {
  NotificationBell,
  type NotificationBellProps,
} from "./notification-bell";

export {
  NotificationToast,
  NotificationToastContainer,
  type NotificationToastProps,
  type NotificationToastContainerProps,
  type ToastItem,
} from "./notification-toast";

// Settings components
export {
  NotificationPreferences,
  type NotificationPreferencesProps,
} from "./notification-preferences";

export {
  ChannelNotificationSettings,
  type ChannelNotificationSettingsProps,
} from "./channel-notification-settings";

// Badge components
export { MentionBadge, type MentionBadgeProps } from "./mention-badge";

export { UnreadBadge, type UnreadBadgeProps } from "./unread-badge";

// Empty state
export {
  NotificationEmpty,
  NotificationFilteredEmpty,
  type NotificationEmptyProps,
} from "./notification-empty";

// Desktop notification hook and component
export {
  useDesktopNotification,
  DesktopNotificationPermissionButton,
  type UseDesktopNotificationReturn,
  type DesktopNotificationOptions,
  type DesktopNotificationPermissionButtonProps,
} from "./desktop-notification";

// Sound hook and components
export {
  useNotificationSound,
  NotificationSoundPlayer,
  SoundVolumeControl,
  type UseNotificationSoundReturn,
  type NotificationSoundOptions,
  type NotificationSoundPlayerProps,
  type SoundVolumeControlProps,
} from "./notification-sound";

// Types
export type {
  NotificationType,
  NotificationPriority,
  ChannelNotificationLevel,
  NotificationActor,
  Notification,
  ChannelNotificationSettings as ChannelNotificationSettingsType,
  DoNotDisturbSchedule,
  NotificationPreferences as NotificationPreferencesType,
  UnreadCounts,
  NotificationFilterTab,
  NotificationFilterTabConfig,
} from "./types";

// Re-export hooks from /hooks folder for convenience
export {
  useNotifications,
  type UseNotificationsOptions,
  type UseNotificationsReturn,
} from "@/hooks/use-notifications";
export {
  useUnreadCounts,
  useChannelUnread,
  type UseUnreadCountsOptions,
  type UseUnreadCountsReturn,
  type ChannelUnreadInfo,
} from "@/hooks/use-unread-counts";

// Re-export store for direct access
export {
  useNotificationStore,
  selectUnreadTotal,
  selectUnreadMentions,
  selectChannelUnread,
  selectIsChannelMuted,
  selectNotificationPreferences,
  selectHasUnread,
  type NotificationStore,
  type NotificationState,
  type NotificationActions,
} from "@/stores/notification-store";

// Plugin integration components
export {
  NotificationBell as NotificationBellNew,
  type NotificationBellProps as NotificationBellNewProps,
} from "./NotificationBell";

export {
  NotificationList,
  type NotificationListProps,
} from "./NotificationList";

export {
  NotificationPreferences as NotificationPreferencesNew,
  type NotificationPreferencesProps as NotificationPreferencesNewProps,
} from "./NotificationPreferences";

// Plugin integration hooks
export {
  useNotificationPreferences,
  type UseNotificationPreferencesOptions,
  type UseNotificationPreferencesReturn,
} from "@/hooks/use-notification-preferences";

export {
  usePushSubscription,
  type UsePushSubscriptionOptions,
  type UsePushSubscriptionReturn,
} from "@/hooks/use-push-subscription";

// Plugin integration services
export {
  NotificationService,
  getNotificationService,
  PreferenceService,
  getPreferenceService,
  TemplateService,
  getTemplateService,
  NotificationEventDispatcher,
  getNotificationEventDispatcher,
} from "@/services/notifications";

// Plugin types
export type {
  NotificationChannel,
  NotificationCategory,
  NotificationStatus,
  UserNotificationPreferences,
  QuietHours,
  ChatEventType,
  ChatNotificationEvent,
  SendNotificationRequest,
  SendNotificationResponse,
} from "@/types/notifications";
