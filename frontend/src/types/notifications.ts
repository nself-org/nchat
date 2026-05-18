/**
 * Notification Types - Shared types for notification plugin integration
 *
 * Aligns with the nself notifications plugin types
 */

// =============================================================================
// Core Types
// =============================================================================

export type NotificationChannel = "email" | "push" | "sms";

export type NotificationCategory =
  | "transactional"
  | "marketing"
  | "system"
  | "alert";

export type NotificationStatus =
  | "pending"
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "bounced";

export type QueueStatus = "pending" | "processing" | "completed" | "failed";

export type FrequencyType =
  | "immediate"
  | "hourly"
  | "daily"
  | "weekly"
  | "disabled";

// =============================================================================
// Template Types
// =============================================================================

export interface NotificationTemplate {
  id: string;
  name: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  push_title?: string;
  push_body?: string;
  sms_body?: string;
  metadata: Record<string, unknown>;
  variables: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariables {
  [key: string]: unknown;
}

// =============================================================================
// Preference Types
// =============================================================================

export interface QuietHours {
  start: string; // HH:MM format
  end: string; // HH:MM format
  timezone: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  enabled: boolean;
  frequency: FrequencyType;
  quiet_hours?: QuietHours;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserNotificationPreferences {
  email: {
    enabled: boolean;
    frequency: FrequencyType;
    categories: {
      transactional: boolean;
      marketing: boolean;
      system: boolean;
      alert: boolean;
    };
  };
  push: {
    enabled: boolean;
    frequency: FrequencyType;
    categories: {
      transactional: boolean;
      marketing: boolean;
      system: boolean;
      alert: boolean;
    };
  };
  sms: {
    enabled: boolean;
    frequency: FrequencyType;
    categories: {
      transactional: boolean;
      marketing: boolean;
      system: boolean;
      alert: boolean;
    };
  };
  quietHours?: QuietHours;
  digest: {
    enabled: boolean;
    frequency: "daily" | "weekly";
    time: string; // HH:MM format
  };
}

// =============================================================================
// Notification Message Types
// =============================================================================

export interface PluginNotification {
  id: string;
  user_id: string;
  template_id?: string;
  template_name?: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  status: NotificationStatus;
  priority: number;

  // Recipients
  recipient_email?: string;
  recipient_phone?: string;
  recipient_push_token?: string;

  // Content
  subject?: string;
  body_text?: string;
  body_html?: string;

  // Delivery
  provider?: string;
  provider_message_id?: string;

  // Timing
  scheduled_at?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;

  // Engagement
  opened_at?: string;
  clicked_at?: string;

  // Retries
  retry_count: number;
  max_retries: number;

  // Errors
  error_message?: string;
  error_code?: string;

  // Metadata
  metadata: Record<string, unknown>;
  tags: string[];

  created_at: string;
  updated_at: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface SendNotificationRequest {
  user_id: string;
  template?: string;
  channel: NotificationChannel;
  category?: NotificationCategory;
  to: {
    email?: string;
    phone?: string;
    push_token?: string;
  };
  content?: {
    subject?: string;
    body?: string;
    html?: string;
  };
  variables?: TemplateVariables;
  priority?: number;
  scheduled_at?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface SendNotificationResponse {
  success: boolean;
  notification_id?: string;
  error?: string;
  message?: string;
}

export interface GetNotificationResponse {
  notification: PluginNotification;
}

export interface ListNotificationsResponse {
  notifications: PluginNotification[];
  total: number;
  page: number;
  limit: number;
}

export interface MarkReadRequest {
  notification_ids: string[];
}

export interface MarkReadResponse {
  success: boolean;
  marked_count: number;
}

export interface UpdatePreferencesRequest {
  preferences: Partial<UserNotificationPreferences>;
}

export interface UpdatePreferencesResponse {
  success: boolean;
  preferences: UserNotificationPreferences;
}

export interface PushSubscribeRequest {
  subscription: {
    endpoint: string;
    expirationTime: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  device_id?: string;
  platform?: "web" | "pwa" | "ios" | "android";
}

export interface PushSubscribeResponse {
  success: boolean;
  subscription_id?: string;
  error?: string;
}

// =============================================================================
// Chat Event Types - Events that trigger notifications
// =============================================================================

export type ChatEventType =
  | "message.new"
  | "message.mention"
  | "message.reaction"
  | "thread.reply"
  | "dm.new"
  | "channel.invite"
  | "channel.join"
  | "channel.leave"
  | "reminder.due"
  | "announcement.new";

export interface ChatNotificationEvent {
  type: ChatEventType;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  target: {
    user_id: string;
    user_email?: string;
    user_push_token?: string;
  };
  data: {
    channel_id?: string;
    channel_name?: string;
    message_id?: string;
    thread_id?: string;
    message_preview?: string;
    action_url?: string;
    [key: string]: unknown;
  };
}

// =============================================================================
// Delivery Statistics Types
// =============================================================================

export interface DeliveryStats {
  channel: NotificationChannel;
  category: NotificationCategory;
  date: string;
  total: number;
  delivered: number;
  failed: number;
  bounced: number;
  delivery_rate: number;
}

export interface EngagementStats {
  channel: NotificationChannel;
  date: string;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  open_rate: number;
  click_rate: number;
}

// =============================================================================
// Service Configuration
// =============================================================================

export interface NotificationPluginConfig {
  /**
   * Base URL for the notifications plugin API
   */
  apiUrl: string;

  /**
   * VAPID public key for web push
   */
  vapidPublicKey?: string;

  /**
   * Whether to enable email notifications
   */
  emailEnabled: boolean;

  /**
   * Whether to enable push notifications
   */
  pushEnabled: boolean;

  /**
   * Whether to enable SMS notifications
   */
  smsEnabled: boolean;

  /**
   * Default notification category
   */
  defaultCategory: NotificationCategory;

  /**
   * Retry configuration
   */
  retry: {
    maxAttempts: number;
    delayMs: number;
  };
}

// =============================================================================
// Default Configuration
// =============================================================================

export const defaultNotificationConfig: NotificationPluginConfig = {
  apiUrl:
    process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL || "http://localhost:3102",
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  defaultCategory: "transactional",
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
  },
};

export const defaultUserPreferences: UserNotificationPreferences = {
  email: {
    enabled: true,
    frequency: "immediate",
    categories: {
      transactional: true,
      marketing: false,
      system: true,
      alert: true,
    },
  },
  push: {
    enabled: true,
    frequency: "immediate",
    categories: {
      transactional: true,
      marketing: false,
      system: true,
      alert: true,
    },
  },
  sms: {
    enabled: false,
    frequency: "immediate",
    categories: {
      transactional: true,
      marketing: false,
      system: false,
      alert: true,
    },
  },
  digest: {
    enabled: false,
    frequency: "daily",
    time: "09:00",
  },
};
