/**
 * Draft Messages Hook
 *
 * React hook for managing draft messages with auto-save functionality.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getDraftManager, type DraftMessage } from "@/lib/messaging/drafts";
import { logger } from "@/lib/logger";

const draftManager = getDraftManager();

export interface UseDraftsOptions {
  channelId: string;
  replyToId?: string;
  threadId?: string;
  onDraftRestored?: (draft: DraftMessage) => void;
}

export interface UseDraftsReturn {
  // Draft state
  draftContent: string;
  hasDraft: boolean;
  draftUpdatedAt: number | null;

  // Draft actions
  updateDraft: (
    content: string,
    options?: {
      attachments?: unknown[];
      mentions?: unknown[];
    },
  ) => void;
  saveDraft: (
    content: string,
    options?: {
      attachments?: unknown[];
      mentions?: unknown[];
    },
  ) => void;
  clearDraft: () => void;
  restoreDraft: () => DraftMessage | undefined;

  // Multi-draft management
  channelDrafts: DraftMessage[];
  channelDraftCount: number;
  allDrafts: Map<string, DraftMessage[]>;
  totalDraftCount: number;
}

/**
 * Hook for managing draft messages
 */
export function useDrafts(options: UseDraftsOptions): UseDraftsReturn {
  const { channelId, replyToId, threadId, onDraftRestored } = options;
  const { user } = useAuth();
  const [draftContent, setDraftContent] = useState("");
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<number | null>(null);
  const [channelDrafts, setChannelDrafts] = useState<DraftMessage[]>([]);
  const [totalDraftCount, setTotalDraftCount] = useState(0);
  const isRestoringRef = useRef(false);

  // Load draft when channel/user changes
  useEffect(() => {
    if (!user?.id || !channelId || isRestoringRef.current) return;

    isRestoringRef.current = true;
    const draft = draftManager.restoreDraft(
      channelId,
      user.id,
      replyToId,
      threadId,
    );

    if (draft) {
      setDraftContent(draft.content);
      setDraftUpdatedAt(draft.updatedAt);
      onDraftRestored?.(draft);
      logger.debug("Draft restored on mount", { channelId, draftId: draft.id });
    } else {
      setDraftContent("");
      setDraftUpdatedAt(null);
    }

    isRestoringRef.current = false;
  }, [channelId, user?.id, replyToId, threadId, onDraftRestored]);

  // Update channel drafts
  useEffect(() => {
    if (!user?.id || !channelId) return;

    const updateChannelDrafts = () => {
      const drafts = draftManager.getChannelDrafts(channelId, user.id);
      setChannelDrafts(drafts);
    };

    updateChannelDrafts();

    // Update every 5 seconds to catch any changes
    const interval = setInterval(updateChannelDrafts, 5000);

    return () => clearInterval(interval);
  }, [channelId, user?.id]);

  // Update total draft count
  useEffect(() => {
    if (!user?.id) return;

    const updateTotalCount = () => {
      const count = draftManager.getTotalDraftCount(user.id);
      setTotalDraftCount(count);
    };

    updateTotalCount();

    // Update every 5 seconds
    const interval = setInterval(updateTotalCount, 5000);

    return () => clearInterval(interval);
  }, [user?.id]);

  /**
   * Update draft with auto-save
   */
  const updateDraft = useCallback(
    (
      content: string,
      options?: { attachments?: unknown[]; mentions?: unknown[] },
    ) => {
      if (!user?.id || !channelId) return;

      setDraftContent(content);
      setDraftUpdatedAt(Date.now());

      // Auto-save draft
      if (content.trim().length > 0) {
        draftManager.updateDraftContent(channelId, user.id, content, {
          replyToId,
          threadId,
          ...options,
        });
        logger.debug("Draft auto-saving", {
          channelId,
          contentLength: content.length,
        });
      } else {
        // Clear draft if content is empty
        draftManager.deleteDraftByKey(channelId, user.id, replyToId, threadId);
        logger.debug("Draft cleared (empty content)", { channelId });
      }
    },
    [user?.id, channelId, replyToId, threadId],
  );

  /**
   * Save draft immediately (no debounce)
   */
  const saveDraft = useCallback(
    (
      content: string,
      options?: { attachments?: unknown[]; mentions?: unknown[] },
    ) => {
      if (!user?.id || !channelId) return;

      if (content.trim().length === 0) {
        clearDraft();
        return;
      }

      const draft = draftManager.saveDraft(
        {
          channelId,
          userId: user.id,
          content,
          replyToId,
          threadId,
          attachments: options?.attachments,
          mentions: options?.mentions,
        },
        false, // Immediate save
      );

      setDraftContent(draft.content);
      setDraftUpdatedAt(draft.updatedAt);

      logger.debug("Draft saved immediately", { channelId, draftId: draft.id });
    },
    [user?.id, channelId, replyToId, threadId],
  );

  /**
   * Clear draft
   */
  const clearDraft = useCallback(() => {
    if (!user?.id || !channelId) return;

    draftManager.deleteDraftByKey(channelId, user.id, replyToId, threadId);
    setDraftContent("");
    setDraftUpdatedAt(null);

    logger.debug("Draft cleared", { channelId });
  }, [user?.id, channelId, replyToId, threadId]);

  /**
   * Restore draft
   */
  const restoreDraft = useCallback((): DraftMessage | undefined => {
    if (!user?.id || !channelId) return undefined;

    const draft = draftManager.restoreDraft(
      channelId,
      user.id,
      replyToId,
      threadId,
    );
    if (draft) {
      setDraftContent(draft.content);
      setDraftUpdatedAt(draft.updatedAt);
      logger.debug("Draft restored manually", { channelId, draftId: draft.id });
    }

    return draft;
  }, [user?.id, channelId, replyToId, threadId]);

  /**
   * Get all drafts grouped by channel
   */
  const allDrafts = user?.id
    ? draftManager.getAllDraftsGrouped(user.id)
    : new Map<string, DraftMessage[]>();

  /**
   * Check if draft exists
   */
  const hasDraft = user?.id
    ? draftManager.hasDraft(channelId, user.id, replyToId, threadId)
    : false;

  /**
   * Get channel draft count
   */
  const channelDraftCount = channelDrafts.length;

  return {
    // State
    draftContent,
    hasDraft,
    draftUpdatedAt,

    // Actions
    updateDraft,
    saveDraft,
    clearDraft,
    restoreDraft,

    // Multi-draft
    channelDrafts,
    channelDraftCount,
    allDrafts,
    totalDraftCount,
  };
}

