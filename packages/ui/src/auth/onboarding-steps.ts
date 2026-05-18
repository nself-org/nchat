/**
 * Onboarding step definitions — inlined from @/lib/onboarding/onboarding-steps.
 *
 * @module auth/onboarding-steps
 */

import type { OnboardingStep, OnboardingStepId } from './onboarding-types';

// ============================================================================
// Step Definitions
// ============================================================================

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Get started with your team communication platform',
    icon: 'Sparkles',
    required: true,
    order: 0,
    estimatedTime: 30,
    canSkip: false,
  },
  {
    id: 'profile-setup',
    title: 'Set Up Profile',
    description: 'Tell your team a bit about yourself',
    icon: 'User',
    required: true,
    order: 1,
    estimatedTime: 60,
    canSkip: false,
  },
  {
    id: 'avatar-upload',
    title: 'Profile Picture',
    description: 'Upload a photo or use your initials',
    icon: 'Camera',
    required: false,
    order: 2,
    estimatedTime: 30,
    canSkip: true,
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Customize your chat experience',
    icon: 'Settings',
    required: false,
    order: 3,
    estimatedTime: 45,
    canSkip: true,
  },
  {
    id: 'notification-permission',
    title: 'Notifications',
    description: 'Enable notifications so you never miss a message',
    icon: 'Bell',
    required: false,
    order: 4,
    estimatedTime: 20,
    canSkip: true,
  },
  {
    id: 'join-channels',
    title: 'Join Channels',
    description: 'Find channels that interest you',
    icon: 'Hash',
    required: false,
    order: 5,
    estimatedTime: 60,
    canSkip: true,
  },
  {
    id: 'invite-team',
    title: 'Invite Team',
    description: 'Bring your teammates onboard',
    icon: 'UserPlus',
    required: false,
    order: 6,
    estimatedTime: 60,
    canSkip: true,
  },
  {
    id: 'tour',
    title: 'Take the Tour',
    description: 'Learn how to navigate the app',
    icon: 'Map',
    required: false,
    order: 7,
    estimatedTime: 120,
    canSkip: true,
  },
  {
    id: 'completion',
    title: "You're All Set!",
    description: 'Welcome to your new communication hub',
    icon: 'CheckCircle',
    required: true,
    order: 8,
    estimatedTime: 10,
    canSkip: false,
  },
];

// ============================================================================
// Helpers
// ============================================================================

export function getStepById(stepId: OnboardingStepId): OnboardingStep | undefined {
  return onboardingSteps.find((step) => step.id === stepId);
}

export function getNextStep(currentStepId: OnboardingStepId): OnboardingStep | undefined {
  const current = getStepById(currentStepId);
  if (!current) return undefined;
  return onboardingSteps.find((step) => step.order === current.order + 1);
}

export function getPreviousStep(currentStepId: OnboardingStepId): OnboardingStep | undefined {
  const current = getStepById(currentStepId);
  if (!current) return undefined;
  return onboardingSteps.find((step) => step.order === current.order - 1);
}

export function getStepIndex(stepId: OnboardingStepId): number {
  return onboardingSteps.findIndex((step) => step.id === stepId);
}

export function getStepIds(): OnboardingStepId[] {
  return onboardingSteps.map((step) => step.id);
}

export function canSkipStep(stepId: OnboardingStepId): boolean {
  return getStepById(stepId)?.canSkip ?? false;
}

export function isStepRequired(stepId: OnboardingStepId): boolean {
  return getStepById(stepId)?.required ?? false;
}

// ============================================================================
// Default Values
// ============================================================================

export const defaultOnboardingPreferences = {
  theme: 'system' as const,
  language: 'en',
  messageDensity: 'comfortable' as const,
  soundsEnabled: true,
  desktopNotifications: true,
  emailDigest: 'daily' as const,
  showOnlineStatus: true,
};

export const defaultNotificationSettings = {
  desktopNotifications: true,
  soundEnabled: true,
  mentionsOnly: false,
  dmNotifications: true,
  channelNotifications: true,
  muteSchedule: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
  },
};

export const defaultUserProfile = {
  displayName: '',
  fullName: '',
  bio: '',
  title: '',
  department: '',
  location: '',
  timezone: '',
  pronouns: '',
  phone: '',
  website: '',
};
