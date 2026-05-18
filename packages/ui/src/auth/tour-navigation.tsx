/**
 * TourNavigation — back/next/skip controls for the app tour tooltip.
 *
 * No store deps — pure props.
 *
 * @module auth/tour-navigation
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TourNavigationProps {
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  isLastStep?: boolean;
  className?: string;
}

// ============================================================================
// TourNavigation
// ============================================================================

/**
 * Navigation row inside a tour tooltip — Back / Skip Tour / Next or Finish.
 */
export function TourNavigation({
  onNext,
  onPrev,
  onSkip,
  hasNext,
  hasPrev,
  isLastStep,
  className,
}: TourNavigationProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip Tour
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {isLastStep ? (
            'Finish'
          ) : (
            <>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default TourNavigation;
