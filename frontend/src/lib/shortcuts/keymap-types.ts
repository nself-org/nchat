/**
 * Keymap Types and Utilities
 *
 * Types and functions for building a discoverable key map:
 * searching shortcuts, categorizing them, exporting to various formats.
 */

import {
  type ShortcutDefinition,
  type ShortcutCategory,
  type ShortcutContext,
} from "./shortcut-registry";
import {
  formatKeyCombo,
  formatChordSequence,
  type FormatKeyComboOptions,
} from "./key-parser";

// ============================================================================
// Types
// ============================================================================

/** A section in the keymap display, grouping shortcuts by category */
export interface KeymapSection {
  /** The category for this section */
  category: ShortcutCategory;
  /** Human-readable section title */
  title: string;
  /** Optional section description */
  description?: string;
  /** Shortcuts in this section */
  shortcuts: KeymapEntry[];
}

/** A single entry in the keymap, with formatted display data */
export interface KeymapEntry {
  /** Shortcut ID */
  id: string;
  /** Key combination string (raw) */
  keys: string;
  /** Formatted key combination for display */
  displayKeys: string;
  /** Human-readable description */
  description: string;
  /** Category */
  category: ShortcutCategory;
  /** Context */
  context: ShortcutContext;
  /** Whether this shortcut is currently enabled */
  enabled: boolean;
  /** Whether the keys have been customized from preset defaults */
  isCustomized: boolean;
  /** The preset this belongs to */
  preset?: string;
}

/** Result from searching shortcuts */
export interface KeymapSearchResult {
  /** The matching entry */
  entry: KeymapEntry;
  /** The field that matched (id, description, keys, category) */
  matchField: "id" | "description" | "keys" | "category" | "context";
  /** Relevance score (higher is more relevant) */
  score: number;
}

// ============================================================================
// Category Metadata
// ============================================================================

const CATEGORY_TITLES: Record<ShortcutCategory, string> = {
  navigation: "Navigation",
  messaging: "Messaging",
  formatting: "Formatting",
  media: "Media & Files",
  calls: "Calls & Voice",
  admin: "Administration & UI",
  custom: "Custom",
};

const CATEGORY_DESCRIPTIONS: Record<ShortcutCategory, string> = {
  navigation: "Navigate between channels, chats, and views.",
  messaging: "Send, edit, reply, and manage messages.",
  formatting: "Format text with bold, italic, code, and more.",
  media: "Upload files, open emoji and GIF pickers.",
  calls: "Start, manage, and control voice and video calls.",
  admin: "Application settings, sidebar toggles, and admin features.",
  custom: "User-defined custom shortcuts.",
};

/** All categories in display order */
export const CATEGORY_ORDER: ShortcutCategory[] = [
  "navigation",
  "messaging",
  "formatting",
  "media",
  "calls",
  "admin",
  "custom",
];

// ============================================================================
// Keymap Building
// ============================================================================

/**
 * Convert shortcut definitions into a formatted keymap entry array.
 *
 * @param definitions - Array of shortcut definitions from the registry
 * @param options - Formatting options for key display
 * @param customizedIds - Set of IDs that have user-customized keys
 * @returns Array of formatted keymap entries
 */
export function buildKeymapEntries(
  definitions: ShortcutDefinition[],
  options: FormatKeyComboOptions = {},
  customizedIds: Set<string> = new Set(),
): KeymapEntry[] {
  return definitions.map((def) => ({
    id: def.id,
    keys: def.keys,
    displayKeys: formatChordSequence(def.keys, options),
    description: def.description,
    category: def.category,
    context: def.context,
    enabled: def.enabled,
    isCustomized: customizedIds.has(def.id),
    preset: def.preset,
  }));
}

/**
 * Get the full categorized keymap, organized into sections.
 *
 * @param definitions - Array of shortcut definitions from the registry
 * @param options - Formatting options
 * @param customizedIds - Set of IDs with user-customized keys
 * @returns Array of keymap sections, one per category (empty categories excluded)
 */
export function getKeymap(
  definitions: ShortcutDefinition[],
  options: FormatKeyComboOptions = {},
  customizedIds: Set<string> = new Set(),
): KeymapSection[] {
  const entries = buildKeymapEntries(definitions, options, customizedIds);

  const sections: KeymapSection[] = [];

  for (const category of CATEGORY_ORDER) {
    const sectionEntries = entries.filter((e) => e.category === category);
    if (sectionEntries.length === 0) continue;

    sections.push({
      category,
      title: CATEGORY_TITLES[category],
      description: CATEGORY_DESCRIPTIONS[category],
      shortcuts: sectionEntries,
    });
  }

  return sections;
}

// ============================================================================
// Search
// ============================================================================

