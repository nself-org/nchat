"use client";

/**
 * Social Features Mutations Hook
 *
 * React hook for social interactions including DMs, calls, friendships,
 * blocking, reporting, and file sharing.
 */

import { useMutation } from "@apollo/client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import {
  CREATE_DM_CHANNEL,
  GET_OR_CREATE_DM,
  INITIATE_CALL,
  ACCEPT_CALL,
  REJECT_CALL,
  END_CALL,
  BLOCK_USER,
  UNBLOCK_USER,
  REPORT_USER,
  REPORT_MESSAGE,
  INVITE_USER_TO_CHANNEL,
  UPDATE_USER_STATUS,
  SHARE_FILE,
  type InitiateCallInput,
  type ReportUserInput,
  type InviteToChannelInput,
  type ShareFileInput,
} from "@/graphql/mutations/social";

export function useSocialMutations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // ============================================================================
  // Direct Message Mutations
  // ============================================================================

  const [getOrCreateDMMutation, { loading: creatingDM }] =
    useMutation(GET_OR_CREATE_DM);

  const openDM = useCallback(
    async (otherUserId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Opening DM", { userId: user.id, otherUserId });

        const { data } = await getOrCreateDMMutation({
          variables: { userId: user.id, otherUserId },
        });

        const { channel_id, created } = data.get_or_create_dm;

        if (created) {
          logger.info("DM channel created", {
            userId: user.id,
            channelId: channel_id,
          });
          toast({
            title: "Conversation started",
            description: "A new direct message conversation has been created.",
          });
        } else {
          logger.debug("Existing DM channel opened", {
            userId: user.id,
            channelId: channel_id,
          });
        }

        // Navigate to DM
        router.push(`/chat/dm/${channel_id}`);

        return channel_id;
      } catch (error) {
        logger.error("Failed to open DM", error as Error, {
          userId: user.id,
          otherUserId,
        });
        toast({
          title: "Failed to open conversation",
          description: "Could not start a direct message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, getOrCreateDMMutation, router, toast],
  );

  // ============================================================================
  // Call Mutations
  // ============================================================================

  const [initiateCallMutation, { loading: initiatingCall }] =
    useMutation(INITIATE_CALL);
  const [acceptCallMutation, { loading: acceptingCall }] =
    useMutation(ACCEPT_CALL);
  const [rejectCallMutation, { loading: rejectingCall }] =
    useMutation(REJECT_CALL);
  const [endCallMutation, { loading: endingCall }] = useMutation(END_CALL);

  const initiateCall = useCallback(
    async (input: InitiateCallInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Initiating call", { userId: user.id, ...input });

        const { data } = await initiateCallMutation({
          variables: input,
        });

        logger.info("Call initiated", {
          callId: data.insert_nchat_calls_one.id,
        });
        toast({
          title: "Calling...",
          description: `${input.type === "video" ? "Video" : "Voice"} call initiated.`,
        });

        return data.insert_nchat_calls_one;
      } catch (error) {
        logger.error("Failed to initiate call", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Call failed",
          description: "Could not initiate the call. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, initiateCallMutation, toast],
  );

  const acceptCall = useCallback(
    async (callId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Accepting call", { userId: user.id, callId });

        const { data } = await acceptCallMutation({
          variables: { callId },
        });

        logger.info("Call accepted", { callId });
        return data.update_nchat_calls_by_pk;
      } catch (error) {
        logger.error("Failed to accept call", error as Error, {
          userId: user.id,
          callId,
        });
        toast({
          title: "Failed to accept",
          description: "Could not accept the call. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, acceptCallMutation, toast],
  );

  const rejectCall = useCallback(
    async (callId: string, reason?: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Rejecting call", { userId: user.id, callId, reason });

        const { data } = await rejectCallMutation({
          variables: { callId, reason },
        });

        logger.info("Call rejected", { callId });
        return data.update_nchat_calls_by_pk;
      } catch (error) {
        logger.error("Failed to reject call", error as Error, {
          userId: user.id,
          callId,
        });
        throw error;
      }
    },
    [user?.id, rejectCallMutation],
  );

  const endCall = useCallback(
    async (callId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Ending call", { userId: user.id, callId });

        const { data } = await endCallMutation({
          variables: { callId },
        });

        logger.info("Call ended", { callId });
        return data.update_nchat_calls_by_pk;
      } catch (error) {
        logger.error("Failed to end call", error as Error, {
          userId: user.id,
          callId,
        });
        throw error;
      }
    },
    [user?.id, endCallMutation],
  );

  // ============================================================================
  // Blocking Mutations
  // ============================================================================

  const [blockUserMutation, { loading: blockingUser }] =
    useMutation(BLOCK_USER);
  const [unblockUserMutation, { loading: unblockingUser }] =
    useMutation(UNBLOCK_USER);

  const blockUser = useCallback(
    async (blockedUserId: string, reason?: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Blocking user", {
          userId: user.id,
          blockedUserId,
          reason,
        });

        const { data } = await blockUserMutation({
          variables: { userId: user.id, blockedUserId, reason },
        });

        logger.info("User blocked", { userId: user.id, blockedUserId });
        toast({
          title: "User blocked",
          description: "You will no longer see messages from this user.",
        });

        return data.insert_nchat_blocked_users_one;
      } catch (error) {
        logger.error("Failed to block user", error as Error, {
          userId: user.id,
          blockedUserId,
        });
        toast({
          title: "Block failed",
          description: "Could not block this user. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, blockUserMutation, toast],
  );

  const unblockUser = useCallback(
    async (blockedUserId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Unblocking user", { userId: user.id, blockedUserId });

        const { data } = await unblockUserMutation({
          variables: { userId: user.id, blockedUserId },
        });

        logger.info("User unblocked", { userId: user.id, blockedUserId });
        toast({
          title: "User unblocked",
          description: "You can now see messages from this user again.",
        });

        return data;
      } catch (error) {
        logger.error("Failed to unblock user", error as Error, {
          userId: user.id,
          blockedUserId,
        });
        toast({
          title: "Unblock failed",
          description: "Could not unblock this user. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, unblockUserMutation, toast],
  );

  // ============================================================================
  // Reporting Mutations
  // ============================================================================

  const [reportUserMutation, { loading: reportingUser }] =
    useMutation(REPORT_USER);
  const [reportMessageMutation, { loading: reportingMessage }] =
    useMutation(REPORT_MESSAGE);

  const reportUser = useCallback(
    async (input: ReportUserInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Reporting user", { userId: user.id, ...input });

        const { data } = await reportUserMutation({
          variables: input,
        });

        logger.info("User reported", {
          reportId: data.insert_nchat_user_reports_one.id,
        });
        toast({
          title: "Report submitted",
          description: "Thank you for helping keep the community safe.",
        });

        return data.insert_nchat_user_reports_one;
      } catch (error) {
        logger.error("Failed to report user", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Report failed",
          description: "Could not submit the report. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, reportUserMutation, toast],
  );

  const reportMessage = useCallback(
    async (messageId: string, reason: string, details?: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Reporting message", {
          userId: user.id,
          messageId,
          reason,
        });

        const { data } = await reportMessageMutation({
          variables: { reporterId: user.id, messageId, reason, details },
        });

        logger.info("Message reported", {
          reportId: data.insert_nchat_message_reports_one.id,
        });
        toast({
          title: "Message reported",
          description: "The message has been reported to moderators.",
        });

        return data.insert_nchat_message_reports_one;
      } catch (error) {
        logger.error("Failed to report message", error as Error, {
          userId: user.id,
          messageId,
        });
        toast({
          title: "Report failed",
          description: "Could not report the message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, reportMessageMutation, toast],
  );

  // ============================================================================
  // Invitation Mutations
  // ============================================================================

  const [inviteToChannelMutation, { loading: invitingToChannel }] = useMutation(
    INVITE_USER_TO_CHANNEL,
  );

  const inviteToChannel = useCallback(
    async (input: InviteToChannelInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Inviting user to channel", { userId: user.id, ...input });

        const { data } = await inviteToChannelMutation({
          variables: input,
        });

        logger.info("Invitation sent", {
          inviteId: data.insert_nchat_channel_invites_one.id,
        });
        toast({
          title: "Invitation sent",
          description: `An invitation has been sent to ${input.inviteeEmail}.`,
        });

        return data.insert_nchat_channel_invites_one;
      } catch (error) {
        logger.error("Failed to send invitation", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Invitation failed",
          description: "Could not send the invitation. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, inviteToChannelMutation, toast],
  );

  // ============================================================================
  // Status Mutations
  // ============================================================================

  const [updateStatusMutation, { loading: updatingStatus }] =
    useMutation(UPDATE_USER_STATUS);

  const updateStatus = useCallback(
    async (status: string, statusText?: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Updating user status", { userId: user.id, status });

        const { data } = await updateStatusMutation({
          variables: { userId: user.id, status, statusText },
        });

        return data.update_nchat_users_by_pk;
      } catch (error) {
        logger.error("Failed to update status", error as Error, {
          userId: user.id,
        });
        throw error;
      }
    },
    [user?.id, updateStatusMutation],
  );

  // ============================================================================
  // File Sharing Mutations
  // ============================================================================

  const [shareFileMutation, { loading: sharingFile }] = useMutation(SHARE_FILE);

  const shareFile = useCallback(
    async (input: ShareFileInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Sharing file", {
          userId: user.id,
          fileName: input.fileName,
        });

        const { data } = await shareFileMutation({
          variables: input,
        });

        logger.info("File shared", {
          fileId: data.insert_nchat_shared_files_one.id,
        });
        toast({
          title: "File shared",
          description: `${input.fileName} has been shared.`,
        });

        return data.insert_nchat_shared_files_one;
      } catch (error) {
        logger.error("Failed to share file", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Share failed",
          description: "Could not share the file. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, shareFileMutation, toast],
  );

  // ============================================================================
  // Return API
  // ============================================================================

  return {
    // Direct Messages
    openDM,
    creatingDM,

    // Calls
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    initiatingCall,
    acceptingCall,
    rejectingCall,
    endingCall,

    // Blocking
    blockUser,
    unblockUser,
    blockingUser,
    unblockingUser,

    // Reporting
    reportUser,
    reportMessage,
    reportingUser,
    reportingMessage,

    // Invitations
    inviteToChannel,
    invitingToChannel,

    // Status
    updateStatus,
    updatingStatus,

    // File Sharing
    shareFile,
    sharingFile,
  };
}
