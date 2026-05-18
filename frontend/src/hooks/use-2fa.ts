/**
 * use2FA Hook
 *
 * Custom React hook for managing Two-Factor Authentication.
 */

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

import { logger } from "@/lib/logger";

export interface TwoFactorStatus {
  isEnabled: boolean;
  enabledAt: string | null;
  lastUsedAt: string | null;
  backupCodes: {
    total: number;
    unused: number;
    used: number;
  };
  trustedDevices: Array<{
    id: string;
    deviceName: string;
    deviceId: string;
    trustedUntil: string;
    lastUsedAt: string;
    createdAt: string;
  }>;
}

export interface TwoFactorSetupData {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
  backupCodes: string[];
  manualEntryCode: string;
}

export function use2FA() {
  const { user } = useAuth();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch 2FA status
  const fetchStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/auth/2fa/status?userId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
      }
    } catch (err) {
      logger.error("Failed to fetch 2FA status:", err);
    }
  }, [user?.id]);

  // Load status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Start 2FA setup
  const startSetup = useCallback(async () => {
    if (!user?.id || !user?.email) {
      setError("User information is required");
      return { success: false };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Setup failed");
      }

      setSetupData(data.data);
      return { success: true, data: data.data };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start setup";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  // Verify and enable 2FA
  const verifyAndEnable = useCallback(
    async (code: string) => {
      if (!user?.id || !setupData) {
        setError("Setup data is required");
        return { success: false };
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/2fa/verify-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            secret: setupData.secret,
            code,
            backupCodes: setupData.backupCodes,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Verification failed");
        }

        // Refresh status
        await fetchStatus();
        setSetupData(null);

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Verification failed";
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [user?.id, setupData, fetchStatus],
  );

  // Disable 2FA
  const disable = useCallback(
    async (password: string) => {
      if (!user?.id) {
        setError("User ID is required");
        return { success: false };
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/2fa/disable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to disable 2FA");
        }

        // Refresh status
        await fetchStatus();

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to disable 2FA";
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [user?.id, fetchStatus],
  );

  // Regenerate backup codes
  const regenerateBackupCodes = useCallback(
    async (password: string) => {
      if (!user?.id) {
        setError("User ID is required");
        return { success: false };
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/2fa/backup-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to regenerate codes");
        }

        // Refresh status
        await fetchStatus();

        return { success: true, codes: data.data.codes };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to regenerate codes";
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [user?.id, fetchStatus],
  );

  // Remove trusted device
  const removeTrustedDevice = useCallback(
    async (deviceId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/auth/2fa/trusted-devices?id=${deviceId}`,
          {
            method: "DELETE",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to remove device");
        }

        // Refresh status
        await fetchStatus();

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to remove device";
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchStatus],
  );

  return {
    status,
    setupData,
    loading,
    error,
    startSetup,
    verifyAndEnable,
    disable,
    regenerateBackupCodes,
    removeTrustedDevice,
    refreshStatus: fetchStatus,
  };
}