/**
 * Search shortcuts by a query string. Searches across ID, description,
 * formatted keys, category, and context.
 *
 * @param entries - Keymap entries to search through
 * @param query - Search query
 * @returns Sorted array of search results (best match first)
 */
export function searchShortcuts(
  entries: KeymapEntry[],
  query: string,
): KeymapSearchResult[] {
  if (!query || query.trim().length === 0) {
    return entries.map((e) => ({
      entry: e,
      matchField: "description" as const,
      score: 0,
    }));
  }

  const q = query.toLowerCase().trim();
  const results: KeymapSearchResult[] = [];

  for (const entry of entries) {
    let bestScore = 0;
    let bestField: KeymapSearchResult["matchField"] = "description";

    // Exact ID match (highest score)
    if (entry.id.toLowerCase().includes(q)) {
      const score = entry.id.toLowerCase() === q ? 100 : 80;
      if (score > bestScore) {
        bestScore = score;
        bestField = "id";
      }
    }

    // Description match
    const descLower = entry.description.toLowerCase();
    if (descLower.includes(q)) {
      const score = descLower.startsWith(q) ? 70 : 50;
      if (score > bestScore) {
        bestScore = score;
        bestField = "description";
      }
    }

    // Keys match
    const keysLower = entry.keys.toLowerCase();
    const displayKeysLower = entry.displayKeys.toLowerCase();
    if (keysLower.includes(q) || displayKeysLower.includes(q)) {
      const score = keysLower === q || displayKeysLower === q ? 90 : 60;
      if (score > bestScore) {
        bestScore = score;
        bestField = "keys";
      }
    }

    // Category match
    if (entry.category.toLowerCase().includes(q)) {
      const score = 30;
      if (score > bestScore) {
        bestScore = score;
        bestField = "category";
      }
    }

    // Context match
    if (entry.context.toLowerCase().includes(q)) {
      const score = 20;
      if (score > bestScore) {
        bestScore = score;
        bestField = "context";
      }
    }

    if (bestScore > 0) {
      results.push({ entry, matchField: bestField, score: bestScore });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

// ============================================================================
// Export
// ============================================================================

/**
 * Export the keymap to a serialized format.
 *
 * @param sections - Keymap sections to export
 * @param format - Output format ('json' or 'markdown')
 * @returns Formatted string
 */
export function exportKeymap(
  sections: KeymapSection[],
  format: "json" | "markdown",
): string {
  if (format === "json") {
    return exportKeymapJson(sections);
  }
  return exportKeymapMarkdown(sections);
}

function exportKeymapJson(sections: KeymapSection[]): string {
  const data = sections.map((section) => ({
    category: section.category,
    title: section.title,
    description: section.description,
    shortcuts: section.shortcuts.map((s) => ({
      id: s.id,
      keys: s.keys,
      displayKeys: s.displayKeys,
      description: s.description,
      context: s.context,
      enabled: s.enabled,
    })),
  }));
  return JSON.stringify(data, null, 2);
}

function exportKeymapMarkdown(sections: KeymapSection[]): string {
  const lines: string[] = ["# Keyboard Shortcuts", ""];

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    if (section.description) {
      lines.push(`${section.description}`);
    }
    lines.push("");
    lines.push("| Shortcut | Description | Context |");
    lines.push("| --- | --- | --- |");

    for (const shortcut of section.shortcuts) {
      if (!shortcut.enabled) continue;
      const keysDisplay = `\`${shortcut.displayKeys}\``;
      lines.push(
        `| ${keysDisplay} | ${shortcut.description} | ${shortcut.context} |`,
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

// ============================================================================
// Utility
// ============================================================================

/**
 * Get the title for a shortcut category.
 */
export function getCategoryTitle(category: ShortcutCategory): string {
  return CATEGORY_TITLES[category] || category;
}

/**
 * Get the description for a shortcut category.
 */
export function getCategoryDescription(category: ShortcutCategory): string {
  return CATEGORY_DESCRIPTIONS[category] || "";
}

/**
 * Filter keymap entries by context.
 */
export function filterEntriesByContext(
  entries: KeymapEntry[],
  context: ShortcutContext,
): KeymapEntry[] {
  return entries.filter((e) => e.context === context || e.context === "global");
}

/**
 * Filter keymap entries to only enabled ones.
 */
export function filterEnabledEntries(entries: KeymapEntry[]): KeymapEntry[] {
  return entries.filter((e) => e.enabled);
}

/**
 * Get a summary of shortcuts count by category.
 */
export function getKeymapSummary(
  entries: KeymapEntry[],
): Record<ShortcutCategory, number> {
  const summary: Record<ShortcutCategory, number> = {
    navigation: 0,
    messaging: 0,
    formatting: 0,
    media: 0,
    calls: 0,
    admin: 0,
    custom: 0,
  };

  for (const entry of entries) {
    summary[entry.category]++;
  }

  return summary;
}
