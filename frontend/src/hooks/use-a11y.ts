"use client";

import { useEffect, useRef, useCallback, RefObject } from "react";
import { useAccessibility } from "@/contexts/accessibility-context";

/**
 * Accessibility Hooks
 *
 * Collection of hooks for implementing accessible patterns:
 * - Focus management
 * - ARIA live regions
 * - Keyboard navigation
 * - Skip links
 */

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Focus trap for modals and dialogs
 *
 * @example
 * const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
 */
export function useFocusTrap<T extends HTMLElement>(
  isActive: boolean,
  options?: {
    initialFocus?: RefObject<HTMLElement>;
    returnFocus?: boolean;
    onEscape?: () => void;
  },
): RefObject<T | null> {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const { initialFocus, returnFocus = true, onEscape } = options || {};

    // Store previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      const selector = [
        "a[href]",
        "button:not([disabled])",
        "textarea:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
      ].join(", ");

      return Array.from(container.querySelectorAll(selector));
    };

    // Focus first element or specified element
    const focusFirst = () => {
      if (initialFocus?.current) {
        initialFocus.current.focus();
      } else {
        const elements = getFocusableElements();
        if (elements.length > 0) {
          elements[0].focus();
        }
      }
    };

    focusFirst();

    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key
      if (e.key === "Escape" && onEscape) {
        onEscape();
        return;
      }

      // Tab key
      if (e.key === "Tab") {
        const elements = getFocusableElements();
        if (elements.length === 0) return;

        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];
        const activeElement = document.activeElement;

        // Shift+Tab on first element
        if (e.shiftKey && activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
        // Tab on last element
        else if (!e.shiftKey && activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    // Return focus on cleanup
    return () => {
      container.removeEventListener("keydown", handleKeyDown);

      if (returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, options]);

  return containerRef;
}

/**
 * Restore focus when component unmounts
 *
 * @example
 * useFocusReturn(triggerButtonRef);
 */
export function useFocusReturn(elementRef?: RefObject<HTMLElement>) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Store current focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    return () => {
      // Restore focus
      if (elementRef?.current) {
        elementRef.current.focus();
      } else if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [elementRef]);
}

/**
 * Focus first input in a form
 *
 * @example
 * useFocusFirstInput(formRef, isOpen);
 */
export function useFocusFirstInput(
  containerRef: RefObject<HTMLElement>,
  shouldFocus: boolean = true,
) {
  useEffect(() => {
    if (!shouldFocus || !containerRef.current) return;

    const firstInput = containerRef.current.querySelector<HTMLInputElement>(
      'input:not([disabled]):not([type="hidden"]), textarea:not([disabled])',
    );

    if (firstInput) {
      // Small delay to ensure rendering is complete
      setTimeout(() => {
        firstInput.focus();
      }, 100);
    }
  }, [containerRef, shouldFocus]);
}

// ============================================================================
// ARIA Live Regions
// ============================================================================

/**
 * Announce messages to screen readers
 *
 * @example
 * const announce = useAnnouncer();
 * announce('Message sent successfully');
 */
export function useAnnouncer() {
  const { announce } = useAccessibility();
  return announce;
}

/**
 * Create a live region for dynamic updates
 *
 * @example
 * const liveRegionRef = useLiveRegion<HTMLDivElement>('polite');
 */
export function useLiveRegion<T extends HTMLElement>(
  politeness: "polite" | "assertive" = "polite",
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.setAttribute("aria-live", politeness);
    ref.current.setAttribute("aria-atomic", "true");
  }, [politeness]);

  return ref;
}

// ============================================================================
// Skip Links
// ============================================================================

/**
 * Create skip link functionality
 *
 * @example
 * useSkipLink('main-content', 'Skip to main content');
 */
export function useSkipLink(
  targetId: string,
  label: string = "Skip to content",
) {
  useEffect(() => {
    const skipLink = document.createElement("a");
    skipLink.href = `#${targetId}`;
    skipLink.className = "skip-link";
    skipLink.textContent = label;

    // Style the skip link (visually hidden until focused)
    skipLink.style.cssText = `
      position: absolute;
      left: -9999px;
      z-index: 999;
      padding: 0.5rem 1rem;
      background: var(--primary);
      color: var(--primary-foreground);
      text-decoration: none;
      border-radius: 0 0 0.25rem 0.25rem;
    `;

    // Show on focus
    skipLink.addEventListener("focus", () => {
      skipLink.style.left = "0";
    });

    skipLink.addEventListener("blur", () => {
      skipLink.style.left = "-9999px";
    });

    // Insert at start of body
    document.body.insertBefore(skipLink, document.body.firstChild);

    return () => {
      skipLink.remove();
    };
  }, [targetId, label]);
}

// ============================================================================
// Keyboard Navigation
// ============================================================================

/**
 * Arrow key navigation for lists
 *
 * @example
 * useArrowNavigation(listRef, { orientation: 'vertical', loop: true });
 */
