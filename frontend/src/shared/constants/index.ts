/**
 * Shared constants for nself-chat (web and mobile)
 */

// App info
export const APP_NAME = "nchat";
export const APP_DISPLAY_NAME = "nChat";
export const APP_VERSION = "0.9.1";

// API endpoints
export const API_VERSION = "v1";

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// Message limits
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

// File types
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];
export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
];
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

export const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

// Image dimensions
export const MAX_IMAGE_WIDTH = 4096;
export const MAX_IMAGE_HEIGHT = 4096;
export const THUMBNAIL_SIZE = 200;
export const AVATAR_SIZE = 128;

// Voice recording
export const MAX_VOICE_DURATION = 60 * 5; // 5 minutes
export const VOICE_SAMPLE_RATE = 44100;
export const VOICE_BIT_RATE = 128000;

// Real-time
export const TYPING_DEBOUNCE_MS = 500;
export const TYPING_TIMEOUT_MS = 3000;
export const PRESENCE_HEARTBEAT_MS = 30000;
export const RECONNECT_DELAY_MS = 1000;
export const MAX_RECONNECT_ATTEMPTS = 10;

// Status/Stories
export const STATUS_EXPIRY_HOURS = 24;
export const MAX_STATUS_LENGTH = 700;

// Search
export const SEARCH_DEBOUNCE_MS = 300;
export const MIN_SEARCH_LENGTH = 2;
export const MAX_SEARCH_RESULTS = 50;

// Cache
export const CACHE_TTL_SHORT = 60 * 1000; // 1 minute
export const CACHE_TTL_MEDIUM = 5 * 60 * 1000; // 5 minutes
export const CACHE_TTL_LONG = 30 * 60 * 1000; // 30 minutes

// User roles
export const USER_ROLES = [
  "owner",
  "admin",
  "moderator",
  "member",
  "guest",
] as const;

// User statuses
export const USER_STATUSES = ["online", "offline", "away", "dnd"] as const;

// Channel types
export const CHANNEL_TYPES = ["public", "private", "direct", "group"] as const;

// Message types
export const MESSAGE_TYPES = [
  "text",
  "image",
  "video",
  "audio",
  "file",
  "system",
] as const;

// Notification types
export const NOTIFICATION_TYPES = [
  "message",
  "mention",
  "reaction",
  "thread_reply",
  "channel_invite",
  "direct_message",
  "system",
] as const;

// Call types
export const CALL_TYPES = ["audio", "video"] as const;

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  SERVER_ERROR: "SERVER_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
} as const;

// Storage keys
export const STORAGE_KEYS = {
  // sast-ignore: HARDCODED_CREDENTIAL -- these are localStorage key name strings, not credential values
  AUTH_TOKEN: "@nchat/auth_token",
  REFRESH_TOKEN: "@nchat/refresh_token",
  USER: "@nchat/user",
  APP_CONFIG: "@nchat/app_config",
  THEME: "@nchat/theme",
  DRAFT_MESSAGES: "@nchat/draft_messages",
  RECENT_EMOJIS: "@nchat/recent_emojis",
  NOTIFICATION_SETTINGS: "@nchat/notification_settings",
} as const;

// Deep link schemes
export const DEEP_LINK_SCHEME = "nchat";
export const DEEP_LINK_HOST = "app";

// Default colors (matching theme presets)
export const COLORS = {
  primary: "#00D4FF",
  secondary: "#0EA5E9",
  accent: "#38BDF8",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
} as const;

// Z-index layers
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

// Animation durations (ms)
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;
