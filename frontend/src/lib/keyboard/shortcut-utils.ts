/**
 * Keyboard Shortcut Utilities
 *
 * Helper functions for parsing, formatting, and working with keyboard shortcuts.
 * Handles platform-specific differences between Mac and Windows/Linux.
 */

// ============================================================================
// Types
// ============================================================================

export type ModifierKey = "mod" | "ctrl" | "alt" | "shift" | "meta";

export interface ParsedShortcut {
  /** Modifier keys in the shortcut */
  modifiers: ModifierKey[];
  /** The main key (non-modifier) */
  key: string;
  /** Original shortcut string */
  original: string;
}

export interface KeyDisplayOptions {
  /** Use Mac-style symbols (default: auto-detect) */
  useMacSymbols?: boolean;
  /** Separator between keys (default: '' for Mac, '+' for Windows) */
  separator?: string;
  /** Show modifier keys in uppercase (default: false) */
  uppercase?: boolean;
}

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Check if the current platform is macOS
 */
export function isMacOS(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Check if the current platform is Windows
 */
export function isWindows(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return navigator.platform.indexOf("Win") > -1;
}

/**
 * Check if the current platform is Linux
 */
export function isLinux(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return navigator.platform.indexOf("Linux") > -1;
}

/**
 * Get the current platform
 */
export function getPlatform(): "mac" | "windows" | "linux" | "unknown" {
  if (isMacOS()) return "mac";
  if (isWindows()) return "windows";
  if (isLinux()) return "linux";
  return "unknown";
}

// ============================================================================
// Key Mapping
// ============================================================================

/** Mac-specific key symbols */
const MAC_KEY_SYMBOLS: Record<string, string> = {
  mod: "\u2318", // Command
  meta: "\u2318", // Command
  ctrl: "\u2303", // Control
  alt: "\u2325", // Option
  shift: "\u21E7", // Shift
  enter: "\u21A9", // Return
  return: "\u21A9",
  backspace: "\u232B", // Delete
  delete: "\u2326", // Forward Delete
  escape: "\u238B", // Escape
  esc: "\u238B",
  tab: "\u21E5", // Tab
  space: "\u2423", // Space
  arrowup: "\u2191", // Up
  arrowdown: "\u2193", // Down
  arrowleft: "\u2190", // Left
  arrowright: "\u2192", // Right
  up: "\u2191",
  down: "\u2193",
  left: "\u2190",
  right: "\u2192",
  pageup: "\u21DE", // Page Up
  pagedown: "\u21DF", // Page Down
  home: "\u2196", // Home
  end: "\u2198", // End
  capslock: "\u21EA", // Caps Lock
};

/** Windows/Linux key names */
const WINDOWS_KEY_NAMES: Record<string, string> = {
  mod: "Ctrl",
  meta: "Win",
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  enter: "Enter",
  return: "Enter",
  backspace: "Backspace",
  delete: "Delete",
  escape: "Esc",
  esc: "Esc",
  tab: "Tab",
  space: "Space",
  arrowup: "\u2191",
  arrowdown: "\u2193",
  arrowleft: "\u2190",
  arrowright: "\u2192",
  up: "\u2191",
  down: "\u2193",
  left: "\u2190",
  right: "\u2192",
  pageup: "PgUp",
  pagedown: "PgDn",
  home: "Home",
  end: "End",
  capslock: "Caps",
};

/** Keys that are modifiers */
const MODIFIER_KEYS = new Set([
  "mod",
  "ctrl",
  "alt",
  "shift",
  "meta",
  "control",
  "option",
  "command",
]);

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a shortcut string into its components
 *
 * @example
 * parseShortcut('mod+shift+k') // { modifiers: ['mod', 'shift'], key: 'k', original: 'mod+shift+k' }
 */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((p) => p.trim());
  const modifiers: ModifierKey[] = [];
  let key = "";

  for (const part of parts) {
    if (MODIFIER_KEYS.has(part)) {
      const normalized = normalizeModifier(part);
      if (!modifiers.includes(normalized)) {
        modifiers.push(normalized);
      }
    } else {
      key = part;
    }
  }

  // Sort modifiers in consistent order: mod/ctrl, alt, shift
  modifiers.sort((a, b) => {
    const order = ["mod", "ctrl", "meta", "alt", "shift"];
    return order.indexOf(a) - order.indexOf(b);
  });

  return {
    modifiers,
    key,
    original: shortcut,
  };
}

