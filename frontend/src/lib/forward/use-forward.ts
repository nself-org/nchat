"use client";

/**
 * useForward Hook - Message forwarding functionality for nself-chat
 *
 * Provides methods to forward messages to channels/DMs with Apollo Client
 * integration and feature flag support.
 *
 * @example
 * ```tsx
 * import { useForward } from '@/lib/forward'
 *
 * function MessageActions({ message }) {
 *   const { forwardMessage, isForwarding, canForward } = useForward()
 *
 *   if (!canForward) return null
 *
 *   return (
 *     <button onClick={() => forwardMessage(message)}>
 *       Forward
 *     </button>
 *   )
 * }
 * ```
 */

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client";
import { useFeatureEnabled } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";
import {
  useForwardStore,
  type ForwardMessage,
  type ForwardDestination,
  type ForwardResult,
} from "./forward-store";
import {
  FORWARD_MESSAGE,
  FORWARD_MESSAGE_TO_MULTIPLE,
  GET_FORWARD_DESTINATIONS,
  GET_RECENT_FORWARD_DESTINATIONS,
  type ForwardMessageVariables,
  type ForwardMessageToMultipleVariables,
  type GetForwardDestinationsVariables,
} from "@/graphql/forward";

// ============================================================================
// Types
// ============================================================================

export interface UseForwardOptions {
  /** Called after successful forward */
  onSuccess?: (results: ForwardResult[]) => void;
  /** Called after forward failure */
  onError?: (error: Error) => void;
  /** Called when forward modal opens */
  onOpen?: () => void;
  /** Called when forward modal closes */
  onClose?: () => void;
}

export interface UseForwardReturn {
  // Feature flag
  canForward: boolean;
  isForwardEnabled: boolean;

  // Modal state
  isOpen: boolean;
  openForwardModal: (message: ForwardMessage) => void;
  closeForwardModal: () => void;

  // Message state
  messageToForward: ForwardMessage | null;

  // Selection
  selectedDestinations: ForwardDestination[];
  selectedCount: number;
  toggleDestination: (destination: ForwardDestination) => void;
  selectDestination: (destination: ForwardDestination) => void;
  deselectDestination: (destinationId: string) => void;
  clearSelectedDestinations: () => void;
  isDestinationSelected: (destinationId: string) => boolean;

  // Comment
  comment: string;
  setComment: (comment: string) => void;

  // Recent destinations
  recentDestinations: ForwardDestination[];
  addRecentDestination: (destination: ForwardDestination) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Forward execution
  isForwarding: boolean;
  forwardResults: ForwardResult[];
  executeForward: () => Promise<ForwardResult[]>;
  forwardToSingle: (
    message: ForwardMessage,
    destination: ForwardDestination,
    comment?: string,
  ) => Promise<ForwardResult>;

  // Destinations query
  loadDestinations: (query?: string) => void;
  destinations: ForwardDestination[];
  isLoadingDestinations: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useForward(options: UseForwardOptions = {}): UseForwardReturn {
  const { onSuccess, onError, onOpen, onClose } = options;

  // Feature flag check
  const isForwardEnabled = useFeatureEnabled(FEATURES.MESSAGES_FORWARD);

  // Store state and actions
  const store = useForwardStore();

  // GraphQL mutations
  const [forwardMutation, { loading: forwardingOne }] =
    useMutation(FORWARD_MESSAGE);
  const [forwardMultipleMutation, { loading: forwardingMultiple }] =
    useMutation(FORWARD_MESSAGE_TO_MULTIPLE);

  // GraphQL queries
  const [
    loadDestinationsQuery,
    { data: destinationsData, loading: loadingDestinations },
  ] = useLazyQuery(GET_FORWARD_DESTINATIONS, {
    fetchPolicy: "network-only",
  });

  // Computed values
  const isForwarding =
    forwardingOne || forwardingMultiple || store.isForwarding;

  const destinations = useMemo(() => {
    if (!destinationsData) return [];

    const channels = (destinationsData.nchat_channels || []).map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type as "channel" | "direct" | "group",
      icon: ch.icon,
      slug: ch.slug,
      isPrivate: ch.is_private,
      lastActivityAt: ch.updated_at,
      members: ch.members?.map((m: any) => ({
        id: m.user?.id,
        displayName: m.user?.display_name,
        avatarUrl: m.user?.avatar_url,
      })),
    }));

