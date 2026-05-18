/**
 * Profile Types for nself-chat
 *
 * Comprehensive type definitions for user profiles with full parity to
 * Telegram/WhatsApp/Signal/Slack/Discord functionality.
 *
 * Features:
 * - Profile photo/video support
 * - Bio and about fields with rich text
 * - Username policies and validation
 * - Account privacy states
 * - Profile discovery (search, QR code)
 *
 * @module types/profile
 * @version 1.0.0
 */

// ============================================================================
// Profile Photo/Video Types
// ============================================================================

/**
 * Profile photo information
 */
export interface ProfilePhoto {
  /** Unique identifier */
  id: string;
  /** Full-size image URL */
  url: string;
  /** Thumbnail URL (150x150) */
  thumbnailUrl: string;
  /** Medium size URL (400x400) */
  mediumUrl: string;
  /** Original uploaded filename */
  originalFilename?: string;
  /** File size in bytes */
  size: number;
  /** Image dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** When the photo was uploaded */
  createdAt: Date;
  /** Whether this is the current profile photo */
  isCurrent: boolean;
}

/**
 * Profile video information (like Telegram)
 */
export interface ProfileVideo {
  /** Unique identifier */
  id: string;
  /** Video URL */
  url: string;
  /** Video thumbnail URL */
  thumbnailUrl: string;
  /** Duration in seconds (max 10 seconds) */
  duration: number;
  /** File size in bytes */
  size: number;
  /** When the video was uploaded */
  createdAt: Date;
  /** Whether this is the current profile video */
  isCurrent: boolean;
}

/**
 * Photo upload options with crop data
 */
export interface PhotoUploadOptions {
  file: File;
  /** Crop data for the image */
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Optional rotation in degrees */
  rotation?: number;
}

// ============================================================================
// Bio and About Types
// ============================================================================

/**
 * Maximum character limits for profile fields
 */
export const PROFILE_LIMITS = {
  /** Bio/about character limit (like Telegram: 70, WhatsApp: 139, we use 160) */
  bio: 160,
  /** Status text limit */
  status: 100,
  /** Display name length */
  displayName: { min: 1, max: 64 },
  /** Username length */
  username: { min: 3, max: 32 },
  /** Website URL length */
  website: 200,
  /** Location text length */
  location: 100,
  /** Job title length */
  jobTitle: 100,
  /** Organization name length */
  organization: 100,
  /** Phone number length */
  phone: 20,
  /** Pronouns length */
  pronouns: 50,
} as const;

/**
 * Bio/about information
 */
export interface ProfileBio {
  /** Bio text */
  text: string;
  /** Character count */
  length: number;
  /** When the bio was last updated */
  updatedAt: Date;
}

// ============================================================================
// Username Types
// ============================================================================

/**
 * Username validation result
 */
export interface UsernameValidation {
  /** Is the username valid format */
  valid: boolean;
  /** Is the username available */
  available?: boolean;
  /** Error message if invalid */
  error?: string;
  /** Suggestions if taken */
  suggestions?: string[];
}

/**
 * Username change history record
 */
export interface UsernameChangeRecord {
  /** Previous username */
  previousUsername: string;
  /** New username */
  newUsername: string;
  /** When the change occurred */
  changedAt: Date;
  /** IP address of the change (for security) */
  ipAddress?: string;
}

/**
 * Username format rules
 */
export const USERNAME_RULES = {
  /** Minimum length */
  minLength: 3,
  /** Maximum length */
  maxLength: 32,
  /** Allowed characters pattern */
  pattern: /^[a-z0-9_]+$/,
  /** Must start with a letter */
  mustStartWithLetter: true,
  /** Cannot end with underscore */
  cannotEndWithUnderscore: true,
  /** Maximum consecutive underscores */
  maxConsecutiveUnderscores: 1,
  /** Reserved usernames that cannot be used */
  reserved: [
    "admin",
    "administrator",
    "root",
    "system",
    "nchat",
    "nself",
    "support",
    "help",
    "mod",
    "moderator",
    "owner",
    "staff",
    "team",
    "official",
    "bot",
    "api",
    "null",
    "undefined",
    "anonymous",
    "everyone",
    "here",
    "channel",
    "group",
    "all",
  ],
  /** Username change cooldown in days */
  changeCooldownDays: 30,
} as const;

// ============================================================================
// Privacy Types
// ============================================================================

/**
 * Privacy visibility levels
 */
export type PrivacyVisibility = "everyone" | "contacts" | "nobody";

/**
 * Account privacy settings
 */
export interface ProfilePrivacySettings {
  /** Online/offline visibility */
  onlineStatus: PrivacyVisibility;
  /** Last seen visibility */
  lastSeen: PrivacyVisibility;
  /** Profile photo visibility */
  profilePhoto: PrivacyVisibility;
  /** Bio visibility */
  bio: PrivacyVisibility;
  /** Phone number visibility (if shared) */
  phone: PrivacyVisibility;
  /** Who can add to groups */
  addToGroups: PrivacyVisibility;
  /** Who can call */
  calls: PrivacyVisibility;
  /** Who can forward messages (with link to profile) */
  forwardedMessages: PrivacyVisibility;
  /** Read receipts */
  readReceipts: boolean;
  /** Typing indicator */
  typingIndicator: boolean;
  /** Profile searchable by username */
  searchableByUsername: boolean;
  /** Profile searchable by email (if permitted) */
  searchableByEmail: boolean;
  /** Show email on profile */
  showEmail: boolean;
}

