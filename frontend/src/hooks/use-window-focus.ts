"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook for detecting window focus state
 * Useful for pausing animations, refreshing data, or managing notifications
 * @returns Boolean indicating if the window is focused
 */
export function useWindowFocus(): boolean {
  const [isFocused, setIsFocused] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true; // Assume focused during SSR
    }
    return document.hasFocus();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Also listen to visibility change for tab switching
    const handleVisibilityChange = () => {
      setIsFocused(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isFocused;
}

/**
 * Hook for executing callbacks on window focus/blur
 * @param onFocus - Callback when window gains focus
 * @param onBlur - Callback when window loses focus
 */
export function useWindowFocusEffect(
  onFocus?: () => void,
  onBlur?: () => void,
): boolean {
  const [isFocused, setIsFocused] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return document.hasFocus();
  });

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleFocus, handleBlur]);

  return isFocused;
}

/**
 * Hook that returns document visibility state
 * @returns 'visible' | 'hidden' | 'prerender'
 */
export function useDocumentVisibility(): DocumentVisibilityState {
  const [visibility, setVisibility] = useState<DocumentVisibilityState>(() => {
    if (typeof document === "undefined") return "visible";
    return document.visibilityState;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      setVisibility(document.visibilityState);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return visibility;
}
