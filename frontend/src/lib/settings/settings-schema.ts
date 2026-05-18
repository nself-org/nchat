/**
 * Settings Schema - Zod schemas for settings validation
 */

import { z } from "zod";

// ============================================================================
// Enum Schemas
// ============================================================================

export const themeModeSchema = z.enum(["light", "dark", "system"]);
export const fontSizeSchema = z.enum([
  "small",
  "medium",
  "large",
  "extra-large",
]);
export const fontFamilySchema = z.enum(["system", "inter", "roboto", "mono"]);
export const messageDensitySchema = z.enum([
  "compact",
  "comfortable",
  "spacious",
]);
export const sidebarPositionSchema = z.enum(["left", "right"]);
export const notificationSoundSchema = z.enum([
  "default",
  "chime",
  "bell",
  "pop",
  "none",
]);
export const notificationPositionSchema = z.enum([
  "top-right",
  "top-left",
  "bottom-right",
  "bottom-left",
]);
export const onlineStatusVisibilitySchema = z.enum([
  "everyone",
  "contacts",
  "nobody",
]);
export const profileVisibilitySchema = z.enum(["public", "members", "private"]);
export const dmPermissionSchema = z.enum(["everyone", "members", "none"]);
export const contrastModeSchema = z.enum(["normal", "high", "higher"]);
export const timeFormatSchema = z.enum(["12h", "24h"]);
export const dateFormatSchema = z.enum(["mdy", "dmy", "ymd"]);
export const weekStartSchema = z.enum(["sunday", "monday"]);

// ============================================================================
// Account Settings Schema
// ============================================================================

export const accountSettingsSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  username: z.string().min(2).max(32).optional().or(z.literal("")),
  displayName: z.string().min(1).max(64).optional().or(z.literal("")),
  timezone: z.string(),
  language: z.string().length(2),
  twoFactorEnabled: z.boolean(),
});

// ============================================================================
// Appearance Settings Schema
// ============================================================================

export const appearanceSettingsSchema = z.object({
  theme: themeModeSchema,
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontSize: fontSizeSchema,
  fontFamily: fontFamilySchema,
  messageDensity: messageDensitySchema,
  sidebarPosition: sidebarPositionSchema,
  sidebarWidth: z.number().min(200).max(400),
  showAvatars: z.boolean(),
  showTimestamps: z.boolean(),
  compactMode: z.boolean(),
  animationsEnabled: z.boolean(),
  reduceMotion: z.boolean(),
  reduceTransparency: z.boolean(),
});

// ============================================================================
// Notification Type Schema
// ============================================================================

const notificationTypeSchema = z.object({
  enabled: z.boolean(),
  sound: notificationSoundSchema,
  desktop: z.boolean(),
});

// ============================================================================
// Notification Settings Schema
// ============================================================================

export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  sound: notificationSoundSchema,
  soundVolume: z.number().min(0).max(100),
  position: notificationPositionSchema,
  duration: z.number().min(1000).max(30000),
  showPreview: z.boolean(),
  showSender: z.boolean(),
  desktopNotifications: z.boolean(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  doNotDisturb: z.boolean(),
  doNotDisturbStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  doNotDisturbEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  mutedChannels: z.array(z.string()),
  mutedUsers: z.array(z.string()),
  mentions: notificationTypeSchema,
  directMessages: notificationTypeSchema,
  threads: notificationTypeSchema,
  reactions: notificationTypeSchema,
});

// ============================================================================
// Privacy Settings Schema
// ============================================================================

export const privacySettingsSchema = z.object({
  onlineStatus: onlineStatusVisibilitySchema,
  lastSeen: z.boolean(),
  readReceipts: z.boolean(),
  typingIndicator: z.boolean(),
  profileVisibility: profileVisibilitySchema,
  showEmail: z.boolean(),
  showBio: z.boolean(),
  showActivity: z.boolean(),
  dmPermission: dmPermissionSchema,
  allowInvites: z.boolean(),
  allowMentions: z.boolean(),
  blockList: z.array(z.string()),
});

// ============================================================================
// Accessibility Settings Schema
// ============================================================================

export const accessibilitySettingsSchema = z.object({
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
  contrastMode: contrastModeSchema,
  fontSize: fontSizeSchema,
  dyslexiaFont: z.boolean(),
  reduceTransparency: z.boolean(),
  alwaysShowFocus: z.boolean(),
  largerTargets: z.boolean(),
  showKeyboardHints: z.boolean(),
  screenReaderMode: z.boolean(),
  announceMessages: z.boolean(),
  preferCaptions: z.boolean(),
});

// ============================================================================
// Language Settings Schema
// ============================================================================

export const languageSettingsSchema = z.object({
  language: z.string().min(2).max(5),
  timezone: z.string(),
  timeFormat: timeFormatSchema,
  dateFormat: dateFormatSchema,
  weekStart: weekStartSchema,
  numberFormat: z.string(),
});

// ============================================================================
// Advanced Settings Schema
// ============================================================================

export const advancedSettingsSchema = z.object({
  developerMode: z.boolean(),
  showDebugInfo: z.boolean(),
  betaFeatures: z.boolean(),
  analyticsEnabled: z.boolean(),
  errorReporting: z.boolean(),
  cacheEnabled: z.boolean(),
  offlineMode: z.boolean(),
  autoUpdate: z.boolean(),
  syncEnabled: z.boolean(),
  syncFrequency: z.number().min(5000).max(300000),
});

// ============================================================================
// Combined User Settings Schema
// ============================================================================

export const userSettingsSchema = z.object({
  account: accountSettingsSchema,
  appearance: appearanceSettingsSchema,
  notifications: notificationSettingsSchema,
  privacy: privacySettingsSchema,
  accessibility: accessibilitySettingsSchema,
  language: languageSettingsSchema,
  advanced: advancedSettingsSchema,
});

// ============================================================================
// Partial Settings Schema (for updates)
// ============================================================================

export const partialUserSettingsSchema = z.object({
  account: accountSettingsSchema.partial().optional(),
  appearance: appearanceSettingsSchema.partial().optional(),
  notifications: notificationSettingsSchema.partial().optional(),
  privacy: privacySettingsSchema.partial().optional(),
  accessibility: accessibilitySettingsSchema.partial().optional(),
  language: languageSettingsSchema.partial().optional(),
  advanced: advancedSettingsSchema.partial().optional(),
});

// ============================================================================
// Settings Export Schema
// ============================================================================

export const settingsExportSchema = z.object({
  version: z.string(),
  exportedAt: z.string().datetime(),
  settings: partialUserSettingsSchema,
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type AccountSettingsInput = z.infer<typeof accountSettingsSchema>;
export type AppearanceSettingsInput = z.infer<typeof appearanceSettingsSchema>;
export type NotificationSettingsInput = z.infer<
  typeof notificationSettingsSchema
>;
export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;
export type AccessibilitySettingsInput = z.infer<
  typeof accessibilitySettingsSchema
>;
export type LanguageSettingsInput = z.infer<typeof languageSettingsSchema>;
export type AdvancedSettingsInput = z.infer<typeof advancedSettingsSchema>;
export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
export type PartialUserSettingsInput = z.infer<
  typeof partialUserSettingsSchema
>;
export type SettingsExportInput = z.infer<typeof settingsExportSchema>;
