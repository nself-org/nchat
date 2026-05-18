"use client";

/**
 * useDraft Hook - Get and manage a draft for a specific context
 *
 * Provides draft content, auto-save, and management for a single context
 */

import { useCallback, useEffect, useMemo } from "react";
import { useDraftsStore } from "@/stores/drafts-store";
import type {
  Draft,
  DraftContextType,
  DraftAttachment,
  DraftMention,
  DraftReplyPreview,
} from "@/lib/drafts/draft-types";
import {
  createContextKey,
  hasDraftContent,
  getDraftPreview,
} from "@/lib/drafts";

// ============================================================================
// Types
// ============================================================================

export interface UseDraftOptions {
  /** Context type (channel, thread, dm) */
  contextType: DraftContextType;
  /** Context ID (channel ID, thread ID, etc.) */
  contextId: string;
  /** Auto-save debounce in ms (default: 500) */
  autoSaveDebounce?: number;
  /** Disable auto-save */
  disableAutoSave?: boolean;
}

export interface UseDraftReturn {
  /** The draft object if it exists */
  draft: Draft | undefined;
  /** Whether the draft has meaningful content */
  hasDraft: boolean;
  /** Draft content (plain text) */
  content: string;
  /** Draft content preview (truncated) */
  contentPreview: string;
  /** Draft HTML content */
  contentHtml: string | undefined;
  /** Whether draft is a reply */
  isReply: boolean;
  /** Reply preview info */
  replyTo: DraftReplyPreview | undefined;
  /** Attachments */
  attachments: DraftAttachment[];
  /** Mentions */
  mentions: DraftMention[];
  /** Context key */
  contextKey: string;

  /** Save draft immediately */
  save: (
    content: string,
    options?: {
      contentHtml?: string;
      replyToMessageId?: string | null;
      replyToPreview?: DraftReplyPreview;
      attachments?: DraftAttachment[];
      mentions?: DraftMention[];
    },
  ) => Promise<Draft>;

  /** Schedule auto-save (debounced) */
  autoSave: (
    content: string,
    options?: {
      contentHtml?: string;
      replyToMessageId?: string | null;
      replyToPreview?: DraftReplyPreview;
      attachments?: DraftAttachment[];
      mentions?: DraftMention[];
    },
  ) => void;

  /** Update draft content */
  updateContent: (content: string, contentHtml?: string) => void;

  /** Set reply */
  setReply: (messageId: string, preview: DraftReplyPreview) => void;

  /** Clear reply */
  clearReply: () => void;

  /** Add attachment */
  addAttachment: (attachment: DraftAttachment) => void;

  /** Remove attachment */
  removeAttachment: (attachmentId: string) => void;

  /** Clear all attachments */
  clearAttachments: () => void;

  /** Add mention */
  addMention: (mention: DraftMention) => void;

  /** Delete the draft */
  deleteDraft: () => Promise<boolean>;

  /** Restore draft to composer */
  restore: () => Promise<Draft | null>;

  /** Clear draft (alias for delete) */
  clear: () => Promise<boolean>;
}

// ============================================================================
// Hook
// ============================================================================

