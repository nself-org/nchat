/**
 * Archive Service
 *
 * Manages archive states for channels and threads including:
 * - Archive/unarchive operations
 * - Reason tracking
 * - Read-only mode enforcement
 * - Visibility settings
 * - Permission integration
 *
 * Phase 6: Task 35 - Complete channel/category/thread/forum behavior
 */

import type { UserRole } from "@/types/user";

// =============================================================================
// TYPES
// =============================================================================

export type ArchiveEntityType = "channel" | "thread" | "post";

export interface ArchiveState {
  isArchived: boolean;
  archivedAt: string | null;
  archivedBy: string | null;
  archiveReason: string | null;
  autoArchived: boolean;
  expiresAt: string | null;
}

export interface ArchiveOptions {
  reason?: string;
  expiresAt?: string;
  autoArchive?: boolean;
}

export interface ArchiveHistoryEntry {
  id: string;
  entityId: string;
  entityType: ArchiveEntityType;
  action: "archive" | "unarchive";
  userId: string;
  reason: string | null;
  autoArchived: boolean;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface ArchiveSettings {
  showArchivedChannels: boolean;
  showArchivedThreads: boolean;
  archiveNotificationEnabled: boolean;
  defaultAutoArchiveDays: number;
}

export interface ArchivableEntity {
  id: string;
  type: ArchiveEntityType;
  name: string;
  isArchived: boolean;
  archivedAt: string | null;
  archiveReason: string | null;
}

export interface ArchivePermissionContext {
  userId: string;
  userRole: UserRole;
  entityType: ArchiveEntityType;
  entityId: string;
  isOwner: boolean;
  isModerator: boolean;
}

export interface BulkArchiveResult {
  success: boolean;
  archived: string[];
  failed: Array<{ id: string; error: string }>;
}

// =============================================================================
// ARCHIVE SERVICE
// =============================================================================

export class ArchiveService {
  private userId: string;
  private userRole: UserRole;
  private settings: ArchiveSettings;

  constructor(userId: string, userRole: UserRole) {
    this.userId = userId;
    this.userRole = userRole;
    this.settings = this.loadSettings();
  }

  // ===========================================================================
  // ARCHIVE OPERATIONS
  // ===========================================================================

  /**
   * Archive a channel
   */
  async archiveChannel(
    channelId: string,
    options: ArchiveOptions = {},
  ): Promise<ArchiveState> {
    await this.checkArchivePermission("channel", channelId);

    const response = await fetch(`/api/channels/${channelId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: this.userId,
        reason: options.reason,
        expiresAt: options.expiresAt,
        autoArchive: options.autoArchive || false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to archive channel");
    }

    const data = await response.json();
    return this.extractArchiveState(data.channel);
  }

  /**
   * Unarchive a channel
   */
  async unarchiveChannel(channelId: string): Promise<ArchiveState> {
    await this.checkArchivePermission("channel", channelId);

    const response = await fetch(`/api/channels/${channelId}/archive`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to unarchive channel");
    }

    const data = await response.json();
    return this.extractArchiveState(data.channel);
  }

  /**
   * Archive a thread
   */
  async archiveThread(
    threadId: string,
    options: ArchiveOptions = {},
  ): Promise<ArchiveState> {
    await this.checkArchivePermission("thread", threadId);

    const response = await fetch(`/api/threads/${threadId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: this.userId,
        reason: options.reason,
        autoArchive: options.autoArchive || false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to archive thread");
    }

    const data = await response.json();
    return this.extractArchiveState(data.thread);
  }

  /**
   * Unarchive a thread
   */
  async unarchiveThread(threadId: string): Promise<ArchiveState> {
    await this.checkArchivePermission("thread", threadId);

    const response = await fetch(`/api/threads/${threadId}/archive`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to unarchive thread");
    }

    const data = await response.json();
    return this.extractArchiveState(data.thread);
  }

  /**
   * Archive a forum post
   */
  async archivePost(
    postId: string,
    options: ArchiveOptions = {},
  ): Promise<ArchiveState> {
    await this.checkArchivePermission("post", postId);

    const response = await fetch(
      `/api/channels/forums/posts/${postId}/archive`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.userId,
          reason: options.reason,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to archive post");
    }

    const data = await response.json();
    return this.extractArchiveState(data.post);
  }

  /**
   * Unarchive a forum post
   */
  async unarchivePost(postId: string): Promise<ArchiveState> {
    await this.checkArchivePermission("post", postId);

    const response = await fetch(
      `/api/channels/forums/posts/${postId}/archive`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: this.userId }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to unarchive post");
    }

    const data = await response.json();
    return this.extractArchiveState(data.post);
  }

