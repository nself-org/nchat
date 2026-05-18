/**
 * User Types for nself-chat
 *
 * Core type definitions for users, profiles, presence, status, roles, and permissions.
 * These types are used across the application for authentication, chat, and user management.
 */

// ============================================================================
// User Role Types
// ============================================================================

/**
 * User roles in the system, ordered by privilege level (highest to lowest).
 * Used for RBAC (Role-Based Access Control) throughout the application.
 */
export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

/**
 * Numeric privilege levels for each role (higher = more privileges).
 * Useful for permission comparisons.
 */
export const UserRoleLevel: Record<UserRole, number> = {
  owner: 100,
  admin: 80,
  moderator: 60,
  member: 40,
  guest: 20,
} as const;

/**
 * Human-readable labels for user roles.
 */
export const UserRoleLabels: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  moderator: "Moderator",
  member: "Member",
  guest: "Guest",
} as const;

/**
 * Role descriptions for UI display.
 */
export const UserRoleDescriptions: Record<UserRole, string> = {
  owner: "Full system access and control",
  admin: "Manage users, channels, and settings",
  moderator: "Manage messages and moderate content",
  member: "Standard user with chat access",
  guest: "Limited read-only access",
} as const;

// ============================================================================
// User Presence Types
// ============================================================================

/**
 * User presence status indicating online state.
 */
export type UserPresenceStatus = "online" | "away" | "dnd" | "offline";

/**
 * Human-readable labels for presence statuses.
 */
export const UserPresenceLabels: Record<UserPresenceStatus, string> = {
  online: "Online",
  away: "Away",
  dnd: "Do Not Disturb",
  offline: "Offline",
} as const;

/**
 * Full presence information for a user.
 */
export interface UserPresence {
  /** Current presence status */
  status: UserPresenceStatus;
  /** When the status was last updated */
  lastUpdatedAt: Date;
  /** When the user was last seen active */
  lastSeenAt?: Date;
  /** Optional custom status message */
  customStatus?: UserStatus;
  /** Device information if tracking multiple sessions */
  device?: "desktop" | "mobile" | "web";
  /** Whether user is currently active (not idle) */
  isActive: boolean;
  /** Automatic away timeout in minutes (0 = disabled) */
  autoAwayTimeout?: number;
}

// ============================================================================
// User Status Types
// ============================================================================

/**
 * Custom status that users can set (emoji + text).
 */
export interface UserStatus {
  /** Status emoji (single emoji character) */
  emoji?: string;
  /** Status text message */
  text: string;
  /** When the status expires (null = never) */
  expiresAt?: Date | null;
  /** When the status was set */
  setAt: Date;
}

/**
 * Preset status options for quick selection.
 */
export interface UserStatusPreset {
  id: string;
  emoji: string;
  text: string;
  /** Duration in minutes (null = indefinite) */
  duration?: number | null;
}

/**
 * Default status presets available to all users.
 */
export const DefaultStatusPresets: UserStatusPreset[] = [
  { id: "in-meeting", emoji: "📅", text: "In a meeting", duration: 60 },
  { id: "commuting", emoji: "🚗", text: "Commuting", duration: 60 },
  { id: "lunch", emoji: "🍽️", text: "Out for lunch", duration: 60 },
  { id: "vacationing", emoji: "🌴", text: "Vacationing", duration: null },
  {
    id: "working-remotely",
    emoji: "🏠",
    text: "Working remotely",
    duration: null,
  },
  { id: "sick", emoji: "🤒", text: "Out sick", duration: null },
  { id: "focusing", emoji: "🎯", text: "Focusing", duration: 120 },
];

// ============================================================================
// User Permissions Types
// ============================================================================

/**
 * Granular permissions for users.
 * Can be assigned via roles or individually.
 */
export interface UserPermissions {
  // Channel permissions
  canCreatePublicChannels: boolean;
  canCreatePrivateChannels: boolean;
  canDeleteChannels: boolean;
  canArchiveChannels: boolean;
  canManageChannelMembers: boolean;
  canManageChannelSettings: boolean;

