/**
 * Key Parser and Normalizer
 *
 * Parses keyboard combination strings into structured data,
 * normalizes key combos for cross-platform consistency, matches
 * keyboard events, and formats key combos for human-readable display.
 *
 * Supports chord sequences (e.g., "g then i" like VS Code).
 */

// ============================================================================
// Types
// ============================================================================

/** Platform identifier */
export type Platform = "mac" | "windows" | "linux" | "unknown";

/** Modifier keys that can be part of a key combination */
export interface KeyModifiers {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  mod: boolean;
}

/** A parsed single key combination (e.g., "mod+shift+k") */
export interface ParsedKey {
  /** Modifier keys that must be held */
  modifiers: KeyModifiers;
  /** The primary key (non-modifier), lowercased */
  key: string;
  /** The original string before parsing */
  original: string;
}

/** A parsed chord sequence (e.g., "g then i") */
export interface ParsedChord {
  /** The sequence of key combos to press in order */
  steps: ParsedKey[];
  /** Whether this is a chord (multi-step) vs a single combo */
  isChord: boolean;
  /** The original string */
  original: string;
}

// ============================================================================
// Constants
// ============================================================================

const CHORD_SEPARATOR = " then ";

const MODIFIER_NAMES = new Set([
  "mod",
  "ctrl",
  "control",
  "alt",
  "option",
  "shift",
  "meta",
  "command",
  "cmd",
  "super",
  "win",
]);

/** Mac key symbols for display */
const MAC_SYMBOLS: Record<string, string> = {
  mod: "\u2318",
  meta: "\u2318",
  command: "\u2318",
  cmd: "\u2318",
  ctrl: "\u2303",
  control: "\u2303",
  alt: "\u2325",
  option: "\u2325",
  shift: "\u21E7",
  enter: "\u21A9",
  return: "\u21A9",
  backspace: "\u232B",
  delete: "\u2326",
  escape: "\u238B",
  esc: "\u238B",
  tab: "\u21E5",
  space: "\u2423",
  arrowup: "\u2191",
  arrowdown: "\u2193",
  arrowleft: "\u2190",
  arrowright: "\u2192",
  up: "\u2191",
  down: "\u2193",
  left: "\u2190",
  right: "\u2192",
  pageup: "\u21DE",
  pagedown: "\u21DF",
  home: "\u2196",
  end: "\u2198",
  capslock: "\u21EA",
};

/** Windows/Linux key names for display */
const WIN_NAMES: Record<string, string> = {
  mod: "Ctrl",
  meta: "Win",
  command: "Win",
  cmd: "Win",
  ctrl: "Ctrl",
  control: "Ctrl",
  alt: "Alt",
  option: "Alt",
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

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detect the current platform
 */
export function detectPlatform(): Platform {
  if (typeof globalThis === "undefined" || typeof navigator === "undefined") {
    return "unknown";
  }

  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  if (/Mac|iPod|iPhone|iPad/.test(platform)) return "mac";
  if (/Win/.test(platform)) return "windows";
  if (/Linux/.test(ua) || /Linux/.test(platform)) return "linux";
  return "unknown";
}

// ============================================================================
// Parsing
// ============================================================================

/**
 * Normalize a modifier name to one of: mod, ctrl, alt, shift, meta
 */
function normalizeModifierName(name: string): keyof KeyModifiers | null {
  const lower = name.toLowerCase().trim();
  switch (lower) {
    case "mod":
      return "mod";
    case "ctrl":
    case "control":
      return "ctrl";
    case "alt":
    case "option":
      return "alt";
    case "shift":
      return "shift";
    case "meta":
    case "command":
    case "cmd":
    case "super":
    case "win":
      return "meta";
    default:
      return null;
  }
}

/**
 * Normalize a key name for consistent comparison
 */
function normalizeKeyName(key: string): string {
  const lower = key.toLowerCase().trim();

  // Handle key codes (e.g., "KeyA" -> "a", "Digit1" -> "1")
  if (lower.startsWith("key")) return lower.slice(3);
  if (lower.startsWith("digit")) return lower.slice(5);

  // Handle arrow key variants
  switch (lower) {
    case "up":
    case "arrowup":
      return "arrowup";
    case "down":
    case "arrowdown":
      return "arrowdown";
    case "left":
    case "arrowleft":
      return "arrowleft";
    case "right":
    case "arrowright":
      return "arrowright";
    case "esc":
      return "escape";
    case "return":
      return "enter";
    case "del":
      return "delete";
    case "ins":
      return "insert";
    default:
      return lower;
  }
}

/**
 * Parse a single key combination string into a ParsedKey.
 *
 * @param combo - A key combination string, e.g. "mod+shift+k", "alt+ArrowUp"
 * @returns ParsedKey with modifiers and the primary key
 *
 * @example
 * parseKeyCombo('mod+shift+k')
 * // { modifiers: { ctrl: false, alt: false, shift: true, meta: false, mod: true }, key: 'k', original: 'mod+shift+k' }
 */
export function parseKeyCombo(combo: string): ParsedKey {
  const parts = combo.split("+").map((p) => p.trim());
  const modifiers: KeyModifiers = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    mod: false,
  };
  let key = "";

  for (const part of parts) {
    const modName = normalizeModifierName(part);
    if (modName && MODIFIER_NAMES.has(part.toLowerCase().trim())) {
      modifiers[modName] = true;
    } else {
      key = normalizeKeyName(part);
    }
  }

  return {
    modifiers,
    key,
    original: combo,
  };
}

