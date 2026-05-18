/**
 * Draft Messages Manager
 *
 * Production-ready draft message system with auto-save, multi-draft support,
 * and localStorage persistence.
 */

import { logger } from "@/lib/logger";
import { debounce } from "@/lib/utils";

export interface DraftMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  replyToId?: string;
  threadId?: string;
  attachments?: unknown[];
  mentions?: unknown[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface DraftConfig {
  autoSaveDelay: number; // Debounce delay for auto-save (ms)
  maxDraftsPerChannel: number; // Maximum drafts per channel
  maxDraftAge: number; // Maximum age of drafts before cleanup (ms)
}

export interface DraftCallbacks {
  onDraftSaved?: (draft: DraftMessage) => void;
  onDraftDeleted?: (draftId: string) => void;
  onDraftRestored?: (draft: DraftMessage) => void;
}

const DEFAULT_CONFIG: DraftConfig = {
  autoSaveDelay: 1000, // 1 second
  maxDraftsPerChannel: 5,
  maxDraftAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Draft Messages Manager
 *
 * Manages draft messages with auto-save and persistence
 */
export class DraftManager {
  private config: DraftConfig;
  private drafts: Map<string, DraftMessage> = new Map();
  private callbacks: DraftCallbacks;
  private autoSaveFunctions: Map<string, ReturnType<typeof debounce>> =
    new Map();

  constructor(
    config: Partial<DraftConfig> = {},
    callbacks: DraftCallbacks = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
    this.loadFromStorage();
  }

  /**
   * Save a draft (with auto-save support)
   */
  saveDraft(
    draft: Omit<DraftMessage, "id" | "createdAt" | "updatedAt">,
    autoSave = false,
  ): DraftMessage {
    const draftKey = this.getDraftKey(
      draft.channelId,
      draft.userId,
      draft.replyToId,
      draft.threadId,
    );

    // Get or create auto-save function for this draft key
    if (autoSave) {
      let autoSaveFunc = this.autoSaveFunctions.get(draftKey);
      if (!autoSaveFunc) {
        autoSaveFunc = debounce((d: DraftMessage) => {
          this.performSave(d);
        }, this.config.autoSaveDelay);
        this.autoSaveFunctions.set(draftKey, autoSaveFunc);
      }

      const existingDraft = this.drafts.get(draftKey);
      const draftToSave: DraftMessage = existingDraft
        ? { ...existingDraft, ...draft, updatedAt: Date.now() }
        : {
            ...draft,
            id: draftKey,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

      // Call debounced save
      autoSaveFunc(draftToSave);

      // Return immediately without saving yet
      return draftToSave;
    }

    // Immediate save
    const existingDraft = this.drafts.get(draftKey);
    const draftToSave: DraftMessage = existingDraft
      ? { ...existingDraft, ...draft, updatedAt: Date.now() }
      : {
          ...draft,
          id: draftKey,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

    return this.performSave(draftToSave);
  }

  /**
   * Perform the actual save operation
   */
  private performSave(draft: DraftMessage): DraftMessage {
    // Validate content
    if (!draft.content || draft.content.trim().length === 0) {
      // Don't save empty drafts
      if (this.drafts.has(draft.id)) {
        this.deleteDraft(draft.id);
      }
      return draft;
    }

    // Enforce max drafts per channel
    const channelDrafts = this.getChannelDrafts(draft.channelId, draft.userId);
    if (
      channelDrafts.length >= this.config.maxDraftsPerChannel &&
      !this.drafts.has(draft.id)
    ) {
      // Remove oldest draft
      const oldest = channelDrafts.sort((a, b) => a.updatedAt - b.updatedAt)[0];
      if (oldest) {
        this.deleteDraft(oldest.id);
      }
    }

    this.drafts.set(draft.id, draft);
    this.saveToStorage();

    logger.debug("Draft saved", {
      id: draft.id,
      channelId: draft.channelId,
      contentLength: draft.content.length,
    });

    this.callbacks.onDraftSaved?.(draft);

    return draft;
  }

  /**
   * Get a draft
   */
  getDraft(
    channelId: string,
    userId: string,
    replyToId?: string,
    threadId?: string,
  ): DraftMessage | undefined {
    const draftKey = this.getDraftKey(channelId, userId, replyToId, threadId);
    return this.drafts.get(draftKey);
  }

  /**
   * Get all drafts for a channel
   */
  getChannelDrafts(channelId: string, userId: string): DraftMessage[] {
    return Array.from(this.drafts.values()).filter(
      (draft) => draft.channelId === channelId && draft.userId === userId,
    );
  }

  /**
   * Get all drafts for a user
   */
  getUserDrafts(userId: string): DraftMessage[] {
    return Array.from(this.drafts.values()).filter(
      (draft) => draft.userId === userId,
    );
  }

  /**
   * Get all drafts with channel info
   */
  getAllDraftsGrouped(userId: string): Map<string, DraftMessage[]> {
    const grouped = new Map<string, DraftMessage[]>();
    const userDrafts = this.getUserDrafts(userId);

    for (const draft of userDrafts) {
      const existing = grouped.get(draft.channelId) || [];
      grouped.set(draft.channelId, [...existing, draft]);
    }

    return grouped;
  }

  /**
   * Check if a draft exists
   */
  hasDraft(
    channelId: string,
    userId: string,
    replyToId?: string,
    threadId?: string,
  ): boolean {
    const draftKey = this.getDraftKey(channelId, userId, replyToId, threadId);
    const draft = this.drafts.get(draftKey);
    return !!draft && draft.content.trim().length > 0;
  }

  /**
   * Delete a draft
   */
  deleteDraft(draftId: string): void {
    const draft = this.drafts.get(draftId);
    if (draft) {
      this.drafts.delete(draftId);
      this.autoSaveFunctions.delete(draftId);
      this.saveToStorage();

      logger.debug("Draft deleted", { id: draftId });

      this.callbacks.onDraftDeleted?.(draftId);
    }
  }

  /**
   * Delete a draft by key
   */
  deleteDraftByKey(
    channelId: string,
    userId: string,
    replyToId?: string,
    threadId?: string,
  ): void {
    const draftKey = this.getDraftKey(channelId, userId, replyToId, threadId);
    this.deleteDraft(draftKey);
  }

  /**
   * Delete all drafts for a channel
   */
  deleteChannelDrafts(channelId: string, userId: string): number {
    const drafts = this.getChannelDrafts(channelId, userId);
    for (const draft of drafts) {
      this.deleteDraft(draft.id);
    }
    return drafts.length;
  }

  /**
   * Delete all drafts for a user
   */
  deleteUserDrafts(userId: string): number {
    const drafts = this.getUserDrafts(userId);
    for (const draft of drafts) {
      this.deleteDraft(draft.id);
    }
    return drafts.length;
  }

  /**
   * Clear old drafts
   */
  clearOldDrafts(): number {
    let cleared = 0;
    const now = Date.now();
    const maxAge = this.config.maxDraftAge;

    for (const [id, draft] of this.drafts.entries()) {
      if (now - draft.updatedAt > maxAge) {
        this.drafts.delete(id);
        this.autoSaveFunctions.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.saveToStorage();
      logger.info("Cleared old drafts", { count: cleared });
    }

    return cleared;
  }

  /**
   * Update draft content (triggers auto-save)
   */
  updateDraftContent(
    channelId: string,
    userId: string,
    content: string,
    options?: {
      replyToId?: string;
      threadId?: string;
      attachments?: unknown[];
      mentions?: unknown[];
    },
  ): DraftMessage {
    return this.saveDraft(
      {
        channelId,
        userId,
        content,
        replyToId: options?.replyToId,
        threadId: options?.threadId,
        attachments: options?.attachments,
        mentions: options?.mentions,
      },
      true, // Auto-save
    );
  }

  /**
   * Restore a draft (e.g., when switching back to a channel)
   */
  restoreDraft(
    channelId: string,
    userId: string,
    replyToId?: string,
    threadId?: string,
  ): DraftMessage | undefined {
    const draft = this.getDraft(channelId, userId, replyToId, threadId);
    if (draft) {
      logger.debug("Draft restored", { id: draft.id, channelId });
      this.callbacks.onDraftRestored?.(draft);
    }
    return draft;
  }

  /**
   * Get draft count for a channel
   */
  getChannelDraftCount(channelId: string, userId: string): number {
    return this.getChannelDrafts(channelId, userId).length;
  }

  /**
   * Get total draft count for a user
   */
  getTotalDraftCount(userId: string): number {
    return this.getUserDrafts(userId).length;
  }

  /**
   * Generate a unique draft key
   */
  private getDraftKey(
    channelId: string,
    userId: string,
    replyToId?: string,
    threadId?: string,
  ): string {
    const parts = [channelId, userId];
    if (threadId) parts.push("thread", threadId);
    if (replyToId) parts.push("reply", replyToId);
    return `draft_${parts.join("_")}`;
  }

  /**
   * Save drafts to localStorage
   */
  private saveToStorage(): void {
    try {
      if (typeof window === "undefined") return;

      const data = Array.from(this.drafts.entries());
      localStorage.setItem("nchat_draft_messages", JSON.stringify(data));
    } catch (error) {
      logger.error("Failed to save drafts to storage", error as Error);
    }
  }

  /**
   * Load drafts from localStorage
   */
  private loadFromStorage(): void {
    try {
      if (typeof window === "undefined") return;

      const data = localStorage.getItem("nchat_draft_messages");
      if (data) {
        const entries: [string, DraftMessage][] = JSON.parse(data);
        this.drafts = new Map(entries);

        logger.info("Loaded drafts from storage", {
          count: this.drafts.size,
        });

        // Clean up old drafts
        this.clearOldDrafts();
      }
    } catch (error) {
      logger.error("Failed to load drafts from storage", error as Error);
      this.drafts = new Map();
    }
  }
}

/**
 * Create a singleton draft manager instance
 */
let draftManagerInstance: DraftManager | null = null;

export function getDraftManager(
  config?: Partial<DraftConfig>,
  callbacks?: DraftCallbacks,
): DraftManager {
  if (!draftManagerInstance) {
    draftManagerInstance = new DraftManager(config, callbacks);
  }
  return draftManagerInstance;
}

/**
 * Destroy the draft manager instance
 */
export function destroyDraftManager(): void {
  draftManagerInstance = null;
}
