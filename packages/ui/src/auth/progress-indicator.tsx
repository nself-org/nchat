/**
 * ProgressIndicator — onboarding progress display (dots / bar / steps).
 *
 * Decoupled from @/lib/onboarding/*: accepts steps array and statuses as props.
 *
 * @module auth/progress-indicator
 */

import { Check } from 'lucide-react';
import { cn } from '../lib/utils';
import type { OnboardingStepId, OnboardingStepStatus, OnboardingStep } from './onboarding-types';

// ============================================================================
// Types
// ============================================================================

export interface ProgressIndicatorProps {
  steps: OnboardingStep[];
  currentStepId: OnboardingStepId;
  stepStatuses: Record<OnboardingStepId, OnboardingStepStatus>;
  onStepClick?: (stepId: OnboardingStepId) => void;
  variant?: 'dots' | 'bar' | 'steps';
  className?: string;
}

// ============================================================================
// ProgressIndicator
// ============================================================================

/**
 * Shows onboarding progress as dots, a progress bar, or a step list.
 *
 * @example
 * ```tsx
 * <ProgressIndicator
 *   steps={onboardingSteps}
 *   currentStepId="profile-setup"
 *   stepStatuses={statuses}
 *   variant="dots"
 * />
 * ```
 */
export function ProgressIndicator({
  steps,
  currentStepId,
  stepStatuses,
  onStepClick,
  variant = 'dots',
  className,
}: ProgressIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);
  const totalSteps = steps.length;
  const completedCount = Object.values(stepStatuses).filter(
    (s) => s === 'completed' || s === 'skipped'
  ).length;
  const percentComplete = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // ── Bar variant ───────────────────────────────────────────────────────────

  if (variant === 'bar') {
    return (
      <div className={cn('w-full', className)}>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Step {currentIndex + 1} of {totalSteps}
          </span>
          <span className="font-medium text-foreground">{percentComplete}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>
    );
  }

  // ── Steps variant ─────────────────────────────────────────────────────────

  if (variant === 'steps') {
    return (
      <nav aria-label="Progress" className={cn('w-full', className)}>
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = stepStatuses[step.id] ?? 'pending';
            const isCurrent = step.id === currentStepId;
            const isClickable =
              onStepClick &&
              (status === 'completed' || status === 'skipped' || index <= currentIndex);

            return (
              <li key={step.id} className="relative flex-1">
                {index !== 0 && (
                  <div
                    className={cn(
                      'absolute top-4 h-0.5 -translate-y-1/2',
                      status === 'completed' || status === 'skipped'
                        ? 'bg-primary'
                        : 'bg-border'
                    )}
                    style={{ left: '-50%', right: '50%' }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    'group relative flex flex-col items-center',
                    isClickable && 'cursor-pointer'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                      isCurrent
                        ? 'border-primary bg-primary text-primary-foreground'
                        : status === 'completed'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : status === 'skipped'
                            ? 'border-muted-foreground bg-muted-foreground text-background'
                            : 'border-border bg-background text-muted-foreground'
                    )}
                  >
                    {status === 'completed' ? (
                      <Check className="h-4 w-4" />
                    ) : status === 'skipped' ? (
                      <span className="text-xs">-</span>
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'mt-2 hidden max-w-[80px] truncate text-center text-xs font-medium sm:block',
                      isCurrent
                        ? 'text-primary'
                        : status === 'completed' || status === 'skipped'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // ── Dots variant (default) ────────────────────────────────────────────────

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {steps.map((step, index) => {
        const status = stepStatuses[step.id] ?? 'pending';
        const isCurrent = step.id === currentStepId;
        const isClickable =
          onStepClick &&
          (status === 'completed' || status === 'skipped' || index <= currentIndex);

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => isClickable && onStepClick?.(step.id)}
            disabled={!isClickable}
            className={cn(
              'transition-all duration-200',
              isClickable && 'cursor-pointer hover:scale-110',
              isCurrent
                ? 'h-2 w-8 rounded-full bg-primary'
                : status === 'completed'
                  ? 'h-2 w-2 rounded-full bg-primary'
                  : status === 'skipped'
                    ? 'h-2 w-2 rounded-full bg-muted-foreground'
                    : 'h-2 w-2 rounded-full bg-border'
            )}
            aria-label={`${step.title} - ${status}`}
            aria-current={isCurrent ? 'step' : undefined}
          />
        );
      })}
    </div>
  );
}

export default ProgressIndicator;
