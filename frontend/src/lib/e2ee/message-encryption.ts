/**
 * Message Encryption Integration
 * Helper functions to integrate E2EE into message sending/receiving
 */

import { getE2EEManager } from "./index";
import type { ApolloClient } from "@apollo/client";
import { crypto } from "./crypto";

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptedMessagePayload {
  isEncrypted: boolean;
  encryptedContent?: Uint8Array;
  messageType?: "PreKey" | "Normal";
  senderDeviceId?: string;
  plainContent?: string;
}

export interface MessageEncryptionOptions {
  userId: string; // Sender's user ID
  recipientUserId: string;
  recipientDeviceId?: string;
  channelId?: string;
  isDirectMessage: boolean;
}

// ============================================================================
// MESSAGE ENCRYPTION
// ============================================================================

/**
 * Encrypt a message before sending
 * Returns encrypted payload if E2EE is enabled, otherwise returns plaintext
 */
export async function encryptMessageForSending(
  plaintext: string,
  options: MessageEncryptionOptions,
  apolloClient: ApolloClient<any>,
): Promise<EncryptedMessagePayload> {
  const e2eeManager = getE2EEManager(apolloClient, options.userId);

  // Check if E2EE is initialized
  if (!e2eeManager.isInitialized()) {
    return {
      isEncrypted: false,
      plainContent: plaintext,
    };
  }

  // Only encrypt DMs and private channels
  if (!options.isDirectMessage && !options.channelId) {
    return {
      isEncrypted: false,
      plainContent: plaintext,
    };
  }

  try {
    // Get recipient device ID (default to first device)
    const deviceId =
      options.recipientDeviceId ||
      (await getDefaultDeviceId(options.recipientUserId, apolloClient));

    if (!deviceId) {
      logger.warn("No device ID found for recipient, sending unencrypted");
      return {
        isEncrypted: false,
        plainContent: plaintext,
      };
    }

    // Encrypt message
    const result = await e2eeManager.encryptMessage(
      plaintext,
      options.recipientUserId,
      deviceId,
    );

    return {
      isEncrypted: true,
      encryptedContent: result.encryptedPayload,
      messageType: result.type,
      senderDeviceId: result.deviceId,
    };
  } catch (error) {
    logger.error("Message encryption error:", error);
    // Fallback to unencrypted
    return {
      isEncrypted: false,
      plainContent: plaintext,
    };
  }
}

/**
 * Decrypt a received message
 */
export async function decryptReceivedMessage(
  encryptedPayload: Uint8Array,
  messageType: "PreKey" | "Normal",
  recipientUserId: string,
  senderUserId: string,
  senderDeviceId: string,
  apolloClient: ApolloClient<any>,
): Promise<string> {
  const e2eeManager = getE2EEManager(apolloClient, recipientUserId);

  if (!e2eeManager.isInitialized()) {
    throw new Error("E2EE not initialized");
  }

  try {
    return await e2eeManager.decryptMessage(
      encryptedPayload,
      messageType,
      senderUserId,
      senderDeviceId,
    );
  } catch (error) {
    logger.error("Message decryption error:", error);
    throw new Error("Failed to decrypt message");
  }
}

/**
 * Prepare message for database storage
 * Converts encrypted payload to storable format
 */
export function prepareMessageForStorage(payload: EncryptedMessagePayload): {
  content: string;
  is_encrypted: boolean;
  encrypted_payload?: number[];
  sender_device_id?: string;
  encryption_version?: number;
} {
  if (!payload.isEncrypted || !payload.encryptedContent) {
    return {
      content: payload.plainContent || "",
      is_encrypted: false,
    };
  }

  return {
    content: "[Encrypted Message]", // Placeholder for indexing
    is_encrypted: true,
    encrypted_payload: Array.from(payload.encryptedContent),
    sender_device_id: payload.senderDeviceId,
    encryption_version: 1, // Signal Protocol version
  };
}

/**
 * Extract message content for display
 * Handles both encrypted and plaintext messages
 */
