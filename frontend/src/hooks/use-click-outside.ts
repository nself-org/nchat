"use client";

import { useEffect, useRef, RefObject } from "react";

type Handler = (event: MouseEvent | TouchEvent) => void;

/**
 * Hook for detecting clicks outside a referenced element
 * @param ref - React ref to the element to monitor
 * @param handler - Callback function when clicking outside
 * @param enabled - Optional flag to enable/disable the listener (default: true)
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: Handler,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current;
      // Do nothing if clicking ref's element or descendent elements
      if (!el || el.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, enabled]);
}

/**
 * Hook that returns a ref and handles click outside detection
 * Useful when you don't have an existing ref
 * @param handler - Callback function when clicking outside
 * @param enabled - Optional flag to enable/disable the listener (default: true)
 * @returns A ref to attach to your element
 */
export function useClickOutsideRef<T extends HTMLElement = HTMLElement>(
  handler: Handler,
  enabled: boolean = true,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  useClickOutside(ref, handler, enabled);
  return ref;
}
