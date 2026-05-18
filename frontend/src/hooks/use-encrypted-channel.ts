/**
 * useEncryptedChannel - Hook for managing encrypted channel communication
 *
 * Provides auto-encryption of outgoing messages, auto-decryption of incoming
 * messages, and key exchange handling for end-to-end encrypted channels.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useEncryptionStore } from "@/stores/encryption-store";
import type { EncryptedMessage } from "@/lib/crypto/message-encryption";

// ============================================================================
// Types
// ============================================================================

export interface EncryptedChannelState {
  /** Whether encryption is enabled for this channel */
  isEncrypted: boolean;
  /** Current encryption status */
  status: "disabled" | "initializing" | "enabled" | "error";
  /** Error message if any */
  error: string | null;
  /** Whether the channel is ready to send encrypted messages */
  isReady: boolean;
  /** Number of encrypted messages sent in this channel */
  messagesSent: number;
  /** Number of encrypted messages received in this channel */
  messagesReceived: number;
}

export interface EncryptedChannelActions {
  /** Enables encryption for the channel */
  enableEncryption: () => Promise<void>;
  /** Disables encryption for the channel */
  disableEncryption: () => void;
  /** Encrypts a message for sending */
  encryptMessage: (plaintext: string) => Promise<EncryptedMessage | null>;
  /** Decrypts a received message */
  decryptMessage: (encrypted: EncryptedMessage) => Promise<string | null>;
  /** Refreshes the encryption keys for the channel */
  refreshKeys: () => Promise<void>;
  /** Clears any encryption errors */
  clearError: () => void;
}

export interface UseEncryptedChannelOptions {
  /** Whether to auto-enable encryption when the hook mounts */
  autoEnable?: boolean;
  /** Callback when encryption status changes */
  onStatusChange?: (status: EncryptedChannelState["status"]) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Callback when a message is encrypted */
  onMessageEncrypted?: () => void;
  /** Callback when a message is decrypted */
  onMessageDecrypted?: () => void;
}

export interface UseEncryptedChannelResult
  extends EncryptedChannelState, EncryptedChannelActions {}

// ============================================================================
// Mock Encryption Functions (until real crypto is integrated)
// ============================================================================

async function mockEncrypt(plaintext: string): Promise<EncryptedMessage> {
  // Simulate encryption delay
  await new Promise((resolve) => setTimeout(resolve, 10));

  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = new Uint8Array(12);
  if (typeof crypto !== "undefined") {
    crypto.getRandomValues(iv);
  }

  // Simple base64 encoding for mock (NOT real encryption)
  const ciphertext = btoa(String.fromCharCode(...data));
  const ivString = btoa(String.fromCharCode(...iv));

  return {
    ciphertext,
    iv: ivString,
    ephemeralPublicKey: "{}",
    version: 1,
    timestamp: Date.now(),
  };
}

async function mockDecrypt(encrypted: EncryptedMessage): Promise<string> {
  // Simulate decryption delay
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Simple base64 decoding for mock (NOT real decryption)
  const bytes = atob(encrypted.ciphertext);
  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array([...bytes].map((c) => c.charCodeAt(0))));
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing encrypted channel communication
 */
