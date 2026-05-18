/**
 * useOnboarding Hook - Convenient hook for onboarding functionality
 *
 * Provides easy access to onboarding state and actions
 */

import { useCallback, useMemo, useEffect } from "react";
import { useOnboardingStore } from "@/stores/onboarding-store";
import type {
  OnboardingStepId,
  OnboardingProgress,
} from "@/lib/onboarding/onboarding-types";
import { getStepById, canSkipStep } from "@/lib/onboarding/onboarding-steps";

interface UseOnboardingOptions {
  /**
   * User ID for initializing onboarding
   */
  userId?: string;
  /**
   * Auto-initialize onboarding on mount
   */
  autoInit?: boolean;
  /**
   * Callback when onboarding is completed
   */
  onComplete?: () => void;
  /**
   * Callback when onboarding is skipped
   */
  onSkip?: () => void;
}

interface UseOnboardingReturn {
  // State
  isLoading: boolean;
  isActive: boolean;
  isCompleted: boolean;
  currentStep: OnboardingStepId | null;
  currentStepData: ReturnType<typeof getStepById> | null;
  progress: OnboardingProgress | null;
  canSkipCurrentStep: boolean;

  // Form data - using Record types for flexibility
  profileData: Record<string, unknown>;
  preferencesData: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
  selectedChannels: string[];
  teamInvitations: { email: string; role?: "admin" | "moderator" | "member" }[];

  // Actions
  start: () => void;
  next: (data?: Record<string, unknown>) => void;
  previous: () => void;
  skip: () => void;
  skipAll: () => void;
  goTo: (stepId: OnboardingStepId) => void;
  reset: () => void;

  // Form actions
  updateProfile: (data: Record<string, unknown>) => void;
  updatePreferences: (data: Record<string, unknown>) => void;
  updateNotifications: (data: Record<string, unknown>) => void;
  selectChannels: (channelIds: string[]) => void;
  toggleChannel: (channelId: string) => void;
  addInvitation: (invitation: {
    email: string;
    role?: "admin" | "moderator" | "member";
  }) => void;
  removeInvitation: (email: string) => void;
}

export function useOnboarding(
  options: UseOnboardingOptions = {},
): UseOnboardingReturn {
  const { userId, autoInit = true, onComplete, onSkip } = options;

  const {
    onboarding,
    isLoading,
    profileData,
    preferencesData,
    notificationSettings,
    selectedChannels,
    teamInvitations,
    initialize,
    startOnboarding,
    completeStep,
    skipStep,
    previousStep,
    goToStep,
    skipAllOnboarding,
    resetOnboarding,
    updateProfileData,
    updatePreferencesData,
    updateNotificationSettings,
    setSelectedChannels,
    toggleChannelSelection,
    addTeamInvitation,
    removeTeamInvitation,
    getOnboardingProgress,
  } = useOnboardingStore();

  // Initialize on mount if userId provided and autoInit enabled
  useEffect(() => {
    if (autoInit && userId) {
      initialize(userId);
    }
  }, [autoInit, userId, initialize]);

  // Watch for completion
  useEffect(() => {
    if (onboarding?.status === "completed" && onComplete) {
      onComplete();
    }
    if (onboarding?.status === "skipped" && onSkip) {
      onSkip();
    }
  }, [onboarding?.status, onComplete, onSkip]);

  // Computed state
  const isActive = onboarding?.status === "in_progress";
  const isCompleted =
    onboarding?.status === "completed" || onboarding?.status === "skipped";
  const currentStep = onboarding?.currentStepId ?? null;
  const currentStepData = currentStep ? getStepById(currentStep) : null;
  const progress = getOnboardingProgress();
  const canSkipCurrentStep = currentStep ? canSkipStep(currentStep) : false;

  // Actions
  const start = useCallback(() => {
    startOnboarding();
  }, [startOnboarding]);

  const next = useCallback(
    (data?: Record<string, unknown>) => {
      completeStep(data);
    },
    [completeStep],
  );

  const previous = useCallback(() => {
    previousStep();
  }, [previousStep]);

  const skip = useCallback(() => {
    skipStep();
  }, [skipStep]);

  const skipAll = useCallback(() => {
    skipAllOnboarding();
    onSkip?.();
  }, [skipAllOnboarding, onSkip]);

  const goTo = useCallback(
    (stepId: OnboardingStepId) => {
      goToStep(stepId);
    },
    [goToStep],
  );

  const reset = useCallback(() => {
    resetOnboarding();
  }, [resetOnboarding]);

  // Form actions
  const updateProfile = useCallback(
    (data: Partial<typeof profileData>) => {
      updateProfileData(data);
    },
    [updateProfileData],
  );

  const updatePreferences = useCallback(
    (data: Partial<typeof preferencesData>) => {
      updatePreferencesData(data);
    },
    [updatePreferencesData],
  );

  const updateNotifications = useCallback(
    (data: Partial<typeof notificationSettings>) => {
      updateNotificationSettings(data);
    },
    [updateNotificationSettings],
  );

  const selectChannels = useCallback(
    (channelIds: string[]) => {
      setSelectedChannels(channelIds);
    },
    [setSelectedChannels],
  );

  const toggleChannel = useCallback(
    (channelId: string) => {
      toggleChannelSelection(channelId);
    },
    [toggleChannelSelection],
  );

  const addInvitation = useCallback(
    (invitation: (typeof teamInvitations)[0]) => {
      addTeamInvitation(invitation);
    },
    [addTeamInvitation],
  );

  const removeInvitation = useCallback(
    (email: string) => {
      removeTeamInvitation(email);
    },
    [removeTeamInvitation],
  );

  return {
    // State
    isLoading,
    isActive,
    isCompleted,
    currentStep,
    currentStepData: currentStepData ?? null,
    progress,
    canSkipCurrentStep,

    // Form data
    profileData,
    preferencesData,
    notificationSettings,
    selectedChannels,
    teamInvitations,

    // Actions
    start,
    next,
    previous,
    skip,
    skipAll,
    goTo,
    reset,

    // Form actions
    updateProfile,
    updatePreferences,
    updateNotifications,
    selectChannels,
    toggleChannel,
    addInvitation,
    removeInvitation,
  };
}

/**
 * Hook to check if onboarding should be shown
 */
export function useShouldShowOnboarding(userId?: string): boolean {
  const { onboarding, onboardingConfig, initialize, shouldShowOnboarding } =
    useOnboardingStore();

  useEffect(() => {
    if (userId) {
      initialize(userId);
    }
  }, [userId, initialize]);

  return shouldShowOnboarding();
}
