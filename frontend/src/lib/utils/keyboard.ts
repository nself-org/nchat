/**
 * Keyboard utilities for nself-chat
 * @module utils/keyboard
 */

/**
 * Key codes for common keys
 */
export const KEY_CODES = {
  // Letters
  A: "KeyA",
  B: "KeyB",
  C: "KeyC",
  D: "KeyD",
  E: "KeyE",
  F: "KeyF",
  G: "KeyG",
  H: "KeyH",
  I: "KeyI",
  J: "KeyJ",
  K: "KeyK",
  L: "KeyL",
  M: "KeyM",
  N: "KeyN",
  O: "KeyO",
  P: "KeyP",
  Q: "KeyQ",
  R: "KeyR",
  S: "KeyS",
  T: "KeyT",
  U: "KeyU",
  V: "KeyV",
  W: "KeyW",
  X: "KeyX",
  Y: "KeyY",
  Z: "KeyZ",

  // Numbers
  DIGIT_0: "Digit0",
  DIGIT_1: "Digit1",
  DIGIT_2: "Digit2",
  DIGIT_3: "Digit3",
  DIGIT_4: "Digit4",
  DIGIT_5: "Digit5",
  DIGIT_6: "Digit6",
  DIGIT_7: "Digit7",
  DIGIT_8: "Digit8",
  DIGIT_9: "Digit9",

  // Function keys
  F1: "F1",
  F2: "F2",
  F3: "F3",
  F4: "F4",
  F5: "F5",
  F6: "F6",
  F7: "F7",
  F8: "F8",
  F9: "F9",
  F10: "F10",
  F11: "F11",
  F12: "F12",

  // Special keys
  ESCAPE: "Escape",
  TAB: "Tab",
  CAPS_LOCK: "CapsLock",
  SHIFT: "Shift",
  CONTROL: "Control",
  ALT: "Alt",
  META: "Meta",
  SPACE: "Space",
  ENTER: "Enter",
  BACKSPACE: "Backspace",
  DELETE: "Delete",
  INSERT: "Insert",
  HOME: "Home",
  END: "End",
  PAGE_UP: "PageUp",
  PAGE_DOWN: "PageDown",

  // Arrow keys
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",

  // Punctuation
  COMMA: "Comma",
  PERIOD: "Period",
  SEMICOLON: "Semicolon",
  QUOTE: "Quote",
  BRACKET_LEFT: "BracketLeft",
  BRACKET_RIGHT: "BracketRight",
  BACKSLASH: "Backslash",
  SLASH: "Slash",
  MINUS: "Minus",
  EQUAL: "Equal",
  BACKQUOTE: "Backquote",
} as const;

/**
 * Key to display name mapping
 */
const KEY_DISPLAY_NAMES: Record<string, string> = {
  Meta: navigator?.platform?.includes("Mac") ? "Cmd" : "Win",
  Control: "Ctrl",
  Escape: "Esc",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Backspace: "Backspace",
  Delete: "Del",
  Insert: "Ins",
  PageUp: "PgUp",
  PageDown: "PgDn",
  " ": "Space",
};

/**
 * Modifier key names
 */
export type ModifierKey = "ctrl" | "alt" | "shift" | "meta" | "cmd";

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Key code or key name */
  key: string;
  /** Modifier keys */
  modifiers?: ModifierKey[];
  /** Description for display */
  description?: string;
}

/**
 * Check if a key is a modifier key
 * @param event - Keyboard event
 * @returns Whether the pressed key is a modifier
 * @example
 * if (isModifierKey(event)) return; // Ignore modifier-only presses
 */
export function isModifierKey(event: KeyboardEvent): boolean {
  const modifierKeys = ["Control", "Alt", "Shift", "Meta"];
  return modifierKeys.includes(event.key);
}

