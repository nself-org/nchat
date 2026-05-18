/**
 * Analytics Event Schema
 *
 * Defines all analytics events, their properties, and validation logic.
 */

// ============================================================================
// Event Names
// ============================================================================

/**
 * Enumeration of all tracked analytics events
 */
export enum AnalyticsEvent {
  // Navigation
  PAGE_VIEW = "page_view",
  NAVIGATION = "navigation",

  // Authentication
  SIGN_IN = "sign_in",
  SIGN_OUT = "sign_out",
  SIGN_UP = "sign_up",
  PASSWORD_RESET = "password_reset",

  // Messaging
  MESSAGE_SENT = "message_sent",
  MESSAGE_EDITED = "message_edited",
  MESSAGE_DELETED = "message_deleted",
  REACTION_ADDED = "reaction_added",
  REACTION_REMOVED = "reaction_removed",

  // Channels
  CHANNEL_CREATED = "channel_created",
  CHANNEL_JOINED = "channel_joined",
  CHANNEL_LEFT = "channel_left",
  CHANNEL_ARCHIVED = "channel_archived",
  CHANNEL_UPDATED = "channel_updated",

  // Direct Messages
  DM_STARTED = "dm_started",
  DM_CLOSED = "dm_closed",

  // Threads
  THREAD_STARTED = "thread_started",
  THREAD_REPLIED = "thread_replied",

  // Calls
  CALL_STARTED = "call_started",
  CALL_ENDED = "call_ended",
  CALL_JOINED = "call_joined",
  CALL_LEFT = "call_left",
  SCREEN_SHARED = "screen_shared",

  // Features
  FEATURE_USED = "feature_used",
  SEARCH_PERFORMED = "search_performed",
  FILE_UPLOADED = "file_uploaded",
  FILE_DOWNLOADED = "file_downloaded",
  MENTION_USED = "mention_used",
  EMOJI_PICKER_USED = "emoji_picker_used",
  SHORTCUT_USED = "shortcut_used",

  // User Actions
  PROFILE_UPDATED = "profile_updated",
  SETTINGS_CHANGED = "settings_changed",
  THEME_CHANGED = "theme_changed",
  NOTIFICATION_PREFERENCE_CHANGED = "notification_preference_changed",

  // Errors
  ERROR_OCCURRED = "error_occurred",
  API_ERROR = "api_error",
  WEBSOCKET_ERROR = "websocket_error",

  // Performance
  PERFORMANCE_MARK = "performance_mark",
  SLOW_OPERATION = "slow_operation",

  // Session
  SESSION_START = "session_start",
  SESSION_END = "session_end",
  SESSION_RESUME = "session_resume",

  // Engagement
  APP_BACKGROUNDED = "app_backgrounded",
  APP_FOREGROUNDED = "app_foregrounded",
  IDLE_TIMEOUT = "idle_timeout",
}

// ============================================================================
// Event Categories
// ============================================================================

/**
 * Categorization of events for filtering and reporting
 */
export enum EventCategory {
  NAVIGATION = "navigation",
  AUTHENTICATION = "authentication",
  MESSAGING = "messaging",
  CHANNELS = "channels",
  DIRECT_MESSAGES = "direct_messages",
  THREADS = "threads",
  CALLS = "calls",
  FEATURES = "features",
  USER_ACTIONS = "user_actions",
  ERRORS = "errors",
  PERFORMANCE = "performance",
  SESSION = "session",
  ENGAGEMENT = "engagement",
}

/**
 * Mapping of events to their categories
 */
