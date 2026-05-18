/**
 * Onboarding Steps - Step definitions for the onboarding wizard
 *
 * Defines all onboarding steps with their metadata and configuration
 */

import type { OnboardingStep, OnboardingStepId } from "./onboarding-types";

// ============================================================================
// Step Definitions
// ============================================================================

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to nchat",
    description: "Get started with your team communication platform",
    icon: "Sparkles",
    required: true,
    order: 0,
    estimatedTime: 30,
    canSkip: false,
  },
  {
    id: "profile-setup",
    title: "Set Up Your Profile",
    description: "Tell us a bit about yourself so your team knows who you are",
    icon: "User",
    required: true,
    order: 1,
    estimatedTime: 60,
    canSkip: false,
  },
  {
    id: "avatar-upload",
    title: "Add a Profile Picture",
    description: "Upload a photo or use your initials",
    icon: "Camera",
    required: false,
    order: 2,
    estimatedTime: 30,
    canSkip: true,
  },
  {
    id: "preferences",
    title: "Set Your Preferences",
    description: "Customize your chat experience",
    icon: "Settings",
    required: false,
    order: 3,
    estimatedTime: 45,
    canSkip: true,
  },
  {
    id: "notification-permission",
    title: "Stay in the Loop",
    description: "Enable notifications so you never miss important messages",
    icon: "Bell",
    required: false,
    order: 4,
    estimatedTime: 20,
    canSkip: true,
  },
  {
    id: "join-channels",
    title: "Join Channels",
    description: "Find channels that interest you and join the conversation",
    icon: "Hash",
    required: false,
    order: 5,
    estimatedTime: 60,
    canSkip: true,
  },
  {
    id: "invite-team",
    title: "Invite Your Team",
    description: "Bring your teammates to nchat",
    icon: "UserPlus",
    required: false,
    order: 6,
    estimatedTime: 60,
    canSkip: true,
  },
  {
    id: "tour",
    title: "Take the Tour",
    description: "Learn how to navigate and use nchat effectively",
    icon: "Map",
    required: false,
    order: 7,
    estimatedTime: 120,
    canSkip: true,
  },
  {
    id: "completion",
    title: "You're All Set!",
    description: "Welcome to your new team communication hub",
    icon: "CheckCircle",
    required: true,
    order: 8,
    estimatedTime: 10,
    canSkip: false,
  },
];

// ============================================================================
// Step Helpers
// ============================================================================

/**
 * Get a step by its ID
 */
export function getStepById(
  stepId: OnboardingStepId,
): OnboardingStep | undefined {
  return onboardingSteps.find((step) => step.id === stepId);
}

/**
 * Get the next step after the given step ID
 */
export function getNextStep(
  currentStepId: OnboardingStepId,
): OnboardingStep | undefined {
  const currentStep = getStepById(currentStepId);
  if (!currentStep) return undefined;
  return onboardingSteps.find((step) => step.order === currentStep.order + 1);
}

/**
 * Get the previous step before the given step ID
 */
export function getPreviousStep(
  currentStepId: OnboardingStepId,
): OnboardingStep | undefined {
  const currentStep = getStepById(currentStepId);
  if (!currentStep) return undefined;
  return onboardingSteps.find((step) => step.order === currentStep.order - 1);
}

/**
 * Get all required steps
 */
export function getRequiredSteps(): OnboardingStep[] {
  return onboardingSteps.filter((step) => step.required);
}

/**
 * Get all optional steps
 */
export function getOptionalSteps(): OnboardingStep[] {
  return onboardingSteps.filter((step) => !step.required);
}

/**
 * Get the total number of steps
 */
export function getTotalSteps(): number {
  return onboardingSteps.length;
}

/**
 * Get step index by ID
 */
export function getStepIndex(stepId: OnboardingStepId): number {
  return onboardingSteps.findIndex((step) => step.id === stepId);
}

/**
 * Get step by index
 */
