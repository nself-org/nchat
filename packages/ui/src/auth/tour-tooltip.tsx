/**
 * TourTooltip — positioned tooltip card for the app tour.
 *
 * Uses getElementPosition / calculateTooltipPosition / scrollToElement from tour-utils.
 * No store deps — pure props.
 *
 * @module auth/tour-tooltip
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';
import type { TourStop } from './onboarding-types';
import {
  getElementPosition,
  calculateTooltipPosition,
  scrollToElement,
  type TooltipPosition,
} from './tour-utils';
import { TourStepIndicator } from './tour-step-indicator';
import { TourNavigation } from './tour-navigation';

// ============================================================================
// Types
// ============================================================================

export interface TourTooltipProps {
  stop: TourStop;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  currentIndex: number;
  totalStops: number;
}

// ============================================================================
// Arrow classes by position
// ============================================================================

const ARROW_CLASSES: Record<string, string> = {
  top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-card',
  bottom:
    'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-card',
  left: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-transparent border-b-transparent border-l-transparent border-r-card',
  right:
    'right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-transparent border-b-transparent border-r-transparent border-l-card',
};

// ============================================================================
// TourTooltip
// ============================================================================

/**
 * Floating tooltip card that positions itself relative to the target element.
 * Falls back to centered in the viewport when the target is not found.
 */
export function TourTooltip({
  stop,
  onNext,
  onPrev,
  onSkip,
  hasNext,
  hasPrev,
  currentIndex,
  totalStops,
}: TourTooltipProps) {
  const [position, setPosition] = useState<(TooltipPosition & { arrowPosition?: string }) | null>(
    null
  );
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (stop.placement === 'center') {
      setPosition({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 160,
        arrowPosition: 'top',
      });
      return;
    }

    const targetPos = getElementPosition(stop.targetSelector);
    if (!targetPos) {
      setPosition({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 160,
        arrowPosition: 'top',
      });
      return;
    }

    const pos = calculateTooltipPosition(targetPos, stop.placement, 320, 200);
    // Derive arrow direction from placement
    const arrowMap: Record<string, string> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    };
    setPosition({ ...pos, arrowPosition: arrowMap[stop.placement] ?? 'top' });
  }, [stop]);

  useEffect(() => {
    if (stop.placement !== 'center') {
      scrollToElement(stop.targetSelector);
    }

    const timer = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [stop, updatePosition]);

  useEffect(() => {
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  if (!position) return null;

  return (
    <div
      ref={tooltipRef}
      className={cn(
        'fixed z-[10001] w-80 rounded-xl border border-border bg-card shadow-2xl',
        'transition-all duration-300 ease-out',
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      )}
      style={{
        top: position.top,
        left: position.left,
        transform: position.transform,
      }}
    >
      {/* Arrow */}
      {position.arrowPosition && (
        <div
          className={cn(
            'absolute h-0 w-0 border-[8px]',
            ARROW_CLASSES[position.arrowPosition] ?? ARROW_CLASSES.top
          )}
        />
      )}

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">{stop.title}</h3>
          <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
            {currentIndex + 1}/{totalStops}
          </span>
        </div>

        {/* Description */}
        <p className="mb-4 text-sm text-muted-foreground">{stop.description}</p>

        {/* Media */}
        {stop.media && (
          <div className="mb-4 overflow-hidden rounded-lg bg-muted">
            {(stop.media.type === 'image' || stop.media.type === 'gif') && (
              <img
                src={stop.media.url}
                alt={stop.media.alt ?? stop.title}
                className="h-auto w-full"
              />
            )}
            {stop.media.type === 'video' && (
              <video
                src={stop.media.url}
                autoPlay
                loop
                muted
                playsInline
                className="h-auto w-full"
              />
            )}
          </div>
        )}

        {/* Step indicator */}
        <div className="mb-4">
          <TourStepIndicator currentStep={currentIndex} totalSteps={totalStops} />
        </div>

        {/* Navigation */}
        <TourNavigation
          onNext={onNext}
          onPrev={onPrev}
          onSkip={onSkip}
          hasNext={hasNext}
          hasPrev={hasPrev}
          isLastStep={!hasNext}
        />
      </div>
    </div>
  );
}

export default TourTooltip;
