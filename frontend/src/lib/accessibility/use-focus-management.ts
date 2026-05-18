"use client";

import { useRef, useCallback, useEffect, useState } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "area[href]",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable]",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Hook for managing focus within a container
 */
export function useFocusManagement<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /**
   * Get all focusable elements within the container
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const elements =
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter(
      (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
    );
  }, []);

  /**
   * Focus the first focusable element in the container
   */
  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
      return true;
    }
    return false;
  }, [getFocusableElements]);

  /**
   * Focus the last focusable element in the container
   */
  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
      return true;
    }
    return false;
  }, [getFocusableElements]);

  /**
   * Focus a specific element by index
   */
  const focusByIndex = useCallback(
    (index: number) => {
      const elements = getFocusableElements();
      if (elements.length > 0 && index >= 0 && index < elements.length) {
        elements[index].focus();
        return true;
      }
      return false;
    },
    [getFocusableElements],
  );

  /**
   * Focus the next focusable element
   */
  const focusNext = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length === 0) return false;

    const currentIndex = elements.findIndex(
      (el) => el === document.activeElement,
    );
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % elements.length;
    elements[nextIndex].focus();
    return true;
  }, [getFocusableElements]);

  /**
   * Focus the previous focusable element
   */
  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length === 0) return false;

    const currentIndex = elements.findIndex(
      (el) => el === document.activeElement,
    );
    const prevIndex =
      currentIndex === -1
        ? elements.length - 1
        : (currentIndex - 1 + elements.length) % elements.length;
    elements[prevIndex].focus();
    return true;
  }, [getFocusableElements]);

  /**
   * Store the currently focused element for later restoration
   */
  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  /**
   * Restore focus to the previously saved element
   */
  const restoreFocus = useCallback(() => {
    if (
      previousFocusRef.current &&
      typeof previousFocusRef.current.focus === "function"
    ) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
      return true;
    }
    return false;
  }, []);

  /**
   * Focus the container itself
   */
  const focusContainer = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.focus();
      return true;
    }
    return false;
  }, []);

  return {
    containerRef,
    getFocusableElements,
    focusFirst,
    focusLast,
    focusByIndex,
    focusNext,
    focusPrevious,
    saveFocus,
    restoreFocus,
    focusContainer,
  };
}

/**
 * Hook to detect if the user is using keyboard navigation
 */
export function useFocusVisible(): boolean {
  const [focusVisible, setFocusVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return focusVisible;
}

/**
 * Hook for focus trap with return focus
 */
export function useFocusReturn<T extends HTMLElement = HTMLDivElement>(
  active: boolean = true,
) {
  const containerRef = useRef<T>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (active) {
      returnFocusRef.current = document.activeElement as HTMLElement;
    }

    return () => {
      if (active && returnFocusRef.current) {
        // Use setTimeout to allow the component to unmount first
        setTimeout(() => {
          returnFocusRef.current?.focus();
        }, 0);
      }
    };
  }, [active]);

  return containerRef;
}

/**
 * Hook to focus an element on mount
 */
export function useFocusOnMount<T extends HTMLElement = HTMLElement>(
  options: { delay?: number; condition?: boolean } = {},
) {
  const { delay = 0, condition = true } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!condition) return;

    const timeoutId = setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [delay, condition]);

  return ref;
}

/**
 * Hook to manage focus within a dialog or modal
 */
export function useDialogFocus<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  initialFocusId?: string,
) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Save current focus
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus initial element or first focusable
      const focusInitial = () => {
        if (initialFocusId) {
          const element = document.getElementById(initialFocusId);
          if (element) {
            element.focus();
            return;
          }
        }

        if (containerRef.current) {
          const firstFocusable =
            containerRef.current.querySelector<HTMLElement>(
              FOCUSABLE_SELECTORS,
            );
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            containerRef.current.focus();
          }
        }
      };

      // Use RAF to ensure DOM is ready
      requestAnimationFrame(focusInitial);
    } else if (previousFocusRef.current) {
      // Restore focus when closing
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen, initialFocusId]);

  return containerRef;
}

/**
 * Get focus-visible CSS classes
 */
export const focusVisibleClasses = {
  ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  outline:
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  none: "focus:outline-none focus-visible:outline-none",
  within:
    "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
} as const;

export default useFocusManagement;
