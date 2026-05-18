/**
 * Application constants for nself-chat
 * @module lib/constants
 */

/**
 * API URL configuration
 */
export const API_URLS = {
  /** GraphQL endpoint */
  GRAPHQL:
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql",
  /** Authentication endpoint */
  AUTH: process.env.NEXT_PUBLIC_AUTH_URL || "http://auth.localhost/v1/auth",
  /** Storage endpoint */
  STORAGE:
    process.env.NEXT_PUBLIC_STORAGE_URL ||
    "http://storage.localhost/v1/storage",
  /** WebSocket endpoint for subscriptions */
  WS: process.env.NEXT_PUBLIC_WS_URL || "ws://api.localhost/v1/graphql",
} as const;

/**
 * Application metadata
 */
export const APP_CONFIG = {
  /** Application name */
  NAME: process.env.NEXT_PUBLIC_APP_NAME || "nchat",
  /** Application description */
  DESCRIPTION: "Team communication platform",
  /** Application version */
  VERSION: process.env.NEXT_PUBLIC_APP_VERSION || "0.9.1",
  /** Default locale */
  DEFAULT_LOCALE: "en-US",
  /** Support email */
  SUPPORT_EMAIL: "support@nself.org",
} as const;

/**
 * Default values for the application
 */
export const DEFAULTS = {
  /** Default avatar background colors */
  AVATAR_COLORS: [
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#ef4444", // Red
    "#f97316", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#14b8a6", // Teal
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
  ],
  /** Default primary color */
  PRIMARY_COLOR: "#6366f1",
  /** Default theme mode */
  THEME_MODE: "system" as const,
  /** Default page size for pagination */
  PAGE_SIZE: 50,
  /** Default avatar size */
  AVATAR_SIZE: 40,
  /** Default message limit */
  MESSAGE_LIMIT: 100,
  /** Typing indicator timeout (ms) */
  TYPING_TIMEOUT: 3000,
  /** Auto-save interval (ms) */
  AUTO_SAVE_INTERVAL: 30000,
  /** Reconnect interval (ms) */
  RECONNECT_INTERVAL: 5000,
  /** Maximum reconnect attempts */
  MAX_RECONNECT_ATTEMPTS: 10,
} as const;

/**
 * Size limits
 */
export const LIMITS = {
  /** Maximum message length (characters) */
  MAX_MESSAGE_LENGTH: 4000,
  /** Maximum channel name length */
  MAX_CHANNEL_NAME_LENGTH: 80,
  /** Minimum channel name length */
  MIN_CHANNEL_NAME_LENGTH: 1,
  /** Maximum username length */
  MAX_USERNAME_LENGTH: 30,
  /** Minimum username length */
  MIN_USERNAME_LENGTH: 2,
  /** Maximum display name length */
  MAX_DISPLAY_NAME_LENGTH: 50,
  /** Maximum file upload size (bytes) - 10MB */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  /** Maximum image upload size (bytes) - 5MB */
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,
  /** Maximum video upload size (bytes) - 50MB */
  MAX_VIDEO_SIZE: 50 * 1024 * 1024,
  /** Maximum number of files per message */
  MAX_FILES_PER_MESSAGE: 10,
  /** Maximum channel topic length */
  MAX_CHANNEL_TOPIC_LENGTH: 250,
  /** Maximum bio length */
  MAX_BIO_LENGTH: 160,
  /** Maximum password length */
  MAX_PASSWORD_LENGTH: 128,
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,
  /** Maximum search query length */
  MAX_SEARCH_QUERY_LENGTH: 100,
  /** Maximum reactions per message */
  MAX_REACTIONS_PER_MESSAGE: 50,
  /** Maximum members in a direct message group */
  MAX_DM_GROUP_MEMBERS: 8,
} as const;

/**
 * Timing constants (all in milliseconds)
 */
