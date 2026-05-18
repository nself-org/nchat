/**
 * Emoji Custom - Custom emoji management utilities
 *
 * This module provides utilities for managing custom emojis,
 * including CRUD operations, validation, and synchronization.
 */

import type {
  CustomEmoji,
  CreateCustomEmojiRequest,
  UpdateCustomEmojiRequest,
} from "./emoji-types";
import {
  registerCustomShortcode,
  unregisterCustomShortcode,
} from "./emoji-shortcodes";

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "nchat-custom-emojis";
const MAX_EMOJI_SIZE = 256 * 1024; // 256KB
const ALLOWED_TYPES = ["image/png", "image/gif", "image/jpeg", "image/webp"];
const MAX_EMOJI_DIMENSION = 128;
const MIN_EMOJI_DIMENSION = 16;

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate custom emoji name
 *
 * @param name - The emoji name to validate
 * @returns Validation result
 */
export function validateEmojiName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name) {
    return { valid: false, error: "Name is required" };
  }

  if (name.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters" };
  }

  if (name.length > 32) {
    return { valid: false, error: "Name must be 32 characters or less" };
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    return {
      valid: false,
      error:
        "Name must start with a letter and contain only letters, numbers, underscores, and hyphens",
    };
  }

  return { valid: true };
}

/**
 * Validate custom emoji file
 *
 * @param file - The file to validate
 * @returns Promise resolving to validation result
 */
export async function validateEmojiFile(
  file: File,
): Promise<{ valid: boolean; error?: string }> {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_TYPES.map((t) => t.split("/")[1]).join(", ")}`,
    };
  }

  // Check file size
  if (file.size > MAX_EMOJI_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_EMOJI_SIZE / 1024}KB`,
    };
  }

  // Check dimensions
  try {
    const dimensions = await getImageDimensions(file);

    if (
      dimensions.width < MIN_EMOJI_DIMENSION ||
      dimensions.height < MIN_EMOJI_DIMENSION
    ) {
      return {
        valid: false,
        error: `Image too small. Minimum: ${MIN_EMOJI_DIMENSION}x${MIN_EMOJI_DIMENSION}px`,
      };
    }

    if (
      dimensions.width > MAX_EMOJI_DIMENSION ||
      dimensions.height > MAX_EMOJI_DIMENSION
    ) {
      return {
        valid: false,
        error: `Image too large. Maximum: ${MAX_EMOJI_DIMENSION}x${MAX_EMOJI_DIMENSION}px`,
      };
    }
  } catch {
    return { valid: false, error: "Failed to read image dimensions" };
  }

  return { valid: true };
}

/**
 * Get image dimensions from file
 */
function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

// ============================================================================
// Local Storage Operations
// ============================================================================

/**
 * Get custom emojis from local storage
 *
 * @returns Map of custom emojis
 */
export function getLocalCustomEmojis(): Map<string, CustomEmoji> {
  if (typeof window === "undefined") return new Map();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Map();

    return new Map(parsed.map((emoji: CustomEmoji) => [emoji.id, emoji]));
  } catch {
    return new Map();
  }
}

/**
 * Save custom emojis to local storage
 *
 * @param emojis - Map of custom emojis
 */
