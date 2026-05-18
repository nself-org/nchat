/**
 * Bot Permissions Utilities
 * Handles permission checking and management for bot API access
 */

import { gql } from "@apollo/client";
import { getApolloClient } from "@/lib/apollo-client";

import { logger } from "@/lib/logger";

/**
 * Available bot permissions
 */
export enum BotPermission {
  // Messages
  MESSAGES_SEND = "messages.send",
  MESSAGES_READ = "messages.read",
  MESSAGES_DELETE = "messages.delete",
  MESSAGES_EDIT = "messages.edit",

  // Channels
  CHANNELS_CREATE = "channels.create",
  CHANNELS_READ = "channels.read",
  CHANNELS_UPDATE = "channels.update",
  CHANNELS_DELETE = "channels.delete",

  // Reactions
  REACTIONS_ADD = "reactions.add",
  REACTIONS_REMOVE = "reactions.remove",

  // Users
  USERS_READ = "users.read",
  USERS_UPDATE = "users.update",

  // Files
  FILES_UPLOAD = "files.upload",
  FILES_READ = "files.read",

  // Threads
  THREADS_CREATE = "threads.create",
  THREADS_READ = "threads.read",
}

/**
 * Permission categories
 */
export enum PermissionCategory {
  MESSAGES = "messages",
  CHANNELS = "channels",
  REACTIONS = "reactions",
  USERS = "users",
  FILES = "files",
  THREADS = "threads",
}

/**
 * Permission metadata
 */
export interface PermissionDefinition {
  permission: BotPermission;
  description: string;
  category: PermissionCategory;
  isDangerous: boolean;
}

/**
 * All permission definitions
 */
export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    permission: BotPermission.MESSAGES_SEND,
    description: "Send messages to channels",
    category: PermissionCategory.MESSAGES,
    isDangerous: false,
  },
  {
    permission: BotPermission.MESSAGES_READ,
    description: "Read message history",
    category: PermissionCategory.MESSAGES,
    isDangerous: false,
  },
  {
    permission: BotPermission.MESSAGES_DELETE,
    description: "Delete messages (own messages only)",
    category: PermissionCategory.MESSAGES,
    isDangerous: true,
  },
  {
    permission: BotPermission.MESSAGES_EDIT,
    description: "Edit messages (own messages only)",
    category: PermissionCategory.MESSAGES,
    isDangerous: false,
  },
  {
    permission: BotPermission.CHANNELS_CREATE,
    description: "Create new channels",
    category: PermissionCategory.CHANNELS,
    isDangerous: false,
  },
  {
    permission: BotPermission.CHANNELS_READ,
    description: "Read channel information",
    category: PermissionCategory.CHANNELS,
    isDangerous: false,
  },
  {
    permission: BotPermission.CHANNELS_UPDATE,
    description: "Update channel settings",
    category: PermissionCategory.CHANNELS,
    isDangerous: true,
  },
  {
    permission: BotPermission.CHANNELS_DELETE,
    description: "Delete channels",
    category: PermissionCategory.CHANNELS,
    isDangerous: true,
  },
  {
    permission: BotPermission.REACTIONS_ADD,
    description: "Add reactions to messages",
    category: PermissionCategory.REACTIONS,
    isDangerous: false,
  },
  {
    permission: BotPermission.REACTIONS_REMOVE,
    description: "Remove reactions from messages",
    category: PermissionCategory.REACTIONS,
    isDangerous: false,
  },
  {
    permission: BotPermission.USERS_READ,
    description: "Read user information",
    category: PermissionCategory.USERS,
    isDangerous: false,
  },
  {
    permission: BotPermission.USERS_UPDATE,
    description: "Update user profiles (bot profile only)",
    category: PermissionCategory.USERS,
    isDangerous: true,
  },
  {
    permission: BotPermission.FILES_UPLOAD,
    description: "Upload files and attachments",
    category: PermissionCategory.FILES,
    isDangerous: false,
  },
  {
    permission: BotPermission.FILES_READ,
    description: "Read file information",
    category: PermissionCategory.FILES,
    isDangerous: false,
  },
  {
    permission: BotPermission.THREADS_CREATE,
    description: "Create message threads",
    category: PermissionCategory.THREADS,
    isDangerous: false,
  },
  {
    permission: BotPermission.THREADS_READ,
    description: "Read thread messages",
    category: PermissionCategory.THREADS,
    isDangerous: false,
  },
];

/**
 * Get permissions by category
 */
export function getPermissionsByCategory(
  category: PermissionCategory,
): PermissionDefinition[] {
  return PERMISSION_DEFINITIONS.filter((p) => p.category === category);
}

/**
 * Get permission definition
 */
export function getPermissionDefinition(
  permission: BotPermission,
): PermissionDefinition | undefined {
  return PERMISSION_DEFINITIONS.find((p) => p.permission === permission);
}

/**
 * Check if a permission is dangerous
 */
export function isDangerousPermission(permission: BotPermission): boolean {
  return (
    PERMISSION_DEFINITIONS.find((p) => p.permission === permission)
      ?.isDangerous || false
  );
}

/**
 * GraphQL query to check bot permissions
 */
const CHECK_BOT_PERMISSION = gql`
  query CheckBotPermission($botId: uuid!, $permission: String!) {
    nchat_bot_permissions(
      where: { bot_id: { _eq: $botId }, permission: { _eq: $permission } }
    ) {
      id
      permission
    }
  }
`;

/**
 * GraphQL query to get all bot permissions
 */
const GET_BOT_PERMISSIONS = gql`
  query GetBotPermissions($botId: uuid!) {
    nchat_bot_permissions(where: { bot_id: { _eq: $botId } }) {
      id
      permission
      granted_by
      created_at
    }
  }
`;

