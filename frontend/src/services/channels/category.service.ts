/**
 * Category Service - Handles category CRUD, ordering, and permission sync
 * Phase 6: Task 61
 */

import type {
  ChannelCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/types/advanced-channels";

const DEFAULT_WORKSPACE_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";

export class CategoryService {
  private workspaceId: string;

  constructor(workspaceId: string = DEFAULT_WORKSPACE_ID) {
    this.workspaceId = workspaceId;
  }

  async createCategory(input: CreateCategoryInput): Promise<ChannelCategory> {
    const response = await fetch("/api/channels/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        workspaceId: input.workspaceId || this.workspaceId,
      }),
    });
    if (!response.ok) throw new Error("Failed to create category");
    return response.json();
  }

  async getCategories(includeChannels = false): Promise<ChannelCategory[]> {
    const params = new URLSearchParams({
      workspaceId: this.workspaceId,
      includeChannels: includeChannels.toString(),
    });
    const response = await fetch(`/api/channels/categories?${params}`);
    if (!response.ok) throw new Error("Failed to fetch categories");
    return response.json();
  }

  async updateCategory(
    categoryId: string,
    input: UpdateCategoryInput,
  ): Promise<ChannelCategory> {
    const response = await fetch(`/api/channels/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Failed to update category");
    return response.json();
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const response = await fetch(`/api/channels/categories/${categoryId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete category");
  }

  async reorderCategories(categoryIds: string[]): Promise<void> {
    const response = await fetch("/api/channels/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: this.workspaceId, categoryIds }),
    });
    if (!response.ok) throw new Error("Failed to reorder categories");
  }

  async getCategory(categoryId: string): Promise<ChannelCategory | null> {
    const response = await fetch(`/api/channels/categories/${categoryId}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Failed to fetch category");
    return response.json();
  }

  async moveChannel(input: {
    channelId: string;
    categoryId: string;
    position: number;
  }): Promise<void> {
    const response = await fetch("/api/channels/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, workspaceId: this.workspaceId }),
    });
    if (!response.ok) throw new Error("Failed to move channel");
  }
}

export const categoryService = new CategoryService();
