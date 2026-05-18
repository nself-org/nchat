/**
 * Settings Types - TypeScript definitions for the settings system
 */

// ============================================================================
// Base Setting Types
// ============================================================================

export type SettingType =
  | "toggle"
  | "select"
  | "input"
  | "slider"
  | "color"
  | "radio"
  | "textarea";

export interface BaseSetting {
  id: string;
  label: string;
  description?: string;
  category: string;
  subcategory?: string;
  type: SettingType;
  disabled?: boolean;
  hidden?: boolean;
  premium?: boolean;
  tags?: string[];
}

export interface ToggleSetting extends BaseSetting {
  type: "toggle";
  value: boolean;
  defaultValue: boolean;
}

export interface SelectSetting extends BaseSetting {
  type: "select";
  value: string;
  defaultValue: string;
  options: SelectOption[];
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
}

export interface InputSetting extends BaseSetting {
  type: "input";
  value: string;
  defaultValue: string;
  placeholder?: string;
  inputType?: "text" | "email" | "password" | "url" | "tel";
  pattern?: string;
  minLength?: number;
  maxLength?: number;
}

export interface SliderSetting extends BaseSetting {
  type: "slider";
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  showValue?: boolean;
}

export interface ColorSetting extends BaseSetting {
  type: "color";
  value: string;
  defaultValue: string;
  presets?: string[];
  allowCustom?: boolean;
}

export interface RadioSetting extends BaseSetting {
  type: "radio";
  value: string;
  defaultValue: string;
  options: RadioOption[];
  layout?: "vertical" | "horizontal" | "grid";
}

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface TextareaSetting extends BaseSetting {
  type: "textarea";
  value: string;
  defaultValue: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export type Setting =
  | ToggleSetting
  | SelectSetting
  | InputSetting
  | SliderSetting
  | ColorSetting
  | RadioSetting
  | TextareaSetting;

// ============================================================================
// Settings Categories
// ============================================================================

export interface SettingsCategory {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  href: string;
  order: number;
}

export interface SettingsSubcategory {
  id: string;
  label: string;
  description?: string;
  categoryId: string;
  order: number;
}

// ============================================================================
// Account Settings
// ============================================================================

export interface AccountSettings {
  email: string;
  username: string;
  displayName: string;
  timezone: string;
  language: string;
  twoFactorEnabled: boolean;
}

// ============================================================================
// Appearance Settings
// ============================================================================

export type ThemeMode = "light" | "dark" | "system";
export type FontSize = "small" | "medium" | "large" | "extra-large";
export type FontFamily = "system" | "inter" | "roboto" | "mono";
export type MessageDensity = "compact" | "comfortable" | "spacious";
export type SidebarPosition = "left" | "right";

export interface AppearanceSettings {
  theme: ThemeMode;
  accentColor: string;
  fontSize: FontSize;
  fontFamily: FontFamily;
  messageDensity: MessageDensity;
  sidebarPosition: SidebarPosition;
  sidebarWidth: number;
  showAvatars: boolean;
  showTimestamps: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
}

// ============================================================================
// Notification Settings
// ============================================================================

export type NotificationSound = "default" | "chime" | "bell" | "pop" | "none";
export type NotificationPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

export interface NotificationSettings {
  enabled: boolean;
  sound: NotificationSound;
  soundVolume: number;
  position: NotificationPosition;
  duration: number;
  showPreview: boolean;
  showSender: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  doNotDisturb: boolean;
  doNotDisturbStart: string;
  doNotDisturbEnd: string;
  mutedChannels: string[];
  mutedUsers: string[];
  mentions: {
    enabled: boolean;
    sound: NotificationSound;
    desktop: boolean;
  };
  directMessages: {
    enabled: boolean;
    sound: NotificationSound;
    desktop: boolean;
  };
  threads: {
    enabled: boolean;
    sound: NotificationSound;
    desktop: boolean;
  };
  reactions: {
    enabled: boolean;
    sound: NotificationSound;
    desktop: boolean;
  };
}

// ============================================================================
// Privacy Settings
// ============================================================================

export type OnlineStatusVisibility = "everyone" | "contacts" | "nobody";
export type ProfileVisibility = "public" | "members" | "private";
export type DMPermission = "everyone" | "members" | "none";

export interface PrivacySettings {
  onlineStatus: OnlineStatusVisibility;
  lastSeen: boolean;
  readReceipts: boolean;
  typingIndicator: boolean;
  profileVisibility: ProfileVisibility;
  showEmail: boolean;
  showBio: boolean;
  showActivity: boolean;
  dmPermission: DMPermission;
  allowInvites: boolean;
  allowMentions: boolean;
  blockList: string[];
}

// ============================================================================
// Accessibility Settings
// ============================================================================

export type ContrastMode = "normal" | "high" | "higher";

export interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  contrastMode: ContrastMode;
  fontSize: FontSize;
  dyslexiaFont: boolean;
  reduceTransparency: boolean;
  alwaysShowFocus: boolean;
  largerTargets: boolean;
  showKeyboardHints: boolean;
  screenReaderMode: boolean;
  announceMessages: boolean;
  preferCaptions: boolean;
}

// ============================================================================
// Language & Region Settings
// ============================================================================

export type TimeFormat = "12h" | "24h";
export type DateFormat = "mdy" | "dmy" | "ymd";
export type WeekStart = "sunday" | "monday";

export interface LanguageSettings {
  language: string;
  timezone: string;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  weekStart: WeekStart;
  numberFormat: string;
}

// ============================================================================
// Advanced Settings
// ============================================================================

export interface AdvancedSettings {
  developerMode: boolean;
  showDebugInfo: boolean;
  betaFeatures: boolean;
  analyticsEnabled: boolean;
  errorReporting: boolean;
  cacheEnabled: boolean;
  offlineMode: boolean;
  autoUpdate: boolean;
  syncEnabled: boolean;
  syncFrequency: number;
}

// ============================================================================
// Combined Settings State
// ============================================================================

export interface UserSettings {
  account: AccountSettings;
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
  language: LanguageSettings;
  advanced: AdvancedSettings;
}

// ============================================================================
// Sync Status
// ============================================================================

export interface SyncStatus {
  lastSyncedAt: string | null;
  isSyncing: boolean;
  hasLocalChanges: boolean;
  error: string | null;
}

// ============================================================================
// Settings Metadata
// ============================================================================

export interface SettingsMetadata {
  version: string;
  lastUpdated: string;
  syncedAt?: string;
  deviceId?: string;
}

// ============================================================================
// Export/Import
// ============================================================================

export interface SettingsExport {
  version: string;
  exportedAt: string;
  settings: Partial<UserSettings>;
  metadata?: Record<string, unknown>;
}

export interface SettingsImportResult {
  success: boolean;
  imported: string[];
  errors: string[];
  warnings: string[];
}