/**
 * Parse a full shortcut string which may contain chord sequences.
 *
 * @param shortcut - A shortcut string, possibly with " then " for chord sequences.
 * @returns ParsedChord with steps and metadata
 *
 * @example
 * parseChordSequence('g then i')
 * // { steps: [parsedG, parsedI], isChord: true, original: 'g then i' }
 *
 * parseChordSequence('mod+k')
 * // { steps: [parsedModK], isChord: false, original: 'mod+k' }
 */
export function parseChordSequence(shortcut: string): ParsedChord {
  const trimmed = shortcut.trim();
  const parts = trimmed.split(CHORD_SEPARATOR).map((p) => p.trim());
  const steps = parts.map(parseKeyCombo);

  return {
    steps,
    isChord: steps.length > 1,
    original: trimmed,
  };
}

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize a key combo string for cross-platform consistency.
 * On Mac, "ctrl" in shortcuts typically maps to "mod" (Cmd).
 * This function keeps the combo in the canonical "mod" form.
 *
 * @param combo - The key combination string
 * @param platform - Target platform (defaults to detected platform)
 * @returns Normalized key combination string
 *
 * @example
 * normalizeKeyCombo('Ctrl+K') // 'mod+k' (standardizes to mod)
 * normalizeKeyCombo('Command+Shift+P') // 'mod+shift+p'
 */
export function normalizeKeyCombo(combo: string, _platform?: Platform): string {
  const parsed = parseKeyCombo(combo);
  const parts: string[] = [];

  // Build in canonical order: mod, ctrl, alt, shift
  if (parsed.modifiers.mod || parsed.modifiers.meta) {
    parts.push("mod");
  }
  if (
    parsed.modifiers.ctrl &&
    !parsed.modifiers.mod &&
    !parsed.modifiers.meta
  ) {
    parts.push("ctrl");
  }
  if (parsed.modifiers.alt) {
    parts.push("alt");
  }
  if (parsed.modifiers.shift) {
    parts.push("shift");
  }

  if (parsed.key) {
    parts.push(parsed.key);
  }

  return parts.join("+");
}

// ============================================================================
// Matching
// ============================================================================

/**
 * Check whether a KeyboardEvent matches a parsed key combination.
 *
 * @param event - The browser KeyboardEvent
 * @param combo - A ParsedKey to match against
 * @param platform - Platform for mod key resolution (defaults to detected)
 * @returns true if the event matches the combination
 *
 * @example
 * matchesKeyEvent(event, parseKeyCombo('mod+k'))
 */
