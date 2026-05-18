"use client";

import { useEffect, useRef, useCallback } from "react";

export interface UseFocusManagementOptions {
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
  /** Whether to restore focus on unmount */
  restoreFocus?: boolean;
  /** Whether to trap focus within the element */
  trapFocus?: boolean;
}

/**
 * Hook for managing focus state and behavior
 *
 * @example
 * ```tsx
 * const { focusRef, setFocus } = useFocusManagement({
 *   autoFocus: true,
 *   restoreFocus: true,
 * });
 *
 * return <input ref={focusRef} />;
 * ```
 */
export function useFocusManagement<T extends HTMLElement>(
  options: UseFocusManagementOptions = {},
) {
  const {
    autoFocus = false,
    restoreFocus = false,
    trapFocus = false,
  } = options;
  const focusRef = useRef<T>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const setFocus = useCallback(() => {
    focusRef.current?.focus();
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus) {
      // Store the currently focused element
      previousActiveElementRef.current = document.activeElement as HTMLElement;

      // Focus the element
      requestAnimationFrame(() => {
        focusRef.current?.focus();
      });
    }

    return () => {
      // Restore focus on unmount if enabled
      if (restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [autoFocus, restoreFocus]);

  // Focus trap
  useEffect(() => {
    if (!trapFocus || !focusRef.current) return;

    const element = focusRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusableElements = element.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    element.addEventListener("keydown", handleKeyDown);

    return () => {
      element.removeEventListener("keydown", handleKeyDown);
    };
  }, [trapFocus]);

  return {
    focusRef,
    setFocus,
  };
}

/**
 * Hook for managing roving tabindex (arrow key navigation)
 *
 * Useful for lists, menus, toolbars, etc.
 *
 * @example
 * ```tsx
 * const { containerRef, currentIndex } = useRovingTabIndex({
 *   orientation: 'vertical',
 *   loop: true,
 * });
 *
 * return (
 *   <div ref={containerRef}>
 *     <button tabIndex={currentIndex === 0 ? 0 : -1}>Item 1</button>
 *     <button tabIndex={currentIndex === 1 ? 0 : -1}>Item 2</button>
 *     <button tabIndex={currentIndex === 2 ? 0 : -1}>Item 3</button>
 *   </div>
 * );
 * ```
 */
export function useRovingTabIndex<T extends HTMLElement>(
  options: {
    orientation?: "horizontal" | "vertical" | "both";
    loop?: boolean;
    onIndexChange?: (index: number) => void;
  } = {},
) {
  const { orientation = "vertical", loop = true, onIndexChange } = options;
  const containerRef = useRef<T>(null);
  const currentIndexRef = useRef(0);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }, []);

  const focusElement = useCallback(
    (index: number) => {
      const elements = getFocusableElements();
      const element = elements[index];

      if (element) {
        element.focus();
        currentIndexRef.current = index;
        onIndexChange?.(index);
      }
    },
    [getFocusableElements, onIndexChange],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const currentIndex = currentIndexRef.current;
      let nextIndex = currentIndex;

      const isVerticalKey =
        event.key === "ArrowUp" || event.key === "ArrowDown";
      const isHorizontalKey =
        event.key === "ArrowLeft" || event.key === "ArrowRight";

      // Check if key matches orientation
      if (orientation === "vertical" && !isVerticalKey) return;
      if (orientation === "horizontal" && !isHorizontalKey) return;

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        nextIndex = currentIndex + 1;
        if (nextIndex >= elements.length) {
          nextIndex = loop ? 0 : elements.length - 1;
        }
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = loop ? elements.length - 1 : 0;
        }
      } else if (event.key === "Home") {
        event.preventDefault();
        nextIndex = 0;
      } else if (event.key === "End") {
        event.preventDefault();
        nextIndex = elements.length - 1;
      }

      focusElement(nextIndex);
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [orientation, loop, getFocusableElements, focusElement]);

  return {
    containerRef,
    currentIndex: currentIndexRef.current,
    focusElement,
  };
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

/**
 * Move focus to the first focusable element in a container
 */
export function focusFirstElement(container: HTMLElement): void {
  const elements = getFocusableElements(container);
  elements[0]?.focus();
}

/**
 * Move focus to the last focusable element in a container
 */
export function focusLastElement(container: HTMLElement): void {
  const elements = getFocusableElements(container);
  elements[elements.length - 1]?.focus();
}

/**
 * Check if an element is currently focused
 */
export function isFocused(element: HTMLElement | null): boolean {
  return element !== null && document.activeElement === element;
}

/**
 * Hook to detect when an element loses focus
 */
export function useBlurDetection(
  callback: () => void,
  deps: React.DependencyList = [],
) {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleBlur = (event: FocusEvent) => {
      // Check if focus moved outside the element
      if (!element.contains(event.relatedTarget as Node)) {
        callback();
      }
    };

    element.addEventListener("focusout", handleBlur);

    return () => {
      element.removeEventListener("focusout", handleBlur);
    };
  }, [callback, ...deps]);

  return elementRef;
}

export default useFocusManagement;