  // Message permissions
  canSendMessages: boolean;
  canEditOwnMessages: boolean;
  canDeleteOwnMessages: boolean;
  canDeleteAnyMessage: boolean;
  canPinMessages: boolean;
  canMentionEveryone: boolean;
  canMentionHere: boolean;

  // File permissions
  canUploadFiles: boolean;
  canDeleteAnyFile: boolean;
  maxUploadSizeMB: number;

  // User management permissions
  canInviteUsers: boolean;
  canRemoveUsers: boolean;
  canBanUsers: boolean;
  canManageRoles: boolean;
  canViewUserDetails: boolean;

  // Moderation permissions
  canMuteUsers: boolean;
  canWarnUsers: boolean;
  canViewModerationLogs: boolean;
  canManageReports: boolean;

  // Admin permissions
  canAccessAdminPanel: boolean;
  canManageAppSettings: boolean;
  canManageIntegrations: boolean;
  canManageBots: boolean;
  canViewAnalytics: boolean;

  // Special permissions
  canBypassSlowMode: boolean;
  canBypassRateLimit: boolean;
  canUseCustomEmojis: boolean;
  canManageCustomEmojis: boolean;
}

/**
 * Default permissions for each role.
 */
export const DefaultRolePermissions: Record<UserRole, UserPermissions> = {
  owner: {
    canCreatePublicChannels: true,
    canCreatePrivateChannels: true,
    canDeleteChannels: true,
    canArchiveChannels: true,
    canManageChannelMembers: true,
    canManageChannelSettings: true,
    canSendMessages: true,
    canEditOwnMessages: true,
    canDeleteOwnMessages: true,
    canDeleteAnyMessage: true,
    canPinMessages: true,
    canMentionEveryone: true,
    canMentionHere: true,
    canUploadFiles: true,
    canDeleteAnyFile: true,
    maxUploadSizeMB: 100,
    canInviteUsers: true,
    canRemoveUsers: true,
    canBanUsers: true,
    canManageRoles: true,
    canViewUserDetails: true,
    canMuteUsers: true,
    canWarnUsers: true,
    canViewModerationLogs: true,
    canManageReports: true,
    canAccessAdminPanel: true,
    canManageAppSettings: true,
    canManageIntegrations: true,
    canManageBots: true,
    canViewAnalytics: true,
    canBypassSlowMode: true,
    canBypassRateLimit: true,
    canUseCustomEmojis: true,
    canManageCustomEmojis: true,
  },
  admin: {
    canCreatePublicChannels: true,
    canCreatePrivateChannels: true,
    canDeleteChannels: true,
    canArchiveChannels: true,
    canManageChannelMembers: true,
    canManageChannelSettings: true,
    canSendMessages: true,
    canEditOwnMessages: true,
    canDeleteOwnMessages: true,
    canDeleteAnyMessage: true,
    canPinMessages: true,
    canMentionEveryone: true,
    canMentionHere: true,
    canUploadFiles: true,
    canDeleteAnyFile: true,
    maxUploadSizeMB: 50,
    canInviteUsers: true,
    canRemoveUsers: true,
    canBanUsers: true,
    canManageRoles: false,
    canViewUserDetails: true,
    canMuteUsers: true,
    canWarnUsers: true,
    canViewModerationLogs: true,
    canManageReports: true,
    canAccessAdminPanel: true,
    canManageAppSettings: false,
    canManageIntegrations: true,
    canManageBots: true,
    canViewAnalytics: true,
    canBypassSlowMode: true,
    canBypassRateLimit: true,
    canUseCustomEmojis: true,
    canManageCustomEmojis: true,
  },
  moderator: {
    canCreatePublicChannels: true,
    canCreatePrivateChannels: true,
    canDeleteChannels: false,
    canArchiveChannels: true,
    canManageChannelMembers: true,
    canManageChannelSettings: false,
    canSendMessages: true,
    canEditOwnMessages: true,
    canDeleteOwnMessages: true,
    canDeleteAnyMessage: true,
    canPinMessages: true,
    canMentionEveryone: true,
    canMentionHere: true,
    canUploadFiles: true,
    canDeleteAnyFile: true,
    maxUploadSizeMB: 25,
    canInviteUsers: true,
    canRemoveUsers: false,
    canBanUsers: false,
    canManageRoles: false,
    canViewUserDetails: true,
    canMuteUsers: true,
    canWarnUsers: true,
    canViewModerationLogs: true,
    canManageReports: true,
    canAccessAdminPanel: false,
    canManageAppSettings: false,
    canManageIntegrations: false,
    canManageBots: false,
    canViewAnalytics: false,
    canBypassSlowMode: true,
    canBypassRateLimit: false,
    canUseCustomEmojis: true,
    canManageCustomEmojis: false,
  },
  member: {
    canCreatePublicChannels: false,
    canCreatePrivateChannels: true,
    canDeleteChannels: false,
    canArchiveChannels: false,
    canManageChannelMembers: false,
    canManageChannelSettings: false,
    canSendMessages: true,
    canEditOwnMessages: true,
    canDeleteOwnMessages: true,
    canDeleteAnyMessage: false,
    canPinMessages: false,
    canMentionEveryone: false,
    canMentionHere: false,
    canUploadFiles: true,
    canDeleteAnyFile: false,
    maxUploadSizeMB: 10,
    canInviteUsers: false,
    canRemoveUsers: false,
    canBanUsers: false,
    canManageRoles: false,
    canViewUserDetails: true,
    canMuteUsers: false,
    canWarnUsers: false,
    canViewModerationLogs: false,
    canManageReports: false,
    canAccessAdminPanel: false,
    canManageAppSettings: false,
    canManageIntegrations: false,
    canManageBots: false,
    canViewAnalytics: false,
    canBypassSlowMode: false,
    canBypassRateLimit: false,
    canUseCustomEmojis: true,
    canManageCustomEmojis: false,
  },
  guest: {
    canCreatePublicChannels: false,
    canCreatePrivateChannels: false,
    canDeleteChannels: false,
    canArchiveChannels: false,
    canManageChannelMembers: false,
    canManageChannelSettings: false,
    canSendMessages: false,
    canEditOwnMessages: false,
    canDeleteOwnMessages: false,
    canDeleteAnyMessage: false,
    canPinMessages: false,
    canMentionEveryone: false,
    canMentionHere: false,
    canUploadFiles: false,
    canDeleteAnyFile: false,
    maxUploadSizeMB: 0,
    canInviteUsers: false,
    canRemoveUsers: false,
    canBanUsers: false,
    canManageRoles: false,
    canViewUserDetails: false,
    canMuteUsers: false,
    canWarnUsers: false,
    canViewModerationLogs: false,
    canManageReports: false,
    canAccessAdminPanel: false,
    canManageAppSettings: false,
    canManageIntegrations: false,
    canManageBots: false,
    canViewAnalytics: false,
    canBypassSlowMode: false,
    canBypassRateLimit: false,
    canUseCustomEmojis: false,
    canManageCustomEmojis: false,
  },
};

