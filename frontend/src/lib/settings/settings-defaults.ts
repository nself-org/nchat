/**
 * Settings Defaults - Default values for all settings
 */

import type {
  AccountSettings,
  AppearanceSettings,
  NotificationSettings,
  PrivacySettings,
  AccessibilitySettings,
  LanguageSettings,
  AdvancedSettings,
  UserSettings,
} from "./settings-types";

// ============================================================================
// Account Defaults
// ============================================================================

export const defaultAccountSettings: AccountSettings = {
  email: "",
  username: "",
  displayName: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  language: "en",
  twoFactorEnabled: false,
};

// ============================================================================
// Appearance Defaults
// ============================================================================

export const defaultAppearanceSettings: AppearanceSettings = {
  theme: "system",
  accentColor: "#6366f1",
  fontSize: "medium",
  fontFamily: "system",
  messageDensity: "comfortable",
  sidebarPosition: "left",
  sidebarWidth: 260,
  showAvatars: true,
  showTimestamps: true,
  compactMode: false,
  animationsEnabled: true,
  reduceMotion: false,
  reduceTransparency: false,
};

// ============================================================================
// Notification Defaults
// ============================================================================

export const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  sound: "default",
  soundVolume: 80,
  position: "top-right",
  duration: 5000,
  showPreview: true,
  showSender: true,
  desktopNotifications: true,
  emailNotifications: false,
  pushNotifications: true,
  doNotDisturb: false,
  doNotDisturbStart: "22:00",
  doNotDisturbEnd: "08:00",
  mutedChannels: [],
  mutedUsers: [],
  mentions: {
    enabled: true,
    sound: "default",
    desktop: true,
  },
  directMessages: {
    enabled: true,
    sound: "default",
    desktop: true,
  },
  threads: {
    enabled: true,
    sound: "default",
    desktop: true,
  },
  reactions: {
    enabled: false,
    sound: "none",
    desktop: false,
  },
};

// ============================================================================
// Privacy Defaults
// ============================================================================

export const defaultPrivacySettings: PrivacySettings = {
  onlineStatus: "everyone",
  lastSeen: true,
  readReceipts: true,
  typingIndicator: true,
  profileVisibility: "members",
  showEmail: false,
  showBio: true,
  showActivity: true,
  dmPermission: "everyone",
  allowInvites: true,
  allowMentions: true,
  blockList: [],
};

// ============================================================================
// Accessibility Defaults
// ============================================================================

export const defaultAccessibilitySettings: AccessibilitySettings = {
  reduceMotion: false,
  highContrast: false,
  contrastMode: "normal",
  fontSize: "medium",
  dyslexiaFont: false,
  reduceTransparency: false,
  alwaysShowFocus: false,
  largerTargets: false,
  showKeyboardHints: true,
  screenReaderMode: false,
  announceMessages: false,
  preferCaptions: false,
};

// ============================================================================
// Language & Region Defaults
// ============================================================================

export const defaultLanguageSettings: LanguageSettings = {
  language: "en",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  timeFormat: "12h",
  dateFormat: "mdy",
  weekStart: "sunday",
  numberFormat: "en-US",
};

// ============================================================================
// Advanced Defaults
// ============================================================================

export const defaultAdvancedSettings: AdvancedSettings = {
  developerMode: false,
  showDebugInfo: false,
  betaFeatures: false,
  analyticsEnabled: true,
  errorReporting: true,
  cacheEnabled: true,
  offlineMode: false,
  autoUpdate: true,
  syncEnabled: true,
  syncFrequency: 30000, // 30 seconds
};

// ============================================================================
// Combined Default Settings
// ============================================================================

export const defaultUserSettings: UserSettings = {
  account: defaultAccountSettings,
  appearance: defaultAppearanceSettings,
  notifications: defaultNotificationSettings,
  privacy: defaultPrivacySettings,
  accessibility: defaultAccessibilitySettings,
  language: defaultLanguageSettings,
  advanced: defaultAdvancedSettings,
};

// ============================================================================
// Settings Categories Configuration
// ============================================================================

export const settingsCategories = [
  {
    id: "account",
    label: "Account",
    description: "Manage your account settings",
    icon: "Settings",
    href: "/settings/account",
    order: 1,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Customize the look and feel",
    icon: "Palette",
    href: "/settings/appearance",
    order: 2,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Configure notification preferences",
    icon: "Bell",
    href: "/settings/notifications",
    order: 3,
  },
  {
    id: "privacy",
    label: "Privacy",
    description: "Control your privacy settings",
    icon: "Shield",
    href: "/settings/privacy",
    order: 4,
  },
  {
    id: "accessibility",
    label: "Accessibility",
    description: "Accessibility options",
    icon: "Accessibility",
    href: "/settings/accessibility",
    order: 5,
  },
  {
    id: "language",
    label: "Language & Region",
    description: "Language and regional settings",
    icon: "Globe",
    href: "/settings/language",
    order: 6,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Advanced settings and options",
    icon: "Wrench",
    href: "/settings/advanced",
    order: 7,
  },
] as const;

// ============================================================================
// Preset Colors
// ============================================================================

export const presetColors = [
  "#6366f1", // Indigo (default)
  "#8b5cf6", // Violet
  "#a855f7", // Purple
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#eab308", // Yellow
  "#84cc16", // Lime
  "#22c55e", // Green
  "#10b981", // Emerald
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#0ea5e9", // Sky
  "#3b82f6", // Blue
];

// ============================================================================
// Font Options
// ============================================================================

export const fontFamilyOptions = [
  { value: "system", label: "System Default", family: "system-ui, sans-serif" },
  { value: "inter", label: "Inter", family: "Inter, sans-serif" },
  { value: "roboto", label: "Roboto", family: "Roboto, sans-serif" },
  { value: "mono", label: "Monospace", family: "ui-monospace, monospace" },
];

export const fontSizeOptions = [
  { value: "small", label: "Small", size: "14px" },
  { value: "medium", label: "Medium", size: "16px" },
  { value: "large", label: "Large", size: "18px" },
  { value: "extra-large", label: "Extra Large", size: "20px" },
];

// ============================================================================
// Notification Sound Options
// ============================================================================

export const notificationSoundOptions = [
  { value: "default", label: "Default", file: "/sounds/notification.mp3" },
  { value: "chime", label: "Chime", file: "/sounds/chime.mp3" },
  { value: "bell", label: "Bell", file: "/sounds/bell.mp3" },
  { value: "pop", label: "Pop", file: "/sounds/pop.mp3" },
  { value: "none", label: "None", file: null },
];

// ============================================================================
// Timezone Options (common ones)
// ============================================================================

export const commonTimezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Asia/Shanghai", label: "China Standard Time (CST)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

// ============================================================================
// Language Options
// ============================================================================

export const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish (Espanol)" },
  { value: "fr", label: "French (Francais)" },
  { value: "de", label: "German (Deutsch)" },
  { value: "pt", label: "Portuguese (Portugues)" },
  { value: "it", label: "Italian (Italiano)" },
  { value: "nl", label: "Dutch (Nederlands)" },
  { value: "pl", label: "Polish (Polski)" },
  { value: "ru", label: "Russian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese (Simplified)" },
  { value: "ar", label: "Arabic" },
];