export function useArrowNavigation<T extends HTMLElement>(
  containerRef: RefObject<T>,
  options?: {
    orientation?: "horizontal" | "vertical" | "both";
    loop?: boolean;
    onSelect?: (element: HTMLElement) => void;
  },
) {
  const { orientation = "vertical", loop = true, onSelect } = options || {};

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const getFocusableChildren = (): HTMLElement[] => {
      const selector = [
        "a[href]",
        "button:not([disabled])",
        '[role="button"]:not([aria-disabled="true"])',
        '[role="menuitem"]:not([aria-disabled="true"])',
        '[role="option"]:not([aria-disabled="true"])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(", ");

      return Array.from(container.querySelectorAll(selector));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const elements = getFocusableChildren();
      const currentIndex = elements.findIndex(
        (el) => el === document.activeElement,
      );

      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      // Vertical navigation
      if (orientation === "vertical" || orientation === "both") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          nextIndex = currentIndex + 1;
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          nextIndex = currentIndex - 1;
        }
      }

      // Horizontal navigation
      if (orientation === "horizontal" || orientation === "both") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          nextIndex = currentIndex + 1;
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          nextIndex = currentIndex - 1;
        }
      }

      // Home/End keys
      if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = elements.length - 1;
      }

      // Enter/Space to select
      if ((e.key === "Enter" || e.key === " ") && onSelect) {
        e.preventDefault();
        onSelect(elements[currentIndex]);
        return;
      }

      // Handle looping
      if (loop) {
        if (nextIndex >= elements.length) {
          nextIndex = 0;
        } else if (nextIndex < 0) {
          nextIndex = elements.length - 1;
        }
      } else {
        nextIndex = Math.max(0, Math.min(nextIndex, elements.length - 1));
      }

      // Focus next element
      if (nextIndex !== currentIndex && elements[nextIndex]) {
        elements[nextIndex].focus();
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, orientation, loop, onSelect]);
}

// ============================================================================
// ARIA Attributes
// ============================================================================

/**
 * Generate ARIA label for icon-only buttons
 *
 * @example
 * const ariaLabel = useAriaLabel('Send message', { context: 'button' });
 */
export function useAriaLabel(
  label: string,
  options?: {
    context?: string;
    describedBy?: string;
  },
): {
  "aria-label": string;
  "aria-describedby"?: string;
} {
  const { context, describedBy } = options || {};

  return {
    "aria-label": context ? `${label} ${context}` : label,
    ...(describedBy && { "aria-describedby": describedBy }),
  };
}

/**
 * Generate ARIA attributes for loading states
 *
 * @example
 * const loadingProps = useAriaLoading(isLoading, 'Loading messages');
 */
export function useAriaLoading(
  isLoading: boolean,
  label?: string,
): {
  "aria-busy"?: boolean;
  "aria-label"?: string;
} {
  if (!isLoading) return {};

  return {
    "aria-busy": true,
    ...(label && { "aria-label": label }),
  };
}

/**
 * Generate ARIA attributes for expandable sections
 *
 * @example
 * const expandProps = useAriaExpanded(isExpanded, 'channel-list');
 */
export function useAriaExpanded(
  isExpanded: boolean,
  id: string,
): {
  "aria-expanded": boolean;
  "aria-controls": string;
} {
  return {
    "aria-expanded": isExpanded,
    "aria-controls": id,
  };
}

// ============================================================================
// Screen Reader Only
// ============================================================================

/**
 * Create a visually hidden element for screen readers
 *
 * @example
 * const srOnlyRef = useScreenReaderOnly<HTMLSpanElement>('Additional context');
 */
export function useScreenReaderOnly<T extends HTMLElement>(
  content: string,
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.textContent = content;
    ref.current.className = "sr-only";
  }, [content]);

  return ref;
}

// ============================================================================
// Reduced Motion
// ============================================================================

/**
 * Check if user prefers reduced motion
 *
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion();
 */
export function usePrefersReducedMotion(): boolean {
  const { isReducedMotion } = useAccessibility();
  return isReducedMotion();
}

/**
 * Get animation duration based on motion preference
 *
 * @example
 * const duration = useAnimationDuration(300); // Returns 0 if reduced motion
 */
export function useAnimationDuration(defaultDuration: number): number {
  const prefersReducedMotion = usePrefersReducedMotion();
  return prefersReducedMotion ? 0 : defaultDuration;
}

// ============================================================================
// Focus Visible
// ============================================================================

/**
 * Track if focus is visible (keyboard navigation vs mouse click)
 *
 * @example
 * const isFocusVisible = useFocusVisible();
 */
export function useFocusVisible(): boolean {
  const { settings } = useAccessibility();
  return settings.showFocusOutline;
}

// ============================================================================
// High Contrast Mode
// ============================================================================

/**
 * Check if high contrast mode is enabled
 *
 * @example
 * const isHighContrast = useHighContrast();
 */
export function useHighContrast(): boolean {
  const { settings } = useAccessibility();
  return settings.highContrast;
}