/**
 * GraphQL mutation to grant permission
 */
const GRANT_BOT_PERMISSION = gql`
  mutation GrantBotPermission(
    $botId: uuid!
    $permission: String!
    $grantedBy: uuid!
  ) {
    insert_nchat_bot_permissions_one(
      object: {
        bot_id: $botId
        permission: $permission
        granted_by: $grantedBy
      }
      on_conflict: { constraint: bot_permission_unique, update_columns: [] }
    ) {
      id
      permission
    }
  }
`;

/**
 * GraphQL mutation to revoke permission
 */
const REVOKE_BOT_PERMISSION = gql`
  mutation RevokeBotPermission($botId: uuid!, $permission: String!) {
    delete_nchat_bot_permissions(
      where: { bot_id: { _eq: $botId }, permission: { _eq: $permission } }
    ) {
      affected_rows
    }
  }
`;

/**
 * Check if a bot has a specific permission
 *
 * @param botId - The bot ID
 * @param permission - The permission to check
 * @returns True if bot has permission
 *
 * @example
 * const canSend = await checkBotPermission(botId, BotPermission.MESSAGES_SEND);
 * if (!canSend) {
 *   throw new Error('Bot does not have permission to send messages');
 * }
 */
export async function checkBotPermission(
  botId: string,
  permission: BotPermission,
): Promise<boolean> {
  try {
    const client = getApolloClient();
    const { data } = await client.query({
      query: CHECK_BOT_PERMISSION,
      variables: { botId, permission },
      fetchPolicy: "network-only",
    });

    return data?.nchat_bot_permissions?.length > 0;
  } catch (error) {
    logger.error("Error checking bot permission:", error);
    return false;
  }
}

/**
 * Check if a bot has all of the specified permissions
 *
 * @param botId - The bot ID
 * @param permissions - Array of permissions to check
 * @returns True if bot has all permissions
 */
export async function checkBotPermissions(
  botId: string,
  permissions: BotPermission[],
): Promise<boolean> {
  const results = await Promise.all(
    permissions.map((p) => checkBotPermission(botId, p)),
  );

  return results.every((result) => result === true);
}

/**
 * Get all permissions for a bot
 *
 * @param botId - The bot ID
 * @returns Array of permissions
 */
export async function getBotPermissions(botId: string): Promise<string[]> {
  try {
    const client = getApolloClient();
    const { data } = await client.query({
      query: GET_BOT_PERMISSIONS,
      variables: { botId },
      fetchPolicy: "network-only",
    });

    return data?.nchat_bot_permissions?.map((p: any) => p.permission) || [];
  } catch (error) {
    logger.error("Error getting bot permissions:", error);
    return [];
  }
}

/**
 * Grant a permission to a bot
 *
 * @param botId - The bot ID
 * @param permission - The permission to grant
 * @param grantedBy - User ID granting the permission
 */
export async function grantBotPermission(
  botId: string,
  permission: BotPermission,
  grantedBy: string,
): Promise<void> {
  try {
    const client = getApolloClient();
    await client.mutate({
      mutation: GRANT_BOT_PERMISSION,
      variables: { botId, permission, grantedBy },
    });
  } catch (error) {
    logger.error("Error granting bot permission:", error);
    throw error;
  }
}

/**
 * Revoke a permission from a bot
 *
 * @param botId - The bot ID
 * @param permission - The permission to revoke
 */
export async function revokeBotPermission(
  botId: string,
  permission: BotPermission,
): Promise<void> {
  try {
    const client = getApolloClient();
    await client.mutate({
      mutation: REVOKE_BOT_PERMISSION,
      variables: { botId, permission },
    });
  } catch (error) {
    logger.error("Error revoking bot permission:", error);
    throw error;
  }
}

/**
 * Grant multiple permissions to a bot
 *
 * @param botId - The bot ID
 * @param permissions - Array of permissions to grant
 * @param grantedBy - User ID granting the permissions
 */
export async function grantBotPermissions(
  botId: string,
  permissions: BotPermission[],
  grantedBy: string,
): Promise<void> {
  await Promise.all(
    permissions.map((p) => grantBotPermission(botId, p, grantedBy)),
  );
}

/**
 * Revoke multiple permissions from a bot
 *
 * @param botId - The bot ID
 * @param permissions - Array of permissions to revoke
 */
export async function revokeBotPermissions(
  botId: string,
  permissions: BotPermission[],
): Promise<void> {
  await Promise.all(permissions.map((p) => revokeBotPermission(botId, p)));
}

/**
 * Validate permission string format
 *
 * @param permission - The permission string to validate
 * @returns True if permission format is valid
 */
export function isValidPermissionFormat(permission: string): boolean {
  return /^[a-z]+\.[a-z]+$/.test(permission);
}

/**
 * Check if token scopes include required permission
 * Used for token-level permission checks
 *
 * @param tokenScopes - Array of scopes from token
 * @param requiredPermission - The required permission
 * @returns True if token has permission
 */
export function tokenHasPermission(
  tokenScopes: string[],
  requiredPermission: BotPermission,
): boolean {
  // Check for exact match
  if (tokenScopes.includes(requiredPermission)) {
    return true;
  }

  // Check for wildcard scopes (e.g., "messages.*" includes "messages.send")
  const [category] = requiredPermission.split(".");
  if (tokenScopes.includes(`${category}.*`)) {
    return true;
  }

  // Check for admin scope (all permissions)
  if (tokenScopes.includes("*")) {
    return true;
  }

  return false;
}
