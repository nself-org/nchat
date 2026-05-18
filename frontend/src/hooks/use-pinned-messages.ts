/**
 * usePinnedMessages Hook
 *
 * Hook for managing pinned messages in a channel.
 */

import { useCallback, useMemo } from "react";
import { usePinnedStore } from "@/stores/pinned-store";
import { useAuth } from "@/contexts/auth-context";
import type {
  PinnedMessage,
  PinMessageInput,
  UnpinMessageInput,
  PinFilters,
  PinResult,
} from "@/lib/pinned";
import { canPinMessage, canUnpinMessage } from "@/lib/pinned";

interface UsePinnedMessagesOptions {
  channelId: string;
}

interface UsePinnedMessagesReturn {
  // Data
  pinnedMessages: PinnedMessage[];
  filteredPinnedMessages: PinnedMessage[];
  pinnedCount: number;
  isPanelOpen: boolean;

  // Loading/Error
  isLoading: boolean;
  isPinning: boolean;
  isUnpinning: boolean;
  error: string | null;

  // Actions
  pinMessage: (input: PinMessageInput) => Promise<PinResult>;
  unpinMessage: (input: UnpinMessageInput) => Promise<PinResult>;
  reorderPins: (pinIds: string[]) => void;
  updatePinNote: (pinId: string, note: string) => void;

  // Panel
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // Filtering
  setFilters: (filters: Partial<PinFilters>) => void;
  clearFilters: () => void;

  // Permissions
  canPin: boolean;
  canUnpin: (pinId: string) => boolean;
  isMessagePinned: (messageId: string) => boolean;
}

/**
 * Hook for managing pinned messages.
 */
export function usePinnedMessages({
  channelId,
}: UsePinnedMessagesOptions): UsePinnedMessagesReturn {
  const { user } = useAuth();
  const store = usePinnedStore();

  // Get pinned messages for this channel
  const pinnedMessages = useMemo(() => {
    return store.getPinnedMessages(channelId);
  }, [store, channelId]);

  const filteredPinnedMessages = useMemo(() => {
    return store.getFilteredPinnedMessages(channelId);
  }, [store, channelId]);

  // Get channel config
  const config = useMemo(() => {
    return store.getChannelConfig(channelId);
  }, [store, channelId]);

  // Check permissions
  const userRole =
    (user?.role as "owner" | "admin" | "moderator" | "member" | "guest") ??
    "guest";
  const canPin = canPinMessage(userRole, config.pinPermission);

  const canUnpin = useCallback(
    (pinId: string) => {
      const pin = pinnedMessages.find((p) => p.id === pinId);
      if (!pin) return false;
      const isPinner = pin.pinnedBy.id === user?.id;
      return canUnpinMessage(userRole, config.pinPermission, isPinner);
    },
    [pinnedMessages, user?.id, userRole, config.pinPermission],
  );

  const isMessagePinned = useCallback(
    (messageId: string) => {
      return store.isMessagePinned(channelId, messageId);
    },
    [store, channelId],
  );

  // Pin message action
  const pinMessage = useCallback(
    async (input: PinMessageInput): Promise<PinResult> => {
      if (!canPin) {
        return {
          success: false,
          error: "You do not have permission to pin messages",
          errorCode: "PERMISSION_DENIED",
        };
      }

      store.setPinning(true);
      store.setError(null);

      try {
        // In a real app, this would be an API call
        // For now, we'll simulate locally
        const pinnedMessage: PinnedMessage = {
          id: `pin-${Date.now()}`,
          messageId: input.messageId,
          channelId: input.channelId,
          pinnedBy: {
            id: user?.id ?? "",
            username: user?.username ?? "unknown",
            displayName: user?.displayName ?? "Unknown",
            avatarUrl: user?.avatarUrl,
          },
          pinnedAt: new Date(),
          message: {} as any, // Would be fetched from message store
          note: input.note,
          position: pinnedMessages.length,
        };

        store.addPinnedMessage(channelId, pinnedMessage);
        store.setPinning(false);

        return { success: true, pinnedMessage };
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to pin message";
        store.setError(error);
        store.setPinning(false);
        return { success: false, error, errorCode: "UNKNOWN_ERROR" };
      }
    },
    [canPin, store, user, channelId, pinnedMessages.length],
  );

  // Unpin message action
  const unpinMessage = useCallback(
    async (input: UnpinMessageInput): Promise<PinResult> => {
      const messageId = input.messageId ?? "";
      const pin = pinnedMessages.find(
        (p) => p.id === input.pinId || p.messageId === messageId,
      );

      if (!pin) {
        return {
          success: false,
          error: "Pinned message not found",
          errorCode: "PIN_NOT_FOUND",
        };
      }

      if (!canUnpin(pin.id)) {
        return {
          success: false,
          error: "You do not have permission to unpin this message",
          errorCode: "PERMISSION_DENIED",
        };
      }

      store.setUnpinning(true);
      store.setError(null);

      try {
        store.removePinnedMessage(channelId, pin.messageId);
        store.setUnpinning(false);
        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to unpin message";
        store.setError(error);
        store.setUnpinning(false);
        return { success: false, error, errorCode: "UNKNOWN_ERROR" };
      }
    },
    [pinnedMessages, canUnpin, store, channelId],
  );

  // Reorder pins
  const reorderPins = useCallback(
    (pinIds: string[]) => {
      store.reorderPinnedMessages(channelId, pinIds);
    },
    [store, channelId],
  );

  // Update pin note
  const updatePinNote = useCallback(
    (pinId: string, note: string) => {
      store.updatePinnedMessage(channelId, pinId, { note });
    },
    [store, channelId],
  );

  // Panel actions
  const openPanel = useCallback(() => {
    store.openPanel(channelId);
  }, [store, channelId]);

  const closePanel = useCallback(() => {
    store.closePanel();
  }, [store]);

  const togglePanel = useCallback(() => {
    store.togglePanel();
  }, [store]);

  // Filter actions
  const setFilters = useCallback(
    (filters: Partial<PinFilters>) => {
      store.setFilters(filters);
    },
    [store],
  );

  const clearFilters = useCallback(() => {
    store.clearFilters();
  }, [store]);

  return {
    pinnedMessages,
    filteredPinnedMessages,
    pinnedCount: pinnedMessages.length,
    isPanelOpen: store.isPanelOpen && store.activeChannelId === channelId,
    isLoading: store.isLoading || store.isLoadingChannel === channelId,
    isPinning: store.isPinning,
    isUnpinning: store.isUnpinning,
    error: store.error,
    pinMessage,
    unpinMessage,
    reorderPins,
    updatePinNote,
    openPanel,
    closePanel,
    togglePanel,
    setFilters,
    clearFilters,
    canPin,
    canUnpin,
    isMessagePinned,
  };
}