export const eventCategoryMap: Record<AnalyticsEvent, EventCategory> = {
  [AnalyticsEvent.PAGE_VIEW]: EventCategory.NAVIGATION,
  [AnalyticsEvent.NAVIGATION]: EventCategory.NAVIGATION,
  [AnalyticsEvent.SIGN_IN]: EventCategory.AUTHENTICATION,
  [AnalyticsEvent.SIGN_OUT]: EventCategory.AUTHENTICATION,
  [AnalyticsEvent.SIGN_UP]: EventCategory.AUTHENTICATION,
  [AnalyticsEvent.PASSWORD_RESET]: EventCategory.AUTHENTICATION,
  [AnalyticsEvent.MESSAGE_SENT]: EventCategory.MESSAGING,
  [AnalyticsEvent.MESSAGE_EDITED]: EventCategory.MESSAGING,
  [AnalyticsEvent.MESSAGE_DELETED]: EventCategory.MESSAGING,
  [AnalyticsEvent.REACTION_ADDED]: EventCategory.MESSAGING,
  [AnalyticsEvent.REACTION_REMOVED]: EventCategory.MESSAGING,
  [AnalyticsEvent.CHANNEL_CREATED]: EventCategory.CHANNELS,
  [AnalyticsEvent.CHANNEL_JOINED]: EventCategory.CHANNELS,
  [AnalyticsEvent.CHANNEL_LEFT]: EventCategory.CHANNELS,
  [AnalyticsEvent.CHANNEL_ARCHIVED]: EventCategory.CHANNELS,
  [AnalyticsEvent.CHANNEL_UPDATED]: EventCategory.CHANNELS,
  [AnalyticsEvent.DM_STARTED]: EventCategory.DIRECT_MESSAGES,
  [AnalyticsEvent.DM_CLOSED]: EventCategory.DIRECT_MESSAGES,
  [AnalyticsEvent.THREAD_STARTED]: EventCategory.THREADS,
  [AnalyticsEvent.THREAD_REPLIED]: EventCategory.THREADS,
  [AnalyticsEvent.CALL_STARTED]: EventCategory.CALLS,
  [AnalyticsEvent.CALL_ENDED]: EventCategory.CALLS,
  [AnalyticsEvent.CALL_JOINED]: EventCategory.CALLS,
  [AnalyticsEvent.CALL_LEFT]: EventCategory.CALLS,
  [AnalyticsEvent.SCREEN_SHARED]: EventCategory.CALLS,
  [AnalyticsEvent.FEATURE_USED]: EventCategory.FEATURES,
  [AnalyticsEvent.SEARCH_PERFORMED]: EventCategory.FEATURES,
  [AnalyticsEvent.FILE_UPLOADED]: EventCategory.FEATURES,
  [AnalyticsEvent.FILE_DOWNLOADED]: EventCategory.FEATURES,
  [AnalyticsEvent.MENTION_USED]: EventCategory.FEATURES,
  [AnalyticsEvent.EMOJI_PICKER_USED]: EventCategory.FEATURES,
  [AnalyticsEvent.SHORTCUT_USED]: EventCategory.FEATURES,
  [AnalyticsEvent.PROFILE_UPDATED]: EventCategory.USER_ACTIONS,
  [AnalyticsEvent.SETTINGS_CHANGED]: EventCategory.USER_ACTIONS,
  [AnalyticsEvent.THEME_CHANGED]: EventCategory.USER_ACTIONS,
  [AnalyticsEvent.NOTIFICATION_PREFERENCE_CHANGED]: EventCategory.USER_ACTIONS,
  [AnalyticsEvent.ERROR_OCCURRED]: EventCategory.ERRORS,
  [AnalyticsEvent.API_ERROR]: EventCategory.ERRORS,
  [AnalyticsEvent.WEBSOCKET_ERROR]: EventCategory.ERRORS,
  [AnalyticsEvent.PERFORMANCE_MARK]: EventCategory.PERFORMANCE,
  [AnalyticsEvent.SLOW_OPERATION]: EventCategory.PERFORMANCE,
  [AnalyticsEvent.SESSION_START]: EventCategory.SESSION,
  [AnalyticsEvent.SESSION_END]: EventCategory.SESSION,
  [AnalyticsEvent.SESSION_RESUME]: EventCategory.SESSION,
  [AnalyticsEvent.APP_BACKGROUNDED]: EventCategory.ENGAGEMENT,
  [AnalyticsEvent.APP_FOREGROUNDED]: EventCategory.ENGAGEMENT,
  [AnalyticsEvent.IDLE_TIMEOUT]: EventCategory.ENGAGEMENT,
};

// ============================================================================
// Event Property Types
// ============================================================================

/**
 * Base event properties included in every event
 */
export interface BaseEventProperties {
  timestamp: number;
  sessionId: string;
  userId?: string;
  anonymousId?: string;
  platform: "web" | "desktop" | "mobile";
  appVersion: string;
  userAgent?: string;
}

