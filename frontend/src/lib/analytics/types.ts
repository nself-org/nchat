/**
 * Analytics Types and Interfaces
 *
 * Shared types for Firebase Analytics and custom event tracking
 */

export type AnalyticsProvider = "firebase" | "sentry" | "custom" | "none";

export type ConsentStatus = {
  analytics: boolean;
  performance: boolean;
  errorTracking: boolean;
  crashReporting: boolean;
  updatedAt: string;
};

export type UserProperties = {
  userId?: string;
  email?: string;
  username?: string;
  role?: string;
  plan?: string;
  organizationId?: string;
  platform: "web" | "ios" | "android" | "electron" | "tauri";
  appVersion: string;
  deviceModel?: string;
  osVersion?: string;
  locale?: string;
  timezone?: string;
};

export type ScreenViewEvent = {
  screen_name: string;
  screen_class?: string;
  previous_screen?: string;
};

// Standard event names following Firebase Analytics conventions
export enum StandardEvents {
  // App lifecycle
  APP_OPEN = "app_open",
  APP_BACKGROUND = "app_background",
  APP_FOREGROUND = "app_foreground",
  APP_UPDATE = "app_update",

  // Authentication
  LOGIN = "login",
  LOGOUT = "logout",
  SIGN_UP = "sign_up",
  LOGIN_FAILED = "login_failed",

  // User actions
  SEARCH = "search",
  SHARE = "share",
  SELECT_CONTENT = "select_content",
  VIEW_ITEM = "view_item",
  VIEW_ITEM_LIST = "view_item_list",

  // Chat specific
  MESSAGE_SENT = "message_sent",
  MESSAGE_EDITED = "message_edited",
  MESSAGE_DELETED = "message_deleted",
  REACTION_ADDED = "reaction_added",
  THREAD_CREATED = "thread_created",
  THREAD_REPLIED = "thread_replied",

  // Channels
  CHANNEL_CREATED = "channel_created",
  CHANNEL_JOINED = "channel_joined",
  CHANNEL_LEFT = "channel_left",
  CHANNEL_ARCHIVED = "channel_archived",

  // Direct messages
  DM_STARTED = "dm_started",
  DM_SENT = "dm_sent",

  // Files
  FILE_UPLOADED = "file_uploaded",
  FILE_DOWNLOADED = "file_downloaded",
  FILE_SHARED = "file_shared",

  // Calls
  CALL_STARTED = "call_started",
  CALL_JOINED = "call_joined",
  CALL_ENDED = "call_ended",
  CALL_FAILED = "call_failed",

  // Settings
  SETTINGS_CHANGED = "settings_changed",
  THEME_CHANGED = "theme_changed",
  NOTIFICATION_SETTINGS_CHANGED = "notification_settings_changed",

  // Search
  SEARCH_PERFORMED = "search_performed",
  SEARCH_RESULT_CLICKED = "search_result_clicked",
  ADVANCED_SEARCH_USED = "advanced_search_used",

  // Moderation
  CONTENT_FLAGGED = "content_flagged",
  CONTENT_MODERATED = "content_moderated",
  USER_BLOCKED = "user_blocked",

  // Performance
  SCREEN_LOAD_TIME = "screen_load_time",
  API_CALL = "api_call",
  API_ERROR = "api_error",

  // Errors
  ERROR_OCCURRED = "error_occurred",
  CRASH = "crash",

  // Engagement
  SESSION_START = "session_start",
  SESSION_END = "session_end",
  TUTORIAL_BEGIN = "tutorial_begin",
  TUTORIAL_COMPLETE = "tutorial_complete",
}

export type EventParams = {
  [key: string]: string | number | boolean | undefined;
};

export type MessageSentEvent = {
  channel_id: string;
  channel_type: "public" | "private" | "dm";
  message_length: number;
  has_attachment: boolean;
  has_mention: boolean;
  has_emoji: boolean;
  is_thread: boolean;
};

export type SearchEvent = {
  search_term: string;
  search_type: "basic" | "advanced" | "semantic";
  results_count: number;
  filter_count?: number;
  time_taken_ms: number;
};

export type ChannelEvent = {
  channel_id: string;
  channel_type: "public" | "private";
  member_count?: number;
  is_default?: boolean;
};

export type FileEvent = {
  file_type: string;
  file_size: number;
  upload_duration_ms?: number;
  channel_id?: string;
};

export type CallEvent = {
  call_type: "audio" | "video" | "screen_share";
  participant_count: number;
  duration_seconds?: number;
  ended_reason?: "normal" | "error" | "timeout";
};

export type PerformanceEvent = {
  metric_name: string;
  duration_ms: number;
  success: boolean;
  error_message?: string;
};

export type ErrorEvent = {
  error_type: string;
  error_message: string;
  error_stack?: string;
  fatal: boolean;
  context?: string;
};

// Analytics configuration
export type AnalyticsConfig = {
  enabled: boolean;
  providers: AnalyticsProvider[];
  firebase?: {
    measurementId: string;
    appId: string;
    apiKey: string;
  };
  sentry?: {
    dsn: string;
    tracesSampleRate: number;
    replaysSampleRate: number;
  };
  consent: ConsentStatus;
  debugMode: boolean;
  allowedDomains?: string[];
};

// Privacy settings
export type PrivacySettings = {
  optOutAnalytics: boolean;
  optOutPerformance: boolean;
  optOutErrorTracking: boolean;
  optOutCrashReporting: boolean;
  anonymizeIp: boolean;
  anonymizeUserId: boolean;
};

// Session tracking
export type SessionData = {
  sessionId: string;
  startTime: number;
  lastActivityTime: number;
  screenViews: number;
  events: number;
  errors: number;
};

// Retention metrics
export type RetentionMetrics = {
  userId: string;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  totalEvents: number;
  daysActive: number;
  averageSessionDuration: number;
};

// Business metrics
export type BusinessMetrics = {
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
  messagesSent: number;
  channelsCreated: number;
  callsStarted: number;
  filesShared: number;
  searchesPerformed: number;
  averageEngagementScore: number;
};
