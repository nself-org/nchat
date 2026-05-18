"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook for checking if component is mounted
 * Useful for avoiding state updates after unmount
 * @returns Boolean indicating if component is mounted
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  return isMounted;
}

/**
 * Hook that returns a ref-based mounted check
 * More performant than useIsMounted for use in callbacks
 * @returns Function that returns current mounted state
 */
export function useMountedRef(): () => boolean {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}

/**
 * Hook for executing a callback only after component mounts
 * Prevents hydration issues and ensures client-side execution
 * @param callback - Function to execute after mount
 */
export function useOnMount(callback: () => void | (() => void)): void {
  useEffect(() => {
    return callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Hook for executing a callback when component unmounts
 * @param callback - Function to execute on unmount
 */
export function useOnUnmount(callback: () => void): void {
  const callbackRef = useRef(callback);

  // Update ref on each render to use latest callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      callbackRef.current();
    };
  }, []);
}

/**
 * Safe setState that only updates if component is still mounted
 * @param setState - The setState function to wrap
 * @returns Wrapped setState that checks mounted status
 */
export function useSafeSetState<T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
): React.Dispatch<React.SetStateAction<T>> {
  const isMounted = useMountedRef();

  return useCallback(
    (value: React.SetStateAction<T>) => {
      if (isMounted()) {
        setState(value);
      }
    },
    [isMounted, setState],
  );
}
