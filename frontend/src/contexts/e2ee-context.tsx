/**
 * E2EE Context
 * Global context for managing End-to-End Encryption state
 */

"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useApolloClient } from "@apollo/client";
import { getE2EEManager, type E2EEStatus } from "@/lib/e2ee";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";

// ============================================================================
// TYPES
// ============================================================================

export interface E2EEContextType {
  // Status
  status: E2EEStatus;
  isEnabled: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: (password: string) => Promise<void>;
  recover: (recoveryCode: string) => Promise<void>;
  disable: () => void;

  // Message operations
  encryptMessage: (
    plaintext: string,
    recipientUserId: string,
    recipientDeviceId: string,
  ) => Promise<Uint8Array>;
  decryptMessage: (
    encryptedPayload: Uint8Array,
    messageType: "PreKey" | "Normal",
    senderUserId: string,
    senderDeviceId: string,
  ) => Promise<string>;

  // Key management
  rotateSignedPreKey: () => Promise<void>;
  replenishOneTimePreKeys: (count?: number) => Promise<void>;
  getRecoveryCode: () => string | null;
  clearRecoveryCode: () => void;

  // Session management
  hasSession: (peerUserId: string, peerDeviceId: string) => Promise<boolean>;

  // Safety numbers
  generateSafetyNumber: (
    peerUserId: string,
    peerIdentityKey: Uint8Array,
  ) => Promise<string>;
  formatSafetyNumber: (safetyNumber: string) => string;
}

// ============================================================================
// CONTEXT
// ============================================================================

const E2EEContext = createContext<E2EEContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export interface E2EEProviderProps {
  children: ReactNode;
}

export function E2EEProvider({ children }: E2EEProviderProps) {
  const apolloClient = useApolloClient();
  const { user } = useAuth();
  const { config } = useAppConfig();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<E2EEStatus>({
    initialized: false,
    masterKeyInitialized: false,
    deviceKeysGenerated: false,
  });

  const e2eeManager = getE2EEManager(apolloClient, user?.id || "");
  const isEnabled =
    config?.encryption?.enabled ||
    config?.features?.endToEndEncryption ||
    false;

  // Update status
  const updateStatus = useCallback(() => {
    const currentStatus = e2eeManager.getStatus();
    setStatus(currentStatus);
  }, [e2eeManager]);

  // Check if E2EE is already initialized on mount
  useEffect(() => {
    if (user && isEnabled) {
      updateStatus();
    }
  }, [user, isEnabled, updateStatus]);

  // Initialize E2EE
  const initialize = useCallback(
    async (password: string) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get or generate device ID
        let deviceId = localStorage.getItem("e2ee_device_id");
        if (!deviceId) {
          deviceId = `${user.id}-${Date.now()}`;
        }

        await e2eeManager.initialize(password, deviceId);
        updateStatus();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to initialize E2EE";
        setError(errorMessage);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [user, e2eeManager, updateStatus],
  );

  // Recover E2EE
  const recover = useCallback(
    async (recoveryCode: string) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      setIsLoading(true);
      setError(null);

      try {
        await e2eeManager.recover(recoveryCode);
        updateStatus();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to recover E2EE";
        setError(errorMessage);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [user, e2eeManager, updateStatus],
  );

  // Disable E2EE
  const disable = useCallback(() => {
    e2eeManager.destroy();
    updateStatus();
  }, [e2eeManager, updateStatus]);

  // Encrypt message
  const encryptMessage = useCallback(
    async (
      plaintext: string,
      recipientUserId: string,
      recipientDeviceId: string,
    ): Promise<Uint8Array> => {
      if (!status.initialized) {
        throw new Error("E2EE not initialized");
      }

      try {
        const result = await e2eeManager.encryptMessage(
          plaintext,
          recipientUserId,
          recipientDeviceId,
        );
        return result.encryptedPayload;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to encrypt message";
        setError(errorMessage);
        throw error;
      }
    },
    [e2eeManager, status.initialized],
  );

  // Decrypt message
  const decryptMessage = useCallback(
    async (
      encryptedPayload: Uint8Array,
      messageType: "PreKey" | "Normal",
      senderUserId: string,
      senderDeviceId: string,
    ): Promise<string> => {
      if (!status.initialized) {
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
        const errorMessage =
          error instanceof Error ? error.message : "Failed to decrypt message";
        setError(errorMessage);
        throw error;
      }
    },
    [e2eeManager, status.initialized],
  );

  // Rotate signed prekey
  const rotateSignedPreKey = useCallback(async () => {
    setIsLoading(true);
    try {
      await e2eeManager.rotateSignedPreKey();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [e2eeManager]);

  // Replenish one-time prekeys
  const replenishOneTimePreKeys = useCallback(
    async (count: number = 50) => {
      setIsLoading(true);
      try {
        await e2eeManager.replenishOneTimePreKeys(count);
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [e2eeManager],
  );

  // Get recovery code
  const getRecoveryCode = useCallback(() => {
    return e2eeManager.getRecoveryCode();
  }, [e2eeManager]);

  // Clear recovery code
  const clearRecoveryCode = useCallback(() => {
    e2eeManager.clearRecoveryCode();
  }, [e2eeManager]);

  // Check if session exists
  const hasSession = useCallback(
    async (peerUserId: string, peerDeviceId: string): Promise<boolean> => {
      try {
        return await e2eeManager.hasSession(peerUserId, peerDeviceId);
      } catch {
        return false;
      }
    },
    [e2eeManager],
  );

  // Generate safety number
  const generateSafetyNumber = useCallback(
    async (
      peerUserId: string,
      peerIdentityKey: Uint8Array,
    ): Promise<string> => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      try {
        return await e2eeManager.generateSafetyNumber(
          user.id,
          peerUserId,
          peerIdentityKey,
        );
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [user, e2eeManager],
  );

  // Format safety number
  const formatSafetyNumber = useCallback(
    (safetyNumber: string): string => {
      return e2eeManager.formatSafetyNumber(safetyNumber);
    },
    [e2eeManager],
  );

  // Context value
  const value: E2EEContextType = {
    status,
    isEnabled,
    isInitialized: status.initialized,
    isLoading,
    error,
    initialize,
    recover,
    disable,
    encryptMessage,
    decryptMessage,
    rotateSignedPreKey,
    replenishOneTimePreKeys,
    getRecoveryCode,
    clearRecoveryCode,
    hasSession,
    generateSafetyNumber,
    formatSafetyNumber,
  };

  return <E2EEContext.Provider value={value}>{children}</E2EEContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useE2EEContext(): E2EEContextType {
  const context = useContext(E2EEContext);
  if (context === undefined) {
    throw new Error("useE2EEContext must be used within an E2EEProvider");
  }
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default E2EEContext;