export function getStepByIndex(index: number): OnboardingStep | undefined {
  return onboardingSteps[index];
}

/**
 * Calculate total estimated time for all steps
 */
export function getTotalEstimatedTime(): number {
  return onboardingSteps.reduce(
    (total, step) => total + (step.estimatedTime || 0),
    0,
  );
}

/**
 * Get step IDs in order
 */
export function getStepIds(): OnboardingStepId[] {
  return onboardingSteps.map((step) => step.id);
}

/**
 * Check if a step can be skipped
 */
export function canSkipStep(stepId: OnboardingStepId): boolean {
  const step = getStepById(stepId);
  return step?.canSkip ?? false;
}

/**
 * Check if a step is required
 */
export function isStepRequired(stepId: OnboardingStepId): boolean {
  const step = getStepById(stepId);
  return step?.required ?? false;
}

// ============================================================================
// Step Validation
// ============================================================================

export interface StepValidationResult {
  isValid: boolean;
  errors: string[];
}

export type StepValidator = (
  data: Record<string, unknown>,
) => StepValidationResult;

/**
 * Validation functions for each step
 */
export const stepValidators: Partial<Record<OnboardingStepId, StepValidator>> =
  {
    "profile-setup": (data) => {
      const errors: string[] = [];

      if (!data.displayName || typeof data.displayName !== "string") {
        errors.push("Display name is required");
      } else if ((data.displayName as string).length < 2) {
        errors.push("Display name must be at least 2 characters");
      } else if ((data.displayName as string).length > 50) {
        errors.push("Display name must be less than 50 characters");
      }

      return { isValid: errors.length === 0, errors };
    },

    "avatar-upload": (data) => {
      const errors: string[] = [];

      // Avatar is optional, so no validation errors
      if (data.file && data.file instanceof File) {
        const file = data.file as File;
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ];

        if (file.size > maxSize) {
          errors.push("Image must be less than 5MB");
        }

        if (!allowedTypes.includes(file.type)) {
          errors.push("Image must be JPEG, PNG, GIF, or WebP");
        }
      }

      return { isValid: errors.length === 0, errors };
    },

    preferences: () => {
      // Preferences always valid as they have defaults
      return { isValid: true, errors: [] };
    },

    "notification-permission": () => {
      // No validation needed, permission is optional
      return { isValid: true, errors: [] };
    },

    "join-channels": () => {
      // No validation needed, channels are optional
      return { isValid: true, errors: [] };
    },

    "invite-team": (data) => {
      const errors: string[] = [];

      if (data.invitations && Array.isArray(data.invitations)) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        (data.invitations as { email: string }[]).forEach(
          (invitation, index) => {
            if (invitation.email && !emailRegex.test(invitation.email)) {
              errors.push(`Invalid email address at position ${index + 1}`);
            }
          },
        );
      }

      return { isValid: errors.length === 0, errors };
    },
  };

/**
 * Validate step data
 */
export function validateStep(
  stepId: OnboardingStepId,
  data: Record<string, unknown>,
): StepValidationResult {
  const validator = stepValidators[stepId];

  if (!validator) {
    return { isValid: true, errors: [] };
  }

  return validator(data);
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default onboarding preferences
 */
export const defaultOnboardingPreferences = {
  theme: "system" as const,
  language: "en",
  messageDensity: "comfortable" as const,
  soundsEnabled: true,
  desktopNotifications: true,
  emailDigest: "daily" as const,
  showOnlineStatus: true,
};

/**
 * Default notification settings
 */
export const defaultNotificationSettings = {
  desktopNotifications: true,
  soundEnabled: true,
  mentionsOnly: false,
  dmNotifications: true,
  channelNotifications: true,
  muteSchedule: {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00",
  },
};

/**
 * Default user profile
 */
export const defaultUserProfile = {
  displayName: "",
  fullName: "",
  bio: "",
  title: "",
  department: "",
  location: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  pronouns: "",
  phone: "",
  website: "",
};