// ============================================================================
// User Profile Types
// ============================================================================

/**
 * Extended user profile information.
 */
export interface UserProfile {
  /** User's bio/about text */
  bio?: string;
  /** User's location */
  location?: string;
  /** User's timezone (IANA format, e.g., 'America/New_York') */
  timezone?: string;
  /** User's preferred language (ISO 639-1, e.g., 'en') */
  language?: string;
  /** User's website URL */
  website?: string;
  /** User's phone number */
  phone?: string;
  /** User's job title */
  jobTitle?: string;
  /** User's department */
  department?: string;
  /** User's organization */
  organization?: string;
  /** User's pronouns */
  pronouns?: string;
  /** Social media links */
  socialLinks?: UserSocialLinks;
  /** Profile banner image URL */
  bannerUrl?: string;
  /** When profile was last updated */
  updatedAt: Date;
}

/**
 * Social media links for user profiles.
 */
export interface UserSocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
  discord?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  twitch?: string;
  custom?: { label: string; url: string }[];
}

// ============================================================================
// User Settings Types
// ============================================================================

/**
 * User notification preferences.
 */
export interface UserNotificationSettings {
  /** Enable all notifications */
  enabled: boolean;
  /** Play sound for notifications */
  sound: boolean;
  /** Show desktop notifications */
  desktop: boolean;
  /** Email notification preferences */
  email: {
    enabled: boolean;
    directMessages: boolean;
    mentions: boolean;
    digest: "none" | "daily" | "weekly";
  };
  /** Push notification preferences */
  push: {
    enabled: boolean;
    directMessages: boolean;
    mentions: boolean;
    threads: boolean;
  };
  /** Quiet hours settings */
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    timezone: string;
  };
  /** Keywords to trigger notifications */
  keywords: string[];
}

