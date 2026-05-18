"use client";

/**
 * useHotkey Hook
 *
 * A simple, lightweight hook for registering a single keyboard hotkey.
 * Supports platform-aware modifier keys (mod = Cmd on Mac, Ctrl on Windows/Linux).
 *
 * @example
 * ```tsx
 * // Simple usage
 * useHotkey('mod+k', () => openQuickSwitcher());
 *
 * // With options
 * useHotkey('mod+s', handleSave, { enableOnInputs: true, preventDefault: true });
 *
 * // Disabled based on condition
 * useHotkey('escape', closeModal, { enabled: isModalOpen });
 * ```
 */

import { useEffect, useCallback, useRef, useMemo } from "react";
import {
  matchesShortcut,
  shouldIgnoreShortcut,
  formatShortcut,
  isMacOS,
} from "@/lib/keyboard/shortcut-utils";

// ============================================================================
// Types
// ============================================================================

export type HotkeyCallback = (event: KeyboardEvent) => void | boolean;

export interface UseHotkeyOptions {
  /** Whether the hotkey is enabled (default: true) */
  enabled?: boolean;
  /** Allow hotkey to work when input/textarea is focused (default: false) */
  enableOnInputs?: boolean;
  /** Allow hotkey to work when contenteditable element is focused (default: false) */
  enableOnContentEditable?: boolean;
  /** Prevent default browser behavior (default: false) */
  preventDefault?: boolean;
  /** Stop event propagation (default: true) */
  stopPropagation?: boolean;
  /** Event phase to listen on (default: false for bubble) */
  capture?: boolean;
  /** Target element (default: document) */
  target?: HTMLElement | Document | null;
  /** Dependencies for the callback */
  deps?: React.DependencyList;
  /** Description for accessibility */
  description?: string;
}

