/**
 * Security Hook - Provides security operations for the nself-chat application
 *
 * Handles password changes, 2FA setup/verification, session management,
 * and security alerts
 */

"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { useSessionStore, parseUserAgent } from "./session-store";
import {
  calculatePasswordStrength,
  generateTwoFactorSetup,
  verifyTOTP,
  type PasswordStrength,
  type TwoFactorSetupData,
} from "./two-factor";
import { logger } from "@/lib/logger";
import {
  GET_SESSIONS,
  GET_LOGIN_HISTORY,
  GET_SECURITY_SETTINGS,
  GET_BACKUP_CODES_COUNT,
  REVOKE_SESSION,
  REVOKE_ALL_SESSIONS,
  UPDATE_SECURITY_SETTINGS,
  type Session,
  type LoginAttempt,
  type SecuritySettings,
} from "@/graphql/security";

// ============================================================================
// Types
// ============================================================================

export interface ChangePasswordResult {
  success: boolean;
  error?: string;
}

export interface TwoFactorSetupResult {
  success: boolean;
  data?: TwoFactorSetupData;
  error?: string;
}

export interface TwoFactorVerifyResult {
  success: boolean;
  error?: string;
}

export interface RevokeSessionResult {
  success: boolean;
  error?: string;
}

export interface SecurityAlertPreferences {
  loginNotifications: boolean;
  newDeviceAlerts: boolean;
  securityAlertsEmail: boolean;
  passwordChangeAlerts: boolean;
  twoFactorChangeAlerts: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useSecurity() {
  const { user } = useAuth();
  const sessionStore = useSessionStore();

  // Local state for operations
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] =
    useState<TwoFactorSetupData | null>(null);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  // GraphQL queries
  const {
    data: sessionsData,
    loading: loadingSessions,
    refetch: refetchSessions,
  } = useQuery(GET_SESSIONS, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      if (data?.nchat_user_sessions) {
        const sessions = data.nchat_user_sessions.map(transformSession);
        sessionStore.setSessions(sessions);
      }
    },
    onError: (error) => {
      sessionStore.setSessionsError(error.message);
    },
  });

  const [fetchLoginHistory, { loading: loadingHistory }] = useLazyQuery(
    GET_LOGIN_HISTORY,
    {
      onCompleted: (data) => {
        if (data?.nchat_login_history) {
          const history = data.nchat_login_history.map(transformLoginAttempt);
          const total =
            data.nchat_login_history_aggregate?.aggregate?.count || 0;
          sessionStore.setLoginHistory(history, total);
        }
      },
      onError: (error) => {
        sessionStore.setHistoryError(error.message);
      },
    },
  );

  const { data: securitySettingsData, refetch: refetchSecuritySettings } =
    useQuery(GET_SECURITY_SETTINGS, {
      variables: { userId: user?.id },
      skip: !user?.id,
    });

  const { data: backupCodesData, refetch: refetchBackupCodes } = useQuery(
    GET_BACKUP_CODES_COUNT,
    {
      variables: { userId: user?.id },
      skip: !user?.id,
    },
  );

  // GraphQL mutations
  const [revokeSessionMutation] = useMutation(REVOKE_SESSION);
  const [revokeAllSessionsMutation] = useMutation(REVOKE_ALL_SESSIONS);
  const [updateSecuritySettingsMutation] = useMutation(
    UPDATE_SECURITY_SETTINGS,
  );

  // ============================================================================
  // Password Management
  // ============================================================================

  /**
   * Change user password
   */
  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
    ): Promise<ChangePasswordResult> => {
      if (!user?.id) {
        return { success: false, error: "Not authenticated" };
      }

      setIsChangingPassword(true);
      setPasswordError(null);

      try {
        // Validate new password strength
        const strength = calculatePasswordStrength(newPassword);
        if (!strength.isAcceptable) {
          throw new Error(
            "Password is too weak. " + strength.suggestions.join(" "),
          );
        }

        // In production, this would call a secure API endpoint
        // that verifies the current password and hashes the new one
        const response = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            currentPassword,
            newPassword,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to change password");
        }

        // Refetch security settings to update password changed date
        await refetchSecuritySettings();

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to change password";
        setPasswordError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsChangingPassword(false);
      }
    },
    [user?.id, refetchSecuritySettings],
  );

  /**
   * Validate password strength
   */
  const validatePassword = useCallback((password: string): PasswordStrength => {
    return calculatePasswordStrength(password);
  }, []);

  // ============================================================================
  // Two-Factor Authentication
  // ============================================================================

  /**
   * Initialize 2FA setup
   */
  const setup2FA = useCallback(async (): Promise<TwoFactorSetupResult> => {
    if (!user?.id || !user?.email) {
      return { success: false, error: "Not authenticated" };
    }

    setIsSettingUp2FA(true);
    setTwoFactorError(null);

    try {
      // Generate 2FA setup data
      const setupData = await generateTwoFactorSetup(user.email, "nchat");
      setTwoFactorSetupData(setupData);

      return { success: true, data: setupData };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to setup 2FA";
      setTwoFactorError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSettingUp2FA(false);
    }
  }, [user?.id, user?.email]);

  /**
   * Verify 2FA code and enable
   */
  const verify2FA = useCallback(
    async (code: string): Promise<TwoFactorVerifyResult> => {
      if (!user?.id || !twoFactorSetupData?.secret) {
        return { success: false, error: "No 2FA setup in progress" };
      }

      setIsVerifying2FA(true);
      setTwoFactorError(null);

      try {
        // Verify the code
        const isValid = verifyTOTP(code, twoFactorSetupData.secret);

        if (!isValid) {
          throw new Error("Invalid verification code");
        }

        // Call API to store 2FA settings securely
        const response = await fetch("/api/auth/enable-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            secret: twoFactorSetupData.secret,
            backupCodes: twoFactorSetupData.backupCodes,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to enable 2FA");
        }

        // Clear setup data
        setTwoFactorSetupData(null);

        // Refetch security settings
        await refetchSecuritySettings();
        await refetchBackupCodes();

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to verify 2FA";
        setTwoFactorError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsVerifying2FA(false);
      }
    },
    [user?.id, twoFactorSetupData, refetchSecuritySettings, refetchBackupCodes],
  );

  /**
   * Disable 2FA
   */
  const disable2FA = useCallback(
    async (password: string): Promise<TwoFactorVerifyResult> => {
      if (!user?.id) {
        return { success: false, error: "Not authenticated" };
      }

      setIsDisabling2FA(true);
      setTwoFactorError(null);

      try {
        // Call API to disable 2FA (requires password verification)
        const response = await fetch("/api/auth/disable-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            password,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to disable 2FA");
        }

        // Refetch security settings
        await refetchSecuritySettings();

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to disable 2FA";
        setTwoFactorError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsDisabling2FA(false);
      }
    },
    [user?.id, refetchSecuritySettings],
  );

  /**
   * Cancel 2FA setup
   */
  const cancel2FASetup = useCallback(() => {
    setTwoFactorSetupData(null);
    setTwoFactorError(null);
  }, []);

  /**
   * Regenerate backup codes
   */
  const regenerateBackupCodes = useCallback(async (): Promise<
    string[] | null
  > => {
    if (!user?.id) return null;

    try {
      const response = await fetch("/api/auth/regenerate-backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate backup codes");
      }

      const data = await response.json();
      await refetchBackupCodes();

      return data.backupCodes;
    } catch (error) {
      logger.error("Failed to regenerate backup codes:", error);
      return null;
    }
  }, [user?.id, refetchBackupCodes]);

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Load login history
   */
  const loadLoginHistory = useCallback(
    (page: number = 1) => {
      if (!user?.id) return;

      sessionStore.setLoginHistoryPage(page);
      fetchLoginHistory({
        variables: {
          userId: user.id,
          limit: sessionStore.loginHistoryPerPage,
          offset: (page - 1) * sessionStore.loginHistoryPerPage,
        },
      });
    },
    [user?.id, fetchLoginHistory, sessionStore],
  );

  /**
   * Revoke a specific session
   */
  const revokeSession = useCallback(
    async (sessionId: string): Promise<RevokeSessionResult> => {
      if (!user?.id) {
        return { success: false, error: "Not authenticated" };
      }

      sessionStore.setRevoking(true);
      sessionStore.setRevokeError(null);

      try {
        await revokeSessionMutation({
          variables: { sessionId },
        });

        sessionStore.removeSession(sessionId);
        await refetchSessions();

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to revoke session";
        sessionStore.setRevokeError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        sessionStore.setRevoking(false);
      }
    },
    [user?.id, revokeSessionMutation, sessionStore, refetchSessions],
  );

  /**
   * Revoke all other sessions
   */
  const revokeAllOtherSessions =
    useCallback(async (): Promise<RevokeSessionResult> => {
      if (!user?.id) {
        return { success: false, error: "Not authenticated" };
      }

      const currentSession = sessionStore.currentSession;
      if (!currentSession) {
        return { success: false, error: "Current session not found" };
      }

      sessionStore.setRevoking(true);
      sessionStore.setRevokeError(null);

      try {
        await revokeAllSessionsMutation({
          variables: {
            userId: user.id,
            currentSessionId: currentSession.id,
          },
        });

        // Keep only current session
        sessionStore.setSessions([currentSession]);
        await refetchSessions();

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to revoke sessions";
        sessionStore.setRevokeError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        sessionStore.setRevoking(false);
      }
    }, [user?.id, revokeAllSessionsMutation, sessionStore, refetchSessions]);

  // ============================================================================
  // Security Alert Preferences
  // ============================================================================

  /**
   * Update security alert preferences
   */
  const updateAlertPreferences = useCallback(
    async (
      preferences: Partial<SecurityAlertPreferences>,
    ): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await updateSecuritySettingsMutation({
          variables: {
            userId: user.id,
            settings: preferences,
          },
        });

        await refetchSecuritySettings();
        return true;
      } catch (error) {
        logger.error("Failed to update alert preferences:", error);
        return false;
      }
    },
    [user?.id, updateSecuritySettingsMutation, refetchSecuritySettings],
  );

  // ============================================================================
  // Computed Values
  // ============================================================================

  const securitySettings: SecuritySettings | null =
    securitySettingsData?.nchat_users_by_pk
      ? {
          twoFactorEnabled:
            securitySettingsData.nchat_users_by_pk.two_factor_enabled || false,
          twoFactorMethod:
            securitySettingsData.nchat_users_by_pk.two_factor_method ||
            undefined,
          passwordLastChanged:
            securitySettingsData.nchat_users_by_pk.password_changed_at ||
            undefined,
          ...(securitySettingsData.nchat_users_by_pk.security_settings || {}),
        }
      : null;

  const backupCodesRemaining =
    backupCodesData?.nchat_backup_codes_aggregate?.aggregate?.count || 0;

  const sessions =
    sessionsData?.nchat_user_sessions?.map(transformSession) || [];

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Password
    changePassword,
    validatePassword,
    isChangingPassword,
    passwordError,

    // 2FA
    setup2FA,
    verify2FA,
    disable2FA,
    cancel2FASetup,
    regenerateBackupCodes,
    isSettingUp2FA,
    isVerifying2FA,
    isDisabling2FA,
    twoFactorSetupData,
    twoFactorError,
    twoFactorEnabled: securitySettings?.twoFactorEnabled || false,
    backupCodesRemaining,

    // Sessions
    sessions,
    currentSession: sessionStore.currentSession,
    loadingSessions,
    revokeSession,
    revokeAllOtherSessions,
    isRevoking: sessionStore.isRevoking,
    revokeError: sessionStore.revokeError,
    refetchSessions,

    // Login history
    loginHistory: sessionStore.loginHistory,
    loginHistoryTotal: sessionStore.loginHistoryTotal,
    loginHistoryPage: sessionStore.loginHistoryPage,
    loadLoginHistory,
    loadingHistory,

    // Security settings
    securitySettings,
    updateAlertPreferences,

    // Utilities
    parseUserAgent,
  };
}

// ============================================================================
// Transform Functions
// ============================================================================

function transformSession(raw: Record<string, unknown>): Session {
  return {
    id: raw.id as string,
    userId: raw.user_id as string,
    device: raw.device as string,
    browser: raw.browser as string,
    os: raw.os as string,
    ipAddress: raw.ip_address as string,
    location: raw.location as Session["location"],
    isCurrent: raw.is_current as boolean,
    createdAt: raw.created_at as string,
    lastActiveAt: raw.last_active_at as string,
    expiresAt: raw.expires_at as string,
  };
}

function transformLoginAttempt(raw: Record<string, unknown>): LoginAttempt {
  return {
    id: raw.id as string,
    userId: raw.user_id as string,
    success: raw.success as boolean,
    ipAddress: raw.ip_address as string,
    device: raw.device as string,
    browser: raw.browser as string,
    os: raw.os as string,
    location: raw.location as LoginAttempt["location"],
    failureReason: raw.failure_reason as string | undefined,
    createdAt: raw.created_at as string,
  };
}

// ============================================================================
// Export types
// ============================================================================

export type {
  Session,
  LoginAttempt,
  SecuritySettings,
} from "@/graphql/security";
export type { PasswordStrength, TwoFactorSetupData } from "./two-factor";
