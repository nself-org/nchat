"use client";

import * as React from "react";
import { useCallback, useEffect, useRef } from "react";

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

export interface FocusTrapProps {
  /** Whether the focus trap is active */
  active?: boolean;
  /** Content to trap focus within */
  children: React.ReactNode;
  /** Called when escape key is pressed */
  onEscape?: () => void;
  /** Element to return focus to on deactivation */
  returnFocusRef?: React.RefObject<HTMLElement>;
  /** Auto focus first element on mount */
  autoFocus?: boolean;
  /** ID of element to focus initially (overrides autoFocus) */
  initialFocusId?: string;
  /** Whether to allow focus to leave the trap on Shift+Tab from first element */
  allowEscapeOnShiftTab?: boolean;
  /** Additional className for the container */
  className?: string;
}

/**
 * Focus trap component for modals, dialogs, and overlays
 * Traps keyboard focus within the component while active
 */
export function FocusTrap({
  active = true,
  children,
  onEscape,
  returnFocusRef,
  autoFocus = true,
  initialFocusId,
  allowEscapeOnShiftTab = false,
  className,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const elements =
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter(
      (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
    );
  }, []);

  // Store the previously focused element
  useEffect(() => {
    if (active) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
    }
  }, [active]);

  // Handle initial focus
  useEffect(() => {
    if (!active || !autoFocus) return;

    const focusInitialElement = () => {
      if (initialFocusId) {
        const initialElement = document.getElementById(initialFocusId);
        if (initialElement) {
          initialElement.focus();
          return;
        }
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    };

    // Use requestAnimationFrame to ensure the DOM is ready
    const rafId = requestAnimationFrame(focusInitialElement);
    return () => cancelAnimationFrame(rafId);
  }, [active, autoFocus, initialFocusId, getFocusableElements]);

  // Return focus on deactivation
  useEffect(() => {
    return () => {
      if (returnFocusRef?.current) {
        returnFocusRef.current.focus();
      } else if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [returnFocusRef]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!active) return;

      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      // Shift + Tab on first element
      if (event.shiftKey && activeElement === firstElement) {
        if (allowEscapeOnShiftTab) return;
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab on last element
      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    },
    [active, allowEscapeOnShiftTab, getFocusableElements, onEscape],
  );

  // Prevent focus from leaving the trap
  useEffect(() => {
    if (!active) return;

    const handleFocusIn = (event: FocusEvent) => {
      if (!containerRef.current) return;

      const target = event.target as Node;
      if (!containerRef.current.contains(target)) {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, [active, getFocusableElements]);

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={className}
      role="presentation"
    >
      {children}
    </div>
  );
}

/**
 * Hook version of focus trap for more control
 */
export function useFocusTrap(options: Omit<FocusTrapProps, "children"> = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    active = true,
    onEscape,
    returnFocusRef,
    autoFocus = true,
    initialFocusId,
  } = options;

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const elements =
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter(
      (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
    );
  }, []);

  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  }, [getFocusableElements]);

  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  }, [getFocusableElements]);

  useEffect(() => {
    if (!active || !autoFocus) return;

    if (initialFocusId) {
      const element = document.getElementById(initialFocusId);
      if (element) {
        element.focus();
        return;
      }
    }

    focusFirst();
  }, [active, autoFocus, initialFocusId, focusFirst]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!active) return;

      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [active, getFocusableElements, onEscape],
  );

  return {
    containerRef,
    handleKeyDown,
    focusFirst,
    focusLast,
    getFocusableElements,
  };
}

export default FocusTrap;
