/**
 * TourHighlight — spotlight cutout overlay for a DOM element.
 *
 * Uses getElementPosition from tour-utils (inlined DOM utility).
 * No store deps — pure props.
 *
 * @module auth/tour-highlight
 */

import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { getElementPosition, type ElementPosition } from './tour-utils';

// ============================================================================
// Types
// ============================================================================

export interface TourHighlightProps {
  targetSelector: string;
  padding?: number;
  isActive?: boolean;
  onClick?: () => void;
}

// ============================================================================
// TourHighlight
// ============================================================================

/**
 * Renders a semi-opaque backdrop with a radial-gradient cutout around the target element.
 * Also renders a pulsing highlight border.
 */
export function TourHighlight({
  targetSelector,
  padding = 8,
  isActive = true,
  onClick,
}: TourHighlightProps) {
  const [position, setPosition] = useState<ElementPosition | null>(null);

  useEffect(() => {
    if (!isActive) {
      setPosition(null);
      return;
    }

    function updatePosition() {
      const pos = getElementPosition(targetSelector);
      setPosition(pos);
    }

    updatePosition();

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    const observer = new MutationObserver(updatePosition);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      observer.disconnect();
    };
  }, [targetSelector, isActive]);

  if (!isActive || !position) return null;

  const highlightStyle = {
    top: position.top - padding,
    left: position.left - padding,
    width: position.width + padding * 2,
    height: position.height + padding * 2,
  };

  const cx = position.left + position.width / 2;
  const cy = position.top + position.height / 2;
  const r = Math.max(position.width, position.height) / 2 + padding;

  return (
    <>
      {/* Backdrop with spotlight cutout */}
      <div
        className="pointer-events-none fixed inset-0 z-[9998]"
        style={{
          background: `radial-gradient(circle at ${cx}px ${cy}px, transparent ${r}px, rgba(0,0,0,0.7) ${r + 50}px)`,
        }}
      />

      {/* Highlight border */}
      <div
        className={cn(
          'pointer-events-none fixed z-[9999] rounded-lg border-2 border-primary',
          'shadow-[0_0_0_4px_rgba(59,130,246,0.3)]',
          'transition-all duration-300 ease-out'
        )}
        style={highlightStyle}
      >
        <div className="absolute inset-0 animate-ping rounded-lg border-2 border-primary opacity-75" />
      </div>

      {/* Optional click overlay */}
      {onClick && (
        <button
          type="button"
          onClick={onClick}
          className="fixed z-[10000] cursor-pointer"
          style={highlightStyle}
          aria-label="Click highlighted element"
        />
      )}
    </>
  );
}

export default TourHighlight;
