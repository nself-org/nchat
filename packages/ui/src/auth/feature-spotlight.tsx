/**
 * FeatureSpotlight — spotlight overlay for a single feature tip.
 *
 * Injectable: no store deps — pure props.
 * Uses getElementPosition from tour-utils.
 *
 * @module auth/feature-spotlight
 */

import { useEffect, useState, useCallback } from 'react';
import { X, Lightbulb, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { getElementPosition, type ElementPosition } from './tour-utils';

// ============================================================================
// Types
// ============================================================================

export interface FeatureSpotlightTip {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface FeatureSpotlightProps {
  tip: FeatureSpotlightTip;
  onDismiss: () => void;
  onLearnMore?: () => void;
}

// ============================================================================
// FeatureSpotlight
// ============================================================================

/**
 * Spotlight overlay that highlights a DOM element and shows a tip card nearby.
 */
export function FeatureSpotlight({ tip, onDismiss, onLearnMore }: FeatureSpotlightProps) {
  const [position, setPosition] = useState<ElementPosition | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (tip.targetSelector) {
      const pos = getElementPosition(tip.targetSelector);
      setPosition(pos);
    }

    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [tip.targetSelector]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(onDismiss, 200);
  }, [onDismiss]);

  const spotlightStyle = position
    ? {
        top: position.top - 8,
        left: position.left - 8,
        width: position.width + 16,
        height: position.height + 16,
      }
    : {};

  const getTooltipStyle = (): React.CSSProperties => {
    if (!position) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const padding = 16;

    switch (tip.placement) {
      case 'top':
        return {
          bottom: window.innerHeight - position.top + padding,
          left: position.left + position.width / 2 - tooltipWidth / 2,
        };
      case 'bottom':
        return {
          top: position.top + position.height + padding,
          left: position.left + position.width / 2 - tooltipWidth / 2,
        };
      case 'left':
        return {
          top: position.top + position.height / 2 - tooltipHeight / 2,
          right: window.innerWidth - position.left + padding,
        };
      case 'right':
      default:
        return {
          top: position.top + position.height / 2 - tooltipHeight / 2,
          left: position.left + position.width + padding,
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleDismiss}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
            e.preventDefault();
            handleDismiss();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close spotlight"
      />

      {/* Spotlight cutout */}
      {position && (
        <div
          className={cn(
            'absolute rounded-lg transition-all duration-300',
            'ring-4 ring-primary/50 ring-offset-4 ring-offset-transparent',
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          )}
          style={{
            ...spotlightStyle,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className={cn(
          'fixed w-80 rounded-xl border border-border bg-card shadow-2xl',
          'transition-all duration-300 ease-out',
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
        style={getTooltipStyle()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 transition-colors hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="p-4">
          {/* Icon */}
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>

          {/* Title */}
          <h3 className="mb-2 text-lg font-semibold text-foreground">{tip.title}</h3>

          {/* Description */}
          <p className="mb-4 text-sm text-muted-foreground">{tip.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Got it
            </button>

            {onLearnMore && (
              <button
                type="button"
                onClick={() => {
                  onLearnMore();
                  handleDismiss();
                }}
                className="flex items-center text-sm font-medium text-primary hover:opacity-80"
              >
                Learn more
                <ExternalLink className="ml-1 h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureSpotlight;
