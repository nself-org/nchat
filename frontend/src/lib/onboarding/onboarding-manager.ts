/**
 * Onboarding Manager - Core onboarding state management utilities
 *
 * Handles onboarding progress, navigation, and state transitions
 */

import type {
  OnboardingState,
  OnboardingStatus,
  OnboardingStepId,
  OnboardingStepState,
  OnboardingStepStatus,
  OnboardingProgress,
  OnboardingConfig,
} from "./onboarding-types";

import { logger } from "@/lib/logger";
import {
  onboardingSteps,
  getStepById,
  getNextStep,
  getPreviousStep,
  getStepIndex,
  getTotalSteps,
  validateStep,
} from "./onboarding-steps";

// ============================================================================
// State Management
// ============================================================================

/**
 * Create initial onboarding state for a user
 */
export function createInitialOnboardingState(userId: string): OnboardingState {
  const steps: OnboardingStepState[] = onboardingSteps.map((step) => ({
    stepId: step.id,
    status: "pending" as OnboardingStepStatus,
    data: {},
  }));

  return {
    userId,
    status: "not_started",
    currentStepId: "welcome",
    steps,
    version: 1,
  };
}

/**
 * Get step state from onboarding state
 */
export function getStepState(
  state: OnboardingState,
  stepId: OnboardingStepId,
): OnboardingStepState | undefined {
  return state.steps.find((s) => s.stepId === stepId);
}

/**
 * Update step state
 */
export function updateStepState(
  state: OnboardingState,
  stepId: OnboardingStepId,
  updates: Partial<OnboardingStepState>,
): OnboardingState {
  return {
    ...state,
    steps: state.steps.map((step) =>
      step.stepId === stepId ? { ...step, ...updates } : step,
    ),
  };
}

// ============================================================================
// Progress Calculation
// ============================================================================

/**
 * Calculate onboarding progress
 */
export function calculateOnboardingProgress(
  state: OnboardingState,
): OnboardingProgress {
  const completedSteps = state.steps.filter(
    (s) => s.status === "completed",
  ).length;
  const skippedSteps = state.steps.filter((s) => s.status === "skipped").length;
  const totalSteps = getTotalSteps();

  const percentComplete =
    totalSteps > 0
      ? Math.round(((completedSteps + skippedSteps) / totalSteps) * 100)
      : 0;

  const currentStep = getStepById(state.currentStepId);
  const nextStep = getNextStep(state.currentStepId);

  return {
    totalSteps,
    completedSteps,
    skippedSteps,
    percentComplete,
    currentStep: currentStep ?? null,
    nextStep: nextStep ?? null,
  };
}

/**
 * Check if onboarding is completed
 */
export function isOnboardingCompleted(state: OnboardingState): boolean {
  if (state.status === "completed") return true;

  // Check if all required steps are completed
  const requiredSteps = onboardingSteps.filter((step) => step.required);
  const completedRequired = requiredSteps.every((step) => {
    const stepState = getStepState(state, step.id);
    return stepState?.status === "completed";
  });

  return completedRequired;
}

/**
 * Check if all steps are done (completed or skipped)
 */
export function areAllStepsDone(state: OnboardingState): boolean {
  return state.steps.every(
    (step) => step.status === "completed" || step.status === "skipped",
  );
}

// ============================================================================
// Navigation
// ============================================================================

/**
 * Start onboarding
 */
export function startOnboarding(state: OnboardingState): OnboardingState {
  return {
    ...state,
    status: "in_progress",
    startedAt: new Date(),
    currentStepId: "welcome",
    steps: state.steps.map((step, index) =>
      index === 0
        ? { ...step, status: "in_progress" as OnboardingStepStatus }
        : step,
    ),
  };
}

/**
 * Complete current step and move to next
 */
