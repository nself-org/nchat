import { useSubscription, useMutation } from "@apollo/client";
import { CHANNEL_MESSAGES_SUBSCRIPTION } from "@/graphql/subscriptions/messages";
import {
  SEND_MESSAGE,
  UPDATE_MESSAGE,
  DELETE_MESSAGE,
} from "@/graphql/mutations/messages";
import { useCallback, useMemo } from "react";

interface Message {
  id: string;
  content: string;
  channel_id: string;
  author_id: string;
  created_at: string;
  updated_at?: string;
  reply_to_id?: string;
  author: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export function useChannelMessages(channelId: string | null) {
  const { data, loading, error } = useSubscription(
    CHANNEL_MESSAGES_SUBSCRIPTION,
    {
      variables: { channelId, limit: 50 },
      skip: !channelId,
    },
  );

  const [sendMessageMutation] = useMutation(SEND_MESSAGE);
  const [updateMessageMutation] = useMutation(UPDATE_MESSAGE);
  const [deleteMessageMutation] = useMutation(DELETE_MESSAGE);

  const messages = useMemo(() => {
    return (data?.nchat_messages ?? []) as Message[];
  }, [data]);

  const sendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      if (!channelId) return null;
      const result = await sendMessageMutation({
        variables: { channelId, content, replyToId },
      });
      return result.data?.insert_nchat_messages_one;
    },
    [channelId, sendMessageMutation],
  );

  const updateMessage = useCallback(
    async (messageId: string, content: string) => {
      const result = await updateMessageMutation({
        variables: { messageId, content },
      });
      return result.data?.update_nchat_messages_by_pk;
    },
    [updateMessageMutation],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      await deleteMessageMutation({
        variables: { messageId },
      });
    },
    [deleteMessageMutation],
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    updateMessage,
    deleteMessage,
  };
}
