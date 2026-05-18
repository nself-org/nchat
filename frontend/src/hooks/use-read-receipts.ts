import { useSubscription, useMutation } from "@apollo/client";
import { CHANNEL_READ_STATUS_SUBSCRIPTION } from "@/graphql/subscriptions/read-receipts";
import {
  MARK_CHANNEL_READ,
  UPDATE_LAST_READ,
} from "@/graphql/mutations/read-receipts";
import { useAuth } from "@/contexts/auth-context";
import { useCallback, useMemo } from "react";

interface ReadStatus {
  user_id: string;
  channel_id: string;
  last_read_message_id?: string;
  last_read_at: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export function useChannelReadStatus(channelId: string | null) {
  const { data, loading } = useSubscription(CHANNEL_READ_STATUS_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId,
  });

  const readStatuses = useMemo(() => {
    return (data?.nchat_read_status ?? []) as ReadStatus[];
  }, [data]);

  const getReadBy = useCallback(
    (messageId: string) => {
      return readStatuses.filter((s) => s.last_read_message_id === messageId);
    },
    [readStatuses],
  );

  return { readStatuses, getReadBy, loading };
}

export function useMarkRead() {
  const { user } = useAuth();
  const [markReadMutation] = useMutation(MARK_CHANNEL_READ);
  const [updateLastReadMutation] = useMutation(UPDATE_LAST_READ);

  const markRead = useCallback(
    async (channelId: string, messageId: string) => {
      if (!user?.id) return;
      await markReadMutation({
        variables: { channelId, userId: user.id, messageId },
      });
    },
    [user?.id, markReadMutation],
  );

  const updateLastRead = useCallback(
    async (channelId: string) => {
      if (!user?.id) return;
      await updateLastReadMutation({
        variables: { channelId, userId: user.id },
      });
    },
    [user?.id, updateLastReadMutation],
  );

  return { markRead, updateLastRead };
}
