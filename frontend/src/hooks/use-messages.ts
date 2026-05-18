"use client";

/**
 * Message Operations Hooks
 *
 * React hooks for messaging features with comprehensive error handling,
 * logging, and user feedback.
 */

import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import { GET_MESSAGES, MESSAGE_SUBSCRIPTION } from "@/graphql/queries/messages";
import {
  SEND_MESSAGE,
  UPDATE_MESSAGE,
  DELETE_MESSAGE,
  SOFT_DELETE_MESSAGE,
  PIN_MESSAGE,
  UNPIN_MESSAGE,
  STAR_MESSAGE,
  UNSTAR_MESSAGE,
  FORWARD_MESSAGE,
  MARK_MESSAGE_READ,
  MARK_MESSAGE_UNREAD,
  CREATE_THREAD,
  REPLY_TO_THREAD,
  SUBSCRIBE_TO_THREAD,
  UNSUBSCRIBE_FROM_THREAD,
  ADD_ATTACHMENT,
  REMOVE_ATTACHMENT,
  SCHEDULE_MESSAGE,
  CANCEL_SCHEDULED_MESSAGE,
  UPDATE_SCHEDULED_MESSAGE,
  START_TYPING,
  STOP_TYPING,
  DELETE_MULTIPLE_MESSAGES,
  PIN_MULTIPLE_MESSAGES,
  ADD_REACTION,
  REMOVE_REACTION,
  TOGGLE_REACTION,
  type SendMessageInput,
  type UpdateMessageInput,
  type ForwardMessageInput,
  type ScheduleMessageInput,
  type AttachmentInput,
  type PinMessageInput,
} from "@/graphql/mutations/messages";

// ============================================================================
// Message Query Hook
// ============================================================================

export function useMessages(channelId: string) {
  const { data, loading, error, fetchMore } = useQuery(GET_MESSAGES, {
    variables: { channelId, limit: 50 },
    skip: !channelId,
  });

  // Subscribe to new messages
  useSubscription(MESSAGE_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId,
  });

  const loadMore = useCallback(() => {
    if (!data?.nchat_messages) return;

    return fetchMore({
      variables: {
        offset: data.nchat_messages.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          nchat_messages: [
            ...prev.nchat_messages,
            ...fetchMoreResult.nchat_messages,
          ],
        };
      },
    });
  }, [data, fetchMore]);

  return {
    messages: data?.nchat_messages || [],
    loading,
    error,
    loadMore,
  };
}

// ============================================================================
// Message Mutations Hook
// ============================================================================

