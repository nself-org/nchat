/**
 * TourOverlay — full-screen overlay composing TourHighlight + TourTooltip.
 *
 * All state comes from the injected TourAdapter — no store deps.
 *
 * @module auth/tour-overlay
 */

import { useEffect, useCallback } from 'react';
import { cn } from '../lib/utils';
import type { TourStop } from './onboarding-types';
import { TourHighlight } from './tour-highlight';
import { TourTooltip } from './tour-tooltip';

// ============================================================================
// Types
// ============================================================================

export interface TourState {
  currentStopId: string | null;
}

export interface TourAdapter {
  tour: TourState | null;
  tourActive: boolean;
  tourStops: TourStop[];
  nextTourStop: () => void;
  previousTourStop: () => void;
  completeTour: () => void;
  dismissTour: () => void;
}

export interface TourOverlayProps {
  adapter: TourAdapter;
  /** Override the active state (defaults to adapter.tourActive) */
  isActive?: boolean;
  onComplete?: () => void;
  onDismiss?: () => void;
}

// ============================================================================
// TourOverlay
// ============================================================================

/**
 * Full-screen tour overlay — renders backdrop, spotlight highlight, and
 * positioned tooltip. Handles keyboard navigation and body scroll lock.
 */
export function TourOverlay({
  adapter,
  isActive: externalIsActive,
  onComplete,
  onDismiss,
}: TourOverlayProps) {
  const { tour, tourActive, tourStops, nextTourStop, previousTourStop, completeTour, dismissTour } =
    adapter;

  const isActive = externalIsActive ?? tourActive;
  const currentStopId = tour?.currentStopId;
  const currentStop = currentStopId
    ? (tourStops.find((s) => s.id === currentStopId) ?? null)
    : null;
  const currentIndex = currentStop ? tourStops.findIndex((s) => s.id === currentStop.id) : -1;
  const totalStops = tourStops.length;
  const hasNext = currentIndex < totalStops - 1;
  const hasPrev = currentIndex > 0;

  const handleNext = useCallback(() => {
    if (hasNext) {
      nextTourStop();
    } else {
      completeTour();
      onComplete?.();
    }
  }, [hasNext, nextTourStop, completeTour, onComplete]);

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      previousTourStop();
    }
  }, [hasPrev, previousTourStop]);

  const handleDismiss = useCallback(() => {
    dismissTour();
    onDismiss?.();
  }, [dismissTour, onDismiss]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleDismiss();
          break;
        case 'ArrowRight':
        case 'Enter':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleDismiss, handleNext, handlePrev]);

  // Body scroll lock
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isActive]);

  if (!isActive || !currentStop) return null;

  return (
    <div className="fixed inset-0 z-[9997]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleDismiss}
        onKeyDown={(e) => e.key === 'Escape' && handleDismiss()}
        role="button"
        tabIndex={0}
        aria-label="Dismiss tour"
      />

      {/* Spotlight highlight */}
      {currentStop.placement !== 'center' && (
        <TourHighlight
          targetSelector={currentStop.targetSelector}
          padding={currentStop.spotlightPadding ?? 8}
          isActive={true}
        />
      )}

      {/* Tooltip */}
      <TourTooltip
        stop={currentStop}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleDismiss}
        hasNext={hasNext}
        hasPrev={hasPrev}
        currentIndex={currentIndex}
        totalStops={totalStops}
      />
    </div>
  );
}

export default TourOverlay;
