/**
 * Tour DOM utilities — inlined from @/lib/onboarding/tour-manager.
 *
 * Pure DOM functions with no framework dependencies.
 *
 * @module auth/tour-utils
 */

// ============================================================================
// Types
// ============================================================================

export interface ElementPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TooltipPosition {
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  transform?: string;
}

// ============================================================================
// getElementPosition
// ============================================================================

/**
 * Returns the viewport-relative position of the first element matching the
 * given CSS selector. Returns null when the element is not found.
 */
export function getElementPosition(selector: string): ElementPosition | null {
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// calculateTooltipPosition
// ============================================================================

/**
 * Calculates CSS positioning values for a tooltip given the target element
 * position, preferred placement, and optional tooltip dimensions.
 */
export function calculateTooltipPosition(
  elementPos: ElementPosition,
  placement: TooltipPlacement,
  tooltipWidth = 320,
  tooltipHeight = 200
): TooltipPosition {
  const padding = 16;

  switch (placement) {
    case 'top':
      return {
        bottom: window.innerHeight - elementPos.top + padding,
        left: Math.max(
          padding,
          Math.min(
            elementPos.left + elementPos.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          )
        ),
      };

    case 'bottom':
      return {
        top: elementPos.top + elementPos.height + padding,
        left: Math.max(
          padding,
          Math.min(
            elementPos.left + elementPos.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          )
        ),
      };

    case 'left':
      return {
        top: Math.max(
          padding,
          Math.min(
            elementPos.top + elementPos.height / 2 - tooltipHeight / 2,
            window.innerHeight - tooltipHeight - padding
          )
        ),
        right: window.innerWidth - elementPos.left + padding,
      };

    case 'right':
      return {
        top: Math.max(
          padding,
          Math.min(
            elementPos.top + elementPos.height / 2 - tooltipHeight / 2,
            window.innerHeight - tooltipHeight - padding
          )
        ),
        left: elementPos.left + elementPos.width + padding,
      };

    case 'center':
    default:
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
  }
}

// ============================================================================
// scrollToElement
// ============================================================================

/**
 * Smoothly scrolls the page so that the element matching the given selector is
 * centred in the viewport.
 */
export function scrollToElement(selector: string): void {
  try {
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  } catch {
    // silently ignore
  }
}
