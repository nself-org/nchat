/**
 * Onboarding types — inlined from @/lib/onboarding/onboarding-types.
 *
 * No dependency on Next.js or app internals.
 *
 * @module auth/onboarding-types
 */

// ============================================================================
// Step IDs / Statuses
// ============================================================================

export type OnboardingStepId =
  | 'welcome'
  | 'profile-setup'
  | 'avatar-upload'
  | 'preferences'
  | 'notification-permission'
  | 'join-channels'
  | 'invite-team'
  | 'tour'
  | 'completion';

export type OnboardingStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  order: number;
  estimatedTime?: number;
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
// Onboarding State
// ============================================================================

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingState {
  userId: string;
  status: OnboardingStatus;
  currentStepId: OnboardingStepId;
  steps: OnboardingStepState[];
  startedAt?: Date;
  completedAt?: Date;
  skippedAt?: Date;
  version: number;
}

// ============================================================================
// Profile / Preferences / Notifications
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

export interface OnboardingPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  messageDensity: 'compact' | 'comfortable' | 'spacious';
  soundsEnabled: boolean;
  desktopNotifications: boolean;
  emailDigest: 'none' | 'daily' | 'weekly';
  showOnlineStatus: boolean;
}

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied';

export interface NotificationSettings {
  desktopNotifications: boolean;
  soundEnabled: boolean;
  mentionsOnly: boolean;
  dmNotifications: boolean;
  channelNotifications: boolean;
  muteSchedule?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

// ============================================================================
// Channel / Team Invite
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

export interface TeamInvitation {
  email: string;
  role?: 'member' | 'admin' | 'moderator';
  message?: string;
}

export interface InvitationResult {
  email: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Tour
// ============================================================================

export type TourStopId =
  | 'sidebar-navigation'
  | 'channel-list'
  | 'message-composer'
  | 'reactions-threads'
  | 'search'
  | 'settings'
  | 'keyboard-shortcuts'
  | 'mentions-notifications';

export type TourStatus = 'not_started' | 'in_progress' | 'completed' | 'dismissed';

export interface TourStop {
  id: TourStopId;
  title: string;
  description: string;
  targetSelector: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number;
  order: number;
  action?: { label: string; handler: string };
  media?: { type: 'image' | 'video' | 'gif'; url: string; alt?: string };
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

// ============================================================================
// Feature Discovery
// ============================================================================

export type FeatureId =
  | 'threads'
  | 'reactions'
  | 'mentions'
  | 'file-upload'
  | 'voice-messages'
  | 'scheduled-messages'
  | 'search-filters'
  | 'keyboard-shortcuts'
  | 'channel-bookmarks'
  | 'message-pinning'
  | 'custom-status'
  | 'do-not-disturb';

export type FeatureTipType = 'spotlight' | 'tooltip' | 'modal' | 'inline';

export interface FeatureTip {
  id: string;
  featureId: FeatureId;
  type: FeatureTipType;
  title: string;
  description: string;
  targetSelector?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  priority: number;
  triggerCondition?: string;
  dismissible: boolean;
  showOnce: boolean;
}

export interface WhatsNewItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
  learnMoreUrl?: string;
  releaseDate: Date;
  category: 'feature' | 'improvement' | 'fix';
}

// ============================================================================
// Component Props
// ============================================================================

export interface OnboardingStepProps {
  onNext: () => void;
  onPrev: () => void;
  onSkip?: () => void;
  isFirst: boolean;
  isLast: boolean;
  canSkip: boolean;
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