/**
 * Normalize modifier key names
 */
function normalizeModifier(key: string): ModifierKey {
  switch (key.toLowerCase()) {
    case "command":
    case "cmd":
      return "mod";
    case "control":
      return "ctrl";
    case "option":
      return "alt";
    default:
      return key.toLowerCase() as ModifierKey;
  }
}

/**
 * Check if a key event matches a shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: string,
): boolean {
  const parsed = parseShortcut(shortcut);
  const isMac = isMacOS();

  // Check modifiers
  const modPressed = isMac ? event.metaKey : event.ctrlKey;
  const ctrlPressed = event.ctrlKey;
  const altPressed = event.altKey;
  const shiftPressed = event.shiftKey;

  // Check required modifiers
  for (const mod of parsed.modifiers) {
    switch (mod) {
      case "mod":
        if (!modPressed) return false;
        break;
      case "ctrl":
        if (!ctrlPressed) return false;
        break;
      case "alt":
        if (!altPressed) return false;
        break;
      case "shift":
        if (!shiftPressed) return false;
        break;
      case "meta":
        if (!event.metaKey) return false;
        break;
    }
  }

  // Check that no extra modifiers are pressed
  if (
    !parsed.modifiers.includes("mod") &&
    !parsed.modifiers.includes("ctrl") &&
    modPressed
  ) {
    return false;
  }
  if (!parsed.modifiers.includes("alt") && altPressed) {
    return false;
  }
  if (!parsed.modifiers.includes("shift") && shiftPressed) {
    return false;
  }

  // Check the main key
  const eventKey = event.key.toLowerCase();
  const eventCode = event.code.toLowerCase();

  // Handle special keys
  const normalizedKey = normalizeKey(parsed.key);
  const normalizedEventKey = normalizeKey(eventKey);
  const normalizedEventCode = normalizeKey(eventCode);

  return (
    normalizedKey === normalizedEventKey ||
    normalizedKey === normalizedEventCode
  );
}

/**
 * Normalize key names for comparison
 */