export function completeCurrentStep(
  state: OnboardingState,
  data?: Record<string, unknown>,
): OnboardingState {
  const currentStepState = getStepState(state, state.currentStepId);
  if (!currentStepState) return state;

  // Validate step data if provided
  if (data) {
    const validation = validateStep(state.currentStepId, data);
    if (!validation.isValid) {
      logger.error("Step validation failed:", validation.errors);
      return state;
    }
  }

  // Mark current step as completed
  let newState = updateStepState(state, state.currentStepId, {
    status: "completed",
    completedAt: new Date(),
    data: data ?? currentStepState.data,
  });

  // Get next step
  const nextStep = getNextStep(state.currentStepId);

  if (nextStep) {
    // Move to next step
    newState = {
      ...newState,
      currentStepId: nextStep.id,
    };

    // Mark next step as in progress
    newState = updateStepState(newState, nextStep.id, {
      status: "in_progress",
    });
  } else {
    // No more steps, complete onboarding
    newState = {
      ...newState,
      status: "completed",
      completedAt: new Date(),
    };
  }

  return newState;
}

/**
 * Skip current step and move to next
 */
export function skipCurrentStep(state: OnboardingState): OnboardingState {
  const currentStep = getStepById(state.currentStepId);
  if (!currentStep || !currentStep.canSkip) return state;

  // Mark current step as skipped
  let newState = updateStepState(state, state.currentStepId, {
    status: "skipped",
    skippedAt: new Date(),
  });

  // Get next step
  const nextStep = getNextStep(state.currentStepId);

  if (nextStep) {
    // Move to next step
    newState = {
      ...newState,
      currentStepId: nextStep.id,
    };

    // Mark next step as in progress
    newState = updateStepState(newState, nextStep.id, {
      status: "in_progress",
    });
  } else {
    // No more steps, complete onboarding
    newState = {
      ...newState,
      status: "completed",
      completedAt: new Date(),
    };
  }

  return newState;
}

/**
 * Go to previous step
 */
export function goToPreviousStep(state: OnboardingState): OnboardingState {
  const prevStep = getPreviousStep(state.currentStepId);
  if (!prevStep) return state;

  // Reset current step to pending
  let newState = updateStepState(state, state.currentStepId, {
    status: "pending",
  });

  // Move to previous step and mark as in progress
  newState = {
    ...newState,
    currentStepId: prevStep.id,
  };

  newState = updateStepState(newState, prevStep.id, {
    status: "in_progress",
  });

  return newState;
}

/**
 * Go to specific step
 */
export function goToStep(
  state: OnboardingState,
  stepId: OnboardingStepId,
): OnboardingState {
  const step = getStepById(stepId);
  if (!step) return state;

  // Can only go to completed/skipped steps or the next pending step
  const stepState = getStepState(state, stepId);
  const currentIndex = getStepIndex(state.currentStepId);
  const targetIndex = getStepIndex(stepId);

  // Allow going backwards or to the current step
  if (targetIndex > currentIndex && stepState?.status === "pending") {
    return state;
  }

  return {
    ...state,
    currentStepId: stepId,
  };
}

/**
 * Skip entire onboarding
 */
export function skipOnboarding(state: OnboardingState): OnboardingState {
  return {
    ...state,
    status: "skipped",
    skippedAt: new Date(),
    steps: state.steps.map((step) => ({
      ...step,
      status:
        step.status === "completed"
          ? "completed"
          : ("skipped" as OnboardingStepStatus),
      skippedAt: step.status !== "completed" ? new Date() : step.skippedAt,
    })),
  };
}

/**
 * Reset onboarding
 */
export function resetOnboarding(state: OnboardingState): OnboardingState {
  return createInitialOnboardingState(state.userId);
}

// ============================================================================
// Step Data Management
// ============================================================================

/**
 * Update step data without completing the step
 */
export function updateStepData(
  state: OnboardingState,
  stepId: OnboardingStepId,
  data: Record<string, unknown>,
): OnboardingState {
  const stepState = getStepState(state, stepId);
  if (!stepState) return state;

  return updateStepState(state, stepId, {
    data: { ...stepState.data, ...data },
  });
}

