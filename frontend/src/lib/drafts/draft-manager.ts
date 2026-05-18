/**
 * Draft Manager - Central management for all draft operations
 *
 * Coordinates storage, auto-save, and sync functionality
 */

import { v4 as uuidv4 } from "uuid";
import type {
  Draft,
  DraftContextType,
  DraftMetadata,
  DraftAttachment,
  DraftMention,
  DraftReplyPreview,
  DraftFilterOptions,
  DraftSortOptions,
  DraftEventListener,
  DraftEvent,
  CreateDraftInput,
  UpdateDraftInput,
  AutoSaveConfig,
  DraftSyncConfig,
} from "./draft-types";

import {
  createContextKey,
  parseContextKey,
  hasDraftContent,
  getDraftPreview,
} from "./draft-types";
import { DraftStorage, getDraftStorage } from "./draft-storage";
import { DraftAutoSaveManager, getAutoSaveManager } from "./draft-autosave";
import { DraftSyncManager, getSyncManager } from "./draft-sync";

import { logger } from "@/lib/logger";

// ============================================================================
// Draft Manager Class
// ============================================================================

/**
 * Central manager for draft operations
 */
export class DraftManager {
  private storage: DraftStorage;
  private autoSave: DraftAutoSaveManager;
  private sync: DraftSyncManager;
  private listeners: Set<DraftEventListener>;
  private contextNameResolver:
    | ((type: DraftContextType, id: string) => string)
    | null;

