/**
 * Shared types for settings domain.
 *
 * @module settings/types
 */

// ============================================================================
// Theme
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeAccent =
  | 'blue'
  | 'green'
  | 'violet'
  | 'orange'
  | 'rose'
  | 'slate'

export interface ThemeSettings {
  mode: ThemeMode
  accent: ThemeAccent
  fontSize: 'sm' | 'base' | 'lg'
  compactMode: boolean
  messageGrouping: boolean
  showAvatars: boolean
  animationsEnabled: boolean
}

// ============================================================================
// Profile
// ============================================================================

export interface ProfileData {
  userId: string
  displayName: string
  username: string
  email: string
  bio: string | null
  avatarUrl: string | null
  status: string | null
  customStatus: string | null
  customStatusEmoji: string | null
  customStatusExpiry: string | null
  timezone: string
  locale: string
}

export interface ProfileUpdatePayload {
  displayName?: string
  bio?: string | null
  avatarUrl?: string | null
  status?: string | null
  customStatus?: string | null
  customStatusEmoji?: string | null
  customStatusExpiry?: string | null
  timezone?: string
  locale?: string
}

// ============================================================================
// Notifications
// ============================================================================

export type NotificationLevel = 'all' | 'mentions' | 'none'
export type NotificationSound = 'default' | 'subtle' | 'none'

export interface GlobalNotificationSettings {
  desktopNotifications: boolean
  mobileNotifications: boolean
  emailNotifications: boolean
  emailDigest: 'realtime' | 'daily' | 'weekly' | 'never'
  defaultLevel: NotificationLevel
  sound: NotificationSound
  muteAllSounds: boolean
  notifyOnMention: boolean
  notifyOnKeyword: boolean
  keywords: string[]
  doNotDisturbEnabled: boolean
  doNotDisturbStart: string | null
  doNotDisturbEnd: string | null
}

export interface ChannelNotificationOverride {
  channelId: string
  level: NotificationLevel
  muted: boolean
  mutedUntil: string | null
}

// ============================================================================
// i18n
// ============================================================================

export interface LocaleInfo {
  code: string
  name: string
  nativeName: string
  rtl?: boolean
}

export interface I18nSettings {
  locale: string
  timezone: string
  /** 12 or 24 */
  timeFormat: 12 | 24
  dateFormat: 'MDY' | 'DMY' | 'YMD'
  firstDayOfWeek: 0 | 1 | 6
  spellcheck: boolean
}

// ============================================================================
// Privacy & Security
// ============================================================================

export interface PrivacySettings {
  showOnlineStatus: boolean
  allowDirectMessages: 'everyone' | 'friends' | 'nobody'
  showReadReceipts: boolean
  showTypingIndicator: boolean
  allowMessageSearch: boolean
}
