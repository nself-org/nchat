/**
 * TourStep — onboarding step that previews the app tour.
 *
 * Decoupled from app internals: all state via props.
 *
 * @module auth/tour-step
 */

import { Map, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { OnboardingStepProps, TourStop } from './onboarding-types';

// ============================================================================
// Types
// ============================================================================

export interface TourStepProps extends OnboardingStepProps {
  /** Preview stops to show (first 4 shown). Falls back to built-in previews. */
  tourPreviewStops?: TourStop[];
  /** Called when user clicks "Start Tour" — should open TourOverlay */
  onStartTour?: () => void;
  className?: string;
}

// ============================================================================
// Built-in tour previews (used when tourPreviewStops is not provided)
// ============================================================================

const BUILTIN_PREVIEWS: Array<{ title: string; description: string }> = [
  {
    title: 'Sidebar navigation',
    description: 'Switch between channels, DMs, and search in the left sidebar.',
  },
  {
    title: 'Message composer',
    description: 'Rich text, @mentions, emoji, file attachments, and slash commands.',
  },
  {
    title: 'Threads & reactions',
    description: 'Reply in threads to keep conversations focused. Add emoji reactions.',
  },
  {
    title: 'Search & keyboard shortcuts',
    description: 'Find any message or file instantly. Power-user shortcuts to move fast.',
  },
];

// ============================================================================
// TourStep
// ============================================================================

/**
 * Tour preview step — shows the first 4 tour highlights before the user starts the tour.
 *
 * @example
 * ```tsx
 * <TourStep
 *   onNext={handleNext}
 *   onPrev={handlePrev}
 *   isFirst={false}
 *   isLast={false}
 *   canSkip
 *   onSkip={handleSkip}
 *   onStartTour={() => dispatch({ type: 'START_TOUR' })}
 * />
 * ```
 */
export function TourStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  canSkip,
  tourPreviewStops,
  onStartTour,
  className,
}: TourStepProps) {
  const previews = tourPreviewStops
    ? tourPreviewStops.slice(0, 4).map((s) => ({
        title: s.title,
        description: s.description,
      }))
    : BUILTIN_PREVIEWS;

  function handleStartTour() {
    onStartTour?.();
    onNext();
  }

  return (
    <div className={cn('w-full max-w-lg', className)}>
      {/* Header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Map className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Take a Quick Tour</h2>
        <p className="max-w-sm text-muted-foreground">
          We&apos;ll walk you through the key parts of the app so you can hit the ground running.
        </p>
      </div>

      {/* Preview items */}
      <div className="mb-6 space-y-3">
        {previews.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {i + 1}
            </div>
            <div>
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleStartTour}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Start the Tour
          <ChevronRight className="h-4 w-4" />
        </button>
        <p className="text-xs text-muted-foreground">Takes about 2 minutes</p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <div>
          {!isFirst && (
            <button
              type="button"
              onClick={onPrev}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkip && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip tour
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {isLast ? 'Finish' : 'Skip for now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TourStep;