export function useMessageMutations() {
  const { user } = useAuth();
  const { toast } = useToast();

  // CRUD Mutations
  const [sendMessageMutation, { loading: sendingMessage }] =
    useMutation(SEND_MESSAGE);
  const [updateMessageMutation, { loading: updatingMessage }] =
    useMutation(UPDATE_MESSAGE);
  const [deleteMessageMutation, { loading: deletingMessage }] =
    useMutation(DELETE_MESSAGE);
  const [softDeleteMessageMutation, { loading: softDeletingMessage }] =
    useMutation(SOFT_DELETE_MESSAGE);

  // Interaction Mutations
  const [pinMessageMutation, { loading: pinningMessage }] =
    useMutation(PIN_MESSAGE);
  const [unpinMessageMutation, { loading: unpinningMessage }] =
    useMutation(UNPIN_MESSAGE);
  const [starMessageMutation, { loading: starringMessage }] =
    useMutation(STAR_MESSAGE);
  const [unstarMessageMutation, { loading: unstarringMessage }] =
    useMutation(UNSTAR_MESSAGE);
  const [forwardMessageMutation, { loading: forwardingMessage }] =
    useMutation(FORWARD_MESSAGE);
  const [markReadMutation, { loading: markingRead }] =
    useMutation(MARK_MESSAGE_READ);
  const [markUnreadMutation, { loading: markingUnread }] =
    useMutation(MARK_MESSAGE_UNREAD);

  // Thread Mutations
  const [createThreadMutation, { loading: creatingThread }] =
    useMutation(CREATE_THREAD);
  const [replyToThreadMutation, { loading: replyingToThread }] =
    useMutation(REPLY_TO_THREAD);
  const [subscribeThreadMutation, { loading: subscribingThread }] =
    useMutation(SUBSCRIBE_TO_THREAD);
  const [unsubscribeThreadMutation, { loading: unsubscribingThread }] =
    useMutation(UNSUBSCRIBE_FROM_THREAD);

  // Attachment Mutations
  const [addAttachmentMutation, { loading: addingAttachment }] =
    useMutation(ADD_ATTACHMENT);
  const [removeAttachmentMutation, { loading: removingAttachment }] =
    useMutation(REMOVE_ATTACHMENT);

  // Scheduled Message Mutations
  const [scheduleMessageMutation, { loading: schedulingMessage }] =
    useMutation(SCHEDULE_MESSAGE);
  const [cancelScheduledMutation, { loading: cancellingScheduled }] =
    useMutation(CANCEL_SCHEDULED_MESSAGE);
  const [updateScheduledMutation, { loading: updatingScheduled }] = useMutation(
    UPDATE_SCHEDULED_MESSAGE,
  );

  // Typing Indicators
  const [startTypingMutation] = useMutation(START_TYPING);
  const [stopTypingMutation] = useMutation(STOP_TYPING);

  // Bulk Operations
  const [deleteMultipleMutation, { loading: deletingMultiple }] = useMutation(
    DELETE_MULTIPLE_MESSAGES,
  );
  const [pinMultipleMutation, { loading: pinningMultiple }] = useMutation(
    PIN_MULTIPLE_MESSAGES,
  );

  // Reaction Mutations
  const [addReactionMutation, { loading: addingReaction }] =
    useMutation(ADD_REACTION);
  const [removeReactionMutation, { loading: removingReaction }] =
    useMutation(REMOVE_REACTION);
  const [toggleReactionMutation, { loading: togglingReaction }] =
    useMutation(TOGGLE_REACTION);

  // ============================================================================
  // Message CRUD Operations
  // ============================================================================

  const sendMessage = useCallback(
    async (input: SendMessageInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Sending message", {
          userId: user.id,
          channelId: input.channelId,
        });

        const { data } = await sendMessageMutation({
          variables: {
            channelId: input.channelId,
            content: input.content,
            replyToId: input.replyToId,
            attachments: input.attachments,
            mentions: input.mentions,
            metadata: input.metadata,
          },
        });

        logger.debug("Message sent", {
          userId: user.id,
          messageId: data.insert_nchat_messages_one.id,
        });
        return data.insert_nchat_messages_one;
      } catch (error) {
        logger.error("Failed to send message", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Failed to send message",
          description: "Could not send your message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, sendMessageMutation, toast],
  );

  const updateMessage = useCallback(
    async (messageId: string, input: UpdateMessageInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Updating message", { userId: user.id, messageId });

        const { data } = await updateMessageMutation({
          variables: {
            messageId,
            content: input.content,
            mentions: input.mentions,
          },
        });

        logger.info("Message updated", { userId: user.id, messageId });
        toast({
          title: "Message updated",
          description: "Your message has been edited.",
        });

        return data.update_nchat_messages_by_pk;
      } catch (error) {
        logger.error("Failed to update message", error as Error, {
          userId: user.id,
          messageId,
        });
        toast({
          title: "Update failed",
          description: "Could not edit your message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateMessageMutation, toast],
  );

  const deleteMessage = useCallback(
    async (messageId: string, soft = false) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Deleting message", { userId: user.id, messageId, soft });

        const mutation = soft
          ? softDeleteMessageMutation
          : deleteMessageMutation;
        const { data } = await mutation({
          variables: { messageId },
        });

        logger.info("Message deleted", { userId: user.id, messageId });
        toast({
          title: "Message deleted",
          description: "Your message has been removed.",
        });

        return soft
          ? data.update_nchat_messages_by_pk
          : data.delete_nchat_messages_by_pk;
      } catch (error) {
        logger.error("Failed to delete message", error as Error, {
          userId: user.id,
          messageId,
        });
        toast({
          title: "Delete failed",
          description: "Could not delete your message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, deleteMessageMutation, softDeleteMessageMutation, toast],
  );

  // ============================================================================
  // Message Interactions
  // ============================================================================

  const pinMessage = useCallback(
    async (messageId: string, channelId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Pinning message", {
          userId: user.id,
          messageId,
          channelId,
        });

        const { data } = await pinMessageMutation({
          variables: { messageId, channelId },
        });

        logger.info("Message pinned", { userId: user.id, messageId });
        toast({
          title: "Message pinned",
          description: "This message has been pinned to the channel.",
        });

        return data.insert_nchat_pinned_messages_one;
      } catch (error) {
        logger.error("Failed to pin message", error as Error, {
          userId: user.id,
          messageId,
        });
        toast({
          title: "Pin failed",
          description: "Could not pin the message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, pinMessageMutation, toast],
  );

  const unpinMessage = useCallback(
    async (messageId: string, channelId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Unpinning message", {
          userId: user.id,
          messageId,
          channelId,
        });

        await unpinMessageMutation({
          variables: { messageId, channelId },
        });

        logger.info("Message unpinned", { userId: user.id, messageId });
        toast({
          title: "Message unpinned",
          description: "This message has been unpinned.",
        });
      } catch (error) {
        logger.error("Failed to unpin message", error as Error, {
          userId: user.id,
          messageId,
        });
        toast({
          title: "Unpin failed",
          description: "Could not unpin the message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, unpinMessageMutation, toast],
  );

  const starMessage = useCallback(
    async (messageId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Starring message", { userId: user.id, messageId });

        await starMessageMutation({
          variables: { messageId, userId: user.id },
        });

        logger.debug("Message starred", { userId: user.id, messageId });
      } catch (error) {
        logger.error("Failed to star message", error as Error, {
          userId: user.id,
          messageId,
        });
        throw error;
      }
    },
    [user?.id, starMessageMutation],
  );

  const unstarMessage = useCallback(
    async (messageId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Unstarring message", { userId: user.id, messageId });

        await unstarMessageMutation({
          variables: { messageId, userId: user.id },
        });

        logger.debug("Message unstarred", { userId: user.id, messageId });
      } catch (error) {
        logger.error("Failed to unstar message", error as Error, {
          userId: user.id,
          messageId,
        });
        throw error;
      }
    },
    [user?.id, unstarMessageMutation],
  );

  const forwardMessage = useCallback(
    async (input: ForwardMessageInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Forwarding message", { userId: user.id, ...input });

        const { data } = await forwardMessageMutation({
          variables: {
            messageId: input.messageId,
            targetChannelId: input.targetChannelId,
            content: input.content,
            userId: user.id,
          },
        });

        logger.info("Message forwarded", {
          userId: user.id,
          messageId: input.messageId,
        });
        toast({
          title: "Message forwarded",
          description: "Message has been sent to the selected channel.",
        });

        return data.insert_nchat_messages_one;
      } catch (error) {
        logger.error("Failed to forward message", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Forward failed",
          description: "Could not forward the message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, forwardMessageMutation, toast],
  );

  const markMessageRead = useCallback(
    async (messageId: string) => {
      if (!user?.id) return;

      try {
        await markReadMutation({
          variables: { messageId, userId: user.id },
        });
      } catch (error) {
        logger.error("Failed to mark message read", error as Error, {
          userId: user.id,
          messageId,
        });
      }
    },
    [user?.id, markReadMutation],
  );

  const markMessageUnread = useCallback(
    async (messageId: string) => {
      if (!user?.id) return;

      try {
        logger.debug("Marking message unread", { userId: user.id, messageId });

        await markUnreadMutation({
          variables: { messageId, userId: user.id },
        });

        toast({
          title: "Marked as unread",
          description: "This message has been marked as unread.",
        });
      } catch (error) {
        logger.error("Failed to mark message unread", error as Error, {
          userId: user.id,
          messageId,
        });
        throw error;
      }
    },
    [user?.id, markUnreadMutation, toast],
  );

  // ============================================================================
  // Thread Operations
  // ============================================================================

  const createThread = useCallback(
    async (messageId: string, name?: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Creating thread", { userId: user.id, messageId, name });

        const { data } = await createThreadMutation({
          variables: { messageId, name },
        });

        logger.info("Thread created", { userId: user.id, messageId });
        toast({
          title: "Thread created",
          description: "A conversation thread has been started.",
        });

        return data.update_nchat_messages_by_pk;
      } catch (error) {
        logger.error("Failed to create thread", error as Error, {
          userId: user.id,
          messageId,
        });
        toast({
          title: "Thread creation failed",
          description: "Could not create a thread. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, createThreadMutation, toast],
  );

  const replyToThread = useCallback(
    async (
      threadId: string,
      channelId: string,
      content: string,
      mentions?: unknown,
    ) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Replying to thread", { userId: user.id, threadId });

        const { data } = await replyToThreadMutation({
          variables: { threadId, channelId, content, mentions },
        });

        logger.debug("Thread reply sent", { userId: user.id, threadId });
        return data.insert_nchat_messages_one;
      } catch (error) {
        logger.error("Failed to reply to thread", error as Error, {
          userId: user.id,
          threadId,
        });
        toast({
          title: "Reply failed",
          description: "Could not send your reply. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, replyToThreadMutation, toast],
  );

  const subscribeToThread = useCallback(
    async (messageId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        await subscribeThreadMutation({
          variables: { messageId, userId: user.id },
        });

        toast({
          title: "Subscribed to thread",
          description: "You will be notified of new replies.",
        });
      } catch (error) {
        logger.error("Failed to subscribe to thread", error as Error, {
          userId: user.id,
          messageId,
        });
        throw error;
      }
    },
    [user?.id, subscribeThreadMutation, toast],
  );

  const unsubscribeFromThread = useCallback(
    async (messageId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        await unsubscribeThreadMutation({
          variables: { messageId, userId: user.id },
        });

        toast({
          title: "Unsubscribed from thread",
          description: "You will no longer receive notifications.",
        });
      } catch (error) {
        logger.error("Failed to unsubscribe from thread", error as Error, {
          userId: user.id,
          messageId,
        });
        throw error;
      }
    },
    [user?.id, unsubscribeThreadMutation, toast],
  );

  // ============================================================================
  // Attachment Operations
  // ============================================================================

  const addAttachment = useCallback(
    async (messageId: string, attachment: AttachmentInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Adding attachment", { userId: user.id, messageId });

        const { data } = await addAttachmentMutation({
          variables: { messageId, attachment },
        });

        return data.update_nchat_messages_by_pk;
      } catch (error) {
        logger.error("Failed to add attachment", error as Error, {
          userId: user.id,
          messageId,
        });
        toast({
          title: "Attachment failed",
          description: "Could not add the attachment. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, addAttachmentMutation, toast],
  );

  const removeAttachment = useCallback(
    async (messageId: string, attachmentIndex: number) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Removing attachment", {
          userId: user.id,
          messageId,
          attachmentIndex,
        });

        const { data } = await removeAttachmentMutation({
          variables: { messageId, attachmentIndex },
        });

        return data.update_nchat_messages_by_pk;
      } catch (error) {
        logger.error("Failed to remove attachment", error as Error, {
          userId: user.id,
          messageId,
        });
        throw error;
      }
    },
    [user?.id, removeAttachmentMutation],
  );

  // ============================================================================
  // Scheduled Messages
  // ============================================================================

  const scheduleMessage = useCallback(
    async (input: ScheduleMessageInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Scheduling message", {
          userId: user.id,
          scheduledFor: input.scheduledFor,
        });

        const { data } = await scheduleMessageMutation({
          variables: {
            channelId: input.channelId,
            content: input.content,
            scheduledFor: input.scheduledFor,
            attachments: input.attachments,
            mentions: input.mentions,
          },
        });

        logger.info("Message scheduled", {
          userId: user.id,
          messageId: data.insert_nchat_scheduled_messages_one.id,
        });
        toast({
          title: "Message scheduled",
          description: `Your message will be sent at ${new Date(input.scheduledFor).toLocaleString()}.`,
        });

        return data.insert_nchat_scheduled_messages_one;
      } catch (error) {
        logger.error("Failed to schedule message", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Schedule failed",
          description: "Could not schedule your message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, scheduleMessageMutation, toast],
  );

  const cancelScheduledMessage = useCallback(
    async (messageId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Cancelling scheduled message", {
          userId: user.id,
          messageId,
        });

        await cancelScheduledMutation({
          variables: { messageId },
        });

        toast({
          title: "Schedule cancelled",
          description: "Your scheduled message has been cancelled.",
        });
      } catch (error) {
        logger.error("Failed to cancel scheduled message", error as Error, {
          userId: user.id,
          messageId,
        });
        toast({
          title: "Cancel failed",
          description: "Could not cancel the scheduled message.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, cancelScheduledMutation, toast],
  );

  const updateScheduledMessage = useCallback(
    async (messageId: string, content?: string, scheduledFor?: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Updating scheduled message", {
          userId: user.id,
          messageId,
        });

        const { data } = await updateScheduledMutation({
          variables: { messageId, content, scheduledFor },
        });

        toast({
          title: "Schedule updated",
          description: "Your scheduled message has been updated.",
        });

        return data.update_nchat_scheduled_messages_by_pk;
      } catch (error) {
        logger.error("Failed to update scheduled message", error as Error, {
          userId: user.id,
          messageId,
        });
        toast({
          title: "Update failed",
          description: "Could not update the scheduled message.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateScheduledMutation, toast],
  );

  // ============================================================================
  // Typing Indicators
  // ============================================================================

  const startTyping = useCallback(
    async (channelId: string) => {
      if (!user?.id) return;

      try {
        await startTypingMutation({
          variables: { channelId, userId: user.id },
        });
      } catch (error) {
        logger.error("Failed to start typing indicator", error as Error, {
          userId: user.id,
          channelId,
        });
      }
    },
    [user?.id, startTypingMutation],
  );

  const stopTyping = useCallback(
    async (channelId: string) => {
      if (!user?.id) return;

      try {
        await stopTypingMutation({
          variables: { channelId, userId: user.id },
        });
      } catch (error) {
        logger.error("Failed to stop typing indicator", error as Error, {
          userId: user.id,
          channelId,
        });
      }
    },
    [user?.id, stopTypingMutation],
  );

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  const deleteMultipleMessages = useCallback(
    async (messageIds: string[]) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Deleting multiple messages", {
          userId: user.id,
          count: messageIds.length,
        });

        const { data } = await deleteMultipleMutation({
          variables: { messageIds },
        });

        logger.info("Multiple messages deleted", {
          userId: user.id,
          count: data.delete_nchat_messages.affected_rows,
        });
        toast({
          title: "Messages deleted",
          description: `${data.delete_nchat_messages.affected_rows} messages have been removed.`,
        });

        return data.delete_nchat_messages;
      } catch (error) {
        logger.error("Failed to delete multiple messages", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Bulk delete failed",
          description: "Could not delete all messages. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, deleteMultipleMutation, toast],
  );

  const pinMultipleMessages = useCallback(
    async (pins: PinMessageInput[]) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Pinning multiple messages", {
          userId: user.id,
          count: pins.length,
        });

        const { data } = await pinMultipleMutation({
          variables: { pins },
        });

        toast({
          title: "Messages pinned",
          description: `${data.insert_nchat_pinned_messages.affected_rows} messages have been pinned.`,
        });

        return data.insert_nchat_pinned_messages;
      } catch (error) {
        logger.error("Failed to pin multiple messages", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Bulk pin failed",
          description: "Could not pin all messages. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, pinMultipleMutation, toast],
  );

  // ============================================================================
  // Reaction Operations
  // ============================================================================

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Adding reaction", { userId: user.id, messageId, emoji });

        const { data } = await addReactionMutation({
          variables: { messageId, emoji },
        });

        return data.insert_nchat_reactions_one;
      } catch (error) {
        logger.error("Failed to add reaction", error as Error, {
          userId: user.id,
          messageId,
        });
        throw error;
      }
    },
    [user?.id, addReactionMutation],
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Removing reaction", {
          userId: user.id,
          messageId,
          emoji,
        });

        await removeReactionMutation({
          variables: { messageId, emoji },
        });
      } catch (error) {
        logger.error("Failed to remove reaction", error as Error, {
          userId: user.id,
          messageId,
        });
        throw error;
      }
    },
    [user?.id, removeReactionMutation],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Toggling reaction", {
          userId: user.id,
          messageId,
          emoji,
        });

        await toggleReactionMutation({
          variables: { messageId, emoji, userId: user.id },
        });
      } catch (error) {
        logger.error("Failed to toggle reaction", error as Error, {
          userId: user.id,
          messageId,
        });
        throw error;
      }
    },
    [user?.id, toggleReactionMutation],
  );

  // ============================================================================
  // Return API
  // ============================================================================

  return {
    // CRUD
    sendMessage,
    updateMessage,
    deleteMessage,
    sendingMessage,
    updatingMessage,
    deletingMessage,
    softDeletingMessage,

    // Interactions
    pinMessage,
    unpinMessage,
    starMessage,
    unstarMessage,
    forwardMessage,
    markMessageRead,
    markMessageUnread,
    pinningMessage,
    unpinningMessage,
    starringMessage,
    unstarringMessage,
    forwardingMessage,
    markingRead,
    markingUnread,

    // Threads
    createThread,
    replyToThread,
    subscribeToThread,
    unsubscribeFromThread,
    creatingThread,
    replyingToThread,
    subscribingThread,
    unsubscribingThread,

    // Attachments
    addAttachment,
    removeAttachment,
    addingAttachment,
    removingAttachment,

    // Scheduled
    scheduleMessage,
    cancelScheduledMessage,
    updateScheduledMessage,
    schedulingMessage,
    cancellingScheduled,
    updatingScheduled,

    // Typing
    startTyping,
    stopTyping,

    // Bulk
    deleteMultipleMessages,
    pinMultipleMessages,
    deletingMultiple,
    pinningMultiple,

    // Reactions
    addReaction,
    removeReaction,
    toggleReaction,
    addingReaction,
    removingReaction,
    togglingReaction,
  };
}

/**
 * Hook for jumping to a specific message in a channel.
 * Navigates to the channel and scrolls to the target message.
 */
export function useJumpToMessage() {
  const jumpToMessage = useCallback((messageId: string, channelId: string) => {
    if (typeof window !== "undefined") {
      window.location.href = `/chat/${channelId}?messageId=${messageId}`;
    }
  }, []);

  return { jumpToMessage };
}
