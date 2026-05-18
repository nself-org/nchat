"use client";

/**
 * useKeyboardShortcuts Hook
 *
 * A comprehensive hook for managing keyboard shortcuts with context awareness,
 * custom bindings, and integration with the shortcut store.
 */

import { useEffect, useCallback, useRef, useMemo } from "react";
import { useShortcutStore } from "./shortcut-store";
import {
  SHORTCUTS,
  ShortcutKey,
  ShortcutDefinition,
  ShortcutCategory,
} from "./shortcuts";
import {
  matchesShortcut,
  shouldIgnoreShortcut,
  formatShortcut,
  isMacOS,
} from "./shortcut-utils";
import { useKeyboard } from "./keyboard-provider";

// ============================================================================
// Types
// ============================================================================

export type ShortcutCallback = (event: KeyboardEvent) => void | boolean;

export interface ShortcutBinding {
  /** The shortcut key from SHORTCUTS */
  shortcut: ShortcutKey;
  /** Callback when shortcut is triggered */
  callback: ShortcutCallback;
  /** Override enabled state */
  enabled?: boolean;
  /** Override context requirement */
  contexts?: string[];
  /** Allow in input elements */
  allowInInputs?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  /** Context for these shortcuts (e.g., 'chat', 'editor') */
  context?: string;
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
  /** Dependencies array for re-registering shortcuts */
  deps?: React.DependencyList;
  /** Priority for these handlers (higher = first) */
  priority?: number;
}

export interface UseKeyboardShortcutsReturn {
  /** Manually trigger a shortcut */
  trigger: (shortcut: ShortcutKey) => boolean;
  /** Check if a shortcut is currently enabled */
  isEnabled: (shortcut: ShortcutKey) => boolean;
  /** Get the display string for a shortcut */
  getDisplayKey: (shortcut: ShortcutKey) => string;
  /** Get shortcut info */
  getShortcutInfo: (shortcut: ShortcutKey) => ShortcutDefinition | undefined;
  /** All shortcuts with current state */
  shortcuts: ShortcutWithState[];
  /** Shortcuts grouped by category */
  shortcutsByCategory: Record<ShortcutCategory, ShortcutWithState[]>;
}

