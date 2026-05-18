/**
 * Notification component types for nself-chat
 */

export type {
  NotificationType,
  NotificationPriority,
  ChannelNotificationLevel,
  NotificationActor,
  Notification,
  ChannelNotificationSettings,
  DoNotDisturbSchedule,
  NotificationPreferences,
  UnreadCounts,
} from "@/stores/notification-store";

// Component-specific types

export interface NotificationBellProps {
  className?: string;
  showBadge?: boolean;
  onClick?: () => void;
}

export interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    priority?: string;
    title: string;
    body: string;
    actor?: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
    channelId?: string;
    channelName?: string;
    messageId?: string;
    threadId?: string;
    isRead: boolean;
    createdAt: string;
    actionUrl?: string;
  };
  onRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onClick?: (id: string) => void;
  showDismiss?: boolean;
  compact?: boolean;
}

export interface NotificationCenterProps {
  className?: string;
  onClose?: () => void;
  onSettingsClick?: () => void;
}

export interface NotificationPreferencesProps {
  className?: string;
  onSave?: () => void;
}

export interface ChannelNotificationSettingsProps {
  channelId: string;
  channelName: string;
  className?: string;
  onSave?: () => void;
}

export interface NotificationToastProps {
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    actor?: {
      name: string;
      avatarUrl?: string;
    };
  };
  duration?: number;
  onClose?: () => void;
  onClick?: () => void;
}

export interface NotificationSoundProps {
  enabled?: boolean;
  volume?: number;
  soundUrl?: string;
}

export interface MentionBadgeProps {
  count: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  max?: number;
}

export interface UnreadBadgeProps {
  count?: number;
  showDot?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export interface NotificationEmptyProps {
  className?: string;
  title?: string;
  description?: string;
  showIcon?: boolean;
}

export type NotificationFilterTab =
  | "all"
  | "mentions"
  | "threads"
  | "reactions"
  | "unread";

export interface NotificationFilterTabConfig {
  id: NotificationFilterTab;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}