export function useDraft({
  contextType,
  contextId,
  autoSaveDebounce = 500,
  disableAutoSave = false,
}: UseDraftOptions): UseDraftReturn {
  const contextKey = useMemo(
    () => createContextKey(contextType, contextId),
    [contextType, contextId],
  );

  // Store selectors
  const draft = useDraftsStore((state) => state.drafts.get(contextKey));
  const saveDraft = useDraftsStore((state) => state.saveDraft);
  const scheduleAutoSave = useDraftsStore((state) => state.scheduleAutoSave);
  const deleteDraftFromStore = useDraftsStore((state) => state.deleteDraft);
  const restoreDraft = useDraftsStore((state) => state.restoreDraft);
  const initialize = useDraftsStore((state) => state.initialize);
  const isInitialized = useDraftsStore((state) => state.isInitialized);
  const setAutoSaveDebounce = useDraftsStore(
    (state) => state.setAutoSaveDebounce,
  );

  // Initialize store on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Configure auto-save debounce
  useEffect(() => {
    setAutoSaveDebounce(autoSaveDebounce);
  }, [autoSaveDebounce, setAutoSaveDebounce]);

  // Derived values
  const hasDraftValue = useMemo(() => hasDraftContent(draft), [draft]);
  const content = draft?.content ?? "";
  const contentPreview = draft ? getDraftPreview(draft) : "";
  const contentHtml = draft?.contentHtml;
  const isReply =
    draft?.replyToMessageId !== null && draft?.replyToMessageId !== undefined;
  const replyTo = draft?.replyToPreview;
  const attachments = draft?.attachments ?? [];
  const mentions = draft?.mentions ?? [];

  // Save draft immediately
  const save = useCallback(
    async (
      content: string,
      options?: {
        contentHtml?: string;
        replyToMessageId?: string | null;
        replyToPreview?: DraftReplyPreview;
        attachments?: DraftAttachment[];
        mentions?: DraftMention[];
      },
    ) => {
      return await saveDraft(contextType, contextId, content, options);
    },
    [saveDraft, contextType, contextId],
  );

  // Schedule auto-save (debounced)
  const autoSave = useCallback(
    (
      content: string,
      options?: {
        contentHtml?: string;
        replyToMessageId?: string | null;
        replyToPreview?: DraftReplyPreview;
        attachments?: DraftAttachment[];
        mentions?: DraftMention[];
      },
    ) => {
      if (disableAutoSave) return;
      scheduleAutoSave(contextType, contextId, content, options);
    },
    [scheduleAutoSave, contextType, contextId, disableAutoSave],
  );

  // Update content
  const updateContent = useCallback(
    (content: string, contentHtml?: string) => {
      autoSave(content, {
        contentHtml,
        replyToMessageId: draft?.replyToMessageId,
        replyToPreview: draft?.replyToPreview,
        attachments: draft?.attachments,
        mentions: draft?.mentions,
      });
    },
    [autoSave, draft],
  );

  // Set reply
  const setReply = useCallback(
    (messageId: string, preview: DraftReplyPreview) => {
      save(content, {
        contentHtml,
        replyToMessageId: messageId,
        replyToPreview: preview,
        attachments,
        mentions,
      });
    },
    [save, content, contentHtml, attachments, mentions],
  );

  // Clear reply
  const clearReply = useCallback(() => {
    if (!draft) return;

    save(content, {
      contentHtml,
      replyToMessageId: null,
      replyToPreview: undefined,
      attachments,
      mentions,
    });
  }, [save, content, contentHtml, attachments, mentions, draft]);

  // Add attachment
  const addAttachment = useCallback(
    (attachment: DraftAttachment) => {
      const newAttachments = [...attachments, attachment];
      save(content, {
        contentHtml,
        replyToMessageId: draft?.replyToMessageId,
        replyToPreview: draft?.replyToPreview,
        attachments: newAttachments,
        mentions,
      });
    },
    [save, content, contentHtml, draft, attachments, mentions],
  );

  // Remove attachment
  const removeAttachment = useCallback(
    (attachmentId: string) => {
      const newAttachments = attachments.filter((a) => a.id !== attachmentId);
      save(content, {
        contentHtml,
        replyToMessageId: draft?.replyToMessageId,
        replyToPreview: draft?.replyToPreview,
        attachments: newAttachments,
        mentions,
      });
    },
    [save, content, contentHtml, draft, attachments, mentions],
  );

  // Clear attachments
  const clearAttachments = useCallback(() => {
    save(content, {
      contentHtml,
      replyToMessageId: draft?.replyToMessageId,
      replyToPreview: draft?.replyToPreview,
      attachments: [],
      mentions,
    });
  }, [save, content, contentHtml, draft, mentions]);

  // Add mention
  const addMention = useCallback(
    (mention: DraftMention) => {
      const newMentions = [...mentions, mention];
      save(content, {
        contentHtml,
        replyToMessageId: draft?.replyToMessageId,
        replyToPreview: draft?.replyToPreview,
        attachments,
        mentions: newMentions,
      });
    },
    [save, content, contentHtml, draft, attachments, mentions],
  );

  // Delete draft
  const deleteDraft = useCallback(async () => {
    return await deleteDraftFromStore(contextKey);
  }, [deleteDraftFromStore, contextKey]);

  // Restore draft
  const restore = useCallback(async () => {
    return await restoreDraft(contextKey);
  }, [restoreDraft, contextKey]);

  return {
    draft,
    hasDraft: hasDraftValue,
    content,
    contentPreview,
    contentHtml,
    isReply,
    replyTo,
    attachments,
    mentions,
    contextKey,
    save,
    autoSave,
    updateContent,
    setReply,
    clearReply,
    addAttachment,
    removeAttachment,
    clearAttachments,
    addMention,
    deleteDraft,
    restore,
    clear: deleteDraft,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for channel draft
 */
export function useChannelDraft(
  channelId: string,
  options?: Omit<UseDraftOptions, "contextType" | "contextId">,
) {
  return useDraft({
    contextType: "channel",
    contextId: channelId,
    ...options,
  });
}

/**
 * Hook for thread draft
 */
export function useThreadDraft(
  threadId: string,
  options?: Omit<UseDraftOptions, "contextType" | "contextId">,
) {
  return useDraft({
    contextType: "thread",
    contextId: threadId,
    ...options,
  });
}

/**
 * Hook for DM draft
 */
export function useDMDraft(
  conversationId: string,
  options?: Omit<UseDraftOptions, "contextType" | "contextId">,
) {
  return useDraft({
    contextType: "dm",
    contextId: conversationId,
    ...options,
  });
}