/**
 * Page view event properties
 */
export interface PageViewProperties {
  path: string;
  title: string;
  referrer?: string;
  previousPath?: string;
  queryParams?: Record<string, string>;
  loadTime?: number;
}

/**
 * Navigation event properties
 */
export interface NavigationProperties {
  from: string;
  to: string;
  method: "click" | "keyboard" | "browser" | "programmatic";
}

/**
 * Authentication event properties
 */
export interface AuthenticationProperties {
  method: "email" | "google" | "github" | "magic_link" | "idme";
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Message sent event properties
 */
export interface MessageSentProperties {
  channelId: string;
  channelType: "public" | "private" | "direct";
  hasAttachment: boolean;
  hasEmoji: boolean;
  hasMention: boolean;
  hasLink: boolean;
  length: number;
  isReply: boolean;
  isEdited?: boolean;
}

/**
 * Message edited event properties
 */
export interface MessageEditedProperties {
  channelId: string;
  messageId: string;
  previousLength: number;
  newLength: number;
  timeSinceCreation: number;
}

/**
 * Message deleted event properties
 */
export interface MessageDeletedProperties {
  channelId: string;
  messageId: string;
  timeSinceCreation: number;
  hadAttachments: boolean;
  hadReactions: boolean;
}

/**
 * Reaction event properties
 */
export interface ReactionProperties {
  channelId: string;
  messageId: string;
  emoji: string;
  emojiCategory?: string;
}

/**
 * Channel event properties
 */
export interface ChannelProperties {
  channelId: string;
  channelName: string;
  channelType: "public" | "private" | "direct";
  memberCount?: number;
}

/**
 * Thread event properties
 */
export interface ThreadProperties {
  channelId: string;
  threadId: string;
  parentMessageId: string;
  replyCount?: number;
}

/**
 * Call event properties
 */
export interface CallProperties {
  callId: string;
  channelId: string;
  callType: "audio" | "video";
  participantCount?: number;
  duration?: number;
  hasScreenShare?: boolean;
}

/**
 * Feature usage event properties
 */
export interface FeatureUsedProperties {
  featureName: string;
  featureCategory: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Search event properties
 */
export interface SearchProperties {
  query: string;
  queryLength: number;
  filters?: {
    channels?: string[];
    users?: string[];
    dateRange?: string;
    messageType?: string;
  };
  resultCount: number;
  selectedResultIndex?: number;
  searchDuration: number;
}

/**
 * File event properties
 */
export interface FileProperties {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  channelId?: string;
}

/**
 * Error event properties
 */
export interface ErrorProperties {
  errorType: string;
  errorCode?: string;
  errorMessage: string;
  stackTrace?: string;
  componentName?: string;
  actionName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * API error event properties
 */
export interface ApiErrorProperties {
  endpoint: string;
  method: string;
  statusCode: number;
  errorMessage: string;
  requestDuration: number;
  requestId?: string;
}

/**
 * Performance event properties
 */
export interface PerformanceProperties {
  operationName: string;
  duration: number;
  threshold?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Session event properties
 */
export interface SessionProperties {
  sessionId: string;
  duration?: number;
  pageViewCount?: number;
  eventCount?: number;
  startTime?: number;
  endReason?: "user_logout" | "timeout" | "navigation" | "close";
}

/**
 * Settings change event properties
 */
export interface SettingsChangedProperties {
  settingCategory: string;
  settingName: string;
  previousValue?: unknown;
  newValue: unknown;
}

/**
 * Theme change event properties
 */
export interface ThemeChangedProperties {
  previousTheme: string;
  newTheme: string;
  colorScheme: "light" | "dark" | "system";
}

/**
 * Shortcut event properties
 */
export interface ShortcutUsedProperties {
  shortcutKey: string;
  action: string;
  context: string;
}

// ============================================================================
// Event Properties Map
// ============================================================================

/**
 * Maps event types to their corresponding property types
 */
export interface EventPropertiesMap {
  [AnalyticsEvent.PAGE_VIEW]: PageViewProperties;
  [AnalyticsEvent.NAVIGATION]: NavigationProperties;
  [AnalyticsEvent.SIGN_IN]: AuthenticationProperties;
  [AnalyticsEvent.SIGN_OUT]: Record<string, never>;
  [AnalyticsEvent.SIGN_UP]: AuthenticationProperties;
  [AnalyticsEvent.PASSWORD_RESET]: { success: boolean; errorMessage?: string };
  [AnalyticsEvent.MESSAGE_SENT]: MessageSentProperties;
  [AnalyticsEvent.MESSAGE_EDITED]: MessageEditedProperties;
  [AnalyticsEvent.MESSAGE_DELETED]: MessageDeletedProperties;
  [AnalyticsEvent.REACTION_ADDED]: ReactionProperties;
  [AnalyticsEvent.REACTION_REMOVED]: ReactionProperties;
  [AnalyticsEvent.CHANNEL_CREATED]: ChannelProperties;
  [AnalyticsEvent.CHANNEL_JOINED]: ChannelProperties;
  [AnalyticsEvent.CHANNEL_LEFT]: ChannelProperties;
  [AnalyticsEvent.CHANNEL_ARCHIVED]: ChannelProperties;
  [AnalyticsEvent.CHANNEL_UPDATED]: ChannelProperties & {
    updatedFields: string[];
  };
  [AnalyticsEvent.DM_STARTED]: { recipientId: string };
  [AnalyticsEvent.DM_CLOSED]: { recipientId: string; duration?: number };
  [AnalyticsEvent.THREAD_STARTED]: ThreadProperties;
  [AnalyticsEvent.THREAD_REPLIED]: ThreadProperties;
  [AnalyticsEvent.CALL_STARTED]: CallProperties;
  [AnalyticsEvent.CALL_ENDED]: CallProperties;
  [AnalyticsEvent.CALL_JOINED]: CallProperties;
  [AnalyticsEvent.CALL_LEFT]: CallProperties;
  [AnalyticsEvent.SCREEN_SHARED]: CallProperties;
  [AnalyticsEvent.FEATURE_USED]: FeatureUsedProperties;
  [AnalyticsEvent.SEARCH_PERFORMED]: SearchProperties;
  [AnalyticsEvent.FILE_UPLOADED]: FileProperties;
  [AnalyticsEvent.FILE_DOWNLOADED]: FileProperties;
  [AnalyticsEvent.MENTION_USED]: {
    mentionType: "user" | "channel" | "everyone";
    targetId?: string;
  };
  [AnalyticsEvent.EMOJI_PICKER_USED]: {
    selectedEmoji: string;
    searchQuery?: string;
  };
  [AnalyticsEvent.SHORTCUT_USED]: ShortcutUsedProperties;
  [AnalyticsEvent.PROFILE_UPDATED]: { updatedFields: string[] };
  [AnalyticsEvent.SETTINGS_CHANGED]: SettingsChangedProperties;
  [AnalyticsEvent.THEME_CHANGED]: ThemeChangedProperties;
  [AnalyticsEvent.NOTIFICATION_PREFERENCE_CHANGED]: {
    notificationType: string;
    enabled: boolean;
  };
  [AnalyticsEvent.ERROR_OCCURRED]: ErrorProperties;
  [AnalyticsEvent.API_ERROR]: ApiErrorProperties;
  [AnalyticsEvent.WEBSOCKET_ERROR]: {
    errorCode: string;
    errorMessage: string;
    reconnectAttempts: number;
  };
  [AnalyticsEvent.PERFORMANCE_MARK]: PerformanceProperties;
  [AnalyticsEvent.SLOW_OPERATION]: PerformanceProperties;
  [AnalyticsEvent.SESSION_START]: SessionProperties;
  [AnalyticsEvent.SESSION_END]: SessionProperties;
  [AnalyticsEvent.SESSION_RESUME]: SessionProperties;
  [AnalyticsEvent.APP_BACKGROUNDED]: { timestamp: number };
  [AnalyticsEvent.APP_FOREGROUNDED]: {
    timestamp: number;
    backgroundDuration: number;
  };
  [AnalyticsEvent.IDLE_TIMEOUT]: { idleDuration: number };
}

// ============================================================================
// Tracked Event Type
// ============================================================================

/**
 * Complete tracked event including base properties
 */
export interface TrackedEvent<T extends AnalyticsEvent = AnalyticsEvent> {
  id: string;
  name: T;
  category: EventCategory;
  properties: T extends keyof EventPropertiesMap
    ? EventPropertiesMap[T]
    : Record<string, unknown>;
  base: BaseEventProperties;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Required fields for specific event types
 */
const requiredFieldsMap: Partial<Record<AnalyticsEvent, string[]>> = {
  [AnalyticsEvent.PAGE_VIEW]: ["path", "title"],
  [AnalyticsEvent.MESSAGE_SENT]: ["channelId", "channelType", "length"],
  [AnalyticsEvent.CHANNEL_CREATED]: ["channelId", "channelName", "channelType"],
  [AnalyticsEvent.SEARCH_PERFORMED]: [
    "query",
    "queryLength",
    "resultCount",
    "searchDuration",
  ],
  [AnalyticsEvent.ERROR_OCCURRED]: ["errorType", "errorMessage"],
  [AnalyticsEvent.API_ERROR]: [
    "endpoint",
    "method",
    "statusCode",
    "errorMessage",
    "requestDuration",
  ],
  [AnalyticsEvent.FILE_UPLOADED]: [
    "fileId",
    "fileName",
    "fileType",
    "fileSize",
  ],
};

/**
 * Validates that an event name is a known analytics event
 */
export function isValidEventName(name: string): name is AnalyticsEvent {
  return Object.values(AnalyticsEvent).includes(name as AnalyticsEvent);
}

/**
 * Gets the category for an event
 */
export function getEventCategory(event: AnalyticsEvent): EventCategory {
  return eventCategoryMap[event];
}

/**
 * Validates event properties against required fields
 */
export function validateEventProperties<T extends AnalyticsEvent>(
  event: T,
  properties: Record<string, unknown>,
): { valid: boolean; missingFields: string[] } {
  const requiredFields = requiredFieldsMap[event] || [];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (properties[field] === undefined || properties[field] === null) {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validates an entire tracked event
 */
export function validateTrackedEvent(event: TrackedEvent): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate event id
  if (!event.id || typeof event.id !== "string") {
    errors.push("Event must have a valid string id");
  }

  // Validate event name
  if (!isValidEventName(event.name)) {
    errors.push(`Invalid event name: ${event.name}`);
  }

  // Validate category matches
  if (event.category !== eventCategoryMap[event.name]) {
    errors.push(
      `Event category mismatch: expected ${eventCategoryMap[event.name]}, got ${event.category}`,
    );
  }

  // Validate base properties
  if (!event.base) {
    errors.push("Event must have base properties");
  } else {
    if (typeof event.base.timestamp !== "number" || event.base.timestamp <= 0) {
      errors.push("Event must have a valid timestamp");
    }
    if (!event.base.sessionId) {
      errors.push("Event must have a sessionId");
    }
    if (!event.base.platform) {
      errors.push("Event must have a platform");
    }
    if (!event.base.appVersion) {
      errors.push("Event must have an appVersion");
    }
  }

  // Validate event-specific properties
  const { valid, missingFields } = validateEventProperties(
    event.name,
    event.properties as Record<string, unknown>,
  );
  if (!valid) {
    errors.push(
      `Missing required fields for ${event.name}: ${missingFields.join(", ")}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Event Creation Helpers
// ============================================================================

/**
 * Creates a unique event ID
 */
export function createEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `evt_${timestamp}_${random}`;
}

/**
 * Gets all events in a category
 */
export function getEventsByCategory(category: EventCategory): AnalyticsEvent[] {
  return Object.entries(eventCategoryMap)
    .filter(([, cat]) => cat === category)
    .map(([event]) => event as AnalyticsEvent);
}

/**
 * Checks if an event is an error event
 */
export function isErrorEvent(event: AnalyticsEvent): boolean {
  return eventCategoryMap[event] === EventCategory.ERRORS;
}

/**
 * Checks if an event is a performance event
 */
export function isPerformanceEvent(event: AnalyticsEvent): boolean {
  return eventCategoryMap[event] === EventCategory.PERFORMANCE;
}

/**
 * Checks if an event is a session event
 */
export function isSessionEvent(event: AnalyticsEvent): boolean {
  return eventCategoryMap[event] === EventCategory.SESSION;
}