export function useEncryptedChannel(
  channelId: string,
  options: UseEncryptedChannelOptions = {},
): UseEncryptedChannelResult {
  const {
    autoEnable = false,
    onStatusChange,
    onError,
    onMessageEncrypted,
    onMessageDecrypted,
  } = options;

  // Local state for encryption operations
  const [isInitializing, setIsInitializing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Get encryption store actions and state
  const {
    enableChannelEncryption,
    disableChannelEncryption,
    setChannelEncryptionStatus,
    setChannelEncryptionError,
    getChannelEncryption,
    isChannelEncrypted,
    incrementChannelMessagesSent,
    incrementChannelMessagesReceived,
    incrementTotalMessagesSent,
    incrementTotalMessagesReceived,
    incrementEncryptionErrors,
    isInitialized: isGloballyInitialized,
    globalStatus,
  } = useEncryptionStore();

  // Get channel encryption state
  const channelEncryption = getChannelEncryption(channelId);

  // Derive state
  const state: EncryptedChannelState = useMemo(() => {
    const isEncrypted = channelEncryption?.enabled ?? false;
    const status = channelEncryption?.status ?? "disabled";
    const error = channelEncryption?.error ?? localError;

    return {
      isEncrypted,
      status,
      error,
      isReady: isEncrypted && status === "enabled" && isGloballyInitialized,
      messagesSent: channelEncryption?.messagesSent ?? 0,
      messagesReceived: channelEncryption?.messagesReceived ?? 0,
    };
  }, [channelEncryption, localError, isGloballyInitialized]);

  // Status change callback
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(state.status);
    }
  }, [state.status, onStatusChange]);

  // Error callback
  useEffect(() => {
    if (state.error && onError) {
      onError(state.error);
    }
  }, [state.error, onError]);

  // Auto-enable encryption
  useEffect(() => {
    if (autoEnable && channelId && !state.isEncrypted && !isInitializing) {
      enableEncryption();
    }
  }, [autoEnable, channelId, state.isEncrypted, isInitializing]);

  /**
   * Enables encryption for the channel
   */
  const enableEncryption = useCallback(async () => {
    if (!channelId) return;

    setIsInitializing(true);
    setLocalError(null);

    try {
      enableChannelEncryption(channelId);

      // Simulate key exchange / initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if global encryption is available
      if (globalStatus === "error") {
        throw new Error("Global encryption is not available");
      }

      setChannelEncryptionStatus(channelId, "enabled");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to enable encryption";
      setLocalError(errorMessage);
      setChannelEncryptionError(channelId, errorMessage);
      incrementEncryptionErrors();
    } finally {
      setIsInitializing(false);
    }
  }, [
    channelId,
    enableChannelEncryption,
    setChannelEncryptionStatus,
    setChannelEncryptionError,
    incrementEncryptionErrors,
    globalStatus,
  ]);

  /**
   * Disables encryption for the channel
   */
  const disableEncryption = useCallback(() => {
    if (!channelId) return;

    disableChannelEncryption(channelId);
    setLocalError(null);
  }, [channelId, disableChannelEncryption]);

  /**
   * Encrypts a message for sending
   */
  const encryptMessage = useCallback(
    async (plaintext: string): Promise<EncryptedMessage | null> => {
      if (!state.isReady) {
        setLocalError("Channel encryption is not ready");
        return null;
      }

      try {
        const encrypted = await mockEncrypt(plaintext);

        incrementChannelMessagesSent(channelId);
        incrementTotalMessagesSent();

        if (onMessageEncrypted) {
          onMessageEncrypted();
        }

        return encrypted;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Encryption failed";
        setLocalError(errorMessage);
        setChannelEncryptionError(channelId, errorMessage);
        incrementEncryptionErrors();
        return null;
      }
    },
    [
      state.isReady,
      channelId,
      incrementChannelMessagesSent,
      incrementTotalMessagesSent,
      setChannelEncryptionError,
      incrementEncryptionErrors,
      onMessageEncrypted,
    ],
  );

  /**
   * Decrypts a received message
   */
  const decryptMessage = useCallback(
    async (encrypted: EncryptedMessage): Promise<string | null> => {
      if (!state.isReady) {
        setLocalError("Channel encryption is not ready");
        return null;
      }

      try {
        const decrypted = await mockDecrypt(encrypted);

        incrementChannelMessagesReceived(channelId);
        incrementTotalMessagesReceived();

        if (onMessageDecrypted) {
          onMessageDecrypted();
        }

        return decrypted;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Decryption failed";
        setLocalError(errorMessage);
        setChannelEncryptionError(channelId, errorMessage);
        incrementEncryptionErrors();
        return null;
      }
    },
    [
      state.isReady,
      channelId,
      incrementChannelMessagesReceived,
      incrementTotalMessagesReceived,
      setChannelEncryptionError,
      incrementEncryptionErrors,
      onMessageDecrypted,
    ],
  );

  /**
   * Refreshes the encryption keys for the channel
   */
  const refreshKeys = useCallback(async () => {
    if (!channelId || !state.isEncrypted) return;

    setIsInitializing(true);
    setLocalError(null);

    try {
      setChannelEncryptionStatus(channelId, "initializing");

      // Simulate key refresh
      await new Promise((resolve) => setTimeout(resolve, 200));

      setChannelEncryptionStatus(channelId, "enabled");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to refresh keys";
      setLocalError(errorMessage);
      setChannelEncryptionError(channelId, errorMessage);
      incrementEncryptionErrors();
    } finally {
      setIsInitializing(false);
    }
  }, [
    channelId,
    state.isEncrypted,
    setChannelEncryptionStatus,
    setChannelEncryptionError,
    incrementEncryptionErrors,
  ]);

  /**
   * Clears any encryption errors
   */
  const clearError = useCallback(() => {
    setLocalError(null);
    if (channelId) {
      setChannelEncryptionError(channelId, null);
    }
  }, [channelId, setChannelEncryptionError]);

  return {
    ...state,
    enableEncryption,
    disableEncryption,
    encryptMessage,
    decryptMessage,
    refreshKeys,
    clearError,
  };
}

// ============================================================================
// Additional Utility Hooks
// ============================================================================

/**
 * Hook to check if any channel has encryption enabled
 */
export function useHasEncryptedChannels(): boolean {
  const encryptedChannels = useEncryptionStore(
    (state) => state.encryptedChannels,
  );

  return useMemo(() => {
    return Array.from(encryptedChannels.values()).some((c) => c.enabled);
  }, [encryptedChannels]);
}

/**
 * Hook to get encryption statistics
 */
export function useEncryptionStats() {
  const getStatistics = useEncryptionStore((state) => state.getStatistics);
  return getStatistics();
}

/**
 * Hook to check global encryption readiness
 */
export function useEncryptionReady(): boolean {
  const isInitialized = useEncryptionStore((state) => state.isInitialized);
  const globalStatus = useEncryptionStore((state) => state.globalStatus);
  const keyStatus = useEncryptionStore((state) => state.keyStatus);

  return isInitialized && globalStatus === "enabled" && keyStatus === "ready";
}

/**
 * Hook for managing multiple encrypted channels
 */
export function useMultipleEncryptedChannels(channelIds: string[]) {
  const { encryptedChannels, isChannelEncrypted } = useEncryptionStore();

  const channelStates = useMemo(() => {
    return channelIds.map((id) => ({
      channelId: id,
      isEncrypted: isChannelEncrypted(id),
      encryption: encryptedChannels.get(id),
    }));
  }, [channelIds, encryptedChannels, isChannelEncrypted]);

  const allEncrypted = channelStates.every((c) => c.isEncrypted);
  const anyEncrypted = channelStates.some((c) => c.isEncrypted);
  const encryptedCount = channelStates.filter((c) => c.isEncrypted).length;

  return {
    channelStates,
    allEncrypted,
    anyEncrypted,
    encryptedCount,
    totalCount: channelIds.length,
  };
}
