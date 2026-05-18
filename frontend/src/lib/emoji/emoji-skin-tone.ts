/**
 * Emoji Skin Tone - Skin tone modifier handling
 *
 * This module provides utilities for applying and managing
 * Fitzpatrick skin tone modifiers on emojis.
 */

import type { SkinTone, SkinToneInfo } from "./emoji-types";
import { SKIN_TONES, EMOJI_DATA } from "./emoji-data";

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "nchat-emoji-skin-tone";

/**
 * Skin tone modifier Unicode codepoints
 */
export const SKIN_TONE_MODIFIERS: Record<Exclude<SkinTone, "">, string> = {
  "1F3FB": "\u{1F3FB}", // Light
  "1F3FC": "\u{1F3FC}", // Medium-Light
  "1F3FD": "\u{1F3FD}", // Medium
  "1F3FE": "\u{1F3FE}", // Medium-Dark
  "1F3FF": "\u{1F3FF}", // Dark
};

/**
 * Regex to match existing skin tone modifiers
 */
const SKIN_TONE_REGEX = /[\u{1F3FB}-\u{1F3FF}]/gu;

/**
 * Set of emojis that support skin tones (built from data)
 */
const SKIN_TONE_EMOJIS = new Set(
  EMOJI_DATA.filter((e) => e.supportsSkinTone).map((e) =>
    e.emoji.replace(SKIN_TONE_REGEX, ""),
  ),
);

// ============================================================================
// Skin Tone Application
// ============================================================================

/**
 * Apply skin tone modifier to an emoji
 *
 * @param emoji - The emoji character
 * @param skinTone - The skin tone to apply
 * @returns The emoji with skin tone applied, or original if not supported
 *
 * @example
 * applySkinTone(emoji, '1F3FD') // returns emoji with medium skin tone
 */
export function applySkinTone(emoji: string, skinTone: SkinTone): string {
  // No modification for default skin tone
  if (!skinTone) {
    return emoji;
  }

  // Remove any existing skin tone modifiers
  const baseEmoji = removeSkinTone(emoji);

  // Check if this emoji supports skin tones
  if (!supportsSkinTone(baseEmoji)) {
    return emoji;
  }

  // Apply the new skin tone
  const modifier = SKIN_TONE_MODIFIERS[skinTone];

  // For compound emojis (like person raising hand), we need to insert
  // the modifier after the first character
  if (baseEmoji.length > 2) {
    // Get first grapheme cluster
    const segments = [...new Intl.Segmenter().segment(baseEmoji)];
    if (segments.length > 1) {
      const first = segments[0].segment;
      const rest = segments
        .slice(1)
        .map((s) => s.segment)
        .join("");
      return first + modifier + rest;
    }
  }

  return baseEmoji + modifier;
}

/**
 * Remove skin tone modifier from an emoji
 *
 * @param emoji - The emoji with skin tone
 * @returns The base emoji without skin tone
 */
export function removeSkinTone(emoji: string): string {
  return emoji.replace(SKIN_TONE_REGEX, "");
}

/**
 * Check if an emoji supports skin tone modifiers
 *
 * @param emoji - The emoji to check
 * @returns Whether the emoji supports skin tones
 */
export function supportsSkinTone(emoji: string): boolean {
  const baseEmoji = removeSkinTone(emoji);
  return SKIN_TONE_EMOJIS.has(baseEmoji);
}

/**
 * Get the current skin tone of an emoji
 *
 * @param emoji - The emoji to check
 * @returns The skin tone value or empty string for default
 */
export function getEmojiSkinTone(emoji: string): SkinTone {
  const match = emoji.match(SKIN_TONE_REGEX);

  if (!match) {
    return "";
  }

  const codePoint = match[0].codePointAt(0);
  if (!codePoint) {
    return "";
  }

  const hex = codePoint.toString(16).toUpperCase() as SkinTone;
  return Object.keys(SKIN_TONE_MODIFIERS).includes(hex) ? hex : "";
}

// ============================================================================
// Skin Tone Preference Storage
// ============================================================================

/**
 * Get saved skin tone preference
 *
 * @returns The saved skin tone or default
 */
export function getSavedSkinTone(): SkinTone {
  if (typeof window === "undefined") return "";

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return "";

    // Validate the stored value
    if (["", "1F3FB", "1F3FC", "1F3FD", "1F3FE", "1F3FF"].includes(stored)) {
      return stored as SkinTone;
    }

    return "";
  } catch {
    return "";
  }
}

/**
 * Save skin tone preference
 *
 * @param skinTone - The skin tone to save
 */
export function saveSkinTone(skinTone: SkinTone): void {
  if (typeof window === "undefined") return;

  try {
    if (skinTone === "") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, skinTone);
    }
  } catch {
    // Storage full or disabled
  }
}

/**
 * Clear saved skin tone preference
 */
