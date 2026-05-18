/**
 * Onboarding Types - TypeScript definitions for the onboarding system
 *
 * Defines all types for onboarding wizard, product tour, and feature discovery
 */

// ============================================================================
// Onboarding Step Types
// ============================================================================

export type OnboardingStepId =
  | "welcome"
  | "profile-setup"
  | "avatar-upload"
  | "preferences"
  | "notification-permission"
  | "join-channels"
  | "invite-team"
  | "tour"
  | "completion";

export type OnboardingStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  order: number;
  estimatedTime?: number; // in seconds
  canSkip: boolean;
}

export interface OnboardingStepState {
  stepId: OnboardingStepId;
  status: OnboardingStepStatus;
  completedAt?: Date;
  skippedAt?: Date;
  data?: Record<string, unknown>;
}

// ============================================================================
// Onboarding State Types
// ============================================================================

export type OnboardingStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped";

export interface OnboardingState {
  userId: string;
  status: OnboardingStatus;
  currentStepId: OnboardingStepId;
  steps: OnboardingStepState[];
  startedAt?: Date;
  completedAt?: Date;
  skippedAt?: Date;
  version: number; // For tracking onboarding version changes
}

export interface OnboardingProgress {
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  percentComplete: number;
  currentStep: OnboardingStep | null;
  nextStep: OnboardingStep | null;
}

// ============================================================================
// Profile Setup Types
// ============================================================================

export interface UserProfile {
  displayName: string;
  fullName?: string;
  bio?: string;
  title?: string;
  department?: string;
  location?: string;
  timezone?: string;
  pronouns?: string;
  phone?: string;
  website?: string;
}

export interface AvatarUploadData {
  file?: File;
  url?: string;
  useInitials: boolean;
  initialsColor?: string;
  initialsBackground?: string;
}

// ============================================================================
// Preferences Types
// ============================================================================

export interface OnboardingPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  messageDensity: "compact" | "comfortable" | "spacious";
  soundsEnabled: boolean;
  desktopNotifications: boolean;
  emailDigest: "none" | "daily" | "weekly";
  showOnlineStatus: boolean;
}

// ============================================================================
// Notification Permission Types
// ============================================================================

export type NotificationPermissionStatus = "default" | "granted" | "denied";

export interface NotificationSettings {
  desktopNotifications: boolean;
  soundEnabled: boolean;
  mentionsOnly: boolean;
  dmNotifications: boolean;
  channelNotifications: boolean;
  muteSchedule?: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;
  };
}

// ============================================================================
// Channel Suggestions Types
// ============================================================================

export interface SuggestedChannel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  memberCount: number;
  category?: string;
  isDefault: boolean;
  isRecommended: boolean;
}

export interface ChannelJoinSelection {
  channelId: string;
  joined: boolean;
}

// ============================================================================
// Team Invitation Types
// ============================================================================

export interface TeamInvitation {
  email: string;
  role?: "member" | "admin" | "moderator";
  message?: string;
}

