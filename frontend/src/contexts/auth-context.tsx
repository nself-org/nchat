"use client";

/**
 * Authentication Context for nself-chat
 *
 * Provides authentication state and methods throughout the application.
 * Supports both development (FauxAuth) and production (Nhost) auth.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import {
  authConfig,
  isTwoFactorRequired,
  verifySecurityConfiguration,
} from "@/config/auth.config";
import { FauxAuthService } from "@/services/auth/faux-auth.service";
import { NhostAuthService } from "@/services/auth/nhost-auth.service";
import {
  setSentryUser,
  clearSentryUser,
  captureError,
} from "@/lib/sentry-utils";
import type {
  AuthUser,
  UserRole,
  OAuthProvider,
  TwoFactorStatus,
} from "@/services/auth/auth.interface";
import type { AppRole, UserAppContext } from "@/types/app-rbac";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  emailVerified?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  // Per-app RBAC (monorepo compatibility)
  appRoles?: AppRole[]; // User's roles in the current app
  appContext?: UserAppContext; // Full app context with permissions
}

interface SignInOptions {
  redirectTo?: string;
}

interface SignUpOptions {
  displayName?: string;
  redirectTo?: string;
}

interface OAuthOptions {
  provider: OAuthProvider;
  redirectTo?: string;
  scopes?: string[];
}

interface AuthContextType {
  // State
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isDevMode: boolean;

  // Core auth methods
  signIn: (
    email: string,
    password: string,
    options?: SignInOptions,
  ) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username: string,
    displayName?: string,
    options?: SignUpOptions,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;

  // OAuth methods
  signInWithOAuth: (options: OAuthOptions) => Promise<void>;
  handleOAuthCallback: (params: URLSearchParams) => Promise<void>;

  // Magic link methods
  sendMagicLink: (email: string) => Promise<{ success: boolean }>;
  verifyMagicLink: (token: string) => Promise<void>;

  // Password methods
  requestPasswordReset: (email: string) => Promise<{ success: boolean }>;
  resetPassword: (
    token: string,
    newPassword: string,
  ) => Promise<{ success: boolean }>;
  changePassword: (
    oldPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean }>;

  // Email verification
  sendEmailVerification: (email: string) => Promise<{ success: boolean }>;
  verifyEmail: (token: string) => Promise<{ success: boolean }>;

  // 2FA methods
  getTwoFactorStatus: () => Promise<TwoFactorStatus>;
  generateTOTPSecret: () => Promise<{
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
  }>;
  enableTOTP: (
    code: string,
  ) => Promise<{ success: boolean; backupCodes?: string[] }>;
  disableTOTP: (code: string) => Promise<{ success: boolean }>;
  verifyTOTP: (ticket: string, code: string) => Promise<void>;

  // Session helpers
  getAccessToken: () => string | null;
  refreshSession: () => Promise<void>;

  // Dev mode only
  switchUser?: (userId: string) => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Auth Service Initialization
// ============================================================================

// Verify security configuration on module load
if (typeof window === "undefined") {
  // Server-side only
  try {
    verifySecurityConfiguration();
  } catch (error) {
    logger.error("Security configuration error:", error);
  }
}

// Initialize auth service based on environment
// SECURITY: This is determined at build time and cannot be changed at runtime
const createAuthService = () => {
  // Double-check security in production.
  // Exception: NEXT_PUBLIC_ENV=test is the deliberate CI escape hatch that
  // allows FauxAuth in production-built binaries during E2E runs (where
  // NODE_ENV=production because `next start` is used but there is no live
  // Nhost backend). authConfig.isE2ETest captures this explicit opt-in.
  if (
    authConfig.isProduction &&
    authConfig.useDevAuth &&
    !authConfig.isE2ETest
  ) {
    throw new Error("[SECURITY] FATAL: Cannot use dev auth in production");
  }

  return authConfig.useDevAuth ? new FauxAuthService() : new NhostAuthService();
};

// ============================================================================
// Provider Component
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authService] = useState(createAuthService);
  const router = useRouter();

  // ==========================================================================
  // Initialize auth state
  // ==========================================================================

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          const mappedUser: User = {
            id: currentUser.id,
            email: currentUser.email,
            username: currentUser.username || currentUser.email.split("@")[0],
            displayName:
              currentUser.displayName ||
              currentUser.username ||
              currentUser.email.split("@")[0],
            avatarUrl: currentUser.avatarUrl || undefined,
            role: currentUser.role,
            emailVerified: currentUser.emailVerified,
            createdAt: currentUser.createdAt,
            lastLoginAt: currentUser.lastLoginAt,
          };
          setUser(mappedUser);

          // Set user context in Sentry for error tracking
          setSentryUser({
            id: mappedUser.id,
            email: mappedUser.email,
            username: mappedUser.username,
            role: mappedUser.role,
          });
        }
      } catch (error) {
        logger.error("Auth check failed:", error);
        captureError(error as Error, {
          tags: { context: "auth-check" },
          level: "warning",
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [authService]);

  // ==========================================================================
  // Core Auth Methods
  // ==========================================================================

  const signIn = useCallback(
    async (email: string, password: string, options?: SignInOptions) => {
      try {
        setLoading(true);
        const response = await authService.signIn(email, password);

        // Check if 2FA is required
        if ("requires2FA" in response && response.requires2FA) {
          // Store MFA ticket in session storage for verification
          if (typeof window !== "undefined" && response.mfaTicket) {
            sessionStorage.setItem("nchat-mfa-ticket", response.mfaTicket);
          }
          router.push("/auth/2fa-verify");
          return;
        }

        // Check if email verification is required
        if (
          "requiresEmailVerification" in response &&
          response.requiresEmailVerification
        ) {
          router.push("/auth/verify-email-sent");
          return;
        }

        const mappedUser: User = {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username || response.user.email.split("@")[0],
          displayName:
            response.user.displayName ||
            response.user.username ||
            response.user.email.split("@")[0],
          avatarUrl: response.user.avatarUrl || undefined,
          role: response.user.role,
          emailVerified: response.user.emailVerified,
        };

        setUser(mappedUser);

        // Set user context in Sentry
        setSentryUser({
          id: mappedUser.id,
          email: mappedUser.email,
          username: mappedUser.username,
          role: mappedUser.role,
        });

        // Check if 2FA setup is required for this role
        // Skip 2FA enforcement in dev/test mode (FauxAuth) — no real 2FA device to enroll
        if (isTwoFactorRequired(mappedUser.role) && !authConfig.useDevAuth) {
          const status = await getTwoFactorStatus();
          if (!status.enabled) {
            router.push("/settings/security?setup2fa=true");
            return;
          }
        }

        router.push(options?.redirectTo || "/chat");
      } catch (error) {
        logger.error("Sign in error:", error);
        captureError(error as Error, {
          tags: { context: "sign-in" },
          extra: { email },
          level: "error",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [authService, router],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      username: string,
      displayName?: string,
      options?: SignUpOptions,
    ) => {
      try {
        setLoading(true);

        // For Nhost service, pass options
        const response = authConfig.useDevAuth
          ? await authService.signUp(email, password, username)
          : await (authService as NhostAuthService).signUp(
              email,
              password,
              username,
              {
                displayName: displayName || username,
                redirectTo: options?.redirectTo,
              },
            );

        // Check if email verification is required
        if (
          "requiresEmailVerification" in response &&
          response.requiresEmailVerification
        ) {
          router.push("/auth/verify-email-sent");
          return;
        }

        const mappedUser: User = {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username || username,
          displayName: response.user.displayName || displayName || username,
          avatarUrl: response.user.avatarUrl || undefined,
          role: response.user.role,
        };

        setUser(mappedUser);

        // Set user context in Sentry
        setSentryUser({
          id: mappedUser.id,
          email: mappedUser.email,
          username: mappedUser.username,
          role: mappedUser.role,
        });

        // Check if this is the first user (they become owner and go to setup)
        if (response.user.role === "owner") {
          router.push("/setup");
        } else {
          router.push(options?.redirectTo || "/chat");
        }
      } catch (error) {
        logger.error("Sign up error:", error);
        captureError(error as Error, {
          tags: { context: "sign-up" },
          extra: { email },
          level: "error",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [authService, router],
  );

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
      setUser(null);
      clearSentryUser();
      router.push("/");
    } catch (error) {
      logger.error("Sign out error:", error);
      captureError(error as Error, {
        tags: { context: "sign-out" },
        level: "warning",
      });
      throw error;
    }
  }, [authService, router]);

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      try {
        if (authConfig.useDevAuth) {
          // In dev mode, just update the user locally
          setUser((prev) => (prev ? { ...prev, ...data } : null));
        } else {
          // Production profile update via Nhost
          const response = await authService.updateProfile(data);
          if (response.user) {
            const mappedUser: User = {
              id: response.user.id,
              email: response.user.email,
              username:
                response.user.username || response.user.email.split("@")[0],
              displayName:
                response.user.displayName ||
                response.user.username ||
                response.user.email.split("@")[0],
              avatarUrl: response.user.avatarUrl || undefined,
              role: response.user.role,
              emailVerified: response.user.emailVerified,
            };
            setUser(mappedUser);
          }
        }
      } catch (error) {
        logger.error("Profile update error:", error);
        captureError(error as Error, {
          tags: { context: "update-profile" },
          level: "error",
        });
        throw error;
      }
    },
    [authService],
  );

  // ==========================================================================
  // OAuth Methods
  // ==========================================================================

  const signInWithOAuth = useCallback(
    async (options: OAuthOptions) => {
      if (authConfig.useDevAuth) {
        throw new Error("OAuth is not available in development mode");
      }

      try {
        await (authService as NhostAuthService).signInWithOAuth(options);
      } catch (error) {
        logger.error("OAuth sign in error:", error);
        captureError(error as Error, {
          tags: { context: "oauth-sign-in", provider: options.provider },
          level: "error",
        });
        throw error;
      }
    },
    [authService],
  );

  const handleOAuthCallback = useCallback(
    async (params: URLSearchParams) => {
      if (authConfig.useDevAuth) {
        throw new Error("OAuth is not available in development mode");
      }

      try {
        setLoading(true);
        const response = await (
          authService as NhostAuthService
        ).handleOAuthCallback(params);

        const mappedUser: User = {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username || response.user.email.split("@")[0],
          displayName:
            response.user.displayName ||
            response.user.username ||
            response.user.email.split("@")[0],
          avatarUrl: response.user.avatarUrl || undefined,
          role: response.user.role,
          emailVerified: response.user.emailVerified,
        };

        setUser(mappedUser);

        setSentryUser({
          id: mappedUser.id,
          email: mappedUser.email,
          username: mappedUser.username,
          role: mappedUser.role,
        });

        // Check if this is first user
        if (response.user.role === "owner") {
          router.push("/setup");
        } else {
          router.push("/chat");
        }
      } catch (error) {
        logger.error("OAuth callback error:", error);
        captureError(error as Error, {
          tags: { context: "oauth-callback" },
          level: "error",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [authService, router],
  );

  // ==========================================================================
  // Magic Link Methods
  // ==========================================================================

  const sendMagicLink = useCallback(
    async (email: string) => {
      if (authConfig.useDevAuth) {
        // In dev mode, simulate success
        return { success: true };
      }

      try {
        return await (authService as NhostAuthService).sendMagicLink(email);
      } catch (error) {
        logger.error("Send magic link error:", error);
        captureError(error as Error, {
          tags: { context: "send-magic-link" },
          level: "error",
        });
        throw error;
      }
    },
    [authService],
  );

  const verifyMagicLink = useCallback(
    async (token: string) => {
      if (authConfig.useDevAuth) {
        throw new Error("Magic links are not available in development mode");
      }

      try {
        setLoading(true);
        const response = await (
          authService as NhostAuthService
        ).verifyMagicLink(token);

        const mappedUser: User = {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username || response.user.email.split("@")[0],
          displayName:
            response.user.displayName ||
            response.user.username ||
            response.user.email.split("@")[0],
          avatarUrl: response.user.avatarUrl || undefined,
          role: response.user.role,
          emailVerified: true,
        };

        setUser(mappedUser);

        setSentryUser({
          id: mappedUser.id,
          email: mappedUser.email,
          username: mappedUser.username,
          role: mappedUser.role,
        });

        router.push("/chat");
      } catch (error) {
        logger.error("Verify magic link error:", error);
        captureError(error as Error, {
          tags: { context: "verify-magic-link" },
          level: "error",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [authService, router],
  );

  // ==========================================================================
  // Password Methods
  // ==========================================================================

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (authConfig.useDevAuth) {
        return { success: true };
      }

      try {
        return await (authService as NhostAuthService).requestPasswordReset(
          email,
        );
      } catch (error) {
        logger.error("Request password reset error:", error);
        captureError(error as Error, {
          tags: { context: "request-password-reset" },
          level: "error",
        });
        throw error;
      }
    },
    [authService],
  );

  const resetPassword = useCallback(
    async (token: string, newPassword: string) => {
      if (authConfig.useDevAuth) {
        return { success: true };
      }

      try {
        return await (authService as NhostAuthService).resetPassword(
          token,
          newPassword,
        );
      } catch (error) {
        logger.error("Reset password error:", error);
        captureError(error as Error, {
          tags: { context: "reset-password" },
          level: "error",
        });
        throw error;
      }
    },
    [authService],
  );

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      if (authConfig.useDevAuth) {
        return { success: true };
      }

      try {
        return await (authService as NhostAuthService).changePassword(
          oldPassword,
          newPassword,
        );
      } catch (error) {
        logger.error("Change password error:", error);
        captureError(error as Error, {
          tags: { context: "change-password" },
          level: "error",
        });
        throw error;
      }
    },
    [authService],
  );

  // ==========================================================================
  // Email Verification Methods
  // ==========================================================================

  const sendEmailVerification = useCallback(
    async (email: string) => {
      if (authConfig.useDevAuth) {
        return { success: true };
      }

      try {
        return await (authService as NhostAuthService).sendEmailVerification(
          email,
        );
      } catch (error) {
        logger.error("Send email verification error:", error);
        captureError(error as Error, {
          tags: { context: "send-email-verification" },
          level: "error",
        });
        throw error;
      }
    },
    [authService],
  );

  const verifyEmail = useCallback(
    async (token: string) => {
      if (authConfig.useDevAuth) {
        return { success: true };
      }

      try {
        return await (authService as NhostAuthService).verifyEmail(token);
      } catch (error) {
        logger.error("Verify email error:", error);
        captureError(error as Error, {
          tags: { context: "verify-email" },
          level: "error",
        });
        throw error;
      }
    },
    [authService],
  );

  // ==========================================================================
  // 2FA Methods
  // ==========================================================================

  const getTwoFactorStatus = useCallback(async (): Promise<TwoFactorStatus> => {
    if (authConfig.useDevAuth) {
      return { enabled: false, method: null, hasBackupCodes: false };
    }

    try {
      return await (authService as NhostAuthService).getTwoFactorStatus();
    } catch (error) {
      logger.error("Get 2FA status error:", error);
      return { enabled: false, method: null, hasBackupCodes: false };
    }
  }, [authService]);

  const generateTOTPSecret = useCallback(async () => {
    if (authConfig.useDevAuth) {
      throw new Error("2FA is not available in development mode");
    }

    try {
      return await (authService as NhostAuthService).generateTOTPSecret();
    } catch (error) {
      logger.error("Generate TOTP secret error:", error);
      captureError(error as Error, {
        tags: { context: "generate-totp-secret" },
        level: "error",
      });
      throw error;
    }
  }, [authService]);

  const enableTOTP = useCallback(
    async (code: string) => {
      if (authConfig.useDevAuth) {
        throw new Error("2FA is not available in development mode");
      }

      try {
        return await (authService as NhostAuthService).enableTOTP(code);
      } catch (error) {
        logger.error("Enable TOTP error:", error);
        captureError(error as Error, {
          tags: { context: "enable-totp" },
          level: "error",
        });
        throw error;
      }
    },
    [authService],
  );

  const disableTOTP = useCallback(
    async (code: string) => {
      if (authConfig.useDevAuth) {
        throw new Error("2FA is not available in development mode");
      }

      try {
        return await (authService as NhostAuthService).disableTOTP(code);
      } catch (error) {
        logger.error("Disable TOTP error:", error);
        captureError(error as Error, {
          tags: { context: "disable-totp" },
          level: "error",
        });
        throw error;
      }
    },
    [authService],
  );

  const verifyTOTP = useCallback(
    async (ticket: string, code: string) => {
      if (authConfig.useDevAuth) {
        throw new Error("2FA is not available in development mode");
      }

      try {
        setLoading(true);
        const response = await (authService as NhostAuthService).verifyTOTP(
          ticket,
          code,
        );

        const mappedUser: User = {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username || response.user.email.split("@")[0],
          displayName:
            response.user.displayName ||
            response.user.username ||
            response.user.email.split("@")[0],
          avatarUrl: response.user.avatarUrl || undefined,
          role: response.user.role,
          emailVerified: response.user.emailVerified,
        };

        setUser(mappedUser);

        setSentryUser({
          id: mappedUser.id,
          email: mappedUser.email,
          username: mappedUser.username,
          role: mappedUser.role,
        });

        // Clear MFA ticket
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("nchat-mfa-ticket");
        }

        router.push("/chat");
      } catch (error) {
        logger.error("Verify TOTP error:", error);
        captureError(error as Error, {
          tags: { context: "verify-totp" },
          level: "error",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [authService, router],
  );

  // ==========================================================================
  // Session Helpers
  // ==========================================================================

  const getAccessToken = useCallback(() => {
    if (authConfig.useDevAuth) {
      return "dev-token";
    }
    return (authService as NhostAuthService).getAccessToken?.() || null;
  }, [authService]);

  const refreshSession = useCallback(async () => {
    try {
      await authService.refreshToken();
    } catch (error) {
      logger.error("Refresh session error:", error);
    }
  }, [authService]);

  // ==========================================================================
  // Dev Mode User Switching
  // ==========================================================================

  const switchUser = useCallback(
    async (userId: string) => {
      if (!authConfig.useDevAuth) return;

      try {
        const fauxAuth = authService as FauxAuthService;
        const response = await fauxAuth.switchUser(userId);
        if (response) {
          const mappedUser: User = {
            id: response.user.id,
            email: response.user.email,
            username:
              response.user.username || response.user.email.split("@")[0],
            displayName:
              response.user.displayName ||
              response.user.username ||
              response.user.email.split("@")[0],
            avatarUrl: response.user.avatarUrl || undefined,
            role: response.user.role,
          };
          setUser(mappedUser);
        }
      } catch (error) {
        logger.error("Switch user error:", error);
      }
    },
    [authService],
  );

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const contextValue = useMemo<AuthContextType>(
    () => ({
      // State
      user,
      loading,
      isAuthenticated: !!user,
      isDevMode: authConfig.useDevAuth,

      // Core auth methods
      signIn,
      signUp,
      signOut,
      updateProfile,

      // OAuth methods
      signInWithOAuth,
      handleOAuthCallback,

      // Magic link methods
      sendMagicLink,
      verifyMagicLink,

      // Password methods
      requestPasswordReset,
      resetPassword,
      changePassword,

      // Email verification
      sendEmailVerification,
      verifyEmail,

      // 2FA methods
      getTwoFactorStatus,
      generateTOTPSecret,
      enableTOTP,
      disableTOTP,
      verifyTOTP,

      // Session helpers
      getAccessToken,
      refreshSession,

      // Dev mode only
      switchUser: authConfig.useDevAuth ? switchUser : undefined,
    }),
    [
      user,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      signInWithOAuth,
      handleOAuthCallback,
      sendMagicLink,
      verifyMagicLink,
      requestPasswordReset,
      resetPassword,
      changePassword,
      sendEmailVerification,
      verifyEmail,
      getTwoFactorStatus,
      generateTOTPSecret,
      enableTOTP,
      disableTOTP,
      verifyTOTP,
      getAccessToken,
      refreshSession,
      switchUser,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ============================================================================
// Auth Guard Component
// ============================================================================

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredRole?: UserRole | UserRole[];
  require2FA?: boolean;
}

export function AuthGuard({
  children,
  fallback = null,
  requiredRole,
  require2FA = false,
}: AuthGuardProps) {
  const { user, loading, isAuthenticated, getTwoFactorStatus } = useAuth();
  const router = useRouter();
  const [checking2FA, setChecking2FA] = useState(require2FA);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Check role requirements
    if (requiredRole && user) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(user.role)) {
        router.push("/unauthorized");
        return;
      }
    }

    // Check 2FA requirement
    if (require2FA && user && !authConfig.useDevAuth) {
      getTwoFactorStatus().then((status) => {
        if (!status.enabled && isTwoFactorRequired(user.role)) {
          router.push("/settings/security?setup2fa=true");
        }
        setChecking2FA(false);
      });
    } else {
      setChecking2FA(false);
    }
  }, [
    loading,
    isAuthenticated,
    user,
    requiredRole,
    require2FA,
    router,
    getTwoFactorStatus,
  ]);

  if (loading || checking2FA) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default AuthContext;
