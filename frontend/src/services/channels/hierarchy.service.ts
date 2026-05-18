/**
 * Channel Hierarchy Service
 *
 * Manages channel categories, hierarchies, and reordering.
 * Provides category-level permission inheritance.
 *
 * Phase 6: Task 35 - Complete channel/category/thread/forum behavior
 */

import type {
  ChannelCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
  Channel,
  ChannelPermissionOverride,
  CHANNEL_PERMISSIONS,
} from "@/types/advanced-channels";

// =============================================================================
// TYPES
// =============================================================================

export interface CategoryState {
  isCollapsed: boolean;
  lastUpdated: string;
}

export interface CategoryWithState extends ChannelCategory {
  state: CategoryState;
  channels: Channel[];
  channelCount: number;
}

export interface ReorderResult {
  success: boolean;
  positions: Array<{ id: string; position: number }>;
}

export interface MoveChannelResult {
  success: boolean;
  channelId: string;
  fromCategoryId: string | null;
  toCategoryId: string | null;
  newPosition: number;
}

export interface CategoryPermissionInheritance {
  categoryId: string;
  inheritFromCategory: boolean;
  overrides: ChannelPermissionOverride[];
  effectivePermissions: bigint;
}

export interface HierarchySnapshot {
  categories: CategoryWithState[];
  uncategorizedChannels: Channel[];
  totalChannels: number;
  timestamp: string;
}

// =============================================================================
// CHANNEL HIERARCHY SERVICE
// =============================================================================

