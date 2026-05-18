/**
 * @nself-chat/ui — auth domain barrel export.
 *
 * Re-exports all auth, onboarding, security, and tour components/types.
 *
 * @module auth
 */

// Guards
export { AuthGuard, GuestGuard, withAuthGuard } from './auth-guard';
export type { AuthGuardProps, AuthState, GuestGuardProps, UseAuthGuardOptions, UseGuestGuardOptions } from './auth-guard';

export { RoleGuard, AuthRoleGuard, withRoleGuard } from './role-guard';
export type { RoleGuardProps, UserRole, Permission, UseRoleGuardOptions } from './role-guard';

export { SetupGuard, RequireSetupComplete, RequireSetupIncomplete } from './setup-guard';
export type { SetupGuardProps, SetupConfig, RequireSetupCompleteProps, RequireSetupIncompleteProps } from './setup-guard';

// PIN security
export { PinLock } from './pin-lock';
export type { PinLockAdapter, PinLockProps } from './pin-lock';

export { PinLockWrapper } from './pin-lock-wrapper';
export type { PinLockWrapperProps, PinLockStateAdapter } from './pin-lock-wrapper';

export { PinSetup } from './pin-setup';
export type {
  PinSetupAdapter,
  PinSetupProps,
  PinSettings as PinSetupSettings,
  PinStrength,
} from './pin-setup';

export { PinManage } from './pin-manage';
export type {
  PinManageAdapter,
  PinManageProps,
  PinSettings,
  BiometricCredential,
  FailedAttempt,
} from './pin-manage';

// Two-factor
export { TwoFactorVerify } from './two-factor-verify';
export type { TwoFactorVerifyProps } from './two-factor-verify';

export { TwoFactorSetup } from './two-factor-setup';
export type { TwoFactorSetupAdapter, TwoFactorSetupProps } from './two-factor-setup';

// Identity verification
export { IDmeVerification } from './idme-verification';
export type {
  IDmeVerificationAdapter,
  IDmeVerificationProps,
  IDmeVerificationStatus,
} from './idme-verification';

// Encryption
export {
  EncryptionBadge,
  EncryptionIcon,
  ChannelEncryptionStatus,
  MessageEncryptionIndicator,
} from './encryption-badge';
export type {
  EncryptionLevel,
  EncryptionBadgeProps,
  ChannelEncryptionStatusProps,
  MessageEncryptionIndicatorProps,
} from './encryption-badge';

// Onboarding types + data
export { onboardingSteps, defaultOnboardingPreferences, defaultNotificationSettings, defaultUserProfile } from './onboarding-steps';
export type { OnboardingStepId, OnboardingStep, OnboardingPreferences, NotificationSettings, UserProfile } from './onboarding-types';

// OnboardingAdapter is defined in onboarding-wizard
export type { OnboardingAdapter } from './onboarding-wizard';

// Onboarding wizard
export { OnboardingWizard } from './onboarding-wizard';
export type { OnboardingWizardProps } from './onboarding-wizard';

// Progress indicator
export { ProgressIndicator } from './progress-indicator';
export type { ProgressIndicatorProps } from './progress-indicator';

// Onboarding steps (individual)
export { WelcomeStep } from './welcome-step';
export { ProfileSetupStep } from './profile-setup-step';
export { AvatarUploadStep } from './avatar-upload-step';
export { PreferencesStep } from './preferences-step';
export { NotificationPermissionStep } from './notification-permission-step';
export { JoinChannelsStep } from './join-channels-step';
export { InviteTeamStep } from './invite-team-step';
export { TourStep } from './tour-step';
export { CompletionStep } from './completion-step';

// Tour components
export { TourOverlay } from './tour-overlay';
export type { TourAdapter, TourState, TourOverlayProps } from './tour-overlay';

export { TourHighlight } from './tour-highlight';
export type { TourHighlightProps } from './tour-highlight';

export { TourTooltip } from './tour-tooltip';
export type { TourTooltipProps } from './tour-tooltip';

export { TourNavigation } from './tour-navigation';
export type { TourNavigationProps } from './tour-navigation';

export { TourStepIndicator } from './tour-step-indicator';
export type { TourStepIndicatorProps } from './tour-step-indicator';

// Tour utilities
export { getElementPosition, calculateTooltipPosition, scrollToElement } from './tour-utils';

// Feature discovery
export { default as FeatureSpotlight } from './feature-spotlight';
export type { FeatureSpotlightProps, FeatureSpotlightTip } from './feature-spotlight';

export { FeatureTip } from './feature-tip';
export type { FeatureTipProps } from './feature-tip';

export { ProTip } from './pro-tip';
export type { ProTip as ProTipType, ProTipProps } from './pro-tip';

export { KeyboardShortcutTip } from './keyboard-shortcut-tip';
export type { KeyboardShortcutTipProps } from './keyboard-shortcut-tip';

export { WhatsNewModal } from './whats-new-modal';
export type {
  WhatsNewAdapter,
  WhatsNewItem,
  WhatsNewModalProps,
} from './whats-new-modal';
