/**
 * Settings domain barrel export.
 *
 * Type aliases are used where type names collide with component names:
 * - ThemeSettings (type) → ThemeSettingsData
 * - I18nSettings (type) → I18nSettingsData
 * - PrivacySettings (type) → PrivacySettingsData
 *
 * @module settings
 */

// Types (aliased where name collides with component export)
export type {
  ThemeMode,
  ThemeAccent,
  ThemeSettings as ThemeSettingsData,
  ProfileData,
  ProfileUpdatePayload,
  NotificationLevel,
  NotificationSound,
  GlobalNotificationSettings,
  ChannelNotificationOverride,
  LocaleInfo,
  I18nSettings as I18nSettingsData,
  PrivacySettings as PrivacySettingsData,
} from './types'

// Layout
export { SettingsLayout, SettingsSectionCard, SettingsSectionPlain, SettingsRow } from './settings-layout'
export type { SettingsSection, SettingsLayoutProps, SettingsSectionProps, SettingsRowProps } from './settings-layout'

// Profile
export { ProfileSettings } from './profile-settings'
export type { ProfileSettingsAdapter, ProfileSettingsProps } from './profile-settings'

// Theme
export { ThemeSettings } from './theme-settings'
export type { ThemeSettingsAdapter, ThemeSettingsProps } from './theme-settings'

// Notifications
export { NotificationSettings } from './notification-settings'
export type { NotificationSettingsAdapter, NotificationSettingsProps } from './notification-settings'

// i18n
export { I18nSettings } from './i18n-settings'
export type { I18nSettingsAdapter, I18nSettingsProps } from './i18n-settings'

// Privacy
export { PrivacySettings } from './privacy-settings'
export type { PrivacySettingsAdapter, PrivacySettingsProps } from './privacy-settings'

// Billing / workspace / white-label (sub-domain)
export {
  BillingSettings,
  WorkspaceSettings,
  WhiteLabelSettings,
} from './billing'
export type {
  BillingInterval,
  SubscriptionStatus,
  PlanInfo,
  SubscriptionInfo,
  PaymentMethod,
  Invoice,
  WorkspaceSettingsData,
  WorkspaceUpdatePayload,
  WhiteLabelSettingsData,
  WhiteLabelUpdatePayload,
  BillingSettingsAdapter,
  BillingSettingsProps,
  WorkspaceSettingsAdapter,
  WorkspaceSettingsProps,
  WhiteLabelSettingsAdapter,
  WhiteLabelSettingsProps,
} from './billing'