export class ChannelHierarchyService {
  private workspaceId: string;
  private categoryStates: Map<string, CategoryState> = new Map();
  private readonly STORAGE_KEY_PREFIX = "nchat_category_state_";

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
    this.loadCategoryStates();
  }

  // ===========================================================================
  // CATEGORY CRUD OPERATIONS
  // ===========================================================================

  /**
   * Create a new category
   */
  async createCategory(input: CreateCategoryInput): Promise<ChannelCategory> {
    const response = await fetch("/api/channels/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        workspaceId: input.workspaceId || this.workspaceId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create category");
    }

    const data = await response.json();
    return data.category;
  }

  /**
   * Get a single category by ID
   */
  async getCategory(categoryId: string): Promise<CategoryWithState | null> {
    const response = await fetch(
      `/api/channels/categories/${categoryId}?includeChannels=true`,
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Failed to fetch category");
    }

    const data = await response.json();
    const category = data.category;

    return {
      ...category,
      state: this.getCategoryState(categoryId),
      channels: category.channels || [],
      channelCount: category.channels?.length || 0,
    };
  }

  /**
   * Get all categories with their channels
   */
  async getCategories(includeChannels = true): Promise<CategoryWithState[]> {
    const params = new URLSearchParams({
      workspaceId: this.workspaceId,
      includeChannels: includeChannels.toString(),
      includeCollapsed: "true",
    });

    const response = await fetch(`/api/channels/categories?${params}`);

    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }

    const data = await response.json();
    const categories = data.categories || [];

    return categories.map(
      (cat: ChannelCategory & { channels?: Channel[] }) => ({
        ...cat,
        state: this.getCategoryState(cat.id),
        channels: cat.channels || [],
        channelCount: cat.channels?.length || 0,
      }),
    );
  }

  /**
   * Update a category
   */
  async updateCategory(
    categoryId: string,
    input: UpdateCategoryInput,
  ): Promise<ChannelCategory> {
    const response = await fetch(`/api/channels/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update category");
    }

    const data = await response.json();
    return data.category;
  }

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string): Promise<void> {
    const response = await fetch(`/api/channels/categories/${categoryId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete category");
    }

    // Clean up local state
    this.categoryStates.delete(categoryId);
    this.saveCategoryStates();
  }

  // ===========================================================================
  // CATEGORY STATE MANAGEMENT (Collapsed/Expanded)
  // ===========================================================================

  /**
   * Get the current state of a category
   */
  getCategoryState(categoryId: string): CategoryState {
    return (
      this.categoryStates.get(categoryId) || {
        isCollapsed: false,
        lastUpdated: new Date().toISOString(),
      }
    );
  }

  /**
   * Toggle category collapsed state
   */
  toggleCollapsed(categoryId: string): CategoryState {
    const currentState = this.getCategoryState(categoryId);
    const newState: CategoryState = {
      isCollapsed: !currentState.isCollapsed,
      lastUpdated: new Date().toISOString(),
    };

    this.categoryStates.set(categoryId, newState);
    this.saveCategoryStates();

    return newState;
  }

  /**
   * Set category collapsed state
   */
  setCollapsed(categoryId: string, isCollapsed: boolean): CategoryState {
    const newState: CategoryState = {
      isCollapsed,
      lastUpdated: new Date().toISOString(),
    };

    this.categoryStates.set(categoryId, newState);
    this.saveCategoryStates();

    return newState;
  }

  /**
   * Collapse all categories
   */
  collapseAll(): void {
    const now = new Date().toISOString();
    this.categoryStates.forEach((state, id) => {
      this.categoryStates.set(id, { isCollapsed: true, lastUpdated: now });
    });
    this.saveCategoryStates();
  }

  /**
   * Expand all categories
   */
  expandAll(): void {
    const now = new Date().toISOString();
    this.categoryStates.forEach((state, id) => {
      this.categoryStates.set(id, { isCollapsed: false, lastUpdated: now });
    });
    this.saveCategoryStates();
  }

  // ===========================================================================
  // REORDERING OPERATIONS
  // ===========================================================================

  /**
   * Reorder categories by providing new positions
   */
  async reorderCategories(categoryIds: string[]): Promise<ReorderResult> {
    const positions = categoryIds.map((id, index) => ({
      id,
      position: index,
    }));

    const response = await fetch("/api/channels/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positions }),
    });

    if (!response.ok) {
      throw new Error("Failed to reorder categories");
    }

    return {
      success: true,
      positions,
    };
  }

  /**
   * Move a channel to a different category
   */
  async moveChannel(
    channelId: string,
    toCategoryId: string | null,
    position: number,
  ): Promise<MoveChannelResult> {
    const response = await fetch("/api/channels/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "moveChannel",
        channelId,
        categoryId: toCategoryId,
        position,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to move channel");
    }

    const data = await response.json();

    return {
      success: true,
      channelId,
      fromCategoryId: data.fromCategoryId || null,
      toCategoryId,
      newPosition: position,
    };
  }

  /**
   * Reorder channels within a category
   */
  async reorderChannelsInCategory(
    categoryId: string | null,
    channelIds: string[],
  ): Promise<ReorderResult> {
    const positions = channelIds.map((id, index) => ({
      id,
      position: index,
    }));

    const response = await fetch(
      `/api/channels/${categoryId || "uncategorized"}/reorder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to reorder channels");
    }

    return {
      success: true,
      positions,
    };
  }

  // ===========================================================================
  // PERMISSION INHERITANCE
  // ===========================================================================

  /**
   * Get effective permissions for a channel considering category inheritance
   */
  async getChannelEffectivePermissions(
    channelId: string,
    userId: string,
  ): Promise<CategoryPermissionInheritance> {
    const response = await fetch(
      `/api/channels/${channelId}/permissions?userId=${userId}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch channel permissions");
    }

    const data = await response.json();

    return {
      categoryId: data.categoryId || "",
      inheritFromCategory: data.inheritFromCategory ?? true,
      overrides: data.overrides || [],
      effectivePermissions: BigInt(data.effectivePermissions || "0"),
    };
  }

  /**
   * Sync channel permissions with category
   */
  async syncChannelPermissionsWithCategory(channelId: string): Promise<void> {
    const response = await fetch(
      `/api/channels/${channelId}/permissions/sync`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to sync channel permissions");
    }
  }

  /**
   * Set category default permissions
   */
  async setCategoryDefaultPermissions(
    categoryId: string,
    permissions: bigint,
  ): Promise<void> {
    const response = await fetch(`/api/channels/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultPermissions: permissions.toString(),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to set category permissions");
    }
  }

  // ===========================================================================
  // HIERARCHY SNAPSHOT
  // ===========================================================================

  /**
   * Get a complete snapshot of the channel hierarchy
   */
  async getHierarchySnapshot(): Promise<HierarchySnapshot> {
    const categories = await this.getCategories(true);

    // Get uncategorized channels
    const params = new URLSearchParams({
      workspaceId: this.workspaceId,
      categoryId: "null",
    });

    const response = await fetch(`/api/channels?${params}`);
    const data = response.ok ? await response.json() : { channels: [] };

    const uncategorizedChannels = data.channels || [];
    const totalChannels =
      categories.reduce((sum, cat) => sum + cat.channelCount, 0) +
      uncategorizedChannels.length;

    return {
      categories,
      uncategorizedChannels,
      totalChannels,
      timestamp: new Date().toISOString(),
    };
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private loadCategoryStates(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(
        `${this.STORAGE_KEY_PREFIX}${this.workspaceId}`,
      );
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, CategoryState>;
        this.categoryStates = new Map(Object.entries(parsed));
      }
    } catch {
      // Ignore parse errors
    }
  }

  private saveCategoryStates(): void {
    if (typeof window === "undefined") return;

    try {
      const obj = Object.fromEntries(this.categoryStates);
      localStorage.setItem(
        `${this.STORAGE_KEY_PREFIX}${this.workspaceId}`,
        JSON.stringify(obj),
      );
    } catch {
      // Ignore storage errors
    }
  }
}

// =============================================================================
// SINGLETON FACTORY
// =============================================================================

const hierarchyServices = new Map<string, ChannelHierarchyService>();

export function getChannelHierarchyService(
  workspaceId: string,
): ChannelHierarchyService {
  if (!hierarchyServices.has(workspaceId)) {
    hierarchyServices.set(
      workspaceId,
      new ChannelHierarchyService(workspaceId),
    );
  }
  return hierarchyServices.get(workspaceId)!;
}

export function createChannelHierarchyService(
  workspaceId: string,
): ChannelHierarchyService {
  return new ChannelHierarchyService(workspaceId);
}