  // ===========================================================================
  // BULK OPERATIONS
  // ===========================================================================

  /**
   * Archive multiple channels at once
   */
  async bulkArchiveChannels(
    channelIds: string[],
    options: ArchiveOptions = {},
  ): Promise<BulkArchiveResult> {
    const archived: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const channelId of channelIds) {
      try {
        await this.archiveChannel(channelId, options);
        archived.push(channelId);
      } catch (error) {
        failed.push({
          id: channelId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      success: failed.length === 0,
      archived,
      failed,
    };
  }

  /**
   * Unarchive multiple channels at once
   */
  async bulkUnarchiveChannels(
    channelIds: string[],
  ): Promise<BulkArchiveResult> {
    const archived: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const channelId of channelIds) {
      try {
        await this.unarchiveChannel(channelId);
        archived.push(channelId);
      } catch (error) {
        failed.push({
          id: channelId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      success: failed.length === 0,
      archived,
      failed,
    };
  }

  // ===========================================================================
  // ARCHIVE HISTORY
  // ===========================================================================

  /**
   * Get archive history for an entity
   */
  async getArchiveHistory(
    entityType: ArchiveEntityType,
    entityId: string,
  ): Promise<ArchiveHistoryEntry[]> {
    const response = await fetch(
      `/api/archive/history?entityType=${entityType}&entityId=${entityId}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch archive history");
    }

    const data = await response.json();
    return data.history || [];
  }

  /**
   * Get recent archive activity in workspace
   */
  async getRecentArchiveActivity(
    workspaceId: string,
    limit = 50,
  ): Promise<ArchiveHistoryEntry[]> {
    const response = await fetch(
      `/api/archive/activity?workspaceId=${workspaceId}&limit=${limit}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch archive activity");
    }

    const data = await response.json();
    return data.activity || [];
  }

  // ===========================================================================
  // ARCHIVE LISTINGS
  // ===========================================================================

  /**
   * Get all archived channels in a workspace
   */
  async getArchivedChannels(
    workspaceId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ channels: ArchivableEntity[]; total: number }> {
    const params = new URLSearchParams({
      workspaceId,
      isArchived: "true",
    });
    if (options.limit) params.set("limit", options.limit.toString());
    if (options.offset) params.set("offset", options.offset.toString());

    const response = await fetch(`/api/channels?${params}`);

    if (!response.ok) {
      throw new Error("Failed to fetch archived channels");
    }

    const data = await response.json();
    return {
      channels: (data.channels || []).map((ch: Record<string, unknown>) => ({
        id: ch.id as string,
        type: "channel" as const,
        name: ch.name as string,
        isArchived: true,
        archivedAt: ch.archivedAt as string | null,
        archiveReason: ch.archiveReason as string | null,
      })),
      total: data.total || 0,
    };
  }

  /**
   * Get all archived threads in a channel
   */
  async getArchivedThreads(
    channelId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ threads: ArchivableEntity[]; total: number }> {
    const params = new URLSearchParams({
      channelId,
      includeArchived: "true",
      archivedOnly: "true",
    });
    if (options.limit) params.set("limit", options.limit.toString());
    if (options.offset) params.set("offset", options.offset.toString());

    const response = await fetch(`/api/threads?${params}`);

    if (!response.ok) {
      throw new Error("Failed to fetch archived threads");
    }

    const data = await response.json();
    return {
      threads: (data.threads || []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        type: "thread" as const,
        name:
          ((t.parentMessage as Record<string, unknown>)?.content as string) ||
          "Thread",
        isArchived: true,
        archivedAt: t.archivedAt as string | null,
        archiveReason: t.archiveReason as string | null,
      })),
      total: data.total || 0,
    };
  }

  // ===========================================================================
  // SETTINGS
  // ===========================================================================

  /**
   * Get current archive settings
   */
  getSettings(): ArchiveSettings {
    return { ...this.settings };
  }

  /**
   * Update archive settings
   */
  updateSettings(updates: Partial<ArchiveSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
  }

  /**
   * Toggle showing archived channels
   */
  toggleShowArchivedChannels(): boolean {
    this.settings.showArchivedChannels = !this.settings.showArchivedChannels;
    this.saveSettings();
    return this.settings.showArchivedChannels;
  }

  /**
   * Toggle showing archived threads
   */
  toggleShowArchivedThreads(): boolean {
    this.settings.showArchivedThreads = !this.settings.showArchivedThreads;
    this.saveSettings();
    return this.settings.showArchivedThreads;
  }

  // ===========================================================================
  // PERMISSION CHECKS
  // ===========================================================================

  /**
   * Check if user can archive an entity
   */
  async canArchive(
    entityType: ArchiveEntityType,
    entityId: string,
  ): Promise<boolean> {
    try {
      await this.checkArchivePermission(entityType, entityId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if user can unarchive an entity
   */
  async canUnarchive(
    entityType: ArchiveEntityType,
    entityId: string,
  ): Promise<boolean> {
    return this.canArchive(entityType, entityId);
  }

  // ===========================================================================
  // AUTO-ARCHIVE
  // ===========================================================================

  /**
   * Set up auto-archive for a thread
   */
  async setAutoArchive(
    threadId: string,
    durationMinutes: number,
  ): Promise<void> {
    const response = await fetch(`/api/threads/${threadId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autoArchiveMinutes: durationMinutes,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to set auto-archive");
    }
  }

  /**
   * Disable auto-archive for a thread
   */
  async disableAutoArchive(threadId: string): Promise<void> {
    return this.setAutoArchive(threadId, 0);
  }

  /**
   * Get auto-archive duration options
   */
  getAutoArchiveOptions(): Array<{ label: string; value: number }> {
    return [
      { label: "Never", value: 0 },
      { label: "1 hour", value: 60 },
      { label: "24 hours", value: 1440 },
      { label: "3 days", value: 4320 },
      { label: "1 week", value: 10080 },
    ];
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async checkArchivePermission(
    entityType: ArchiveEntityType,
    entityId: string,
  ): Promise<void> {
    // Owners and admins can always archive
    if (this.userRole === "owner" || this.userRole === "admin") {
      return;
    }

    // Moderators can archive threads and posts
    if (this.userRole === "moderator") {
      if (entityType === "thread" || entityType === "post") {
        return;
      }
      throw new Error("Moderators cannot archive channels");
    }

    // Regular members need specific permissions
    const response = await fetch(
      `/api/${entityType === "channel" ? "channels" : entityType === "thread" ? "threads" : "channels/forums/posts"}/${entityId}/permissions?userId=${this.userId}`,
    );

    if (!response.ok) {
      throw new Error("Failed to check archive permission");
    }

    const data = await response.json();
    if (!data.canArchive) {
      throw new Error("Insufficient permissions to archive");
    }
  }

  private extractArchiveState(entity: Record<string, unknown>): ArchiveState {
    return {
      isArchived:
        (entity.isArchived as boolean) ||
        (entity.is_archived as boolean) ||
        false,
      archivedAt:
        (entity.archivedAt as string | null) ||
        (entity.archived_at as string | null) ||
        null,
      archivedBy:
        (entity.archivedBy as string | null) ||
        (entity.archived_by as string | null) ||
        null,
      archiveReason:
        (entity.archiveReason as string | null) ||
        (entity.archive_reason as string | null) ||
        null,
      autoArchived:
        (entity.autoArchived as boolean) ||
        (entity.auto_archived as boolean) ||
        false,
      expiresAt:
        (entity.archiveExpiresAt as string | null) ||
        (entity.archive_expires_at as string | null) ||
        null,
    };
  }

  private loadSettings(): ArchiveSettings {
    if (typeof window === "undefined") {
      return this.getDefaultSettings();
    }

    try {
      const stored = localStorage.getItem(
        `nchat_archive_settings_${this.userId}`,
      );
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }

    return this.getDefaultSettings();
  }

  private saveSettings(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        `nchat_archive_settings_${this.userId}`,
        JSON.stringify(this.settings),
      );
    } catch {
      // Ignore storage errors
    }
  }

  private getDefaultSettings(): ArchiveSettings {
    return {
      showArchivedChannels: false,
      showArchivedThreads: false,
      archiveNotificationEnabled: true,
      defaultAutoArchiveDays: 7,
    };
  }
}

// =============================================================================
// SINGLETON FACTORY
// =============================================================================

const archiveServices = new Map<string, ArchiveService>();

export function getArchiveService(
  userId: string,
  userRole: UserRole,
): ArchiveService {
  const key = `${userId}_${userRole}`;
  if (!archiveServices.has(key)) {
    archiveServices.set(key, new ArchiveService(userId, userRole));
  }
  return archiveServices.get(key)!;
}

export function createArchiveService(
  userId: string,
  userRole: UserRole,
): ArchiveService {
  return new ArchiveService(userId, userRole);
}