export async function extractMessageContent(
  message: {
    content: string;
    is_encrypted: boolean;
    encrypted_payload?: number[];
    sender_device_id?: string;
    sender_user_id: string;
    recipient_user_id: string;
  },
  apolloClient: ApolloClient<any>,
): Promise<string> {
  if (!message.is_encrypted) {
    return message.content;
  }

  if (!message.encrypted_payload || !message.sender_device_id) {
    return "[Encrypted message - unable to decrypt]";
  }

  try {
    const encryptedPayload = new Uint8Array(message.encrypted_payload);
    // Message type should be stored in nchat_messages.encryption_metadata
    // For now, default to 'Normal' (PreKey messages are only for initial session setup)
    const messageType: "PreKey" | "Normal" = "Normal";

    return await decryptReceivedMessage(
      encryptedPayload,
      messageType,
      message.recipient_user_id,
      message.sender_user_id,
      message.sender_device_id,
      apolloClient,
    );
  } catch (error) {
    logger.error("Failed to extract message content:", error);
    return "[Encrypted message - decryption failed]";
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get default device ID for a user
 */
async function getDefaultDeviceId(
  userId: string,
  apolloClient: ApolloClient<any>,
): Promise<string | null> {
  try {
    const { gql } = await import("@apollo/client");

    const GET_USER_DEVICES = gql`
      query GetUserDevices($userId: uuid!) {
        nchat_identity_keys(
          where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
          order_by: { created_at: asc }
          limit: 1
        ) {
          device_id
        }
      }
    `;

    const { data } = await apolloClient.query({
      query: GET_USER_DEVICES,
      variables: { userId },
      fetchPolicy: "network-only",
    });

    if (data.nchat_identity_keys.length > 0) {
      return data.nchat_identity_keys[0].device_id;
    }

    return null;
  } catch (error) {
    logger.error("Error getting default device ID:", error);
    return null;
  }
}

/**
 * Check if a channel should use E2EE
 */
export function shouldEncryptChannel(channel: {
  is_private: boolean;
  is_direct_message: boolean;
}): boolean {
  // Encrypt DMs and private channels
  return channel.is_direct_message || channel.is_private;
}

/**
 * Generate encryption badge text
 */
export function getEncryptionBadgeText(
  isEncrypted: boolean,
  isVerified: boolean,
): string {
  if (!isEncrypted) {
    return "Not encrypted";
  }

  return isVerified ? "Verified E2EE" : "End-to-end encrypted";
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Encrypt multiple messages for group chat
 * Uses sender keys for efficiency
 */
export async function encryptMessagesForGroup(
  plaintext: string,
  senderUserId: string,
  recipientUserIds: string[],
  channelId: string,
  apolloClient: ApolloClient<any>,
): Promise<Map<string, EncryptedMessagePayload>> {
  const results = new Map<string, EncryptedMessagePayload>();

  // For now, encrypt individually (inefficient but functional)

  for (const userId of recipientUserIds) {
    try {
      const payload = await encryptMessageForSending(
        plaintext,
        {
          userId: senderUserId,
          recipientUserId: userId,
          channelId,
          isDirectMessage: false,
        },
        apolloClient,
      );

      results.set(userId, payload);
    } catch (error) {
      logger.error(`Failed to encrypt for user ${userId}:`, error);
      // Store unencrypted fallback
      results.set(userId, {
        isEncrypted: false,
        plainContent: plaintext,
      });
    }
  }

  return results;
}

/**
 * Decrypt multiple messages in batch
 */
export async function decryptMessagesBatch(
  messages: Array<{
    id: string;
    content: string;
    is_encrypted: boolean;
    encrypted_payload?: number[];
    sender_device_id?: string;
    sender_user_id: string;
    recipient_user_id: string;
  }>,
  apolloClient: ApolloClient<any>,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const message of messages) {
    try {
      const content = await extractMessageContent(message, apolloClient);
      results.set(message.id, content);
    } catch (error) {
      logger.error(`Failed to decrypt message ${message.id}:`, error);
      results.set(message.id, "[Decryption failed]");
    }
  }

  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  encryptMessageForSending,
  decryptReceivedMessage,
  prepareMessageForStorage,
  extractMessageContent,
  shouldEncryptChannel,
  getEncryptionBadgeText,
  encryptMessagesForGroup,
  decryptMessagesBatch,
};
