"use client";

import { useRef, useEffect } from "react";

/**
 * Hook for tracking the previous value of a variable
 * @param value - The current value to track
 * @returns The previous value (undefined on first render)
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook for tracking the previous value with initial value support
 * @param value - The current value to track
 * @param initialValue - Initial value to return on first render
 * @returns The previous value
 */
export function usePreviousWithInitial<T>(value: T, initialValue: T): T {
  const ref = useRef<T>(initialValue);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook for detecting if a value has changed
 * @param value - The value to track
 * @returns Object with previous value and hasChanged boolean
 */
export function useValueChange<T>(value: T): {
  previous: T | undefined;
  hasChanged: boolean;
  isFirstRender: boolean;
} {
  const previousRef = useRef<T | undefined>(undefined);
  const isFirstRenderRef = useRef(true);

  const previous = previousRef.current;
  const isFirstRender = isFirstRenderRef.current;
  const hasChanged = !isFirstRender && previous !== value;

  useEffect(() => {
    previousRef.current = value;
    isFirstRenderRef.current = false;
  }, [value]);

  return { previous, hasChanged, isFirstRender };
}