export interface ShortcutWithState extends ShortcutDefinition {
  id: ShortcutKey;
  effectiveKey: string;
  displayKey: string;
  isEnabled: boolean;
  isCustomized: boolean;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Register multiple keyboard shortcuts with a shared context
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   QUICK_SWITCHER: () => setQuickSwitcherOpen(true),
 *   SEARCH: () => focusSearch(),
 *   TOGGLE_SIDEBAR: () => toggleSidebar(),
 * }, { context: 'chat' });
 * ```
 */
export function useKeyboardShortcuts(
  bindings: Partial<Record<ShortcutKey, ShortcutCallback>>,
  options: UseKeyboardShortcutsOptions = {},
): UseKeyboardShortcutsReturn {
  const {
    context = "global",
    enabled = true,
    deps = [],
    priority = 0,
  } = options;

  const {
    isEnabled: globalEnabled,
    activeScope,
    isInputFocused,
  } = useKeyboard();
  const store = useShortcutStore();
  const bindingsRef = useRef(bindings);
  const isMac = useMemo(() => isMacOS(), []);

  // Update bindings ref when bindings change
  useEffect(() => {
    bindingsRef.current = bindings;
  }, [bindings]);

  // Main keyboard event handler
  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      // Check global and local enabled state
      if (!globalEnabled || !enabled || !store.shortcutsEnabled) {
        return;
      }

      // Find matching shortcut
      for (const [id, callback] of Object.entries(bindingsRef.current)) {
        const shortcutKey = id as ShortcutKey;
        const shortcut = SHORTCUTS[shortcutKey] as
          | ShortcutDefinition
          | undefined;

        if (!shortcut) continue;

        // Get effective key (may be customized)
        const effectiveKey = store.getEffectiveKey(shortcutKey);

        // Check if event matches this shortcut
        if (!matchesShortcut(event, effectiveKey)) {
          continue;
        }

        // Check if shortcut is enabled
        if (!store.isShortcutEnabled(shortcutKey)) {
          continue;
        }

        // Check if we should ignore based on input focus
        const shouldIgnore = shouldIgnoreShortcut(event, {
          enableOnInputs: shortcut.enableOnFormTags ?? false,
          enableOnContentEditable: shortcut.enableOnFormTags ?? false,
        });

        if (shouldIgnore) {
          continue;
        }

        // Check scope if defined
        if (shortcut.scopes && shortcut.scopes.length > 0) {
          const hasActiveScope =
            shortcut.scopes.includes(activeScope) ||
            shortcut.scopes.includes(context);
          if (!hasActiveScope) {
            continue;
          }
        }

        // Prevent default if specified
        if (shortcut.preventDefault) {
          event.preventDefault();
        }

        // Execute callback
        const result = callback(event);

        // Stop if handler didn't return false
        if (result !== false) {
          event.stopPropagation();
          return;
        }
      }
    },
    [globalEnabled, enabled, store, activeScope, context],
  );

  // Register event listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [handleKeydown, enabled, ...deps]);

  // Build shortcuts with state
  const shortcuts = useMemo<ShortcutWithState[]>(() => {
    return Object.entries(SHORTCUTS).map(([id, shortcut]) => {
      const shortcutKey = id as ShortcutKey;
      const effectiveKey = store.getEffectiveKey(shortcutKey);
      const isCustomized =
        store.customShortcuts[shortcutKey]?.customKey !== undefined;

      return {
        id: shortcutKey,
        ...(shortcut as ShortcutDefinition),
        effectiveKey,
        displayKey: formatShortcut(effectiveKey, { useMacSymbols: isMac }),
        isEnabled: store.isShortcutEnabled(shortcutKey),
        isCustomized,
      };
    });
  }, [store, isMac]);

  // Group by category
  const shortcutsByCategory = useMemo<
    Record<ShortcutCategory, ShortcutWithState[]>
  >(() => {
    const grouped: Record<ShortcutCategory, ShortcutWithState[]> = {
      Navigation: [],
      Messages: [],
      Formatting: [],
      UI: [],
      Actions: [],
    };

    for (const shortcut of shortcuts) {
      grouped[shortcut.category].push(shortcut);
    }

    return grouped;
  }, [shortcuts]);

  // Utility functions
  const trigger = useCallback((shortcut: ShortcutKey): boolean => {
    const callback = bindingsRef.current[shortcut];
    if (!callback) return false;

    const syntheticEvent = new KeyboardEvent("keydown");
    const result = callback(syntheticEvent);
    return result !== false;
  }, []);

  const isShortcutEnabled = useCallback(
    (shortcut: ShortcutKey): boolean => {
      return store.isShortcutEnabled(shortcut);
    },
    [store],
  );

  const getDisplayKey = useCallback(
    (shortcut: ShortcutKey): string => {
      const effectiveKey = store.getEffectiveKey(shortcut);
      return formatShortcut(effectiveKey, { useMacSymbols: isMac });
    },
    [store, isMac],
  );

  const getShortcutInfo = useCallback(
    (shortcut: ShortcutKey): ShortcutDefinition | undefined => {
      return SHORTCUTS[shortcut] as ShortcutDefinition | undefined;
    },
    [],
  );

  return {
    trigger,
    isEnabled: isShortcutEnabled,
    getDisplayKey,
    getShortcutInfo,
    shortcuts,
    shortcutsByCategory,
  };
}

// ============================================================================
// Simplified Hook for Single Shortcut
// ============================================================================

export interface UseSingleShortcutOptions {
  /** Whether the shortcut is enabled */
  enabled?: boolean;
  /** Contexts where shortcut should work */
  contexts?: string[];
  /** Allow in input elements */
  allowInInputs?: boolean;
  /** Dependencies for the callback */
  deps?: React.DependencyList;
}

/**
 * Register a single keyboard shortcut
 *
 * @example
 * ```tsx
 * useSingleShortcut('QUICK_SWITCHER', () => {
 *   setQuickSwitcherOpen(true);
 * });
 * ```
 */
export function useSingleShortcut(
  shortcutKey: ShortcutKey,
  callback: ShortcutCallback,
  options: UseSingleShortcutOptions = {},
): { displayKey: string; isEnabled: boolean } {
  const { enabled = true, contexts, allowInInputs, deps = [] } = options;

  const {
    isEnabled: globalEnabled,
    activeScope,
    isInputFocused,
  } = useKeyboard();
  const store = useShortcutStore();
  const callbackRef = useRef(callback);
  const isMac = useMemo(() => isMacOS(), []);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const shortcut = SHORTCUTS[shortcutKey] as ShortcutDefinition | undefined;
  const effectiveKey = store.getEffectiveKey(shortcutKey);
  const displayKey = formatShortcut(effectiveKey, { useMacSymbols: isMac });
  const isEnabled = enabled && store.isShortcutEnabled(shortcutKey);

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!globalEnabled || !enabled || !store.shortcutsEnabled) return;
      if (!shortcut) return;

      if (!matchesShortcut(event, effectiveKey)) return;
      if (!store.isShortcutEnabled(shortcutKey)) return;

      const shouldAllowInInputs = allowInInputs ?? shortcut.enableOnFormTags;
      const shouldIgnore = shouldIgnoreShortcut(event, {
        enableOnInputs: shouldAllowInInputs,
        enableOnContentEditable: shouldAllowInInputs,
      });

      if (shouldIgnore) return;

      // Check scope
      const effectiveContexts = contexts ?? shortcut.scopes;
      if (effectiveContexts && effectiveContexts.length > 0) {
        if (!effectiveContexts.includes(activeScope)) return;
      }

      if (shortcut.preventDefault) {
        event.preventDefault();
      }

      const result = callbackRef.current(event);
      if (result !== false) {
        event.stopPropagation();
      }
    },
    [
      globalEnabled,
      enabled,
      store,
      shortcut,
      effectiveKey,
      shortcutKey,
      contexts,
      activeScope,
      allowInInputs,
    ],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [handleKeydown, enabled, ...deps]);

  return { displayKey, isEnabled };
}

// ============================================================================
// Context-Scoped Hook
// ============================================================================

/**
 * Register shortcuts that only work in a specific context
 *
 * @example
 * ```tsx
 * // Only active when editor is focused
 * useContextShortcuts('editor', {
 *   BOLD: () => formatBold(),
 *   ITALIC: () => formatItalic(),
 * });
 * ```
 */
export function useContextShortcuts(
  context: string,
  bindings: Partial<Record<ShortcutKey, ShortcutCallback>>,
  options: Omit<UseKeyboardShortcutsOptions, "context"> = {},
): UseKeyboardShortcutsReturn {
  return useKeyboardShortcuts(bindings, { ...options, context });
}

// ============================================================================
// Shortcut Info Hook
// ============================================================================

/**
 * Get information about a shortcut without registering a handler
 *
 * @example
 * ```tsx
 * const { displayKey, label, description } = useShortcutInfo('QUICK_SWITCHER');
 * // displayKey: "⌘K" (on Mac)
 * // label: "Quick switcher"
 * ```
 */
export function useShortcutDisplay(shortcutKey: ShortcutKey): {
  displayKey: string;
  label: string;
  description: string | undefined;
  isEnabled: boolean;
  isCustomized: boolean;
  category: ShortcutCategory;
} {
  const store = useShortcutStore();
  const isMac = useMemo(() => isMacOS(), []);

  const shortcut = SHORTCUTS[shortcutKey] as ShortcutDefinition | undefined;
  const effectiveKey = store.getEffectiveKey(shortcutKey);
  const isCustomized =
    store.customShortcuts[shortcutKey]?.customKey !== undefined;

  return {
    displayKey: formatShortcut(effectiveKey, { useMacSymbols: isMac }),
    label: shortcut?.label ?? "",
    description: shortcut?.description,
    isEnabled: store.isShortcutEnabled(shortcutKey),
    isCustomized,
    category: shortcut?.category ?? "Actions",
  };
}

// ============================================================================
// All Shortcuts Hook
// ============================================================================

/**
 * Get all shortcuts with their current state (for display in modal)
 */
export function useAllShortcuts(): {
  shortcuts: ShortcutWithState[];
  shortcutsByCategory: Record<ShortcutCategory, ShortcutWithState[]>;
  categories: ShortcutCategory[];
} {
  const store = useShortcutStore();
  const isMac = useMemo(() => isMacOS(), []);

  const categories: ShortcutCategory[] = [
    "Navigation",
    "Messages",
    "Formatting",
    "UI",
    "Actions",
  ];

  const shortcuts = useMemo<ShortcutWithState[]>(() => {
    return Object.entries(SHORTCUTS).map(([id, shortcut]) => {
      const shortcutKey = id as ShortcutKey;
      const effectiveKey = store.getEffectiveKey(shortcutKey);
      const isCustomized =
        store.customShortcuts[shortcutKey]?.customKey !== undefined;

      return {
        id: shortcutKey,
        ...(shortcut as ShortcutDefinition),
        effectiveKey,
        displayKey: formatShortcut(effectiveKey, { useMacSymbols: isMac }),
        isEnabled: store.isShortcutEnabled(shortcutKey),
        isCustomized,
      };
    });
  }, [store, isMac]);

  const shortcutsByCategory = useMemo<
    Record<ShortcutCategory, ShortcutWithState[]>
  >(() => {
    const grouped: Record<ShortcutCategory, ShortcutWithState[]> = {
      Navigation: [],
      Messages: [],
      Formatting: [],
      UI: [],
      Actions: [],
    };

    for (const shortcut of shortcuts) {
      grouped[shortcut.category].push(shortcut);
    }

    return grouped;
  }, [shortcuts]);

  return { shortcuts, shortcutsByCategory, categories };
}