export function clearSkinTone(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// Skin Tone Information
// ============================================================================

/**
 * Get all skin tone options
 *
 * @returns Array of skin tone information
 */
export function getSkinToneOptions(): SkinToneInfo[] {
  return SKIN_TONES;
}

/**
 * Get skin tone info by value
 *
 * @param value - The skin tone value
 * @returns Skin tone info or undefined
 */
export function getSkinToneInfo(value: SkinTone): SkinToneInfo | undefined {
  return SKIN_TONES.find((t) => t.value === value);
}

/**
 * Get skin tone name for display
 *
 * @param value - The skin tone value
 * @returns The display name
 */
export function getSkinToneName(value: SkinTone): string {
  const info = getSkinToneInfo(value);
  return info?.name ?? "Default";
}

/**
 * Get preview emoji for a skin tone
 *
 * @param value - The skin tone value
 * @returns The preview emoji (waving hand with skin tone)
 */
export function getSkinTonePreview(value: SkinTone): string {
  const info = getSkinToneInfo(value);
  return info?.emoji ?? "\u{1F44B}";
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Apply skin tone to multiple emojis
 *
 * @param emojis - Array of emojis
 * @param skinTone - The skin tone to apply
 * @returns Array of emojis with skin tone applied
 */
export function applySkintoneToAll(
  emojis: string[],
  skinTone: SkinTone,
): string[] {
  return emojis.map((emoji) => applySkinTone(emoji, skinTone));
}

/**
 * Remove skin tone from multiple emojis
 *
 * @param emojis - Array of emojis
 * @returns Array of base emojis without skin tone
 */
export function removeSkinToneFromAll(emojis: string[]): string[] {
  return emojis.map((emoji) => removeSkinTone(emoji));
}

// ============================================================================
// Variant Generation
// ============================================================================

/**
 * Get all skin tone variants for an emoji
 *
 * @param emoji - The base emoji
 * @returns Array of all skin tone variants (including default)
 */
export function getSkinToneVariants(emoji: string): string[] {
  const baseEmoji = removeSkinTone(emoji);

  if (!supportsSkinTone(baseEmoji)) {
    return [baseEmoji];
  }

  return [
    baseEmoji, // Default
    applySkinTone(baseEmoji, "1F3FB"),
    applySkinTone(baseEmoji, "1F3FC"),
    applySkinTone(baseEmoji, "1F3FD"),
    applySkinTone(baseEmoji, "1F3FE"),
    applySkinTone(baseEmoji, "1F3FF"),
  ];
}

/**
 * Get skin tone variants with labels
 *
 * @param emoji - The base emoji
 * @returns Array of variants with labels
 */
export function getSkinToneVariantsWithLabels(
  emoji: string,
): Array<{ emoji: string; skinTone: SkinTone; name: string }> {
  const baseEmoji = removeSkinTone(emoji);

  if (!supportsSkinTone(baseEmoji)) {
    return [{ emoji: baseEmoji, skinTone: "", name: "Default" }];
  }

  return SKIN_TONES.map((tone) => ({
    emoji: applySkinTone(baseEmoji, tone.value),
    skinTone: tone.value,
    name: tone.name,
  }));
}

// ============================================================================
// Emoji Comparison
// ============================================================================

/**
 * Check if two emojis are the same (ignoring skin tone)
 *
 * @param a - First emoji
 * @param b - Second emoji
 * @returns Whether the emojis are the same base emoji
 */
export function isSameEmoji(a: string, b: string): boolean {
  return removeSkinTone(a) === removeSkinTone(b);
}

/**
 * Check if two emojis are exactly the same (including skin tone)
 *
 * @param a - First emoji
 * @param b - Second emoji
 * @returns Whether the emojis are exactly the same
 */
export function isSameEmojiExact(a: string, b: string): boolean {
  return a === b;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse skin tone from string representation
 *
 * @param str - String like 'light', 'medium', etc.
 * @returns The skin tone value
 */
export function parseSkinTone(str: string): SkinTone {
  const lower = str.toLowerCase();

  switch (lower) {
    case "light":
    case "type-1-2":
      return "1F3FB";
    case "medium-light":
    case "type-3":
      return "1F3FC";
    case "medium":
    case "type-4":
      return "1F3FD";
    case "medium-dark":
    case "type-5":
      return "1F3FE";
    case "dark":
    case "type-6":
      return "1F3FF";
    default:
      return "";
  }
}

/**
 * Get CSS class for skin tone
 *
 * @param skinTone - The skin tone value
 * @returns CSS class name
 */
export function getSkinToneClass(skinTone: SkinTone): string {
  switch (skinTone) {
    case "1F3FB":
      return "skin-tone-light";
    case "1F3FC":
      return "skin-tone-medium-light";
    case "1F3FD":
      return "skin-tone-medium";
    case "1F3FE":
      return "skin-tone-medium-dark";
    case "1F3FF":
      return "skin-tone-dark";
    default:
      return "skin-tone-default";
  }
}

/**
 * Get background color for skin tone picker
 *
 * @param skinTone - The skin tone value
 * @returns CSS color value
 */
export function getSkinToneColor(skinTone: SkinTone): string {
  switch (skinTone) {
    case "1F3FB":
      return "#fde7c0";
    case "1F3FC":
      return "#ddb896";
    case "1F3FD":
      return "#c19a6b";
    case "1F3FE":
      return "#8b6914";
    case "1F3FF":
      return "#4a3728";
    default:
      return "#ffc93a";
  }
}
