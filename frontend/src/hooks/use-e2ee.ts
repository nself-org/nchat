/**
 * React Hook: useE2EE
 * Main hook for E2EE functionality
 */

import { useState, useEffect, useCallback } from "react";
import { useApolloClient } from "@apollo/client";
import { getE2EEManager, type E2EEStatus } from "@/lib/e2ee";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "./use-toast";

export interface UseE2EEReturn {
  // Status
  status: E2EEStatus;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: (password: string, deviceId?: string) => Promise<void>;
  recover: (recoveryCode: string, deviceId?: string) => Promise<void>;
  destroy: () => void;

  // Message encryption/decryption
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
}

export function useE2EE(): UseE2EEReturn {
  const apolloClient = useApolloClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<E2EEStatus>({
    initialized: false,
    masterKeyInitialized: false,
    deviceKeysGenerated: false,
  });

  const e2eeManager = getE2EEManager(apolloClient, user?.id || "");

  // Update status
  const updateStatus = useCallback(() => {
    const currentStatus = e2eeManager.getStatus();
    setStatus(currentStatus);
  }, [e2eeManager]);

  // Initialize on mount
  useEffect(() => {
    updateStatus();
  }, [updateStatus]);

  // Initialize E2EE
  const initialize = useCallback(
    async (password: string, deviceId?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await e2eeManager.initialize(password, deviceId);
        updateStatus();

        toast({
          title: "E2EE Enabled",
          description: "End-to-end encryption has been initialized",
        });

        // Show recovery code if available
        const recoveryCode = e2eeManager.getRecoveryCode();
        if (recoveryCode) {
          toast({
            title: "Recovery Code",
            description: "Save your recovery code in a secure location",
            variant: "default",
          });
        }
      } catch (err: any) {
        const errorMessage = err.message || "Failed to initialize E2EE";
        setError(errorMessage);

        toast({
          title: "E2EE Initialization Failed",
          description: errorMessage,
          variant: "destructive",
        });

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [e2eeManager, updateStatus, toast],
  );

  // Recover E2EE
  const recover = useCallback(
    async (recoveryCode: string, deviceId?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await e2eeManager.recover(recoveryCode, deviceId);
        updateStatus();

        toast({
          title: "E2EE Recovered",
          description: "Your encryption keys have been recovered",
        });
      } catch (err: any) {
        const errorMessage = err.message || "Failed to recover E2EE";
        setError(errorMessage);

        toast({
          title: "Recovery Failed",
          description: errorMessage,
          variant: "destructive",
        });

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [e2eeManager, updateStatus, toast],
  );

  // Destroy E2EE
  const destroy = useCallback(() => {
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
      try {
        const result = await e2eeManager.encryptMessage(
          plaintext,
          recipientUserId,
          recipientDeviceId,
        );
        return result.encryptedPayload;
      } catch (err: any) {
        const errorMessage = err.message || "Failed to encrypt message";
        setError(errorMessage);

        toast({
          title: "Encryption Failed",
          description: errorMessage,
          variant: "destructive",
        });

        throw err;
      }
    },
    [e2eeManager, toast],
  );

  // Decrypt message
  const decryptMessage = useCallback(
    async (
      encryptedPayload: Uint8Array,
      messageType: "PreKey" | "Normal",
      senderUserId: string,
      senderDeviceId: string,
    ): Promise<string> => {
      try {
        return await e2eeManager.decryptMessage(
          encryptedPayload,
          messageType,
          senderUserId,
          senderDeviceId,
        );
      } catch (err: any) {
        const errorMessage = err.message || "Failed to decrypt message";
        setError(errorMessage);

        toast({
          title: "Decryption Failed",
          description: errorMessage,
          variant: "destructive",
        });

        throw err;
      }
    },
    [e2eeManager, toast],
  );

  // Rotate signed prekey
  const rotateSignedPreKey = useCallback(async () => {
    setIsLoading(true);

    try {
      await e2eeManager.rotateSignedPreKey();

      toast({
        title: "Keys Rotated",
        description: "Signed prekey has been rotated",
      });
    } catch (err: any) {
      toast({
        title: "Key Rotation Failed",
        description: err.message,
        variant: "destructive",
      });

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [e2eeManager, toast]);

  // Replenish one-time prekeys
  const replenishOneTimePreKeys = useCallback(
    async (count: number = 50) => {
      setIsLoading(true);

      try {
        await e2eeManager.replenishOneTimePreKeys(count);

        toast({
          title: "Keys Replenished",
          description: `Generated ${count} new one-time prekeys`,
        });
      } catch (err: any) {
        toast({
          title: "Key Replenishment Failed",
          description: err.message,
          variant: "destructive",
        });

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [e2eeManager, toast],
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

  return {
    status,
    isInitialized: status.initialized,
    isLoading,
    error,
    initialize,
    recover,
    destroy,
    encryptMessage,
    decryptMessage,
    rotateSignedPreKey,
    replenishOneTimePreKeys,
    getRecoveryCode,
    clearRecoveryCode,
    hasSession,
  };
}

export default useE2EE;