export interface UseHotkeyReturn {
  /** Formatted key combination for display */
  displayKey: string;
  /** Whether the hotkey is currently enabled */
  isEnabled: boolean;
  /** Manually trigger the hotkey callback */
  trigger: () => void;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Register a keyboard hotkey
 *
 * @param keys - Key combination string (e.g., 'mod+k', 'shift+enter', 'escape')
 * @param callback - Function to call when hotkey is triggered
 * @param options - Configuration options
 * @returns Object with displayKey, isEnabled, and trigger function
 */
export function useHotkey(
  keys: string,
  callback: HotkeyCallback,
  options: UseHotkeyOptions = {},
): UseHotkeyReturn {
  const {
    enabled = true,
    enableOnInputs = false,
    enableOnContentEditable = false,
    preventDefault = false,
    stopPropagation = true,
    capture = false,
    target = null,
    deps = [],
  } = options;

  const callbackRef = useRef(callback);
  const isMac = useMemo(() => isMacOS(), []);
  const displayKey = useMemo(
    () => formatShortcut(keys, { useMacSymbols: isMac }),
    [keys, isMac],
  );

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Main event handler
  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      // Check if enabled
      if (!enabled) return;

      // Check if keys match
      if (!matchesShortcut(event, keys)) return;

      // Check if we should ignore based on focus
      const shouldIgnore = shouldIgnoreShortcut(event, {
        enableOnInputs,
        enableOnContentEditable,
      });

      if (shouldIgnore) return;

      // Prevent default if specified
      if (preventDefault) {
        event.preventDefault();
      }

      // Execute callback
      const result = callbackRef.current(event);

      // Stop propagation unless callback returned false
      if (stopPropagation && result !== false) {
        event.stopPropagation();
      }
    },
    [
      keys,
      enabled,
      enableOnInputs,
      enableOnContentEditable,
      preventDefault,
      stopPropagation,
    ],
  );

  // Register event listener
  useEffect(() => {
    if (!enabled) return;

    const eventTarget = target || document;

    eventTarget.addEventListener("keydown", handleKeydown as EventListener, {
      capture,
    });

    return () => {
      eventTarget.removeEventListener(
        "keydown",
        handleKeydown as EventListener,
        { capture },
      );
    };
  }, [handleKeydown, enabled, target, capture, ...deps]);

  // Manual trigger function
  const trigger = useCallback(() => {
    const syntheticEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
    });
    callbackRef.current(syntheticEvent);
  }, []);

  return {
    displayKey,
    isEnabled: enabled,
    trigger,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Register an escape key handler
 *
 * @example
 * ```tsx
 * useEscapeKey(() => closeModal(), { enabled: isOpen });
 * ```
 */
export function useEscapeKey(
  callback: HotkeyCallback,
  options: Omit<UseHotkeyOptions, "keys"> = {},
): UseHotkeyReturn {
  return useHotkey("escape", callback, {
    enableOnInputs: true, // Escape typically works in inputs
    ...options,
  });
}

/**
 * Register an enter key handler
 *
 * @example
 * ```tsx
 * useEnterKey(() => submitForm(), { enableOnInputs: true });
 * ```
 */
export function useEnterKey(
  callback: HotkeyCallback,
  options: Omit<UseHotkeyOptions, "keys"> = {},
): UseHotkeyReturn {
  return useHotkey("enter", callback, options);
}

/**
 * Register a mod+key combination (Cmd on Mac, Ctrl on Windows/Linux)
 *
 * @example
 * ```tsx
 * useModKey('s', () => saveDocument(), { preventDefault: true });
 * useModKey('k', () => openSearch());
 * ```
 */
export function useModKey(
  key: string,
  callback: HotkeyCallback,
  options: Omit<UseHotkeyOptions, "keys"> = {},
): UseHotkeyReturn {
  return useHotkey(`mod+${key}`, callback, options);
}

/**
 * Register arrow key handlers
 *
 * @example
 * ```tsx
 * useArrowKeys({
 *   up: () => selectPrevious(),
 *   down: () => selectNext(),
 * });
 * ```
 */
export function useArrowKeys(
  handlers: {
    up?: HotkeyCallback;
    down?: HotkeyCallback;
    left?: HotkeyCallback;
    right?: HotkeyCallback;
  },
  options: Omit<UseHotkeyOptions, "keys"> = {},
): void {
  useHotkey("arrowup", handlers.up || (() => {}), {
    ...options,
    enabled: options.enabled !== false && !!handlers.up,
  });
  useHotkey("arrowdown", handlers.down || (() => {}), {
    ...options,
    enabled: options.enabled !== false && !!handlers.down,
  });
  useHotkey("arrowleft", handlers.left || (() => {}), {
    ...options,
    enabled: options.enabled !== false && !!handlers.left,
  });
  useHotkey("arrowright", handlers.right || (() => {}), {
    ...options,
    enabled: options.enabled !== false && !!handlers.right,
  });
}

// ============================================================================
// Multiple Hotkeys Hook
// ============================================================================

export interface HotkeyDefinition {
  keys: string;
  callback: HotkeyCallback;
  options?: Omit<UseHotkeyOptions, "deps">;
}

/**
 * Register multiple hotkeys at once
 *
 * @example
 * ```tsx
 * useHotkeys([
 *   { keys: 'mod+k', callback: openSearch },
 *   { keys: 'mod+s', callback: save, options: { preventDefault: true } },
 *   { keys: 'escape', callback: close, options: { enableOnInputs: true } },
 * ]);
 * ```
 */
export function useHotkeys(
  hotkeys: HotkeyDefinition[],
  globalOptions: Omit<UseHotkeyOptions, "keys"> = {},
): void {
  const callbacksRef = useRef<Map<string, HotkeyCallback>>(new Map());

  // Update refs
  useEffect(() => {
    callbacksRef.current.clear();
    for (const hotkey of hotkeys) {
      callbacksRef.current.set(hotkey.keys, hotkey.callback);
    }
  }, [hotkeys]);

  // Create combined handler
  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      for (const hotkey of hotkeys) {
        const options = { ...globalOptions, ...hotkey.options };
        const {
          enabled = true,
          enableOnInputs = false,
          enableOnContentEditable = false,
          preventDefault = false,
          stopPropagation = true,
        } = options;

        if (!enabled) continue;
        if (!matchesShortcut(event, hotkey.keys)) continue;

        const shouldIgnore = shouldIgnoreShortcut(event, {
          enableOnInputs,
          enableOnContentEditable,
        });

        if (shouldIgnore) continue;

        if (preventDefault) {
          event.preventDefault();
        }

        const callback = callbacksRef.current.get(hotkey.keys);
        if (callback) {
          const result = callback(event);
          if (stopPropagation && result !== false) {
            event.stopPropagation();
            return;
          }
        }
      }
    },
    [hotkeys, globalOptions],
  );

  // Register listener
  useEffect(() => {
    const target = globalOptions.target || document;
    const capture = globalOptions.capture || false;

    target.addEventListener("keydown", handleKeydown as EventListener, {
      capture,
    });

    return () => {
      target.removeEventListener("keydown", handleKeydown as EventListener, {
        capture,
      });
    };
  }, [handleKeydown, globalOptions.target, globalOptions.capture]);
}

// ============================================================================
// Conditional Hotkey Hook
// ============================================================================

/**
 * Register a hotkey that only works when a condition is met
 *
 * @example
 * ```tsx
 * useConditionalHotkey(
 *   'mod+s',
 *   () => save(),
 *   { when: hasUnsavedChanges, preventDefault: true }
 * );
 * ```
 */
export function useConditionalHotkey(
  keys: string,
  callback: HotkeyCallback,
  options: UseHotkeyOptions & { when: boolean },
): UseHotkeyReturn {
  const { when, ...restOptions } = options;

  return useHotkey(keys, callback, {
    ...restOptions,
    enabled: when && options.enabled !== false,
  });
}

// ============================================================================
// Scoped Hotkey Hook
// ============================================================================

/**
 * Register a hotkey scoped to a specific element
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * useScopedHotkey(containerRef, 'mod+enter', () => submit());
 * ```
 */
export function useScopedHotkey(
  ref: React.RefObject<HTMLElement>,
  keys: string,
  callback: HotkeyCallback,
  options: Omit<UseHotkeyOptions, "target"> = {},
): UseHotkeyReturn {
  const [target, setTarget] = React.useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(ref.current);
  }, [ref]);

  return useHotkey(keys, callback, {
    ...options,
    target,
    enabled: options.enabled !== false && target !== null,
  });
}

// Need to import React for useScopedHotkey
import React from "react";

export default useHotkey;
