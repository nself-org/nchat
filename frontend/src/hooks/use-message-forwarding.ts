"use client";

/**
 * useMessageForwarding Hook
 *
 * Hook for forwarding messages to multiple destinations.
 */

import { useCallback } from "react";
import { useMutation } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { FORWARD_MESSAGE } from "@/graphql/mutations/messages";
import {
  useForwardingStore,
  createForwardRequest,
  formatForwardedContent,
  type ForwardableMessage,
  type ForwardDestination,
  type ForwardingMode,
  type ForwardOperationResult,
  type ForwardResult,
} from "@/lib/messages/message-forwarding";

export function useMessageForwarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const store = useForwardingStore();

  const [forwardMessageMutation] = useMutation(FORWARD_MESSAGE);

  const forwardMessages = useCallback(
    async (
      messages: ForwardableMessage[],
      destinations: ForwardDestination[],
      mode: ForwardingMode,
      comment?: string,
    ) => {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to forward messages",
          variant: "destructive",
        });
        return;
      }

      try {
        logger.debug("Forwarding messages", {
          messageCount: messages.length,
          destinationCount: destinations.length,
          mode,
        });

        store.startForwarding();

        const request = createForwardRequest(
          messages,
          destinations,
          mode,
          user.id,
          comment,
        );
        const results: ForwardResult[] = [];

        // Forward to each destination
        for (const destination of destinations) {
          try {
            const messageIds: string[] = [];

            for (const message of messages) {
              const { content, attribution } = formatForwardedContent(
                message,
                mode,
              );

              const fullContent = comment
                ? `${comment}\n\n${content}${attribution ? `\n\n${attribution}` : ""}`
                : `${content}${attribution ? `\n\n${attribution}` : ""}`;

              const result = await forwardMessageMutation({
                variables: {
                  messageId: message.id,
                  targetChannelId: destination.id,
                  content: fullContent,
                  userId: user.id,
                },
              });

              if (result.data?.insert_nchat_messages_one?.id) {
                messageIds.push(result.data.insert_nchat_messages_one.id);
              }
            }

            results.push({
              destination,
              success: true,
              messageIds,
            });

            logger.info("Successfully forwarded to destination", {
              destination: destination.name,
            });
          } catch (error) {
            logger.error(
              "Failed to forward to destination",
              error instanceof Error ? error : new Error(String(error)),
              { destination: destination.name },
            );
            results.push({
              destination,
              success: false,
              error:
                error instanceof Error ? error.message : "Failed to forward",
            });
          }
        }

        const operationResult: ForwardOperationResult = {
          request,
          results,
          successCount: results.filter((r) => r.success).length,
          failureCount: results.filter((r) => !r.success).length,
        };

        store.finishForwarding(operationResult);

        if (operationResult.successCount > 0) {
          toast({
            title: "Messages forwarded",
            description: `Successfully forwarded to ${operationResult.successCount} destination${operationResult.successCount !== 1 ? "s" : ""}`,
          });
        }

        if (operationResult.failureCount > 0) {
          toast({
            title: "Partial failure",
            description: `Failed to forward to ${operationResult.failureCount} destination${operationResult.failureCount !== 1 ? "s" : ""}`,
            variant: "destructive",
          });
        }

        logger.info("Forward operation completed", {
          successCount: operationResult.successCount,
          failureCount: operationResult.failureCount,
        });
        return operationResult;
      } catch (error) {
        logger.error(
          "Failed to forward messages",
          error instanceof Error ? error : new Error(String(error)),
        );
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to forward messages",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user, store, forwardMessageMutation, toast],
  );

  return {
    // Modal state
    isOpen: store.modal.isOpen,
    messages: store.modal.messages,
    selectedDestinations: store.modal.selectedDestinations,
    mode: store.modal.mode,
    comment: store.modal.comment,
    searchQuery: store.modal.searchQuery,
    recentDestinations: store.modal.recentDestinations,
    isForwarding: store.modal.isForwarding,

    // Actions
    forwardMessages,
    openModal: store.openForwardModal,
    closeModal: store.closeForwardModal,
    setMode: store.setForwardingMode,
    setComment: store.setComment,
    setSearchQuery: store.setSearchQuery,
    addDestination: store.addDestination,
    removeDestination: store.removeDestination,
    toggleDestination: store.toggleDestination,

    // History
    history: store.forwardHistory,
    clearHistory: store.clearHistory,
  };
}