/**
 * Get the key combination string from an event
 * @param event - Keyboard event
 * @param options - Options for formatting
 * @returns Key combination string (e.g., 'Ctrl+Shift+K')
 * @example
 * getKeyCombo(event) // 'Ctrl+K'
 * getKeyCombo(event, { separator: '-' }) // 'Ctrl-K'
 */
export function getKeyCombo(
  event: KeyboardEvent,
  options: {
    separator?: string;
    useSymbols?: boolean;
    useMacSymbols?: boolean;
  } = {},
): string {
  const {
    separator = "+",
    useSymbols = false,
    useMacSymbols = false,
  } = options;

  const parts: string[] = [];

  // Detect Mac
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Mac symbols
  const macSymbols: Record<string, string> = {
    Meta: "\u2318", // Command
    Alt: "\u2325", // Option
    Shift: "\u21E7",
    Control: "\u2303",
  };

  // Standard symbols
  const standardSymbols: Record<string, string> = {
    Meta: "Win",
    Alt: "Alt",
    Shift: "Shift",
    Control: "Ctrl",
  };

  // Add modifiers in standard order
  const modifiers: Array<{
    prop: "metaKey" | "ctrlKey" | "altKey" | "shiftKey";
    name: string;
  }> = [
    { prop: "ctrlKey", name: "Control" },
    { prop: "altKey", name: "Alt" },
    { prop: "shiftKey", name: "Shift" },
    { prop: "metaKey", name: "Meta" },
  ];

  // On Mac, put Meta first
  if (isMac) {
    modifiers.unshift(modifiers.pop()!);
  }

  for (const mod of modifiers) {
    if (event[mod.prop]) {
      if (useMacSymbols && isMac) {
        parts.push(macSymbols[mod.name] || mod.name);
      } else if (useSymbols) {
        parts.push(standardSymbols[mod.name] || mod.name);
      } else {
        parts.push(KEY_DISPLAY_NAMES[mod.name] || mod.name);
      }
    }
  }

  // Add the main key (if not a modifier)
  if (!isModifierKey(event)) {
    let key = event.key;

    // Normalize key name
    if (key === " ") {
      key = "Space";
    } else if (key.length === 1) {
      key = key.toUpperCase();
    } else {
      key = KEY_DISPLAY_NAMES[key] || key;
    }

    parts.push(key);
  }

  return parts.join(separator);
}

/**
 * Parse a shortcut string into a KeyboardShortcut object
 * @param shortcutString - Shortcut string (e.g., 'Ctrl+K', 'Cmd+Shift+P')
 * @returns Parsed shortcut object
 */
export function parseShortcut(shortcutString: string): KeyboardShortcut | null {
  if (!shortcutString) return null;

  const parts = shortcutString.split("+").map((p) => p.trim().toLowerCase());
  if (parts.length === 0) return null;

  const modifiers: ModifierKey[] = [];
  let key = "";

  for (const part of parts) {
    switch (part) {
      case "ctrl":
      case "control":
        modifiers.push("ctrl");
        break;
      case "alt":
      case "option":
        modifiers.push("alt");
        break;
      case "shift":
        modifiers.push("shift");
        break;
      case "meta":
      case "cmd":
      case "command":
      case "win":
      case "super":
        modifiers.push("meta");
        break;
      default:
        key = part;
    }
  }

  if (!key) return null;

  return { key, modifiers };
}

