/**
 * useShortcuts Hook
 *
 * A wrapper around react-hotkeys-hook that integrates with the keyboard context.
 * Provides a consistent API for registering keyboard shortcuts throughout the app.
 */

import { useHotkeys, Options as HotkeysOptions } from "react-hotkeys-hook";
import { useCallback, useMemo } from "react";
import { useKeyboard } from "./keyboard-provider";
import { SHORTCUTS, ShortcutKey, ShortcutDefinition } from "./shortcuts";

// ============================================================================
// Types
// ============================================================================

export interface UseShortcutOptions extends Omit<HotkeysOptions, "enabled"> {
  /** Whether the shortcut is enabled (default: true) */
  enabled?: boolean;
  /** Override the default scope check */
  ignoreScope?: boolean;
  /** Custom condition for enabling the shortcut */
  when?: boolean | (() => boolean);
}

export type ShortcutHandler = (event: KeyboardEvent) => void;

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Register a single keyboard shortcut
 *
 * @param shortcutKey - Key from SHORTCUTS constant
 * @param handler - Callback function when shortcut is triggered
 * @param options - Additional options
 *
 * @example
 * ```tsx
 * useShortcut('QUICK_SWITCHER', () => {
 *   setQuickSwitcherOpen(true);
 * });
 * ```
 */
export function useShortcut(
  shortcutKey: ShortcutKey,
  handler: ShortcutHandler,
  options: UseShortcutOptions = {},
): void {
  const { isEnabled, activeScope, isInputFocused } = useKeyboard();
  const shortcut = SHORTCUTS[shortcutKey] as ShortcutDefinition;

  const {
    enabled = true,
    ignoreScope = false,
    when,
    ...hotkeysOptions
  } = options;

  // Determine if the shortcut should be active
  const isActive = useMemo(() => {
    // Global keyboard system disabled
    if (!isEnabled) return false;

    // Explicit enabled flag
    if (!enabled) return false;

    // Custom condition
    if (when !== undefined) {
      const condition = typeof when === "function" ? when() : when;
      if (!condition) return false;
    }

    // Check scope if shortcut has scopes defined and we're not ignoring scope
    if (!ignoreScope && shortcut.scopes && shortcut.scopes.length > 0) {
      if (!shortcut.scopes.includes(activeScope)) return false;
    }

    // Check if input is focused and shortcut doesn't allow form tags
    if (isInputFocused && !shortcut.enableOnFormTags) return false;

    return true;
  }, [
    isEnabled,
    enabled,
    when,
    ignoreScope,
    shortcut,
    activeScope,
    isInputFocused,
  ]);

  // Wrapped handler that respects preventDefault setting
  const wrappedHandler = useCallback(
    (event: KeyboardEvent) => {
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      handler(event);
    },
    [handler, shortcut.preventDefault],
  );

  // Build options for react-hotkeys-hook
  const finalOptions: HotkeysOptions = useMemo(
    () => ({
      enabled: isActive,
      enableOnFormTags: shortcut.enableOnFormTags
        ? ["INPUT", "TEXTAREA", "SELECT"]
        : undefined,
      preventDefault: shortcut.preventDefault ?? false,
      ...hotkeysOptions,
    }),
    [
      isActive,
      shortcut.enableOnFormTags,
      shortcut.preventDefault,
      hotkeysOptions,
    ],
  );

  useHotkeys(shortcut.key, wrappedHandler, finalOptions);
}

/**
 * Register multiple shortcuts at once
 *
 * @param shortcuts - Map of shortcut keys to handlers
 * @param options - Shared options for all shortcuts
 *
 * @example
 * ```tsx
 * useShortcuts({
 *   QUICK_SWITCHER: () => openQuickSwitcher(),
 *   SEARCH: () => openSearch(),
 *   TOGGLE_SIDEBAR: () => toggleSidebar(),
 * });
 * ```
 */
export function useShortcuts(
  shortcuts: Partial<Record<ShortcutKey, ShortcutHandler>>,
  options: UseShortcutOptions = {},
): void {
  // Convert shortcuts map to entries for iteration
  const shortcutEntries = Object.entries(shortcuts) as Array<
    [ShortcutKey, ShortcutHandler]
  >;

  // Register each shortcut individually
  // Note: This creates multiple useHotkeys calls, which is the intended behavior
  // for proper cleanup and individual control
  shortcutEntries.forEach(([key, handler]) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useShortcut(key, handler, options);
  });
}

/**
 * Register a custom keyboard shortcut (not from SHORTCUTS constant)
 *
 * @param keys - Keyboard key combination (react-hotkeys-hook format)
 * @param handler - Callback function
 * @param options - Hotkeys options
 *
 * @example
 * ```tsx
 * useCustomShortcut('mod+shift+z', () => {
 *   redo();
 * }, { enableOnFormTags: true });
 * ```
 */
export function useCustomShortcut(
  keys: string,
  handler: ShortcutHandler,
  options: HotkeysOptions & { when?: boolean | (() => boolean) } = {},
): void {
  const { isEnabled, isInputFocused } = useKeyboard();
  const { when, enabled = true, ...hotkeysOptions } = options;

  const isActive = useMemo(() => {
    if (!isEnabled) return false;
    if (!enabled) return false;

    if (when !== undefined) {
      const condition = typeof when === "function" ? when() : when;
      if (!condition) return false;
    }

    // Check input focus unless enableOnFormTags is set
    if (isInputFocused && !hotkeysOptions.enableOnFormTags) return false;

    return true;
  }, [
    isEnabled,
    enabled,
    when,
    isInputFocused,
    hotkeysOptions.enableOnFormTags,
  ]);

  useHotkeys(keys, handler, { ...hotkeysOptions, enabled: isActive });
}

/**
 * Hook to get shortcut info for display (e.g., in tooltips or menus)
 *
 * @param shortcutKey - Key from SHORTCUTS constant
 * @returns Shortcut definition with formatted key display
 *
 * @example
 * ```tsx
 * const { label, keyDisplay } = useShortcutInfo('QUICK_SWITCHER');
 * // label: "Quick switcher"
 * // keyDisplay: "Cmd+K" (on Mac)
 * ```
 */
export function useShortcutInfo(shortcutKey: ShortcutKey) {
  const shortcut = SHORTCUTS[shortcutKey] as ShortcutDefinition;
  const isMac =
    typeof window !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  return useMemo(
    () => ({
      ...shortcut,
      keyDisplay: formatKeyForDisplay(shortcut.key, isMac),
    }),
    [shortcut, isMac],
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a keyboard key for display
 */
function formatKeyForDisplay(key: string, isMac: boolean): string {
  return key
    .split("+")
    .map((part) => {
      switch (part.toLowerCase()) {
        case "mod":
          return isMac ? "\u2318" : "Ctrl";
        case "alt":
          return isMac ? "\u2325" : "Alt";
        case "shift":
          return isMac ? "\u21E7" : "Shift";
        case "ctrl":
          return isMac ? "\u2303" : "Ctrl";
        case "enter":
          return isMac ? "\u21A9" : "Enter";
        case "escape":
          return "Esc";
        case "backspace":
          return isMac ? "\u232B" : "Backspace";
        case "arrowup":
          return "\u2191";
        case "arrowdown":
          return "\u2193";
        case "arrowleft":
          return "\u2190";
        case "arrowright":
          return "\u2192";
        default:
          return part.toUpperCase();
      }
    })
    .join(isMac ? "" : "+");
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
  SHORTCUTS,
  type ShortcutKey,
  type ShortcutDefinition,
} from "./shortcuts";