function normalizeKey(key: string): string {
  const lower = key.toLowerCase();

  // Handle key codes
  if (lower.startsWith("key")) {
    return lower.slice(3);
  }
  if (lower.startsWith("digit")) {
    return lower.slice(5);
  }

  // Handle special keys
  switch (lower) {
    case "arrowup":
    case "up":
      return "arrowup";
    case "arrowdown":
    case "down":
      return "arrowdown";
    case "arrowleft":
    case "left":
      return "arrowleft";
    case "arrowright":
    case "right":
      return "arrowright";
    case "esc":
      return "escape";
    default:
      return lower;
  }
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format a shortcut string for display
 *
 * @example
 * formatShortcut('mod+k') // '⌘K' on Mac, 'Ctrl+K' on Windows
 * formatShortcut('mod+shift+k') // '⌘⇧K' on Mac, 'Ctrl+Shift+K' on Windows
 */
export function formatShortcut(
  shortcut: string,
  options: KeyDisplayOptions = {},
): string {
  const {
    useMacSymbols = isMacOS(),
    separator = useMacSymbols ? "" : "+",
    uppercase = true,
  } = options;

  const parsed = parseShortcut(shortcut);
  const keyMap = useMacSymbols ? MAC_KEY_SYMBOLS : WINDOWS_KEY_NAMES;

  const parts: string[] = [];

  // Add modifiers
  for (const mod of parsed.modifiers) {
    parts.push(keyMap[mod] || mod);
  }

  // Add main key
  if (parsed.key) {
    const displayKey =
      keyMap[parsed.key] || (uppercase ? parsed.key.toUpperCase() : parsed.key);
    parts.push(displayKey);
  }

  return parts.join(separator);
}

/**
 * Format a key combination array for display
 *
 * @example
 * formatKeyArray(['mod', 'shift', 'k']) // '⌘⇧K' on Mac
 */
export function formatKeyArray(
  keys: string[],
  options: KeyDisplayOptions = {},
): string {
  return formatShortcut(keys.join("+"), options);
}

/**
 * Get display string for a single key
 */
export function formatKey(
  key: string,
  useMacSymbols: boolean = isMacOS(),
): string {
  const lower = key.toLowerCase();
  const keyMap = useMacSymbols ? MAC_KEY_SYMBOLS : WINDOWS_KEY_NAMES;

  if (keyMap[lower]) {
    return keyMap[lower];
  }

  // Single letter keys should be uppercase
  if (key.length === 1) {
    return key.toUpperCase();
  }

  // Function keys
  if (/^f\d+$/i.test(key)) {
    return key.toUpperCase();
  }

  return key;
}

/**
 * Split a formatted shortcut into individual key parts for display
 */
export function splitShortcutForDisplay(
  shortcut: string,
  useMacSymbols: boolean = isMacOS(),
): string[] {
  const parsed = parseShortcut(shortcut);
  const keyMap = useMacSymbols ? MAC_KEY_SYMBOLS : WINDOWS_KEY_NAMES;
  const parts: string[] = [];

  for (const mod of parsed.modifiers) {
    parts.push(keyMap[mod] || mod);
  }

  if (parsed.key) {
    parts.push(keyMap[parsed.key] || parsed.key.toUpperCase());
  }

  return parts;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a shortcut string is valid
 */
export function isValidShortcut(shortcut: string): boolean {
  if (!shortcut || typeof shortcut !== "string") {
    return false;
  }

  const parsed = parseShortcut(shortcut);

  // Must have at least a key
  if (!parsed.key) {
    return false;
  }

  return true;
}

/**
 * Check if two shortcuts conflict (same key combination)
 */
export function shortcutsConflict(
  shortcut1: string,
  shortcut2: string,
): boolean {
  const parsed1 = parseShortcut(shortcut1);
  const parsed2 = parseShortcut(shortcut2);

  // Check if modifiers match
  if (parsed1.modifiers.length !== parsed2.modifiers.length) {
    return false;
  }

  for (const mod of parsed1.modifiers) {
    if (!parsed2.modifiers.includes(mod)) {
      return false;
    }
  }

  // Check if keys match
  return normalizeKey(parsed1.key) === normalizeKey(parsed2.key);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the modifier key text for the current platform
 */
export function getModifierKeyText(): string {
  return isMacOS() ? "Command" : "Ctrl";
}

/**
 * Get the modifier key symbol for the current platform
 */
export function getModifierKeySymbol(): string {
  return isMacOS() ? "\u2318" : "Ctrl";
}

/**
 * Create a shortcut string from parts
 */
export function createShortcut(modifiers: ModifierKey[], key: string): string {
  return [...modifiers, key].join("+");
}

/**
 * Convert a KeyboardEvent to a shortcut string
 */
export function eventToShortcut(event: KeyboardEvent): string {
  const parts: string[] = [];
  const isMac = isMacOS();

  if (isMac ? event.metaKey : event.ctrlKey) {
    parts.push("mod");
  }
  if (event.altKey) {
    parts.push("alt");
  }
  if (event.shiftKey) {
    parts.push("shift");
  }

  // Get the key
  let key = event.key.toLowerCase();

  // Normalize special keys
  if (key === " ") key = "space";
  if (key === "control" || key === "meta" || key === "alt" || key === "shift") {
    // Don't add modifier-only presses
    return "";
  }

  parts.push(key);

  return parts.join("+");
}

/**
 * Check if an element is an input element
 */
export function isInputElement(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();

  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }

  return false;
}

/**
 * Check if the shortcut should be ignored based on the active element
 */
export function shouldIgnoreShortcut(
  event: KeyboardEvent,
  options: { enableOnInputs?: boolean; enableOnContentEditable?: boolean } = {},
): boolean {
  const { enableOnInputs = false, enableOnContentEditable = false } = options;

  const target = event.target as Element;

  if (!enableOnInputs && isInputElement(target)) {
    // Allow escape to work in inputs
    if (event.key === "Escape") {
      return false;
    }
    return true;
  }

  if (
    !enableOnContentEditable &&
    target instanceof HTMLElement &&
    target.isContentEditable
  ) {
    return true;
  }

  return false;
}