/**
 * Check if a keyboard event matches a shortcut
 * @param event - Keyboard event
 * @param shortcut - Shortcut to match (string or object)
 * @returns Whether the event matches
 * @example
 * if (matchesShortcut(event, 'Ctrl+K')) {
 *   openCommandPalette();
 * }
 * if (matchesShortcut(event, { key: 'k', modifiers: ['ctrl'] })) {
 *   openCommandPalette();
 * }
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: string | KeyboardShortcut,
): boolean {
  const parsed =
    typeof shortcut === "string" ? parseShortcut(shortcut) : shortcut;
  if (!parsed) return false;

  const { key, modifiers = [] } = parsed;

  // Check the main key
  const eventKey = event.key.toLowerCase();
  const eventCode = event.code.toLowerCase();
  const targetKey = key.toLowerCase();

  // Match by key name or code
  const keyMatches =
    eventKey === targetKey ||
    eventCode === targetKey ||
    eventCode === `key${targetKey}` ||
    eventCode === `digit${targetKey}`;

  if (!keyMatches) return false;

  // Check modifiers
  const hasCtrl = modifiers.includes("ctrl");
  const hasAlt = modifiers.includes("alt");
  const hasShift = modifiers.includes("shift");
  const hasMeta = modifiers.includes("meta") || modifiers.includes("cmd");

  // On Mac, Cmd is typically used instead of Ctrl
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Check each modifier
  if (isMac) {
    // On Mac, allow Cmd to match Ctrl shortcuts
    if (hasCtrl && !event.metaKey && !event.ctrlKey) return false;
    if (hasMeta && !event.metaKey) return false;
  } else {
    if (hasCtrl && !event.ctrlKey) return false;
    if (hasMeta && !event.metaKey) return false;
  }

  if (hasAlt && !event.altKey) return false;
  if (hasShift && !event.shiftKey) return false;

  // Ensure no extra modifiers are pressed
  const expectedModCount =
    (hasCtrl ? 1 : 0) +
    (hasAlt ? 1 : 0) +
    (hasShift ? 1 : 0) +
    (hasMeta ? 1 : 0);
  const actualModCount =
    (event.ctrlKey ? 1 : 0) +
    (event.altKey ? 1 : 0) +
    (event.shiftKey ? 1 : 0) +
    (event.metaKey ? 1 : 0);

  // On Mac, Cmd can substitute for Ctrl
  if (isMac && hasCtrl && event.metaKey && !event.ctrlKey) {
    return actualModCount === expectedModCount;
  }

  return actualModCount === expectedModCount;
}

/**
 * Create a preventDefault handler that only runs for matching shortcuts
 * @param shortcuts - Shortcuts to handle
 * @param handler - Handler function
 * @returns Event handler
 * @example
 * element.addEventListener('keydown', preventDefaultHandler(['Ctrl+S', 'Ctrl+K'], (e) => {
 *   if (matchesShortcut(e, 'Ctrl+S')) save();
 *   if (matchesShortcut(e, 'Ctrl+K')) openSearch();
 * }));
 */
export function preventDefaultHandler(
  shortcuts: (string | KeyboardShortcut)[],
  handler: (event: KeyboardEvent) => void,
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        handler(event);
        return;
      }
    }
  };
}

/**
 * Format a shortcut for display
 * @param shortcut - Shortcut string or object
 * @param options - Formatting options
 * @returns Formatted display string
 * @example
 * formatShortcut('Ctrl+K') // 'Ctrl + K' or 'Cmd + K' on Mac
 * formatShortcut('Ctrl+K', { useMacSymbols: true }) // '⌘K' on Mac
 */
export function formatShortcut(
  shortcut: string | KeyboardShortcut,
  options: {
    separator?: string;
    useMacSymbols?: boolean;
  } = {},
): string {
  const { separator = " + ", useMacSymbols = false } = options;

  const parsed =
    typeof shortcut === "string" ? parseShortcut(shortcut) : shortcut;
  if (!parsed) return "";

  const { key, modifiers = [] } = parsed;
  const parts: string[] = [];

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const macSymbols: Record<string, string> = {
    ctrl: "\u2303",
    alt: "\u2325",
    shift: "\u21E7",
    meta: "\u2318",
    cmd: "\u2318",
  };

  const standardNames: Record<string, string> = {
    ctrl: isMac ? "Ctrl" : "Ctrl",
    alt: isMac ? "Option" : "Alt",
    shift: "Shift",
    meta: isMac ? "Cmd" : "Win",
    cmd: "Cmd",
  };

  // Standard order: Ctrl, Alt, Shift, Meta (Mac: Cmd, Shift, Option, Ctrl)
  const order = isMac
    ? ["meta", "cmd", "shift", "alt", "ctrl"]
    : ["ctrl", "alt", "shift", "meta"];

  for (const mod of order) {
    if (modifiers.includes(mod as ModifierKey)) {
      if (useMacSymbols && isMac) {
        parts.push(macSymbols[mod] || mod);
      } else {
        parts.push(standardNames[mod] || mod);
      }
    }
  }

  // Add the key
  const displayKey = key.length === 1 ? key.toUpperCase() : key;
  parts.push(displayKey);

  if (useMacSymbols && isMac) {
    return parts.join("");
  }

  return parts.join(separator);
}