export function saveLocalCustomEmojis(emojis: Map<string, CustomEmoji>): void {
  if (typeof window === "undefined") return;

  try {
    const entries = Array.from(emojis.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    // Register all shortcodes
    for (const emoji of emojis.values()) {
      if (emoji.enabled) {
        registerCustomShortcode(emoji.name, emoji.url);
        for (const alias of emoji.aliases) {
          registerCustomShortcode(alias, emoji.url);
        }
      }
    }
  } catch {
    // Storage full or disabled
  }
}

/**
 * Add a custom emoji locally
 *
 * @param emoji - The custom emoji to add
 */
export function addLocalCustomEmoji(emoji: CustomEmoji): void {
  const emojis = getLocalCustomEmojis();
  emojis.set(emoji.id, emoji);
  saveLocalCustomEmojis(emojis);
}

/**
 * Update a custom emoji locally
 *
 * @param id - The emoji ID
 * @param updates - Updates to apply
 */
export function updateLocalCustomEmoji(
  id: string,
  updates: Partial<CustomEmoji>,
): void {
  const emojis = getLocalCustomEmojis();
  const existing = emojis.get(id);

  if (existing) {
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    emojis.set(id, updated);
    saveLocalCustomEmojis(emojis);
  }
}

/**
 * Remove a custom emoji locally
 *
 * @param id - The emoji ID to remove
 */
export function removeLocalCustomEmoji(id: string): void {
  const emojis = getLocalCustomEmojis();
  const emoji = emojis.get(id);

  if (emoji) {
    // Unregister shortcodes
    unregisterCustomShortcode(emoji.name);
    for (const alias of emoji.aliases) {
      unregisterCustomShortcode(alias);
    }

    emojis.delete(id);
    saveLocalCustomEmojis(emojis);
  }
}

/**
 * Clear all local custom emojis
 */
export function clearLocalCustomEmojis(): void {
  if (typeof window === "undefined") return;

  const emojis = getLocalCustomEmojis();
  for (const emoji of emojis.values()) {
    unregisterCustomShortcode(emoji.name);
    for (const alias of emoji.aliases) {
      unregisterCustomShortcode(alias);
    }
  }

  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for a custom emoji
 *
 * @returns Unique ID string
 */
export function generateEmojiId(): string {
  return `custom-emoji-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a shortcode from emoji name
 *
 * @param name - The emoji name
 * @returns Formatted shortcode with colons
 */
export function createShortcode(name: string): string {
  return `:${name.toLowerCase()}:`;
}

/**
 * Check if a shortcode is already taken
 *
 * @param shortcode - The shortcode to check (without colons)
 * @param excludeId - Emoji ID to exclude from check
 * @returns Whether the shortcode is taken
 */
export function isShortcodeTaken(
  shortcode: string,
  excludeId?: string,
): boolean {
  const emojis = getLocalCustomEmojis();
  const normalized = shortcode.toLowerCase().replace(/^:|:$/g, "");

  for (const emoji of emojis.values()) {
    if (excludeId && emoji.id === excludeId) continue;

    if (
      emoji.name.toLowerCase() === normalized ||
      emoji.aliases.some((a) => a.toLowerCase() === normalized)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Convert file to data URL
 *
 * @param file - The file to convert
 * @returns Promise resolving to data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Create a custom emoji from a file
 *
 * @param request - Create request with name and file
 * @param userId - ID of the user creating the emoji
 * @param username - Username of the creator
 * @returns Promise resolving to the created emoji
 */
export async function createCustomEmojiFromFile(
  request: CreateCustomEmojiRequest,
  userId: string,
  username?: string,
): Promise<CustomEmoji> {
  // Validate name
  const nameValidation = validateEmojiName(request.name);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error);
  }

  // Check if shortcode is taken
  if (isShortcodeTaken(request.name)) {
    throw new Error("This emoji name is already in use");
  }

  // Validate file
  const fileValidation = await validateEmojiFile(request.file);
  if (!fileValidation.valid) {
    throw new Error(fileValidation.error);
  }

  // Convert file to data URL (for local storage)
  // In production, this would be uploaded to storage
  const url = await fileToDataUrl(request.file);

  const emoji: CustomEmoji = {
    id: generateEmojiId(),
    name: request.name.toLowerCase(),
    shortcode: createShortcode(request.name),
    url,
    category: request.category,
    aliases: request.aliases?.map((a) => a.toLowerCase()) ?? [],
    createdBy: userId,
    createdByUsername: username,
    createdAt: new Date().toISOString(),
    enabled: true,
    usageCount: 0,
  };

  return emoji;
}

// ============================================================================
// Search and Filter
// ============================================================================

/**
 * Search custom emojis
 *
 * @param emojis - Map of custom emojis
 * @param query - Search query
 * @returns Matching custom emojis
 */
export function searchCustomEmojis(
  emojis: Map<string, CustomEmoji>,
  query: string,
): CustomEmoji[] {
  const q = query.toLowerCase();

  return Array.from(emojis.values()).filter(
    (emoji) =>
      emoji.name.includes(q) ||
      emoji.aliases.some((a) => a.includes(q)) ||
      (emoji.category && emoji.category.includes(q)),
  );
}

/**
 * Get custom emojis by category
 *
 * @param emojis - Map of custom emojis
 * @param category - Category to filter by
 * @returns Custom emojis in the category
 */
export function getCustomEmojisByCategory(
  emojis: Map<string, CustomEmoji>,
  category: string,
): CustomEmoji[] {
  return Array.from(emojis.values()).filter(
    (emoji) => emoji.category === category,
  );
}

/**
 * Get all custom emoji categories
 *
 * @param emojis - Map of custom emojis
 * @returns Array of unique category names
 */
export function getCustomEmojiCategories(
  emojis: Map<string, CustomEmoji>,
): string[] {
  const categories = new Set<string>();

  for (const emoji of emojis.values()) {
    if (emoji.category) {
      categories.add(emoji.category);
    }
  }

  return Array.from(categories).sort();
}

/**
 * Get enabled custom emojis only
 *
 * @param emojis - Map of custom emojis
 * @returns Array of enabled custom emojis
 */
export function getEnabledCustomEmojis(
  emojis: Map<string, CustomEmoji>,
): CustomEmoji[] {
  return Array.from(emojis.values()).filter((emoji) => emoji.enabled);
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Record custom emoji usage
 *
 * @param id - The emoji ID
 */
export function recordCustomEmojiUsage(id: string): void {
  const emojis = getLocalCustomEmojis();
  const emoji = emojis.get(id);

  if (emoji) {
    emojis.set(id, {
      ...emoji,
      usageCount: emoji.usageCount + 1,
    });
    saveLocalCustomEmojis(emojis);
  }
}

/**
 * Get top used custom emojis
 *
 * @param emojis - Map of custom emojis
 * @param limit - Maximum to return
 * @returns Top used custom emojis
 */
export function getTopCustomEmojis(
  emojis: Map<string, CustomEmoji>,
  limit: number = 10,
): CustomEmoji[] {
  return Array.from(emojis.values())
    .filter((e) => e.enabled)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}

// ============================================================================
// Sync Utilities
// ============================================================================

/**
 * Merge remote custom emojis with local
 *
 * @param remote - Remote custom emojis
 * @param local - Local custom emojis
 * @returns Merged map
 */
export function mergeCustomEmojis(
  remote: CustomEmoji[],
  local: Map<string, CustomEmoji>,
): Map<string, CustomEmoji> {
  const merged = new Map(local);

  for (const emoji of remote) {
    const existing = merged.get(emoji.id);

    if (!existing) {
      // New remote emoji
      merged.set(emoji.id, emoji);
    } else {
      // Merge based on updated timestamp
      const remoteUpdated = emoji.updatedAt ?? emoji.createdAt;
      const localUpdated = existing.updatedAt ?? existing.createdAt;

      if (new Date(remoteUpdated) > new Date(localUpdated)) {
        merged.set(emoji.id, emoji);
      }
    }
  }

  return merged;
}

/**
 * Export custom emojis for backup
 *
 * @param emojis - Map of custom emojis
 * @returns Export data
 */
export function exportCustomEmojis(emojis: Map<string, CustomEmoji>): {
  emojis: CustomEmoji[];
  exportedAt: string;
} {
  return {
    emojis: Array.from(emojis.values()),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Import custom emojis from backup
 *
 * @param data - Import data
 * @param replace - Replace existing or merge
 */
export function importCustomEmojis(
  data: { emojis: CustomEmoji[] },
  replace: boolean = false,
): void {
  if (replace) {
    clearLocalCustomEmojis();
    const map = new Map(data.emojis.map((e) => [e.id, e]));
    saveLocalCustomEmojis(map);
  } else {
    const existing = getLocalCustomEmojis();
    const merged = mergeCustomEmojis(data.emojis, existing);
    saveLocalCustomEmojis(merged);
  }
}
