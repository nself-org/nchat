/**
 * OnboardingWizard — multi-step onboarding flow.
 *
 * Decoupled from app internals: all state via OnboardingAdapter.
 *
 * @module auth/onboarding-wizard
 */

import { cn } from '../lib/utils';
import type {
  OnboardingStepId,
  OnboardingState,
  OnboardingStep,
  OnboardingStepStatus,
} from './onboarding-types';
import { ProgressIndicator } from './progress-indicator';

// ============================================================================
// Adapter
// ============================================================================

export interface OnboardingAdapter {
  /** Full onboarding state */
  state: OnboardingState;
  /** Ordered steps to display */
  steps: OnboardingStep[];
  /** Navigate to a step by ID */
  goToStep: (stepId: OnboardingStepId) => void;
  /** Mark the current step complete and advance */
  completeStep: (stepId: OnboardingStepId, data?: Record<string, unknown>) => void;
  /** Mark the current step skipped and advance */
  skipStep: (stepId: OnboardingStepId) => void;
  /** Mark onboarding as done */
  completeOnboarding: () => void;
  /** Mark onboarding as skipped entirely */
  skipOnboarding: () => void;
}

// ============================================================================
// Types
// ============================================================================

export interface OnboardingWizardProps {
  adapter: OnboardingAdapter;
  /** Render function for each step — receives step + navigation helpers */
  renderStep: (params: {
    stepId: OnboardingStepId;
    stepIndex: number;
    isFirst: boolean;
    isLast: boolean;
    canSkip: boolean;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
  }) => React.ReactNode;
  /** Progress indicator variant */
  progressVariant?: 'dots' | 'bar' | 'steps';
  /** Show skip-all link */
  showSkipAll?: boolean;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getStepStatus(
  state: OnboardingState,
  stepId: OnboardingStepId
): OnboardingStepStatus {
  return state.steps.find((s) => s.stepId === stepId)?.status ?? 'pending';
}

// ============================================================================
// OnboardingWizard
// ============================================================================

/**
 * Multi-step wizard shell — drives step navigation, renders ProgressIndicator,
 * and delegates state mutations to the injected OnboardingAdapter.
 *
 * @example
 * ```tsx
 * <OnboardingWizard
 *   adapter={myAdapter}
 *   progressVariant="dots"
 *   renderStep={({ stepId, onNext, onPrev, onSkip, isFirst, isLast, canSkip }) => {
 *     switch (stepId) {
 *       case 'welcome': return <WelcomeStep onNext={onNext} ... />;
 *       case 'profile-setup': return <ProfileSetupStep onNext={onNext} ... />;
 *       // ...
 *     }
 *   }}
 * />
 * ```
 */
export function OnboardingWizard({
  adapter,
  renderStep,
  progressVariant = 'dots',
  showSkipAll = false,
  className,
}: OnboardingWizardProps) {
  const { state, steps, completeStep, skipStep, goToStep, skipOnboarding } = adapter;

  const currentStepId = state.currentStepId;
  const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);
  const currentStep = steps[currentStepIndex];

  if (!currentStep) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;
  const canSkip = currentStep.canSkip;

  function onNext() {
    completeStep(currentStepId);
    // adapter.goToStep handles advancing to the next step
  }

  function onPrev() {
    if (isFirst) return;
    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) goToStep(prevStep.id);
  }

  function onSkip() {
    skipStep(currentStepId);
  }

  const stepStatuses = steps.reduce<Record<OnboardingStepId, OnboardingStepStatus>>(
    (acc, step) => {
      acc[step.id] = getStepStatus(state, step.id);
      return acc;
    },
    {} as Record<OnboardingStepId, OnboardingStepStatus>
  );

  return (
    <div className={cn('flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12', className)}>
      {/* Progress */}
      <div className="mb-8 w-full max-w-lg">
        <ProgressIndicator
          steps={steps}
          currentStepId={currentStepId}
          variant={progressVariant}
          stepStatuses={stepStatuses}
        />
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg">
        {renderStep({
          stepId: currentStepId,
          stepIndex: currentStepIndex,
          isFirst,
          isLast,
          canSkip,
          onNext,
          onPrev,
          onSkip,
        })}
      </div>

      {/* Skip-all link */}
      {showSkipAll && !isLast && (
        <button
          type="button"
          onClick={skipOnboarding}
          className="mt-6 text-xs text-muted-foreground hover:text-foreground"
        >
          Skip setup entirely
        </button>
      )}
    </div>
  );
}

export default OnboardingWizard;
