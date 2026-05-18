/**
 * Hook for bot token operations
 * Handles generation, revocation, and management of bot API tokens
 */

import { useQuery, useMutation } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { generateBotToken, hashToken } from "@/lib/bots/tokens";
import {
  GET_BOT_TOKENS,
  CREATE_BOT_TOKEN,
  REVOKE_BOT_TOKEN,
  DELETE_BOT_TOKEN,
  GET_BOT_PERMISSIONS,
  GRANT_BOT_PERMISSION,
  REVOKE_BOT_PERMISSION,
  GET_PERMISSION_DEFINITIONS,
  GET_BOT_WEBHOOKS,
  CREATE_BOT_WEBHOOK,
  UPDATE_BOT_WEBHOOK,
  DELETE_BOT_WEBHOOK,
  GET_WEBHOOK_LOGS,
  GET_BOT_API_LOGS,
} from "@/graphql/bots";
import { generateWebhookSecret } from "@/lib/bots/tokens";

import { logger } from "@/lib/logger";

/**
 * Hook to get bot tokens
 */
export function useBotTokens(botId: string | null) {
  const { data, loading, error, refetch } = useQuery(GET_BOT_TOKENS, {
    variables: { botId },
    skip: !botId,
    fetchPolicy: "cache-and-network",
  });

  return {
    tokens: data?.nchat_bot_tokens || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to generate a bot token
 * Returns the plaintext token only once (not stored)
 */
export function useGenerateBotToken() {
  const [createTokenMutation, { loading, error }] =
    useMutation(CREATE_BOT_TOKEN);

  const generateToken = async (
    botId: string,
    name: string,
    scopes: string[],
    expiresAt?: Date,
  ) => {
    try {
      // Generate token
      const token = generateBotToken();
      const tokenHash = hashToken(token);

      // Save to database
      const result = await createTokenMutation({
        variables: {
          botId,
          name,
          tokenHash,
          scopes,
          expiresAt: expiresAt?.toISOString() || null,
        },
        refetchQueries: [{ query: GET_BOT_TOKENS, variables: { botId } }],
      });

      // Return both token and database record
      return {
        token, // Plaintext token (show once)
        record: result.data?.insert_nchat_bot_tokens_one,
      };
    } catch (err) {
      logger.error("Error generating bot token:", err);
      throw err;
    }
  };

  return {
    generateToken,
    loading,
    error,
  };
}

/**
 * Hook to revoke a bot token
 */
export function useRevokeBotToken() {
  const [revokeTokenMutation, { loading, error }] =
    useMutation(REVOKE_BOT_TOKEN);

  const revokeToken = async (tokenId: string, botId: string) => {
    try {
      await revokeTokenMutation({
        variables: { tokenId },
        refetchQueries: [{ query: GET_BOT_TOKENS, variables: { botId } }],
      });
    } catch (err) {
      logger.error("Error revoking bot token:", err);
      throw err;
    }
  };

  return {
    revokeToken,
    loading,
    error,
  };
}

/**
 * Hook to delete a bot token
 */
export function useDeleteBotToken() {
  const [deleteTokenMutation, { loading, error }] =
    useMutation(DELETE_BOT_TOKEN);

  const deleteToken = async (tokenId: string, botId: string) => {
    try {
      await deleteTokenMutation({
        variables: { tokenId },
        refetchQueries: [{ query: GET_BOT_TOKENS, variables: { botId } }],
      });
    } catch (err) {
      logger.error("Error deleting bot token:", err);
      throw err;
    }
  };

  return {
    deleteToken,
    loading,
    error,
  };
}

/**
 * Hook to get bot permissions
 */
export function useBotPermissions(botId: string | null) {
  const { data, loading, error, refetch } = useQuery(GET_BOT_PERMISSIONS, {
    variables: { botId },
    skip: !botId,
    fetchPolicy: "cache-and-network",
  });

  return {
    permissions: data?.nchat_bot_permissions || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to get permission definitions
 */
export function usePermissionDefinitions() {
  const { data, loading, error } = useQuery(GET_PERMISSION_DEFINITIONS, {
    fetchPolicy: "cache-first",
  });

  return {
    definitions: data?.nchat_bot_permission_definitions || [],
    loading,
    error,
  };
}

/**
 * Hook to grant bot permission
 */
export function useGrantBotPermission() {
  const { user } = useAuth();
  const [grantPermissionMutation, { loading, error }] =
    useMutation(GRANT_BOT_PERMISSION);

  const grantPermission = async (botId: string, permission: string) => {
    try {
      await grantPermissionMutation({
        variables: {
          botId,
          permission,
          grantedBy: user?.id,
        },
        refetchQueries: [{ query: GET_BOT_PERMISSIONS, variables: { botId } }],
      });
    } catch (err) {
      logger.error("Error granting bot permission:", err);
      throw err;
    }
  };

  return {
    grantPermission,
    loading,
    error,
  };
}

/**
 * Hook to revoke bot permission
 */
export function useRevokeBotPermission() {
  const [revokePermissionMutation, { loading, error }] = useMutation(
    REVOKE_BOT_PERMISSION,
  );

  const revokePermission = async (botId: string, permission: string) => {
    try {
      await revokePermissionMutation({
        variables: { botId, permission },
        refetchQueries: [{ query: GET_BOT_PERMISSIONS, variables: { botId } }],
      });
    } catch (err) {
      logger.error("Error revoking bot permission:", err);
      throw err;
    }
  };

  return {
    revokePermission,
    loading,
    error,
  };
}

/**
 * Hook to get bot webhooks
 */
export function useBotWebhooks(botId: string | null) {
  const { data, loading, error, refetch } = useQuery(GET_BOT_WEBHOOKS, {
    variables: { botId },
    skip: !botId,
    fetchPolicy: "cache-and-network",
  });

  return {
    webhooks: data?.nchat_bot_webhooks || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to create bot webhook
 */
export function useCreateBotWebhook() {
  const [createWebhookMutation, { loading, error }] =
    useMutation(CREATE_BOT_WEBHOOK);

  const createWebhook = async (
    botId: string,
    url: string,
    events: string[],
  ) => {
    try {
      const secret = generateWebhookSecret();

      const result = await createWebhookMutation({
        variables: {
          botId,
          url,
          events,
          secret,
        },
        refetchQueries: [{ query: GET_BOT_WEBHOOKS, variables: { botId } }],
      });

      return {
        webhook: result.data?.insert_nchat_bot_webhooks_one,
        secret, // Return secret to show once
      };
    } catch (err) {
      logger.error("Error creating bot webhook:", err);
      throw err;
    }
  };

  return {
    createWebhook,
    loading,
    error,
  };
}

/**
 * Hook to update bot webhook
 */
export function useUpdateBotWebhook() {
  const [updateWebhookMutation, { loading, error }] =
    useMutation(UPDATE_BOT_WEBHOOK);

  const updateWebhook = async (
    webhookId: string,
    botId: string,
    input: {
      url?: string;
      events?: string[];
      isActive?: boolean;
    },
  ) => {
    try {
      await updateWebhookMutation({
        variables: {
          webhookId,
          ...input,
        },
        refetchQueries: [{ query: GET_BOT_WEBHOOKS, variables: { botId } }],
      });
    } catch (err) {
      logger.error("Error updating bot webhook:", err);
      throw err;
    }
  };

  return {
    updateWebhook,
    loading,
    error,
  };
}

/**
 * Hook to delete bot webhook
 */
export function useDeleteBotWebhook() {
  const [deleteWebhookMutation, { loading, error }] =
    useMutation(DELETE_BOT_WEBHOOK);

  const deleteWebhook = async (webhookId: string, botId: string) => {
    try {
      await deleteWebhookMutation({
        variables: { webhookId },
        refetchQueries: [{ query: GET_BOT_WEBHOOKS, variables: { botId } }],
      });
    } catch (err) {
      logger.error("Error deleting bot webhook:", err);
      throw err;
    }
  };

  return {
    deleteWebhook,
    loading,
    error,
  };
}

/**
 * Hook to get webhook logs
 */
export function useWebhookLogs(webhookId: string | null, limit: number = 50) {
  const { data, loading, error, refetch } = useQuery(GET_WEBHOOK_LOGS, {
    variables: { webhookId, limit },
    skip: !webhookId,
    fetchPolicy: "cache-and-network",
  });

  return {
    logs: data?.nchat_bot_webhook_logs || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to get bot API logs
 */
export function useBotApiLogs(botId: string | null, limit: number = 100) {
  const { data, loading, error, refetch } = useQuery(GET_BOT_API_LOGS, {
    variables: { botId, limit },
    skip: !botId,
    fetchPolicy: "cache-and-network",
  });

  return {
    logs: data?.nchat_bot_api_logs || [],
    loading,
    error,
    refetch,
  };
}