/**
 * Get step data
 */
export function getStepData(
  state: OnboardingState,
  stepId: OnboardingStepId,
): Record<string, unknown> | undefined {
  return getStepState(state, stepId)?.data;
}

// ============================================================================
// State Serialization
// ============================================================================

/**
 * Serialize onboarding state for storage
 */
export function serializeOnboardingState(state: OnboardingState): string {
  return JSON.stringify({
    ...state,
    startedAt: state.startedAt?.toISOString(),
    completedAt: state.completedAt?.toISOString(),
    skippedAt: state.skippedAt?.toISOString(),
    steps: state.steps.map((step) => ({
      ...step,
      completedAt: step.completedAt?.toISOString(),
      skippedAt: step.skippedAt?.toISOString(),
    })),
  });
}

/**
 * Deserialize onboarding state from storage
 */
export function deserializeOnboardingState(
  json: string,
): OnboardingState | null {
  try {
    const parsed = JSON.parse(json);
    return {
      ...parsed,
      startedAt: parsed.startedAt ? new Date(parsed.startedAt) : undefined,
      completedAt: parsed.completedAt
        ? new Date(parsed.completedAt)
        : undefined,
      skippedAt: parsed.skippedAt ? new Date(parsed.skippedAt) : undefined,
      steps: parsed.steps.map(
        (
          step: OnboardingStepState & {
            completedAt?: string;
            skippedAt?: string;
          },
        ) => ({
          ...step,
          completedAt: step.completedAt
            ? new Date(step.completedAt)
            : undefined,
          skippedAt: step.skippedAt ? new Date(step.skippedAt) : undefined,
        }),
      ),
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default onboarding configuration
 */
export const defaultOnboardingConfig: OnboardingConfig = {
  enabled: true,
  requiredSteps: ["welcome", "profile-setup", "completion"],
  optionalSteps: [
    "avatar-upload",
    "preferences",
    "notification-permission",
    "join-channels",
    "invite-team",
    "tour",
  ],
  defaultChannels: ["general", "random"],
  showTourOnCompletion: true,
  allowSkipAll: true,
  collectAnalytics: true,
  version: 1,
};

/**
 * Apply configuration to onboarding state
 */
export function applyOnboardingConfig(
  state: OnboardingState,
  config: OnboardingConfig,
): OnboardingState {
  // Filter steps based on configuration
  const enabledStepIds = [...config.requiredSteps, ...config.optionalSteps];

  return {
    ...state,
    steps: state.steps.filter((step) => enabledStepIds.includes(step.stepId)),
    version: config.version,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: OnboardingStatus): string {
  const labels: Record<OnboardingStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
    skipped: "Skipped",
  };
  return labels[status];
}

/**
 * Get step status label
 */
export function getStepStatusLabel(status: OnboardingStepStatus): string {
  const labels: Record<OnboardingStepStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    skipped: "Skipped",
  };
  return labels[status];
}

/**
 * Check if user should see onboarding
 */
export function shouldShowOnboarding(
  state: OnboardingState | null,
  config: OnboardingConfig,
): boolean {
  if (!config.enabled) return false;
  if (!state) return true;
  if (state.status === "completed" || state.status === "skipped") return false;
  return true;
}

/**
 * Check if user can skip remaining onboarding
 */
export function canSkipRemainingOnboarding(
  state: OnboardingState,
  config: OnboardingConfig,
): boolean {
  if (!config.allowSkipAll) return false;

  // Check if all required steps are completed
  const requiredStepsCompleted = config.requiredSteps.every((stepId) => {
    const stepState = getStepState(state, stepId);
    return stepState?.status === "completed";
  });

  return requiredStepsCompleted;
}

/**
 * Format time estimate for display
 */
export function formatTimeEstimate(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}