export function matchesKeyEvent(
  event: KeyboardEvent,
  combo: ParsedKey,
  platform?: Platform,
): boolean {
  const plat = platform ?? detectPlatform();
  const isMac = plat === "mac";

  // Resolve "mod" to the platform-appropriate modifier
  const needsMod = combo.modifiers.mod;
  const needsCtrl = combo.modifiers.ctrl;
  const needsAlt = combo.modifiers.alt;
  const needsShift = combo.modifiers.shift;
  const needsMeta = combo.modifiers.meta;

  // Check the "mod" modifier (Cmd on Mac, Ctrl on Windows/Linux)
  if (needsMod) {
    if (isMac && !event.metaKey) return false;
    if (!isMac && !event.ctrlKey) return false;
  }

  // Check explicit ctrl (not mod)
  if (needsCtrl && !event.ctrlKey) return false;

  // Check meta
  if (needsMeta && !event.metaKey) return false;

  // Check alt
  if (needsAlt && !event.altKey) return false;

  // Check shift
  if (needsShift && !event.shiftKey) return false;

  // Check that no extra modifiers are pressed
  const modActive = isMac ? event.metaKey : event.ctrlKey;
  const ctrlActive = event.ctrlKey;
  const altActive = event.altKey;
  const shiftActive = event.shiftKey;
  const metaActive = event.metaKey;

  // On Mac, mod=metaKey. On others, mod=ctrlKey.
  if (isMac) {
    // mod uses metaKey on mac
    if (!needsMod && !needsMeta && metaActive) return false;
    if (!needsCtrl && ctrlActive) return false;
  } else {
    // mod uses ctrlKey on non-mac
    if (!needsMod && !needsCtrl && ctrlActive) return false;
    if (!needsMeta && metaActive) return false;
  }

  if (!needsAlt && altActive) return false;
  if (!needsShift && shiftActive) return false;

  // Match the primary key
  if (!combo.key) return false;

  const eventKey = normalizeKeyName(event.key);
  const eventCode = normalizeKeyName(event.code);

  return combo.key === eventKey || combo.key === eventCode;
}

/**
 * Convenience: match a keyboard event against a combo string.
 *
 * @param event - The browser KeyboardEvent
 * @param comboString - A key combination string like "mod+k"
 * @param platform - Optional platform override
 * @returns true if the event matches
 */
export function matchesKeyComboString(
  event: KeyboardEvent,
  comboString: string,
  platform?: Platform,
): boolean {
  const parsed = parseKeyCombo(comboString);
  return matchesKeyEvent(event, parsed, platform);
}

// ============================================================================
// Formatting
// ============================================================================

export interface FormatKeyComboOptions {
  /** Use Mac-style symbols (defaults to auto-detect) */
  useMacSymbols?: boolean;
  /** Separator between keys (default: '' for Mac, '+' for Windows) */
  separator?: string;
  /** Platform override */
  platform?: Platform;
}

/**
 * Format a key combination for human-readable display.
 *
 * Renders platform-appropriate symbols: on Mac uses unicode glyphs
 * (e.g., ⌘⇧K), on Windows uses text (e.g., Ctrl+Shift+K).
 *
 * @param combo - A key combination string (e.g., "mod+shift+k")
 * @param options - Formatting options
 * @returns Human-readable string
 *
 * @example
 * formatKeyCombo('mod+shift+k')
 * // Mac: '⌘⇧K'
 * // Windows: 'Ctrl+Shift+K'
 *
 * formatKeyCombo('mod+shift+k', { platform: 'mac' })
 * // '⌘⇧K'
 */