export interface InvitationResult {
  email: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Tour Types
// ============================================================================

export type TourStopId =
  | "sidebar-navigation"
  | "channel-list"
  | "message-composer"
  | "reactions-threads"
  | "search"
  | "settings"
  | "keyboard-shortcuts"
  | "mentions-notifications";

export type TourStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "dismissed";

export interface TourStop {
  id: TourStopId;
  title: string;
  description: string;
  targetSelector: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
  spotlightPadding?: number;
  order: number;
  action?: {
    label: string;
    handler: string; // Function name to call
  };
  media?: {
    type: "image" | "video" | "gif";
    url: string;
    alt?: string;
  };
}

export interface TourState {
  userId: string;
  status: TourStatus;
  currentStopId: TourStopId | null;
  completedStops: TourStopId[];
  startedAt?: Date;
  completedAt?: Date;
  dismissedAt?: Date;
}

export interface TourProgress {
  totalStops: number;
  completedStops: number;
  percentComplete: number;
  currentStop: TourStop | null;
  nextStop: TourStop | null;
  prevStop: TourStop | null;
}

// ============================================================================
// Feature Discovery Types
// ============================================================================

export type FeatureId =
  | "threads"
  | "reactions"
  | "mentions"
  | "file-upload"
  | "voice-messages"
  | "scheduled-messages"
  | "search-filters"
  | "keyboard-shortcuts"
  | "channel-bookmarks"
  | "message-pinning"
  | "custom-status"
  | "do-not-disturb";

export type FeatureTipType = "spotlight" | "tooltip" | "modal" | "inline";

export interface FeatureTip {
  id: string;
  featureId: FeatureId;
  type: FeatureTipType;
  title: string;
  description: string;
  targetSelector?: string;
  placement?: "top" | "bottom" | "left" | "right";
  priority: number;
  triggerCondition?: string; // Condition to show the tip
  dismissible: boolean;
  showOnce: boolean;
}

export interface FeatureDiscoveryState {
  userId: string;
  discoveredFeatures: FeatureId[];
  dismissedTips: string[];
  seenTips: string[];
  lastTipShownAt?: Date;
}

export interface WhatsNewItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
  learnMoreUrl?: string;
  releaseDate: Date;
  category: "feature" | "improvement" | "fix";
}

export interface WhatsNewState {
  lastSeenVersion: string;
  seenItems: string[];
  dismissedUntil?: Date;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface OnboardingAnalyticsEvent {
  eventType:
    | "step_started"
    | "step_completed"
    | "step_skipped"
    | "onboarding_completed"
    | "onboarding_abandoned";
  stepId?: OnboardingStepId;
  timestamp: Date;
  duration?: number; // Time spent on step in seconds
  metadata?: Record<string, unknown>;
}

export interface TourAnalyticsEvent {
  eventType:
    | "tour_started"
    | "tour_completed"
    | "tour_dismissed"
    | "stop_viewed"
    | "stop_skipped";
  stopId?: TourStopId;
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface FeatureDiscoveryAnalyticsEvent {
  eventType: "tip_shown" | "tip_dismissed" | "tip_clicked" | "feature_used";
  featureId: FeatureId;
  tipId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Admin Configuration Types
// ============================================================================

export interface OnboardingConfig {
  enabled: boolean;
  requiredSteps: OnboardingStepId[];
  optionalSteps: OnboardingStepId[];
  defaultChannels: string[]; // Channel IDs to auto-join
  customWelcomeMessage?: string;
  customCompletionMessage?: string;
  showTourOnCompletion: boolean;
  allowSkipAll: boolean;
  collectAnalytics: boolean;
  version: number;
}

export interface TourConfig {
  enabled: boolean;
  autoStartAfterOnboarding: boolean;
  allowDismiss: boolean;
  stops: TourStopId[];
}

export interface FeatureDiscoveryConfig {
  enabled: boolean;
  showProTips: boolean;
  showKeyboardShortcutTips: boolean;
  tipFrequency: "always" | "daily" | "weekly" | "first_time_only";
  maxTipsPerSession: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface OnboardingWizardProps {
  initialStep?: OnboardingStepId;
  onComplete?: () => void;
  onSkip?: () => void;
}

export interface OnboardingStepProps {
  onNext: () => void;
  onPrev: () => void;
  onSkip?: () => void;
  isFirst: boolean;
  isLast: boolean;
  canSkip: boolean;
}

export interface TourOverlayProps {
  isActive: boolean;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export interface TourTooltipProps {
  stop: TourStop;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  currentIndex: number;
  totalStops: number;
}

export interface FeatureSpotlightProps {
  featureId: FeatureId;
  tip: FeatureTip;
  onDismiss: () => void;
  onLearnMore?: () => void;
}

export interface WhatsNewModalProps {
  items: WhatsNewItem[];
  onClose: () => void;
  onDismiss?: () => void;
}
