import { useSubscription, useMutation } from "@apollo/client";
import { MESSAGE_REACTIONS_SUBSCRIPTION } from "@/graphql/subscriptions/reactions";
import { ADD_REACTION, REMOVE_REACTION } from "@/graphql/mutations/reactions";
import { useAuth } from "@/contexts/auth-context";
import { useCallback, useMemo } from "react";

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    display_name: string;
  };
}

interface ReactionGroup {
  emoji: string;
  count: number;
  userReacted: boolean;
  users: string[];
}

export function useMessageReactions(messageId: string | null) {
  const { user } = useAuth();

  const { data, loading } = useSubscription(MESSAGE_REACTIONS_SUBSCRIPTION, {
    variables: { messageId },
    skip: !messageId,
  });

  const [addReactionMutation] = useMutation(ADD_REACTION);
  const [removeReactionMutation] = useMutation(REMOVE_REACTION);

  const reactions = useMemo(() => {
    const raw = (data?.nchat_reactions ?? []) as Reaction[];
    const groups = new Map<string, ReactionGroup>();

    for (const r of raw) {
      const existing = groups.get(r.emoji) ?? {
        emoji: r.emoji,
        count: 0,
        userReacted: false,
        users: [],
      };
      existing.count++;
      existing.users.push(r.user?.display_name ?? "Unknown");
      if (r.user_id === user?.id) {
        existing.userReacted = true;
      }
      groups.set(r.emoji, existing);
    }

    return Array.from(groups.values());
  }, [data, user?.id]);

  const addReaction = useCallback(
    async (emoji: string) => {
      if (!messageId) return;
      await addReactionMutation({
        variables: { messageId, emoji },
      });
    },
    [messageId, addReactionMutation],
  );

  const removeReaction = useCallback(
    async (emoji: string) => {
      if (!messageId) return;
      await removeReactionMutation({
        variables: { messageId, emoji },
      });
    },
    [messageId, removeReactionMutation],
  );

  const toggleReaction = useCallback(
    async (emoji: string) => {
      const group = reactions.find((r) => r.emoji === emoji);
      if (group?.userReacted) {
        await removeReaction(emoji);
      } else {
        await addReaction(emoji);
      }
    },
    [reactions, addReaction, removeReaction],
  );

  return {
    reactions,
    loading,
    addReaction,
    removeReaction,
    toggleReaction,
  };
}
