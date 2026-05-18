/**
 * TourStepIndicator — dot progress indicator for the app tour.
 *
 * No store deps — pure props.
 *
 * @module auth/tour-step-indicator
 */

import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TourStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

// ============================================================================
// TourStepIndicator
// ============================================================================

/**
 * Row of dots indicating the current position in the app tour.
 */
export function TourStepIndicator({
  currentStep,
  totalSteps,
  className,
}: TourStepIndicatorProps) {
  return (
    <div
      className={cn('flex items-center justify-center gap-1.5', className)}
      role="tablist"
      aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          role="tab"
          aria-selected={i === currentStep}
          className={cn(
            'rounded-full transition-all duration-200',
            i === currentStep
              ? 'h-2.5 w-2.5 bg-primary'
              : i < currentStep
                ? 'h-2 w-2 bg-primary/40'
                : 'h-2 w-2 bg-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

export default TourStepIndicator;
