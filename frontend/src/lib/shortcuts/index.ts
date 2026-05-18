/**
 * Shortcuts Module
 *
 * Complete keyboard shortcuts system with registry, presets, key parsing,
 * chord sequences, conflict detection, and discoverable keymap.
 *
 * @example
 * ```typescript
 * import {
 *   createShortcutManager,
 *   getPreset,
 *   searchShortcuts,
 *   formatKeyCombo,
 * } from '@/lib/shortcuts';
 *
 * // Create a manager and load a preset
 * const manager = createShortcutManager();
 * manager.loadPreset('nchat');
 *
 * // Set up context
 * manager.addContext('chat');
 *
 * // Get formatted key display
 * formatKeyCombo('mod+shift+k'); // '⌘⇧K' on Mac
 *
 * // Search shortcuts
 * const results = searchShortcuts(entries, 'bold');
 * ```
 */

// Key Parser
export {
  parseKeyCombo,
  parseChordSequence,
  normalizeKeyCombo,
  matchesKeyEvent,
  matchesKeyComboString,
  formatKeyCombo,
  formatChordSequence,
  splitKeyComboForDisplay,
  eventToComboString,
  detectPlatform,
  type Platform,
  type KeyModifiers,
  type ParsedKey,
  type ParsedChord,
  type FormatKeyComboOptions,
} from "./key-parser";

// Shortcut Registry
export {
  ShortcutRegistry,
  createShortcutRegistry,
  type ShortcutCategory,
  type ShortcutContext,
  type ShortcutAction,
  type ShortcutDefinition,
  type ShortcutRegistrationOptions,
  type ShortcutConflict,
} from "./shortcut-registry";

// Presets
export {
  nchatPreset,
  slackPreset,
  discordPreset,
  telegramPreset,
  whatsappPreset,
  PRESETS,
  getPresetNames,
  getPreset,
  getAllPresets,
  presetToRegistrationOptions,
  applyUserOverrides,
  createEmptyOverrides,
  getPresetCategoryCounts,
  type ShortcutPreset,
  type PresetShortcut,
  type UserShortcutOverrides,
} from "./presets";

// Shortcut Manager
export {
  ShortcutManager,
  createShortcutManager,
  getGlobalShortcutManager,
  destroyGlobalShortcutManager,
  type ShortcutManagerOptions,
  type ShortcutEventResult,
} from "./shortcut-manager";

// Keymap Types
export {
  buildKeymapEntries,
  getKeymap,
  searchShortcuts,
  exportKeymap,
  getCategoryTitle,
  getCategoryDescription,
  filterEntriesByContext,
  filterEnabledEntries,
  getKeymapSummary,
  CATEGORY_ORDER,
  type KeymapSection,
  type KeymapEntry,
  type KeymapSearchResult,
} from "./keymap-types";