/**
 * Hook for getting all drafts for current user
 */
export function useAllDrafts() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<DraftMessage[]>([]);
  const [draftsByChannel, setDraftsByChannel] = useState<
    Map<string, DraftMessage[]>
  >(new Map());

  useEffect(() => {
    if (!user?.id) {
      setDrafts([]);
      setDraftsByChannel(new Map());
      return;
    }

    const updateDrafts = () => {
      const allDrafts = draftManager.getUserDrafts(user.id);
      const grouped = draftManager.getAllDraftsGrouped(user.id);

      setDrafts(allDrafts);
      setDraftsByChannel(grouped);
    };

    updateDrafts();

    // Update every 5 seconds
    const interval = setInterval(updateDrafts, 5000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const clearAllDrafts = useCallback(() => {
    if (!user?.id) return;

    const count = draftManager.deleteUserDrafts(user.id);
    logger.info("Cleared all user drafts", { count });

    setDrafts([]);
    setDraftsByChannel(new Map());
  }, [user?.id]);

  const clearChannelDrafts = useCallback(
    (channelId: string) => {
      if (!user?.id) return;

      const count = draftManager.deleteChannelDrafts(channelId, user.id);
      logger.info("Cleared channel drafts", { channelId, count });

      // Update state
      const allDrafts = draftManager.getUserDrafts(user.id);
      const grouped = draftManager.getAllDraftsGrouped(user.id);

      setDrafts(allDrafts);
      setDraftsByChannel(grouped);
    },
    [user?.id],
  );

  return {
    drafts,
    draftsByChannel,
    totalCount: drafts.length,
    channelCount: draftsByChannel.size,
    clearAllDrafts,
    clearChannelDrafts,
  };
}

/**
 * Hook for draft indicators in channel list
 */
export function useChannelDraftIndicator(channelId: string) {
  const { user } = useAuth();
  const [hasDraft, setHasDraft] = useState(false);
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    if (!user?.id || !channelId) {
      setHasDraft(false);
      setDraftCount(0);
      return;
    }

    const updateIndicator = () => {
      const count = draftManager.getChannelDraftCount(channelId, user.id);
      setDraftCount(count);
      setHasDraft(count > 0);
    };

    updateIndicator();

    // Update every 2 seconds for real-time indicator
    const interval = setInterval(updateIndicator, 2000);

    return () => clearInterval(interval);
  }, [channelId, user?.id]);

  return {
    hasDraft,
    draftCount,
  };
}