export const TIMING = {
  /** Debounce delay for search */
  SEARCH_DEBOUNCE: 300,
  /** Debounce delay for typing indicator */
  TYPING_DEBOUNCE: 500,
  /** Debounce delay for auto-save */
  AUTO_SAVE_DEBOUNCE: 1000,
  /** Throttle delay for scroll events */
  SCROLL_THROTTLE: 100,
  /** Animation duration (short) */
  ANIMATION_SHORT: 150,
  /** Animation duration (medium) */
  ANIMATION_MEDIUM: 300,
  /** Animation duration (long) */
  ANIMATION_LONG: 500,
  /** Toast notification duration */
  TOAST_DURATION: 5000,
  /** Loading indicator delay */
  LOADING_DELAY: 200,
  /** Session timeout warning (5 minutes before expiry) */
  SESSION_WARNING: 5 * 60 * 1000,
  /** Polling interval for status updates */
  STATUS_POLL_INTERVAL: 30000,
  /** Cache TTL for user data */
  USER_CACHE_TTL: 5 * 60 * 1000,
  /** Cache TTL for channel data */
  CHANNEL_CACHE_TTL: 60 * 1000,
} as const;

/**
 * Regular expression patterns
 */
export const PATTERNS = {
  /** Email pattern */
  EMAIL:
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  /** Username pattern (letters, numbers, underscores, periods) */
  USERNAME: /^[a-zA-Z][a-zA-Z0-9_.]*[a-zA-Z0-9]$|^[a-zA-Z]$/,
  /** Channel name pattern (lowercase, numbers, hyphens, underscores) */
  CHANNEL_NAME: /^[a-z0-9][a-z0-9_-]*[a-z0-9]$|^[a-z0-9]$/,
  /** URL pattern */
  URL: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi,
  /** Mention pattern (@username) */
  MENTION: /@([a-zA-Z][a-zA-Z0-9_]{0,29})/g,
  /** Channel reference pattern (#channel) */
  CHANNEL_REF: /#([a-z][a-z0-9_-]{0,79})/gi,
  /** Emoji shortcode pattern (:emoji_name:) */
  EMOJI_SHORTCODE: /:([a-z0-9_+-]+):/gi,
  /** Hex color pattern */
  HEX_COLOR: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
  /** UUID pattern */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  /** Phone number pattern (basic) */
  PHONE: /^\+?[1-9]\d{1,14}$/,
  /** Slug pattern */
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  /** Password pattern (at least 8 chars, 1 upper, 1 lower, 1 number) */
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
} as const;

/**
 * Key codes for keyboard shortcuts
 */
export const KEYS = {
  ENTER: "Enter",
  ESCAPE: "Escape",
  TAB: "Tab",
  SPACE: " ",
  BACKSPACE: "Backspace",
  DELETE: "Delete",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
  PAGE_UP: "PageUp",
  PAGE_DOWN: "PageDown",
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * User roles
 */
export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MODERATOR: "moderator",
  MEMBER: "member",
  GUEST: "guest",
} as const;

/**
 * Role hierarchy (higher number = more permissions)
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  [ROLES.OWNER]: 100,
  [ROLES.ADMIN]: 80,
  [ROLES.MODERATOR]: 60,
  [ROLES.MEMBER]: 40,
  [ROLES.GUEST]: 20,
} as const;

/**
 * Channel types
 */
export const CHANNEL_TYPES = {
  PUBLIC: "public",
  PRIVATE: "private",
  DIRECT: "direct",
  GROUP_DM: "group_dm",
} as const;

/**
 * Message types
 */
export const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  FILE: "file",
  VIDEO: "video",
  AUDIO: "audio",
  SYSTEM: "system",
  REPLY: "reply",
  THREAD: "thread",
} as const;

/**
 * Presence status types
 */
export const PRESENCE_STATUS = {
  ONLINE: "online",
  AWAY: "away",
  DND: "dnd",
  OFFLINE: "offline",
} as const;

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  MESSAGE: "message",
  MENTION: "mention",
  REACTION: "reaction",
  REPLY: "reply",
  CHANNEL_INVITE: "channel_invite",
  DM: "dm",
  SYSTEM: "system",
} as const;

