/**
 * Collections Management
 *
 * Logic for managing saved message collections.
 */

import type {
  SavedCollection,
  CreateCollectionInput,
  UpdateCollectionInput,
  ShareCollectionInput,
  CollectionShareSettings,
} from "./saved-types";

// ============================================================================
// Collection Constants
// ============================================================================

export const COLLECTION_LIMITS = {
  /** Maximum collections per user */
  MAX_COLLECTIONS: 50,
  /** Maximum name length */
  MAX_NAME_LENGTH: 100,
  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 500,
  /** Maximum items per collection */
  MAX_ITEMS_PER_COLLECTION: 500,
  /** Default collection colors */
  DEFAULT_COLORS: [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
  ],
  /** Default collection icons */
  DEFAULT_ICONS: [
    "bookmark",
    "star",
    "heart",
    "folder",
    "tag",
    "flag",
    "lightbulb",
    "check",
    "clock",
    "archive",
  ],
} as const;

// ============================================================================
// Collection Validation
// ============================================================================

/**
 * Validate create collection input.
 */
export function validateCreateCollection(input: CreateCollectionInput): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push("Collection name is required");
  }

  if (input.name && input.name.length > COLLECTION_LIMITS.MAX_NAME_LENGTH) {
    errors.push(
      `Name cannot exceed ${COLLECTION_LIMITS.MAX_NAME_LENGTH} characters`,
    );
  }

  if (
    input.description &&
    input.description.length > COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH
  ) {
    errors.push(
      `Description cannot exceed ${COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH} characters`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate update collection input.
 */
export function validateUpdateCollection(input: UpdateCollectionInput): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.collectionId) {
    errors.push("Collection ID is required");
  }

  if (input.name !== undefined) {
    if (input.name.trim().length === 0) {
      errors.push("Collection name cannot be empty");
    }
    if (input.name.length > COLLECTION_LIMITS.MAX_NAME_LENGTH) {
      errors.push(
        `Name cannot exceed ${COLLECTION_LIMITS.MAX_NAME_LENGTH} characters`,
      );
    }
  }

  if (
    input.description &&
    input.description.length > COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH
  ) {
    errors.push(
      `Description cannot exceed ${COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH} characters`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Collection Operations
// ============================================================================

/**
 * Sort collections by position.
 */
export function sortCollections(
  collections: SavedCollection[],
): SavedCollection[] {
  return [...collections].sort((a, b) => a.position - b.position);
}

/**
 * Reorder collections.
 */
export function reorderCollections(
  collections: SavedCollection[],
  newOrder: string[],
): SavedCollection[] {
  const collectionMap = new Map(collections.map((c) => [c.id, c]));

  return newOrder
    .map((id, index) => {
      const collection = collectionMap.get(id);
      if (collection) {
        return { ...collection, position: index };
      }
      return null;
    })
    .filter((c): c is SavedCollection => c !== null);
}

/**
 * Get next available position for new collection.
 */
export function getNextPosition(collections: SavedCollection[]): number {
  if (collections.length === 0) return 0;
  return Math.max(...collections.map((c) => c.position)) + 1;
}

// ============================================================================
// Share Link Generation
// ============================================================================

/**
 * Generate a unique share link ID.
 */
export function generateShareLinkId(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create share settings for a collection.
 */
export function createShareSettings(
  input: ShareCollectionInput,
): CollectionShareSettings {
  return {
    shareLink: input.visibility === "link" ? generateShareLinkId() : undefined,
    visibility: input.visibility,
    sharedWith: input.sharedWith,
    allowContribute: input.allowContribute ?? false,
    expiresAt: input.expiresAt,
  };
}

/**
 * Check if share link is expired.
 */
export function isShareLinkExpired(settings: CollectionShareSettings): boolean {
  if (!settings.expiresAt) return false;
  return new Date() > settings.expiresAt;
}

/**
 * Check if user has access to a shared collection.
 */
export function hasAccessToCollection(
  collection: SavedCollection,
  userId: string,
  isWorkspaceMember: boolean = false,
): boolean {
  // Owner always has access
  if (collection.userId === userId) return true;

  // Not shared
  if (!collection.isShared || !collection.shareSettings) return false;

  const settings = collection.shareSettings;

  // Check if expired
  if (isShareLinkExpired(settings)) return false;

  // Check visibility
  switch (settings.visibility) {
    case "private":
      return false;
    case "link":
      return true; // Anyone with the link
    case "workspace":
      return isWorkspaceMember;
    default:
      return false;
  }
}

// ============================================================================
// Collection Statistics
// ============================================================================

/**
 * Get collection statistics.
 */
export interface CollectionStats {
  totalCollections: number;
  totalShared: number;
  totalItems: number;
  emptyCollections: number;
  averageItemsPerCollection: number;
  largestCollection: {
    id: string;
    name: string;
    itemCount: number;
  } | null;
}

/**
 * Calculate collection statistics.
 */
export function calculateCollectionStats(
  collections: SavedCollection[],
): CollectionStats {
  if (collections.length === 0) {
    return {
      totalCollections: 0,
      totalShared: 0,
      totalItems: 0,
      emptyCollections: 0,
      averageItemsPerCollection: 0,
      largestCollection: null,
    };
  }

  const totalItems = collections.reduce((sum, c) => sum + c.itemCount, 0);
  const emptyCollections = collections.filter((c) => c.itemCount === 0).length;
  const sharedCollections = collections.filter((c) => c.isShared).length;

  const largest = collections.reduce<SavedCollection | null>((max, c) => {
    if (!max || c.itemCount > max.itemCount) return c;
    return max;
  }, null);

  return {
    totalCollections: collections.length,
    totalShared: sharedCollections,
    totalItems,
    emptyCollections,
    averageItemsPerCollection:
      collections.length > 0 ? Math.round(totalItems / collections.length) : 0,
    largestCollection: largest
      ? {
          id: largest.id,
          name: largest.name,
          itemCount: largest.itemCount,
        }
      : null,
  };
}

// ============================================================================
// Color and Icon Helpers
// ============================================================================

/**
 * Get a random default color.
 */
export function getRandomColor(): string {
  const colors = COLLECTION_LIMITS.DEFAULT_COLORS;
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Get a random default icon.
 */
export function getRandomIcon(): string {
  const icons = COLLECTION_LIMITS.DEFAULT_ICONS;
  return icons[Math.floor(Math.random() * icons.length)];
}

/**
 * Parse color string to ensure it's valid.
 */
export function parseColor(color: string | undefined): string {
  if (!color) return getRandomColor();
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  return getRandomColor();
}
