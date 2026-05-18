/**
 * Hook for bot operations
 * Handles CRUD operations for bots
 */

import { useQuery, useMutation } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  GET_BOTS,
  GET_BOT,
  CREATE_BOT,
  UPDATE_BOT,
  DELETE_BOT,
} from "@/graphql/bots";

import { logger } from "@/lib/logger";

/**
 * Hook to get all bots
 */
export function useBots() {
  const { data, loading, error, refetch } = useQuery(GET_BOTS, {
    fetchPolicy: "cache-and-network",
  });

  return {
    bots: data?.nchat_bots || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to get a single bot
 */
export function useBot(botId: string | null) {
  const { data, loading, error, refetch } = useQuery(GET_BOT, {
    variables: { botId },
    skip: !botId,
    fetchPolicy: "cache-and-network",
  });

  return {
    bot: data?.nchat_bots_by_pk,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to create a bot
 */
export function useCreateBot() {
  const { user } = useAuth();
  const [createBotMutation, { loading, error }] = useMutation(CREATE_BOT);

  const createBot = async (input: {
    name: string;
    description?: string;
    avatarUrl?: string;
    botType?: "custom" | "integration" | "system";
    metadata?: Record<string, any>;
  }) => {
    try {
      const result = await createBotMutation({
        variables: {
          name: input.name,
          description: input.description || null,
          avatarUrl: input.avatarUrl || null,
          botType: input.botType || "custom",
          createdBy: user?.id,
          metadata: input.metadata || {},
        },
        refetchQueries: [{ query: GET_BOTS }],
      });

      return result.data?.insert_nchat_users_one?.bot?.returning?.[0];
    } catch (err) {
      logger.error("Error creating bot:", err);
      throw err;
    }
  };

  return {
    createBot,
    loading,
    error,
  };
}

/**
 * Hook to update a bot
 */
export function useUpdateBot() {
  const [updateBotMutation, { loading, error }] = useMutation(UPDATE_BOT);

  const updateBot = async (
    botId: string,
    input: {
      name?: string;
      description?: string;
      avatarUrl?: string;
      isActive?: boolean;
      metadata?: Record<string, any>;
    },
  ) => {
    try {
      const result = await updateBotMutation({
        variables: {
          botId,
          ...input,
        },
        refetchQueries: [
          { query: GET_BOTS },
          { query: GET_BOT, variables: { botId } },
        ],
      });

      return result.data?.update_nchat_bots_by_pk;
    } catch (err) {
      logger.error("Error updating bot:", err);
      throw err;
    }
  };

  return {
    updateBot,
    loading,
    error,
  };
}

/**
 * Hook to delete a bot
 */
export function useDeleteBot() {
  const [deleteBotMutation, { loading, error }] = useMutation(DELETE_BOT);

  const deleteBot = async (botId: string) => {
    try {
      await deleteBotMutation({
        variables: { botId },
        refetchQueries: [{ query: GET_BOTS }],
      });
    } catch (err) {
      logger.error("Error deleting bot:", err);
      throw err;
    }
  };

  return {
    deleteBot,
    loading,
    error,
  };
}