/**
 * Default privacy settings
 */
export const DEFAULT_PRIVACY_SETTINGS: ProfilePrivacySettings = {
  onlineStatus: "everyone",
  lastSeen: "everyone",
  profilePhoto: "everyone",
  bio: "everyone",
  phone: "contacts",
  addToGroups: "everyone",
  calls: "everyone",
  forwardedMessages: "everyone",
  readReceipts: true,
  typingIndicator: true,
  searchableByUsername: true,
  searchableByEmail: false,
  showEmail: false,
};

// ============================================================================
// Profile Discovery Types
// ============================================================================

/**
 * QR code profile data
 */
export interface ProfileQRCode {
  /** QR code data URL (base64 encoded image) */
  dataUrl: string;
  /** Deep link URL encoded in QR */
  deepLink: string;
  /** When the QR code expires (for security) */
  expiresAt?: Date;
  /** QR code style/theme */
  style?: "default" | "minimal" | "branded";
}

/**
 * Profile search result
 */
export interface ProfileSearchResult {
  /** User ID */
  id: string;
  /** Username */
  username: string;
  /** Display name */
  displayName: string;
  /** Avatar URL (if visible) */
  avatarUrl?: string;
  /** Bio snippet (if visible) */
  bioSnippet?: string;
  /** Whether the user is verified */
  isVerified?: boolean;
  /** Match score (for relevance sorting) */
  matchScore?: number;
  /** Whether already in contacts */
  isContact?: boolean;
  /** Mutual connections count */
  mutualConnections?: number;
}

// ============================================================================
// Full Profile Types
// ============================================================================

/**
 * Complete user profile
 */
export interface UserProfileFull {
  /** User ID */
  id: string;
  /** Username (unique, lowercase) */
  username: string;
  /** Display name */
  displayName: string;
  /** Email address */
  email: string;
  /** Whether email is verified */
  emailVerified: boolean;
  /** Phone number (optional) */
  phone?: string;
  /** Whether phone is verified */
  phoneVerified?: boolean;
  /** Current profile photo */
  photo?: ProfilePhoto;
  /** Profile photo history */
  photoHistory?: ProfilePhoto[];
  /** Current profile video */
  video?: ProfileVideo;
  /** Bio/about text */
  bio?: string;
  /** Status text */
  status?: string;
  /** Status emoji */
  statusEmoji?: string;
  /** Status expiration */
  statusExpiresAt?: Date;
  /** Location */
  location?: string;
  /** Website URL */
  website?: string;
  /** Job title */
  jobTitle?: string;
  /** Department */
  department?: string;
  /** Organization */
  organization?: string;
  /** Pronouns */
  pronouns?: string;
  /** Timezone (IANA format) */
  timezone?: string;
  /** Preferred language (ISO 639-1) */
  language?: string;
  /** User role */
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  /** Whether the account is verified */
  isVerified?: boolean;
  /** Whether this is a bot account */
  isBot?: boolean;
  /** When the account was created */
  createdAt: Date;
  /** When the profile was last updated */
  updatedAt: Date;
  /** Last seen timestamp (if visible) */
  lastSeenAt?: Date;
  /** Last username change */
  lastUsernameChange?: Date;
  /** Privacy settings */
  privacySettings?: ProfilePrivacySettings;
  /** Social links */
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    discord?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    twitch?: string;
    custom?: { label: string; url: string }[];
  };
  /** Banner/cover image URL */
  bannerUrl?: string;
}

/**
 * Profile update input
 */
export interface UpdateProfileInput {
  displayName?: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  organization?: string;
  pronouns?: string;
  timezone?: string;
  language?: string;
  socialLinks?: UserProfileFull["socialLinks"];
}

/**
 * Profile update result
 */
export interface UpdateProfileResult {
  success: boolean;
  profile?: UserProfileFull;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Profile API response
 */
export interface ProfileApiResponse {
  success: boolean;
  data?: {
    profile?: UserProfileFull;
    photos?: ProfilePhoto[];
    video?: ProfileVideo;
    qrCode?: ProfileQRCode;
    privacySettings?: ProfilePrivacySettings;
    usernameValidation?: UsernameValidation;
    searchResults?: ProfileSearchResult[];
  };
  error?: string;
  errorCode?: string;
}

/**
 * Profile photo upload response
 */
export interface PhotoUploadResponse {
  success: boolean;
  photo?: ProfilePhoto;
  error?: string;
}

/**
 * Username change response
 */
export interface UsernameChangeResponse {
  success: boolean;
  newUsername?: string;
  previousUsername?: string;
  cooldownEndsAt?: Date;
  error?: string;
}