/**
 * Check if a key is printable (would produce a character)
 * @param event - Keyboard event
 * @returns Whether the key is printable
 */
export function isPrintableKey(event: KeyboardEvent): boolean {
  // Single character keys are printable
  if (event.key.length === 1) {
    return true;
  }

  // Space is printable
  if (event.key === " " || event.code === "Space") {
    return true;
  }

  return false;
}

/**
 * Check if event is from an input element
 * @param event - Keyboard event
 * @returns Whether the event target is an input
 */
export function isInputEvent(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;

  if (!target) return false;

  const tagName = target.tagName.toLowerCase();
  const isInput =
    tagName === "input" || tagName === "textarea" || tagName === "select";
  const isEditable = target.isContentEditable;

  return isInput || isEditable;
}

/**
 * Create a keyboard shortcut handler
 * @param shortcuts - Map of shortcut strings to handlers
 * @param options - Handler options
 * @returns Event handler function
 * @example
 * document.addEventListener('keydown', createShortcutHandler({
 *   'Ctrl+S': () => save(),
 *   'Ctrl+K': () => openSearch(),
 *   'Escape': () => closeModal(),
 * }));
 */
export function createShortcutHandler(
  shortcuts: Record<string, (event: KeyboardEvent) => void>,
  options: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
    ignoreInputs?: boolean;
  } = {},
): (event: KeyboardEvent) => void {
  const {
    preventDefault = true,
    stopPropagation = false,
    ignoreInputs = true,
  } = options;

  return (event: KeyboardEvent) => {
    // Optionally ignore events from input elements
    if (ignoreInputs && isInputEvent(event)) {
      // Still allow Escape in inputs
      if (event.key !== "Escape") {
        return;
      }
    }

    for (const [shortcutStr, handler] of Object.entries(shortcuts)) {
      if (matchesShortcut(event, shortcutStr)) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        handler(event);
        return;
      }
    }
  };
}

/**
 * Focus trap helper - get all focusable elements in a container
 * @param container - Container element
 * @returns Array of focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(", ");

  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors),
  ).filter(
    (el) => el.offsetParent !== null, // Filter out hidden elements
  );
}

/**
 * Create a focus trap within a container
 * @param container - Container element
 * @returns Object with trap and release functions
 */
export function createFocusTrap(container: HTMLElement): {
  activate: () => void;
  deactivate: () => void;
} {
  let previousActiveElement: Element | null = null;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement;

    if (event.shiftKey) {
      // Shift+Tab
      if (active === first || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      // Tab
      if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return {
    activate: () => {
      previousActiveElement = document.activeElement;
      container.addEventListener("keydown", handleKeyDown);

      // Focus first focusable element
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    },
    deactivate: () => {
      container.removeEventListener("keydown", handleKeyDown);

      // Restore focus
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    },
  };
}

/**
 * Detect the current platform's modifier key name
 * @returns 'Cmd' on Mac, 'Ctrl' otherwise
 */
export function getPlatformModifier(): "Cmd" | "Ctrl" {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  return isMac ? "Cmd" : "Ctrl";
}

/**
 * Check if the platform is Mac
 * @returns Whether the platform is Mac
 */
export function isMacPlatform(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  );
}