/**
 * User privacy settings.
 */
export interface UserPrivacySettings {
  /** Who can send direct messages */
  allowDirectMessages: "everyone" | "contacts" | "none";
  /** Show online status to others */
  showOnlineStatus: boolean;
  /** Show typing indicator to others */
  showTypingIndicator: boolean;
  /** Show read receipts to others */
  showReadReceipts: boolean;
  /** Allow profile to be found in search */
  allowProfileSearch: boolean;
  /** Show email address in profile */
  showEmail: boolean;
  /** Show profile to guests */
  showProfileToGuests: boolean;
}

/**
 * User appearance settings.
 */
export interface UserAppearanceSettings {
  /** Theme mode */
  theme: "light" | "dark" | "system";
  /** Compact message display */
  compactMode: boolean;
  /** Show message timestamps */
  showTimestamps: boolean;
  /** Time format */
  timeFormat: "12h" | "24h";
  /** Date format */
  dateFormat: "mdy" | "dmy" | "ymd";
  /** Font size scaling */
  fontSize: "small" | "medium" | "large";
  /** Show user avatars in messages */
  showAvatars: boolean;
  /** Show link previews */
  showLinkPreviews: boolean;
  /** Show emoji reactions inline */
  showReactionsInline: boolean;
  /** Animation settings */
  reduceMotion: boolean;
}

/**
 * Combined user settings.
 */
export interface UserSettings {
  notifications: UserNotificationSettings;
  privacy: UserPrivacySettings;
  appearance: UserAppearanceSettings;
}

// ============================================================================
// Main User Interface
// ============================================================================

/**
 * Core User interface representing a user in the system.
 */
export interface User {
  /** Unique user identifier (UUID) */
  id: string;
  /** Unique username (lowercase, alphanumeric + underscores) */
  username: string;
  /** Display name shown in UI */
  displayName: string;
  /** Email address */
  email: string;
  /** Whether email is verified */
  emailVerified: boolean;
  /** Avatar image URL */
  avatarUrl?: string;
  /** User's role in the system */
  role: UserRole;
  /** Whether user account is active */
  isActive: boolean;
  /** Whether user is a bot */
  isBot: boolean;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Last login timestamp */
  lastLoginAt?: Date;
  /** Current presence information */
  presence?: UserPresence;
  /** Extended profile information */
  profile?: UserProfile;
  /** User settings */
  settings?: UserSettings;
  /** Computed permissions (from role + overrides) */
  permissions?: UserPermissions;
  /** Authentication metadata */
  authMetadata?: UserAuthMetadata;
}

/**
 * Authentication metadata for a user.
 */
export interface UserAuthMetadata {
  /** Auth provider used (email, google, github, etc.) */
  provider: string;
  /** Provider-specific user ID */
  providerId?: string;
  /** ID.me verification status */
  idmeVerified?: boolean;
  /** ID.me verification groups */
  idmeGroups?: ("military" | "police" | "first-responder" | "government")[];
  /** Two-factor authentication enabled */
  twoFactorEnabled?: boolean;
  /** Last password change */
  passwordChangedAt?: Date;
}

// ============================================================================
// User Relationship Types
// ============================================================================

/**
 * User block record.
 */