    return channels as ForwardDestination[];
  }, [destinationsData]);

  // Check if destination is selected
  const isDestinationSelected = useCallback(
    (destinationId: string) => {
      return store.selectedDestinations.some((d) => d.id === destinationId);
    },
    [store.selectedDestinations],
  );

  // Open forward modal with callback
  const openForwardModal = useCallback(
    (message: ForwardMessage) => {
      store.openForwardModal(message);
      onOpen?.();
    },
    [store, onOpen],
  );

  // Close forward modal with callback
  const closeForwardModal = useCallback(() => {
    store.closeForwardModal();
    onClose?.();
  }, [store, onClose]);

  // Load destinations
  const loadDestinations = useCallback(
    (query?: string) => {
      loadDestinationsQuery({
        variables: {
          search: query ? `%${query}%` : undefined,
          limit: 50,
        } as GetForwardDestinationsVariables,
      });
    },
    [loadDestinationsQuery],
  );

  // Forward to a single destination
  const forwardToSingle = useCallback(
    async (
      message: ForwardMessage,
      destination: ForwardDestination,
      comment?: string,
    ): Promise<ForwardResult> => {
      try {
        const variables: ForwardMessageVariables = {
          originalMessageId: message.id,
          targetChannelId: destination.id,
          userId: message.user.id, // This should be current user, passed in
          comment: comment || undefined,
        };

        const result = await forwardMutation({ variables });

        const forwardResult: ForwardResult = {
          destinationId: destination.id,
          destinationName: destination.name,
          success: true,
          messageId: result.data?.insert_nchat_messages_one?.id,
        };

        // Add to recent destinations
        store.addRecentDestination(destination);

        return forwardResult;
      } catch (error) {
        const forwardResult: ForwardResult = {
          destinationId: destination.id,
          destinationName: destination.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
        return forwardResult;
      }
    },
    [forwardMutation, store],
  );

  // Execute forward to all selected destinations
  const executeForward = useCallback(async (): Promise<ForwardResult[]> => {
    if (!store.messageToForward || store.selectedDestinations.length === 0) {
      return [];
    }

    store.setIsForwarding(true);
    store.clearForwardResults();

    const results: ForwardResult[] = [];

    try {
      // Forward to each destination
      for (const destination of store.selectedDestinations) {
        const result = await forwardToSingle(
          store.messageToForward,
          destination,
          store.comment,
        );
        results.push(result);
        store.addForwardResult(result);
      }

      const successfulResults = results.filter((r) => r.success);
      const failedResults = results.filter((r) => !r.success);

      if (successfulResults.length > 0) {
        onSuccess?.(results);
      }

      if (failedResults.length > 0 && successfulResults.length === 0) {
        onError?.(new Error("All forwards failed"));
      }

      return results;
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Forward failed");
      onError?.(err);
      throw err;
    } finally {
      store.setIsForwarding(false);
    }
  }, [store, forwardToSingle, onSuccess, onError]);

  return {
    // Feature flag
    canForward: isForwardEnabled && !isForwarding,
    isForwardEnabled,

    // Modal state
    isOpen: store.isOpen,
    openForwardModal,
    closeForwardModal,

    // Message state
    messageToForward: store.messageToForward,

    // Selection
    selectedDestinations: store.selectedDestinations,
    selectedCount: store.selectedDestinations.length,
    toggleDestination: store.toggleDestination,
    selectDestination: store.selectDestination,
    deselectDestination: store.deselectDestination,
    clearSelectedDestinations: store.clearSelectedDestinations,
    isDestinationSelected,

    // Comment
    comment: store.comment,
    setComment: store.setComment,

    // Recent destinations
    recentDestinations: store.recentDestinations,
    addRecentDestination: store.addRecentDestination,

    // Search
    searchQuery: store.searchQuery,
    setSearchQuery: store.setSearchQuery,

    // Forward execution
    isForwarding,
    forwardResults: store.forwardResults,
    executeForward,
    forwardToSingle,

    // Destinations query
    loadDestinations,
    destinations,
    isLoadingDestinations: loadingDestinations,
  };
}

// ============================================================================
// Simple Forward Hook (for quick actions)
// ============================================================================

/**
 * Simple hook for quick forward actions without modal
 */
export function useQuickForward() {
  const isForwardEnabled = useFeatureEnabled(FEATURES.MESSAGES_FORWARD);
  const [forwardMutation, { loading }] = useMutation(FORWARD_MESSAGE);
  const addRecentDestination = useForwardStore((s) => s.addRecentDestination);

  const quickForward = useCallback(
    async (
      messageId: string,
      targetChannelId: string,
      userId: string,
      comment?: string,
    ) => {
      if (!isForwardEnabled) {
        throw new Error("Forwarding is not enabled");
      }

      const result = await forwardMutation({
        variables: {
          originalMessageId: messageId,
          targetChannelId,
          userId,
          comment,
        } as ForwardMessageVariables,
      });

      return result.data?.insert_nchat_messages_one;
    },
    [isForwardEnabled, forwardMutation],
  );

  return {
    quickForward,
    isForwarding: loading,
    isEnabled: isForwardEnabled,
  };
}

export default useForward;
