/**
 * Emoji Shortcodes - Shortcode mapping and parsing utilities
 *
 * This module provides comprehensive shortcode support for converting
 * between :shortcode: format and emoji characters.
 */

import { EMOJI_DATA, getEmojiByName } from "./emoji-data";
import type {
  ShortcodeEntry,
  ShortcodeParseResult,
  Emoji,
} from "./emoji-types";

// ============================================================================
// Shortcode Mappings
// ============================================================================

/**
 * Build shortcode to emoji mapping
 */
function buildShortcodeMap(): Map<string, string> {
  const map = new Map<string, string>();

  for (const emoji of EMOJI_DATA) {
    // Add primary name
    map.set(emoji.name, emoji.emoji);
    // Add all aliases
    for (const alias of emoji.aliases) {
      map.set(alias, emoji.emoji);
    }
  }

  return map;
}

/**
 * Build emoji to shortcode mapping (reverse lookup)
 */
function buildEmojiToShortcodeMap(): Map<string, string> {
  const map = new Map<string, string>();

  for (const emoji of EMOJI_DATA) {
    // Only add primary name (first occurrence wins)
    if (!map.has(emoji.emoji)) {
      map.set(emoji.emoji, emoji.name);
    }
  }

  return map;
}

/**
 * Shortcode to emoji mapping
 */
export const SHORTCODE_TO_EMOJI: Map<string, string> = buildShortcodeMap();

/**
 * Emoji to shortcode mapping (for reverse lookup)
 */
export const EMOJI_TO_SHORTCODE: Map<string, string> =
  buildEmojiToShortcodeMap();

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert a shortcode to its emoji character
 *
 * @param shortcode - The shortcode (with or without colons)
 * @returns The emoji character or null if not found
 *
 * @example
 * shortcodeToEmoji(':thumbsup:') // returns emoji char
 * shortcodeToEmoji('thumbsup') // also works without colons
 * shortcodeToEmoji('+1') // alias also works
 */
export function shortcodeToEmoji(shortcode: string): string | null {
  // Remove leading/trailing colons if present
  const normalized = shortcode.replace(/^:|:$/g, "").toLowerCase();
  return SHORTCODE_TO_EMOJI.get(normalized) ?? null;
}

/**
 * Convert an emoji character to its primary shortcode
 *
 * @param emoji - The emoji character
 * @returns The shortcode (without colons) or null if not found
 *
 * @example
 * emojiToShortcode(emoji) // returns 'thumbsup'
 */
export function emojiToShortcode(emoji: string): string | null {
  return EMOJI_TO_SHORTCODE.get(emoji) ?? null;
}

/**
 * Convert an emoji to its formatted shortcode (with colons)
 *
 * @param emoji - The emoji character
 * @returns The formatted shortcode or null
 *
 * @example
 * emojiToFormattedShortcode(emoji) // returns ':thumbsup:'
 */
export function emojiToFormattedShortcode(emoji: string): string | null {
  const shortcode = emojiToShortcode(emoji);
  return shortcode ? `:${shortcode}:` : null;
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Regular expression to match shortcodes in text
 * Matches :shortcode: format with alphanumeric, underscore, plus, and minus
 */
const SHORTCODE_REGEX = /:([a-zA-Z0-9_+-]+):/g;

/**
 * Parse text and replace all :shortcodes: with emojis
 *
 * @param text - The text containing shortcodes
 * @returns The text with shortcodes replaced by emojis
 *
 * @example
 * parseShortcodes('Hello :wave: :smile:') // 'Hello emoji1 emoji2'
 */
export function parseShortcodes(text: string): string {
  return text.replace(SHORTCODE_REGEX, (match, shortcode) => {
    const emoji = shortcodeToEmoji(shortcode);
    return emoji ?? match;
  });
}

/**
 * Parse text and return detailed replacement information
 *
 * @param text - The text containing shortcodes
 * @returns Parsed result with original, parsed text, and replacement details
 */
export function parseShortcodesDetailed(text: string): ShortcodeParseResult {
  const replacements: ShortcodeParseResult["replacements"] = [];
  let offset = 0;

  const parsed = text.replace(SHORTCODE_REGEX, (match, shortcode, position) => {
    const emoji = shortcodeToEmoji(shortcode);
    if (emoji) {
      replacements.push({
        shortcode: `:${shortcode}:`,
        emoji,
        start: position - offset,
        end: position - offset + match.length,
      });
      offset += match.length - emoji.length;
      return emoji;
    }
    return match;
  });

  return {
    original: text,
    parsed,
    replacements,
  };
}

/**
 * Parse emojis in text and convert them to shortcodes
 *
 * @param text - The text containing emojis
 * @returns The text with emojis replaced by shortcodes
 */
export function emojisToShortcodes(text: string): string {
  // Build regex from all emoji characters
  const emojiChars = Array.from(EMOJI_TO_SHORTCODE.keys())
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length); // Sort by length (longest first)

  if (emojiChars.length === 0) return text;

  const emojiRegex = new RegExp(`(${emojiChars.join("|")})`, "g");

  return text.replace(emojiRegex, (emoji) => {
    const shortcode = emojiToShortcode(emoji);
    return shortcode ? `:${shortcode}:` : emoji;
  });
}

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Detect if text contains any shortcodes
 *
 * @param text - The text to check
 * @returns True if shortcodes are present
 */