/**
 * File type categories
 */
export const FILE_CATEGORIES = {
  IMAGE: {
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ],
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
  },
  VIDEO: {
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    extensions: [".mp4", ".webm", ".mov"],
  },
  AUDIO: {
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"],
    extensions: [".mp3", ".wav", ".ogg", ".m4a"],
  },
  DOCUMENT: {
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ],
    extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"],
  },
  ARCHIVE: {
    mimeTypes: [
      "application/zip",
      "application/x-rar-compressed",
      "application/gzip",
    ],
    extensions: [".zip", ".rar", ".gz", ".tar"],
  },
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_EMAIL_NOT_VERIFIED: "AUTH_EMAIL_NOT_VERIFIED",

  // Validation errors
  VALIDATION_REQUIRED: "VALIDATION_REQUIRED",
  VALIDATION_INVALID_FORMAT: "VALIDATION_INVALID_FORMAT",
  VALIDATION_TOO_SHORT: "VALIDATION_TOO_SHORT",
  VALIDATION_TOO_LONG: "VALIDATION_TOO_LONG",
  VALIDATION_ALREADY_EXISTS: "VALIDATION_ALREADY_EXISTS",

  // Resource errors
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_FORBIDDEN: "RESOURCE_FORBIDDEN",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",

  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",
  NETWORK_OFFLINE: "NETWORK_OFFLINE",

  // Server errors
  SERVER_ERROR: "SERVER_ERROR",
  SERVER_UNAVAILABLE: "SERVER_UNAVAILABLE",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",

  // File errors
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  FILE_TYPE_NOT_ALLOWED: "FILE_TYPE_NOT_ALLOWED",
  FILE_UPLOAD_FAILED: "FILE_UPLOAD_FAILED",
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  // sast-ignore: HARDCODED_CREDENTIAL -- these are localStorage key names (identifiers), not credential values
  AUTH_TOKEN: "nchat-auth-token",
  // sast-ignore: HARDCODED_CREDENTIAL -- localStorage key name, not a stored token value
  REFRESH_TOKEN: "nchat-refresh-token",
  USER: "nchat-user",
  THEME: "nchat-theme",
  CONFIG: "nchat-config",
  DRAFT_PREFIX: "nchat-draft-",
  SIDEBAR_STATE: "nchat-sidebar",
  RECENT_EMOJI: "nchat-recent-emoji",
  NOTIFICATION_PERMISSION: "nchat-notification-permission",
} as const;

/**
 * Event names for custom events
 */
export const EVENTS = {
  // Auth events
  AUTH_LOGIN: "nchat:auth:login",
  AUTH_LOGOUT: "nchat:auth:logout",
  AUTH_TOKEN_REFRESH: "nchat:auth:token-refresh",

  // Message events
  MESSAGE_SEND: "nchat:message:send",
  MESSAGE_RECEIVE: "nchat:message:receive",
  MESSAGE_UPDATE: "nchat:message:update",
  MESSAGE_DELETE: "nchat:message:delete",

  // Channel events
  CHANNEL_JOIN: "nchat:channel:join",
  CHANNEL_LEAVE: "nchat:channel:leave",
  CHANNEL_UPDATE: "nchat:channel:update",

  // User events
  USER_TYPING: "nchat:user:typing",
  USER_PRESENCE: "nchat:user:presence",

  // UI events
  THEME_CHANGE: "nchat:ui:theme-change",
  SIDEBAR_TOGGLE: "nchat:ui:sidebar-toggle",
  MODAL_OPEN: "nchat:ui:modal-open",
  MODAL_CLOSE: "nchat:ui:modal-close",
} as const;

/**
 * Breakpoints for responsive design
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  "2XL": 1536,
} as const;

/**
 * Z-index layers
 */
export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 100,
  STICKY: 200,
  OVERLAY: 300,
  MODAL: 400,
  POPOVER: 500,
  TOOLTIP: 600,
  TOAST: 700,
  MAX: 9999,
} as const;