export interface UserBlock {
  /** User who created the block */
  userId: string;
  /** User who is blocked */
  blockedUserId: string;
  /** When the block was created */
  createdAt: Date;
  /** Reason for blocking (optional) */
  reason?: string;
}

/**
 * User follow/contact relationship.
 */
export interface UserContact {
  /** User who added the contact */
  userId: string;
  /** The contact user */
  contactUserId: string;
  /** Custom nickname for the contact */
  nickname?: string;
  /** Whether this is a favorite contact */
  isFavorite: boolean;
  /** When the contact was added */
  createdAt: Date;
}

// ============================================================================
// User Session Types
// ============================================================================

/**
 * User session information.
 */
export interface UserSession {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Session token (for auth) */
  token: string;
  /** Refresh token */
  refreshToken?: string;
  /** Device information */
  device: {
    type: "desktop" | "mobile" | "tablet" | "web";
    os?: string;
    browser?: string;
    name?: string;
  };
  /** IP address */
  ipAddress?: string;
  /** Location (from IP) */
  location?: string;
  /** Session creation time */
  createdAt: Date;
  /** Last activity time */
  lastActiveAt: Date;
  /** Session expiration time */
  expiresAt: Date;
  /** Whether this is the current session */
  isCurrent: boolean;
}

// ============================================================================
// User Action Types
// ============================================================================

/**
 * User moderation action record.
 */
export interface UserModerationAction {
  /** Action ID */
  id: string;
  /** User who performed the action */
  moderatorId: string;
  /** User the action was performed on */
  targetUserId: string;
  /** Type of action */
  action: "warn" | "mute" | "unmute" | "ban" | "unban" | "kick" | "role_change";
  /** Reason for the action */
  reason?: string;
  /** Duration in minutes (for timed actions) */
  duration?: number;
  /** When the action expires */
  expiresAt?: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** When the action was performed */
  createdAt: Date;
}

/**
 * User mute status.
 */
export interface UserMute {
  /** User who is muted */
  userId: string;
  /** Channel ID (null = server-wide mute) */
  channelId?: string | null;
  /** Who muted the user */
  mutedBy: string;
  /** Reason for mute */
  reason?: string;
  /** When mute was created */
  createdAt: Date;
  /** When mute expires (null = permanent) */
  expiresAt?: Date | null;
}

/**
 * User ban status.
 */
export interface UserBan {
  /** User who is banned */
  userId: string;
  /** Who banned the user */
  bannedBy: string;
  /** Reason for ban */
  reason?: string;
  /** When ban was created */
  createdAt: Date;
  /** When ban expires (null = permanent) */
  expiresAt?: Date | null;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Minimal user info for display in lists and mentions.
 */
export type UserBasicInfo = Pick<
  User,
  "id" | "username" | "displayName" | "avatarUrl" | "role"
>;

/**
 * User info with presence for member lists.
 */
export type UserWithPresence = UserBasicInfo & {
  presence: UserPresence;
};

/**
 * User info for message display.
 */
export type MessageUser = UserBasicInfo & {
  status?: UserPresenceStatus;
};

/**
 * Input type for creating a new user.
 */
export interface CreateUserInput {
  username: string;
  displayName: string;
  email: string;
  password?: string;
  role?: UserRole;
  avatarUrl?: string;
  profile?: Partial<UserProfile>;
}

/**
 * Input type for updating a user.
 */
export interface UpdateUserInput {
  username?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  role?: UserRole;
  isActive?: boolean;
  profile?: Partial<UserProfile>;
  settings?: Partial<UserSettings>;
}

/**
 * User search/filter criteria.
 */
export interface UserFilter {
  /** Search by username or display name */
  search?: string;
  /** Filter by roles */
  roles?: UserRole[];
  /** Filter by presence status */
  presence?: UserPresenceStatus[];
  /** Filter by active status */
  isActive?: boolean;
  /** Filter by bot status */
  isBot?: boolean;
  /** Include users from specific channels */
  channelIds?: string[];
  /** Exclude specific users */
  excludeIds?: string[];
}