  constructor(
    storage?: DraftStorage,
    autoSave?: DraftAutoSaveManager,
    sync?: DraftSyncManager,
  ) {
    this.storage = storage || getDraftStorage();
    this.autoSave = autoSave || getAutoSaveManager();
    this.sync = sync || getSyncManager();
    this.listeners = new Set();
    this.contextNameResolver = null;

    // Start auto-save
    this.autoSave.start();
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Configure auto-save behavior
   */
  configureAutoSave(config: Partial<AutoSaveConfig>): void {
    this.autoSave.updateConfig(config);
  }

  /**
   * Configure sync behavior
   */
  configureSync(config: Partial<DraftSyncConfig>): void {
    this.sync.configure(config);
  }

  /**
   * Set context name resolver for draft metadata
   */
  setContextNameResolver(
    resolver: (type: DraftContextType, id: string) => string,
  ): void {
    this.contextNameResolver = resolver;
  }

  /**
   * Set user ID for sync
   */
  setUserId(userId: string | null): void {
    this.sync.setUserId(userId);
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Add event listener
   */
  addEventListener(listener: DraftEventListener): () => void {
    this.listeners.add(listener);

    // Also subscribe to auto-save and sync events
    const autoSaveUnsub = this.autoSave.addEventListener(listener);
    const syncUnsub = this.sync.addEventListener(listener);

    return () => {
      this.listeners.delete(listener);
      autoSaveUnsub();
      syncUnsub();
    };
  }

  private emit(event: DraftEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        logger.error("Error in draft event listener:", err);
      }
    });
  }

  // ============================================================================
  // Draft CRUD Operations
  // ============================================================================

  /**
   * Create a new draft
   */
  async create(input: CreateDraftInput): Promise<Draft> {
    const now = Date.now();
    const draft: Draft = {
      id: uuidv4(),
      ...input,
      createdAt: now,
      lastModified: now,
      version: 1,
      syncStatus: "pending",
    };

    await this.storage.set(draft.contextKey, draft);
    this.sync.markForSync(draft.contextKey, draft);

    this.emit({
      type: "created",
      contextKey: draft.contextKey,
      draft,
      timestamp: now,
    });

    return draft;
  }

  /**
   * Get a draft by context key
   */
  async get(contextKey: string): Promise<Draft | null> {
    return await this.storage.get(contextKey);
  }

  /**
   * Get a draft by context type and ID
   */
  async getByContext(
    type: DraftContextType,
    id: string,
  ): Promise<Draft | null> {
    return await this.get(createContextKey(type, id));
  }

  /**
   * Update an existing draft
   */
  async update(
    contextKey: string,
    updates: UpdateDraftInput,
  ): Promise<Draft | null> {
    const existing = await this.storage.get(contextKey);
    if (!existing) return null;

    const now = Date.now();
    const updated: Draft = {
      ...existing,
      ...updates,
      lastModified: now,
      version: existing.version + 1,
      syncStatus: "pending",
    };

    await this.storage.set(contextKey, updated);
    this.sync.markForSync(contextKey, updated);

    this.emit({
      type: "updated",
      contextKey,
      draft: updated,
      timestamp: now,
    });

    return updated;
  }

  /**
   * Save or update a draft (upsert)
   */
  async save(
    contextType: DraftContextType,
    contextId: string,
    content: string,
    options?: {
      contentHtml?: string;
      replyToMessageId?: string | null;
      replyToPreview?: DraftReplyPreview;
      attachments?: DraftAttachment[];
      mentions?: DraftMention[];
      selectionStart?: number;
      selectionEnd?: number;
    },
  ): Promise<Draft> {
    const contextKey = createContextKey(contextType, contextId);
    const existing = await this.storage.get(contextKey);

    const now = Date.now();
    const draft: Draft = existing
      ? {
          ...existing,
          content,
          contentHtml: options?.contentHtml ?? existing.contentHtml,
          replyToMessageId:
            options?.replyToMessageId ?? existing.replyToMessageId,
          replyToPreview: options?.replyToPreview ?? existing.replyToPreview,
          attachmentIds:
            options?.attachments?.map((a) => a.id) ?? existing.attachmentIds,
          attachments: options?.attachments ?? existing.attachments,
          mentions: options?.mentions ?? existing.mentions,
          selectionStart: options?.selectionStart ?? existing.selectionStart,
          selectionEnd: options?.selectionEnd ?? existing.selectionEnd,
          lastModified: now,
          version: existing.version + 1,
          syncStatus: "pending",
        }
      : {
          id: uuidv4(),
          contextKey,
          contextType,
          contextId,
          content,
          contentHtml: options?.contentHtml,
          replyToMessageId: options?.replyToMessageId ?? null,
          replyToPreview: options?.replyToPreview,
          attachmentIds: options?.attachments?.map((a) => a.id) ?? [],
          attachments: options?.attachments,
          mentions: options?.mentions ?? [],
          selectionStart: options?.selectionStart ?? content.length,
          selectionEnd: options?.selectionEnd ?? content.length,
          createdAt: now,
          lastModified: now,
          version: 1,
          syncStatus: "pending",
        };

    await this.storage.set(contextKey, draft);
    this.sync.markForSync(contextKey, draft);

    this.emit({
      type: existing ? "updated" : "created",
      contextKey,
      draft,
      timestamp: now,
    });

    return draft;
  }

  /**
   * Schedule draft for auto-save (debounced)
   */
  scheduleAutoSave(
    contextType: DraftContextType,
    contextId: string,
    content: string,
    options?: {
      contentHtml?: string;
      replyToMessageId?: string | null;
      replyToPreview?: DraftReplyPreview;
      attachments?: DraftAttachment[];
      mentions?: DraftMention[];
      selectionStart?: number;
      selectionEnd?: number;
    },
  ): void {
    const contextKey = createContextKey(contextType, contextId);
    const now = Date.now();

    const draft: Draft = {
      id: uuidv4(),
      contextKey,
      contextType,
      contextId,
      content,
      contentHtml: options?.contentHtml,
      replyToMessageId: options?.replyToMessageId ?? null,
      replyToPreview: options?.replyToPreview,
      attachmentIds: options?.attachments?.map((a) => a.id) ?? [],
      attachments: options?.attachments,
      mentions: options?.mentions ?? [],
      selectionStart: options?.selectionStart ?? content.length,
      selectionEnd: options?.selectionEnd ?? content.length,
      createdAt: now,
      lastModified: now,
      version: 1,
      syncStatus: "pending",
    };

    this.autoSave.schedule(contextKey, draft);
  }

  /**
   * Delete a draft
   */
  async delete(contextKey: string): Promise<boolean> {
    const existing = await this.storage.get(contextKey);
    if (!existing) return false;

    await this.storage.remove(contextKey);
    this.sync.markForDelete(contextKey);
    this.autoSave.cancelScheduled(contextKey);

    this.emit({
      type: "deleted",
      contextKey,
      draft: existing,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Delete draft by context
   */
  async deleteByContext(type: DraftContextType, id: string): Promise<boolean> {
    return await this.delete(createContextKey(type, id));
  }

  /**
   * Clear all drafts
   */
  async clearAll(): Promise<number> {
    const drafts = await this.storage.getAll();
    await this.storage.clear();
    this.autoSave.cancelAll();

    this.emit({
      type: "cleared",
      timestamp: Date.now(),
    });

    return drafts.length;
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Get all drafts
   */
  async getAll(): Promise<Draft[]> {
    return await this.storage.getAll();
  }

  /**
   * Get all drafts with content
   */
  async getAllWithContent(): Promise<Draft[]> {
    const drafts = await this.storage.getAll();
    return drafts.filter(hasDraftContent);
  }

  /**
   * Get draft count
   */
  async getCount(): Promise<number> {
    const drafts = await this.getAllWithContent();
    return drafts.length;
  }

  /**
   * Check if draft exists for context
   */
  async exists(contextKey: string): Promise<boolean> {
    const draft = await this.storage.get(contextKey);
    return hasDraftContent(draft);
  }

  /**
   * Check if context has draft
   */
  async hasDraft(type: DraftContextType, id: string): Promise<boolean> {
    return await this.exists(createContextKey(type, id));
  }

  /**
   * Filter drafts
   */
  async filter(options: DraftFilterOptions): Promise<Draft[]> {
    let drafts = await this.getAllWithContent();

    if (options.contextType) {
      drafts = drafts.filter((d) => d.contextType === options.contextType);
    }

    if (options.hasAttachments !== undefined) {
      drafts = drafts.filter((d) =>
        options.hasAttachments
          ? d.attachmentIds.length > 0 || (d.attachments?.length ?? 0) > 0
          : d.attachmentIds.length === 0 && (d.attachments?.length ?? 0) === 0,
      );
    }

    if (options.isReply !== undefined) {
      drafts = drafts.filter((d) =>
        options.isReply
          ? d.replyToMessageId !== null
          : d.replyToMessageId === null,
      );
    }

    if (options.modifiedAfter !== undefined) {
      drafts = drafts.filter((d) => d.lastModified > options.modifiedAfter!);
    }

    if (options.modifiedBefore !== undefined) {
      drafts = drafts.filter((d) => d.lastModified < options.modifiedBefore!);
    }

    if (options.searchTerm) {
      const term = options.searchTerm.toLowerCase();
      drafts = drafts.filter((d) => d.content.toLowerCase().includes(term));
    }

    return drafts;
  }

  /**
   * Sort drafts
   */
  sort(drafts: Draft[], options: DraftSortOptions): Draft[] {
    return [...drafts].sort((a, b) => {
      let comparison = 0;

      switch (options.field) {
        case "lastModified":
          comparison = a.lastModified - b.lastModified;
          break;
        case "createdAt":
          comparison = a.createdAt - b.createdAt;
          break;
        case "contextName":
          const nameA = this.getContextName(a);
          const nameB = this.getContextName(b);
          comparison = nameA.localeCompare(nameB);
          break;
      }

      return options.direction === "desc" ? -comparison : comparison;
    });
  }

  /**
   * Get draft metadata for listing
   */
  async getDraftMetadata(): Promise<DraftMetadata[]> {
    const drafts = await this.getAllWithContent();

    return drafts.map((draft) => ({
      contextKey: draft.contextKey,
      contextType: draft.contextType,
      contextId: draft.contextId,
      contextName: this.getContextName(draft),
      contentPreview: getDraftPreview(draft),
      hasAttachments:
        draft.attachmentIds.length > 0 || (draft.attachments?.length ?? 0) > 0,
      attachmentCount:
        draft.attachmentIds.length || draft.attachments?.length || 0,
      lastModified: draft.lastModified,
      isReply: draft.replyToMessageId !== null,
    }));
  }

  private getContextName(draft: Draft): string {
    if (this.contextNameResolver) {
      return this.contextNameResolver(draft.contextType, draft.contextId);
    }

    // Default naming
    switch (draft.contextType) {
      case "channel":
        return `#${draft.contextId}`;
      case "thread":
        return `Thread: ${draft.contextId.slice(0, 8)}`;
      case "dm":
        return `DM: ${draft.contextId.slice(0, 8)}`;
      default:
        return draft.contextId;
    }
  }

  // ============================================================================
  // Draft Restoration
  // ============================================================================

  /**
   * Restore draft to composer
   * Returns draft and clears it from storage
   */
  async restore(contextKey: string): Promise<Draft | null> {
    const draft = await this.storage.get(contextKey);
    if (!draft) return null;

    this.emit({
      type: "restored",
      contextKey,
      draft,
      timestamp: Date.now(),
    });

    return draft;
  }

  /**
   * Restore by context
   */
  async restoreByContext(
    type: DraftContextType,
    id: string,
  ): Promise<Draft | null> {
    return await this.restore(createContextKey(type, id));
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Trigger sync manually
   */
  async triggerSync(): Promise<void> {
    await this.sync.sync();
  }

  /**
   * Start sync timer
   */
  startSync(): void {
    this.sync.start();
  }

  /**
   * Stop sync timer
   */
  stopSync(): void {
    this.sync.stop();
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Cleanup old drafts
   */
  async cleanup(): Promise<number> {
    const removedCount = await this.storage.cleanup();

    if (removedCount > 0) {
      this.emit({
        type: "cleared",
        timestamp: Date.now(),
      });
    }

    return removedCount;
  }

  /**
   * Destroy manager and cleanup resources
   */
  destroy(): void {
    this.autoSave.destroy();
    this.sync.destroy();
    this.listeners.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let draftManagerInstance: DraftManager | null = null;

/**
 * Get the singleton draft manager instance
 */
export function getDraftManager(): DraftManager {
  if (!draftManagerInstance) {
    draftManagerInstance = new DraftManager();
  }
  return draftManagerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetDraftManager(): void {
  if (draftManagerInstance) {
    draftManagerInstance.destroy();
    draftManagerInstance = null;
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export {
  createContextKey,
  parseContextKey,
  hasDraftContent,
  getDraftPreview,
  getChannelDraftKey,
  getThreadDraftKey,
  getDMDraftKey,
} from "./draft-types";