export function containsShortcodes(text: string): boolean {
  return SHORTCODE_REGEX.test(text);
}

/**
 * Extract all shortcodes from text
 *
 * @param text - The text to extract from
 * @returns Array of shortcode strings (without colons)
 */
export function extractShortcodes(text: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  const regex = new RegExp(SHORTCODE_REGEX.source, "g");

  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

/**
 * Validate a shortcode string
 *
 * @param shortcode - The shortcode to validate (without colons)
 * @returns True if valid format and exists
 */
export function isValidShortcode(shortcode: string): boolean {
  const normalized = shortcode.replace(/^:|:$/g, "").toLowerCase();
  return (
    /^[a-zA-Z0-9_+-]+$/.test(normalized) && SHORTCODE_TO_EMOJI.has(normalized)
  );
}

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Get all available shortcodes
 *
 * @returns Array of all shortcode strings (without colons)
 */
export function getAllShortcodes(): string[] {
  return Array.from(SHORTCODE_TO_EMOJI.keys());
}

/**
 * Get shortcode entries for display/search
 *
 * @returns Array of shortcode entries with emoji
 */
export function getShortcodeEntries(): ShortcodeEntry[] {
  return EMOJI_DATA.map((emoji) => ({
    shortcode: emoji.name,
    emoji: emoji.emoji,
    aliases: emoji.aliases,
  }));
}

/**
 * Get all shortcodes for a specific emoji (including aliases)
 *
 * @param emoji - The emoji character
 * @returns Array of shortcodes (without colons)
 */
export function getShortcodesForEmoji(emoji: string): string[] {
  const emojiData = EMOJI_DATA.find((e) => e.emoji === emoji);
  if (!emojiData) return [];
  return [emojiData.name, ...emojiData.aliases];
}

// ============================================================================
// Custom Shortcode Support
// ============================================================================

/**
 * Registry for custom shortcodes (from custom emojis)
 */
const customShortcodes = new Map<string, string>();

/**
 * Register a custom shortcode
 *
 * @param shortcode - The shortcode (without colons)
 * @param emojiUrl - The URL of the custom emoji image
 */
export function registerCustomShortcode(
  shortcode: string,
  emojiUrl: string,
): void {
  customShortcodes.set(shortcode.toLowerCase(), emojiUrl);
}

/**
 * Unregister a custom shortcode
 *
 * @param shortcode - The shortcode to remove
 */
export function unregisterCustomShortcode(shortcode: string): void {
  customShortcodes.delete(shortcode.toLowerCase());
}

/**
 * Get custom emoji URL by shortcode
 *
 * @param shortcode - The shortcode (without colons)
 * @returns The URL or undefined
 */
export function getCustomEmojiUrl(shortcode: string): string | undefined {
  return customShortcodes.get(shortcode.toLowerCase());
}

/**
 * Check if a shortcode is a custom emoji
 *
 * @param shortcode - The shortcode to check
 * @returns True if it's a custom emoji
 */
export function isCustomShortcode(shortcode: string): boolean {
  return customShortcodes.has(shortcode.toLowerCase().replace(/^:|:$/g, ""));
}

/**
 * Clear all custom shortcodes
 */
export function clearCustomShortcodes(): void {
  customShortcodes.clear();
}

/**
 * Register multiple custom shortcodes
 *
 * @param shortcuts - Map or array of [shortcode, url] pairs
 */
export function registerCustomShortcodes(
  shortcuts: Map<string, string> | Array<[string, string]>,
): void {
  const entries = shortcuts instanceof Map ? Array.from(shortcuts) : shortcuts;
  for (const [shortcode, url] of entries) {
    registerCustomShortcode(shortcode, url);
  }
}

// ============================================================================
// Autocomplete Helpers
// ============================================================================

/**
 * Find matching shortcodes for autocomplete
 *
 * @param query - The partial shortcode to match
 * @param limit - Maximum number of results
 * @returns Array of matching emoji data
 */
export function findMatchingShortcodes(
  query: string,
  limit: number = 10,
): Array<{ shortcode: string; emoji: string; name: string }> {
  const normalized = query.toLowerCase().replace(/^:|:$/g, "");

  if (!normalized) return [];

  const results: Array<{
    shortcode: string;
    emoji: string;
    name: string;
    score: number;
  }> = [];

  for (const emoji of EMOJI_DATA) {
    // Check primary name
    if (emoji.name.includes(normalized)) {
      const score = emoji.name.startsWith(normalized) ? 100 : 50;
      results.push({
        shortcode: emoji.name,
        emoji: emoji.emoji,
        name: emoji.displayName,
        score: score + (emoji.name === normalized ? 200 : 0),
      });
    }

    // Check aliases
    for (const alias of emoji.aliases) {
      if (alias.includes(normalized)) {
        const score = alias.startsWith(normalized) ? 90 : 40;
        results.push({
          shortcode: alias,
          emoji: emoji.emoji,
          name: emoji.displayName,
          score: score + (alias === normalized ? 200 : 0),
        });
      }
    }
  }

  // Sort by score (higher first) and return limited results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ shortcode, emoji, name }) => ({ shortcode, emoji, name }));
}

/**
 * Get shortcode suggestions for autocomplete with scoring
 *
 * @param query - The partial shortcode
 * @param options - Options for suggestion
 * @returns Sorted suggestions
 */
export function getShortcodeSuggestions(
  query: string,
  options: {
    limit?: number;
    includeAliases?: boolean;
    prioritizeExact?: boolean;
  } = {},
): Array<{
  shortcode: string;
  emoji: string;
  displayName: string;
  isAlias: boolean;
}> {
  const { limit = 10, includeAliases = true, prioritizeExact = true } = options;
  const normalized = query.toLowerCase().replace(/^:|:$/g, "");

  if (!normalized) return [];

  type SuggestionWithScore = {
    shortcode: string;
    emoji: string;
    displayName: string;
    isAlias: boolean;
    score: number;
  };

  const suggestions: SuggestionWithScore[] = [];

  for (const emoji of EMOJI_DATA) {
    // Check primary name
    if (emoji.name.includes(normalized)) {
      let score = 0;
      if (prioritizeExact && emoji.name === normalized) {
        score = 1000;
      } else if (emoji.name.startsWith(normalized)) {
        score = 100 - normalized.length; // Shorter matches rank higher
      } else {
        score = 50 - emoji.name.indexOf(normalized);
      }

      suggestions.push({
        shortcode: emoji.name,
        emoji: emoji.emoji,
        displayName: emoji.displayName,
        isAlias: false,
        score,
      });
    }

    // Check aliases
    if (includeAliases) {
      for (const alias of emoji.aliases) {
        if (alias.includes(normalized)) {
          let score = 0;
          if (prioritizeExact && alias === normalized) {
            score = 900; // Slightly lower than primary exact match
          } else if (alias.startsWith(normalized)) {
            score = 90 - normalized.length;
          } else {
            score = 40 - alias.indexOf(normalized);
          }

          suggestions.push({
            shortcode: alias,
            emoji: emoji.emoji,
            displayName: emoji.displayName,
            isAlias: true,
            score,
          });
        }
      }
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ shortcode, emoji, displayName, isAlias }) => ({
      shortcode,
      emoji,
      displayName,
      isAlias,
    }));
}