export function formatKeyCombo(
  combo: string,
  options: FormatKeyComboOptions = {},
): string {
  const platform = options.platform ?? detectPlatform();
  const isMac = platform === "mac";
  const useMacSymbols = options.useMacSymbols ?? isMac;
  const separator = options.separator ?? (useMacSymbols ? "" : "+");

  const parsed = parseKeyCombo(combo);
  const keyMap = useMacSymbols ? MAC_SYMBOLS : WIN_NAMES;
  const parts: string[] = [];

  // Order: mod/meta, ctrl, alt, shift
  if (parsed.modifiers.mod || parsed.modifiers.meta) {
    parts.push(keyMap["mod"] || "Mod");
  }
  if (
    parsed.modifiers.ctrl &&
    !parsed.modifiers.mod &&
    !parsed.modifiers.meta
  ) {
    parts.push(keyMap["ctrl"] || "Ctrl");
  }
  if (parsed.modifiers.alt) {
    parts.push(keyMap["alt"] || "Alt");
  }
  if (parsed.modifiers.shift) {
    parts.push(keyMap["shift"] || "Shift");
  }

  // Main key
  if (parsed.key) {
    const displayKey = keyMap[parsed.key] || parsed.key.toUpperCase();
    parts.push(displayKey);
  }

  return parts.join(separator);
}

/**
 * Format a chord sequence for display.
 *
 * @param shortcut - A shortcut string, possibly with chord
 * @param options - Formatting options
 * @returns Formatted string (e.g., "G then I" or "⌘K")
 */
export function formatChordSequence(
  shortcut: string,
  options: FormatKeyComboOptions = {},
): string {
  const chord = parseChordSequence(shortcut);
  const formatted = chord.steps.map((step) =>
    formatKeyCombo(step.original, options),
  );
  return formatted.join(" then ");
}

/**
 * Split a key combo into individual display parts (for rendering badges).
 *
 * @param combo - A key combination string
 * @param options - Formatting options
 * @returns Array of display strings for each key part
 *
 * @example
 * splitKeyComboForDisplay('mod+shift+k', { platform: 'mac' })
 * // ['⌘', '⇧', 'K']
 */
export function splitKeyComboForDisplay(
  combo: string,
  options: FormatKeyComboOptions = {},
): string[] {
  const platform = options.platform ?? detectPlatform();
  const isMac = platform === "mac";
  const useMacSymbols = options.useMacSymbols ?? isMac;
  const keyMap = useMacSymbols ? MAC_SYMBOLS : WIN_NAMES;
  const parsed = parseKeyCombo(combo);
  const parts: string[] = [];

  if (parsed.modifiers.mod || parsed.modifiers.meta) {
    parts.push(keyMap["mod"] || "Mod");
  }
  if (
    parsed.modifiers.ctrl &&
    !parsed.modifiers.mod &&
    !parsed.modifiers.meta
  ) {
    parts.push(keyMap["ctrl"] || "Ctrl");
  }
  if (parsed.modifiers.alt) {
    parts.push(keyMap["alt"] || "Alt");
  }
  if (parsed.modifiers.shift) {
    parts.push(keyMap["shift"] || "Shift");
  }
  if (parsed.key) {
    parts.push(keyMap[parsed.key] || parsed.key.toUpperCase());
  }

  return parts;
}

/**
 * Convert a KeyboardEvent to a normalized combo string.
 *
 * @param event - The browser KeyboardEvent
 * @param platform - Optional platform override
 * @returns Normalized combo string (e.g., "mod+shift+k")
 */
export function eventToComboString(
  event: KeyboardEvent,
  platform?: Platform,
): string {
  const plat = platform ?? detectPlatform();
  const isMac = plat === "mac";
  const parts: string[] = [];

  // "mod" key
  if (isMac ? event.metaKey : event.ctrlKey) {
    parts.push("mod");
  }

  // Explicit ctrl on Mac (when meta is not mod)
  if (isMac && event.ctrlKey) {
    parts.push("ctrl");
  }

  if (event.altKey) {
    parts.push("alt");
  }
  if (event.shiftKey) {
    parts.push("shift");
  }

  // Primary key (skip if it is itself a modifier)
  const key = event.key.toLowerCase();
  const isModifierOnly = ["control", "alt", "shift", "meta"].includes(key);
  if (!isModifierOnly) {
    parts.push(normalizeKeyName(key));
  }

  return parts.join("+");
}
