/**
 * Nhost Authentication Service
 *
 * Production-ready authentication service using Nhost Auth.
 * Provides email/password, OAuth, magic links, and 2FA support.
 */

import { nhost } from "@/lib/nhost";
import {
  authConfig,
  validatePassword,
  isEmailDomainAllowed,
} from "@/config/auth.config";
import type {
  AuthService,
  AuthResponse,
  AuthUser,
  UserRole,
} from "./auth.interface";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface SignUpOptions {
  displayName?: string;
  metadata?: Record<string, unknown>;
  redirectTo?: string;
}

export type OAuthProvider =
  | "google"
  | "github"
  | "microsoft"
  | "apple"
  | "facebook"
  | "twitter";

export interface SignInWithOAuthOptions {
  provider: OAuthProvider;
  redirectTo?: string;
  scopes?: string[];
}

export interface MagicLinkOptions {
  redirectTo?: string;
}

export interface PasswordResetOptions {
  redirectTo?: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  method: "totp" | null;
  hasBackupCodes: boolean;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

// ============================================================================
// Nhost Auth Service Implementation
// ============================================================================

export class NhostAuthService implements AuthService {
  private sessionRefreshInterval: NodeJS.Timeout | null = null;
  private currentSession: Session | null = null;

  constructor() {
    // Verify not running in production with dev auth
    if (authConfig.isProduction && authConfig.useDevAuth) {
      throw new Error(
        "[SECURITY] FATAL: NhostAuthService instantiated with dev auth in production",
      );
    }

    // Initialize session refresh if we have a session
    if (typeof window !== "undefined") {
      this.initializeFromStorage();
      this.setupSessionRefresh();
    }
  }

  // ==========================================================================
  // Core Authentication Methods
  // ==========================================================================

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      // Validate email domain if restrictions are in place
      if (!isEmailDomainAllowed(email)) {
        throw new Error("Email domain is not allowed");
      }

      const { session, error } = await nhost.auth.signIn({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!session) {
        throw new Error("Failed to create session");
      }

      // Get user details including role from the database
      const user = await this.getUserWithRole(session.user.id);
      const mappedUser = this.mapNhostUser(session.user, user);

      // Store session
      this.currentSession = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken!,
        expiresAt: session.accessTokenExpiresIn
          ? Date.now() + session.accessTokenExpiresIn * 1000
          : Date.now() + 3600 * 1000,
        user: mappedUser,
      };

      this.persistSession();
      this.setupSessionRefresh();

      return {
        user: mappedUser,
        token: session.accessToken,
      };
    } catch (error) {
      logger.error("NhostAuthService signIn error:", error);
      throw error;
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(
    email: string,
    password: string,
    username: string,
    options?: SignUpOptions,
  ): Promise<AuthResponse> {
    try {
      // Validate email domain
      if (!isEmailDomainAllowed(email)) {
        throw new Error("Email domain is not allowed");
      }

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(". "));
      }

      const { session, error } = await nhost.auth.signUp({
        email,
        password,
        options: {
          displayName: options?.displayName || username,
          redirectTo: options?.redirectTo,
          metadata: {
            username,
            ...options?.metadata,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // If email verification is required, session might be null
      if (!session) {
        if (authConfig.security.requireEmailVerification) {
          return {
            user: {
              id: "",
              email,
              username,
              displayName: options?.displayName || username,
              role: "guest",
            },
            token: "",
            requiresEmailVerification: true,
          } as AuthResponse & { requiresEmailVerification: boolean };
        }
        throw new Error("Failed to create session");
      }

      // Determine if this is the first user (owner)
      const isFirstUser = await this.checkIfFirstUser();
      const role: UserRole = isFirstUser ? "owner" : "member";

      // Create nchat user record
      await this.createNchatUser(session.user.id, username, email, role);

      const mappedUser: AuthUser = {
        id: session.user.id,
        email: session.user.email!,
        username,
        displayName: session.user.displayName || username,
        avatarUrl: session.user.avatarUrl || undefined,
        role,
      };

      // Store session
      this.currentSession = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken!,
        expiresAt: session.accessTokenExpiresIn
          ? Date.now() + session.accessTokenExpiresIn * 1000
          : Date.now() + 3600 * 1000,
        user: mappedUser,
      };

      this.persistSession();
      this.setupSessionRefresh();

      return {
        user: mappedUser,
        token: session.accessToken,
      };
    } catch (error) {
      logger.error("NhostAuthService signUp error:", error);
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await nhost.auth.signOut();
      if (error) {
        logger.error("Sign out error:", error);
      }
    } catch (error) {
      logger.error("NhostAuthService signOut error:", error);
    } finally {
      this.clearSession();
      this.clearSessionRefresh();
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      // Try to get from current session first
      if (this.currentSession?.user) {
        return this.currentSession.user;
      }

      const session = nhost.auth.getSession();
      if (!session || !session.user) {
        return null;
      }

      // Get user details including role from the database
      const user = await this.getUserWithRole(session.user.id);

      return this.mapNhostUser(session.user, user);
    } catch (error) {
      logger.error("NhostAuthService getCurrentUser error:", error);
      return null;
    }
  }

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const { session, error } = await nhost.auth.refreshSession();

      if (error) {
        logger.error("Token refresh error:", error);
        return null;
      }

      if (session) {
        // Update stored session
        if (this.currentSession) {
          this.currentSession.accessToken = session.accessToken;
          this.currentSession.refreshToken = session.refreshToken!;
          this.currentSession.expiresAt = session.accessTokenExpiresIn
            ? Date.now() + session.accessTokenExpiresIn * 1000
            : Date.now() + 3600 * 1000;
          this.persistSession();
        }

        return session.accessToken;
      }

      return null;
    } catch (error) {
      logger.error("NhostAuthService refreshToken error:", error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<AuthUser>): Promise<AuthResponse> {
    try {
      const session = nhost.auth.getSession();
      if (!session || !session.user) {
        throw new Error("Not authenticated");
      }

      const userId = session.user.id;

      // Update nchat_users table
      const mutation = `
        mutation UpdateUserProfile(
          $userId: uuid!,
          $username: String,
          $displayName: String,
          $avatarUrl: String
        ) {
          update_nchat_users(
            where: {auth_user_id: {_eq: $userId}},
            _set: {
              username: $username,
              display_name: $displayName,
              avatar_url: $avatarUrl
            }
          ) {
            affected_rows
            returning {
              username
              display_name
              avatar_url
              role
            }
          }
        }
      `;

      const variables: Record<string, unknown> = { userId };
      if (data.username) variables.username = data.username;
      if (data.displayName) variables.displayName = data.displayName;
      if (data.avatarUrl !== undefined) variables.avatarUrl = data.avatarUrl;

      const { data: mutationData, error } = await nhost.graphql.request(
        mutation,
        variables,
      );

      if (error) {
        const errorMessage = Array.isArray(error)
          ? error[0]?.message || "Failed to update profile"
          : error.message || "Failed to update profile";
        throw new Error(errorMessage);
      }

      const updatedUser = mutationData?.update_nchat_users?.returning?.[0];

      const user: AuthUser = {
        id: userId,
        email: session.user.email!,
        username:
          updatedUser?.username ||
          data.username ||
          session.user.email!.split("@")[0],
        displayName:
          updatedUser?.display_name ||
          data.displayName ||
          session.user.displayName!,
        avatarUrl: updatedUser?.avatar_url || data.avatarUrl,
        role: updatedUser?.role || "member",
      };

      // Update current session
      if (this.currentSession) {
        this.currentSession.user = user;
        this.persistSession();
      }

      return {
        user,
        token: session.accessToken,
      };
    } catch (error) {
      logger.error("NhostAuthService updateProfile error:", error);
      throw error;
    }
  }

  // ==========================================================================
  // OAuth Methods
  // ==========================================================================

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(options: SignInWithOAuthOptions): Promise<void> {
    const { provider, redirectTo, scopes } = options;

    // Verify provider is enabled
    const providerConfig =
      authConfig.providers[provider as keyof typeof authConfig.providers];
    if (typeof providerConfig === "object" && !providerConfig.enabled) {
      throw new Error(`${provider} authentication is not enabled`);
    }

    // Build redirect URL
    const redirectUrl =
      redirectTo ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "/auth/callback");

    // Redirect to Nhost OAuth endpoint
    const params = new URLSearchParams({
      provider,
      redirectTo: redirectUrl,
    });

    if (scopes?.length) {
      params.set("scope", scopes.join(" "));
    }

    const oauthUrl = `${authConfig.authUrl}/signin/provider/${provider}?${params.toString()}`;

    if (typeof window !== "undefined") {
      window.location.href = oauthUrl;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(params: URLSearchParams): Promise<AuthResponse> {
    const error = params.get("error");
    if (error) {
      throw new Error(
        params.get("error_description") || "OAuth authentication failed",
      );
    }

    const refreshToken = params.get("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token received");
    }

    // Exchange refresh token for session
    const response = await fetch(`${authConfig.authUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "Failed to authenticate");
    }

    const data = await response.json();

    // Get or create nchat user
    let userRecord = await this.getUserWithRole(data.user.id);

    if (!userRecord.role) {
      // First time OAuth user - create nchat record
      const isFirstUser = await this.checkIfFirstUser();
      const role: UserRole = isFirstUser ? "owner" : "member";
      const username =
        data.user.displayName?.replace(/\s+/g, "_").toLowerCase() ||
        data.user.email.split("@")[0];

      await this.createNchatUser(data.user.id, username, data.user.email, role);
      userRecord = { ...userRecord, role, username };
    }

    const user = this.mapNhostUser(data.user, userRecord);

    // Store session
    this.currentSession = {
      accessToken: data.session.accessToken,
      refreshToken: data.session.refreshToken,
      expiresAt:
        Date.now() + (data.session.accessTokenExpiresIn || 3600) * 1000,
      user,
    };

    this.persistSession();
    this.setupSessionRefresh();

    return {
      user,
      token: data.session.accessToken,
    };
  }

  // ==========================================================================
  // Magic Link Methods
  // ==========================================================================

  /**
   * Send magic link to email
   */
  async sendMagicLink(
    email: string,
    options?: MagicLinkOptions,
  ): Promise<{ success: boolean }> {
    try {
      if (!isEmailDomainAllowed(email)) {
        throw new Error("Email domain is not allowed");
      }

      const response = await fetch(
        `${authConfig.authUrl}/signin/passwordless/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            options: {
              redirectTo:
                options?.redirectTo ||
                (typeof window !== "undefined"
                  ? `${window.location.origin}/auth/callback?type=magicLink`
                  : "/auth/callback?type=magicLink"),
            },
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to send magic link");
      }

      return { success: true };
    } catch (error) {
      logger.error("Send magic link error:", error);
      throw error;
    }
  }

  /**
   * Verify magic link token
   */
  async verifyMagicLink(token: string): Promise<AuthResponse> {
    const response = await fetch(
      `${authConfig.authUrl}/signin/passwordless/email/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      },
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "Magic link verification failed");
    }

    const data = await response.json();

    // Get or create nchat user
    let userRecord = await this.getUserWithRole(data.user.id);

    if (!userRecord.role) {
      const isFirstUser = await this.checkIfFirstUser();
      const role: UserRole = isFirstUser ? "owner" : "member";
      const username = data.user.email.split("@")[0];

      await this.createNchatUser(data.user.id, username, data.user.email, role);
      userRecord = { ...userRecord, role, username };
    }

    const user = this.mapNhostUser(data.user, userRecord);

    // Store session
    this.currentSession = {
      accessToken: data.session.accessToken,
      refreshToken: data.session.refreshToken,
      expiresAt:
        Date.now() + (data.session.accessTokenExpiresIn || 3600) * 1000,
      user,
    };

    this.persistSession();
    this.setupSessionRefresh();

    return {
      user,
      token: data.session.accessToken,
    };
  }

  // ==========================================================================
  // Password Reset Methods
  // ==========================================================================

  /**
   * Request password reset email
   */
  async requestPasswordReset(
    email: string,
    options?: PasswordResetOptions,
  ): Promise<{ success: boolean }> {
    try {
      const response = await fetch(
        `${authConfig.authUrl}/user/password/reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            options: {
              redirectTo:
                options?.redirectTo ||
                (typeof window !== "undefined"
                  ? `${window.location.origin}/auth/reset-password`
                  : "/auth/reset-password"),
            },
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error?.message || "Failed to send password reset email",
        );
      }

      return { success: true };
    } catch (error) {
      logger.error("Request password reset error:", error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(". "));
    }

    const response = await fetch(
      `${authConfig.authUrl}/user/password/reset/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket: token,
          newPassword,
        }),
      },
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "Password reset failed");
    }

    return { success: true };
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(". "));
    }

    const session = nhost.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${authConfig.authUrl}/user/password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        oldPassword,
        newPassword,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "Password change failed");
    }

    return { success: true };
  }

  // ==========================================================================
  // Email Verification Methods
  // ==========================================================================

  /**
   * Send email verification
   */
  async sendEmailVerification(email: string): Promise<{ success: boolean }> {
    const response = await fetch(
      `${authConfig.authUrl}/user/email/send-verification-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          options: {
            redirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/auth/verify-email`
                : "/auth/verify-email",
          },
        }),
      },
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        data.error?.message || "Failed to send verification email",
      );
    }

    return { success: true };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ success: boolean }> {
    const response = await fetch(`${authConfig.authUrl}/user/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: token }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "Email verification failed");
    }

    return { success: true };
  }

  // ==========================================================================
  // Two-Factor Authentication Methods
  // ==========================================================================

  /**
   * Get 2FA status for current user
   */
  async getTwoFactorStatus(): Promise<TwoFactorStatus> {
    const session = nhost.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${authConfig.authUrl}/mfa/totp`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      return {
        enabled: false,
        method: null,
        hasBackupCodes: false,
      };
    }

    const data = await response.json();
    return {
      enabled: data.isActive || false,
      method: data.isActive ? "totp" : null,
      hasBackupCodes: false, // Would need to check database
    };
  }

  /**
   * Generate TOTP secret for 2FA setup
   */
  async generateTOTPSecret(): Promise<{
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
  }> {
    const session = nhost.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${authConfig.authUrl}/mfa/totp/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "Failed to generate TOTP secret");
    }

    const data = await response.json();
    return {
      secret: data.totpSecret,
      otpauthUrl: data.imageUrl, // Nhost returns the otpauth URL in imageUrl
      qrCodeDataUrl: data.qrCodeDataUrl || "", // May need to generate separately
    };
  }

  /**
   * Enable TOTP 2FA
   */
  async enableTOTP(
    code: string,
  ): Promise<{ success: boolean; backupCodes?: string[] }> {
    const session = nhost.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${authConfig.authUrl}/mfa/totp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        code,
        activateMfa: true,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "Failed to enable 2FA");
    }

    return { success: true };
  }

  /**
   * Disable TOTP 2FA
   */
  async disableTOTP(code: string): Promise<{ success: boolean }> {
    const session = nhost.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${authConfig.authUrl}/mfa/totp`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "Failed to disable 2FA");
    }

    return { success: true };
  }

  /**
   * Verify TOTP code during sign in
   */
  async verifyTOTP(ticket: string, code: string): Promise<AuthResponse> {
    const response = await fetch(`${authConfig.authUrl}/signin/mfa/totp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket,
        otp: code,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "2FA verification failed");
    }

    const data = await response.json();
    const userRecord = await this.getUserWithRole(data.user.id);
    const user = this.mapNhostUser(data.user, userRecord);

    // Store session
    this.currentSession = {
      accessToken: data.session.accessToken,
      refreshToken: data.session.refreshToken,
      expiresAt:
        Date.now() + (data.session.accessTokenExpiresIn || 3600) * 1000,
      user,
    };

    this.persistSession();
    this.setupSessionRefresh();

    return {
      user,
      token: data.session.accessToken,
    };
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return (
      this.currentSession?.accessToken || nhost.auth.getAccessToken() || null
    );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentSession || nhost.auth.isAuthenticated();
  }

  /**
   * Get session expiration time
   */
  getSessionExpiresAt(): number | null {
    return this.currentSession?.expiresAt || null;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private async getUserWithRole(userId: string): Promise<{
    username?: string;
    display_name?: string;
    avatar_url?: string;
    role?: UserRole;
  }> {
    const query = `
      query GetUserWithRole($userId: uuid!) {
        nchat_users(where: {auth_user_id: {_eq: $userId}}) {
          username
          display_name
          avatar_url
          role
        }
      }
    `;

    try {
      const { data, error } = await nhost.graphql.request(query, { userId });

      if (error) {
        logger.error("Error fetching user role:", error);
        return { role: "guest" };
      }

      const nchatUser = data?.nchat_users?.[0];
      if (!nchatUser) {
        return { role: undefined };
      }

      return {
        username: nchatUser.username,
        display_name: nchatUser.display_name,
        avatar_url: nchatUser.avatar_url,
        role: nchatUser.role || "guest",
      };
    } catch (error) {
      logger.error("getUserWithRole error:", error);
      return { role: "guest" };
    }
  }

  private async checkIfFirstUser(): Promise<boolean> {
    const query = `
      query CheckFirstUser {
        nchat_users_aggregate {
          aggregate {
            count
          }
        }
      }
    `;

    try {
      const { data } = await nhost.graphql.request(query);
      return data?.nchat_users_aggregate?.aggregate?.count === 0;
    } catch (error) {
      logger.error("checkIfFirstUser error:", error);
      return false;
    }
  }

  private async createNchatUser(
    userId: string,
    username: string,
    email: string,
    role: UserRole,
  ): Promise<void> {
    const mutation = `
      mutation CreateNchatUser($userId: uuid!, $username: String!, $email: String!, $role: String!) {
        insert_nchat_users_one(object: {
          auth_user_id: $userId,
          username: $username,
          display_name: $username,
          email: $email,
          role: $role
        }) {
          id
        }
      }
    `;

    try {
      await nhost.graphql.request(mutation, {
        userId,
        username,
        email,
        role,
      });
    } catch (error) {
      logger.error("createNchatUser error:", error);
      // Don't throw - user creation in nchat_users is not critical
    }
  }

  private mapNhostUser(
    nhostUser: {
      id: string;
      email?: string;
      displayName?: string;
      avatarUrl?: string;
    },
    nchatUser: {
      username?: string;
      display_name?: string;
      avatar_url?: string;
      role?: UserRole;
    },
  ): AuthUser {
    return {
      id: nhostUser.id,
      email: nhostUser.email || "",
      username: nchatUser.username || nhostUser.email?.split("@")[0] || "",
      displayName:
        nchatUser.display_name ||
        nhostUser.displayName ||
        nhostUser.email?.split("@")[0] ||
        "",
      avatarUrl: nchatUser.avatar_url || nhostUser.avatarUrl || undefined,
      role: nchatUser.role || "guest",
    };
  }

  private initializeFromStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("nchat-session");
      if (stored) {
        const session = JSON.parse(stored);
        if (session.expiresAt > Date.now()) {
          this.currentSession = session;
        } else {
          localStorage.removeItem("nchat-session");
        }
      }
    } catch (error) {
      logger.error("Failed to load session from storage:", error);
      localStorage.removeItem("nchat-session");
    }
  }

  private persistSession(): void {
    if (typeof window === "undefined" || !this.currentSession) return;

    try {
      localStorage.setItem(
        "nchat-session",
        JSON.stringify(this.currentSession),
      );
    } catch (error) {
      logger.error("Failed to persist session:", error);
    }
  }

  private clearSession(): void {
    this.currentSession = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("nchat-session");
    }
  }

  private setupSessionRefresh(): void {
    if (typeof window === "undefined") return;

    this.clearSessionRefresh();

    // Refresh token before it expires
    const refreshInterval = (authConfig.session.refreshThreshold - 60) * 1000; // 60 seconds before threshold

    this.sessionRefreshInterval = setInterval(async () => {
      if (
        this.currentSession &&
        this.currentSession.expiresAt - Date.now() <
          authConfig.session.refreshThreshold * 1000
      ) {
        await this.refreshToken();
      }
    }, refreshInterval);
  }

  private clearSessionRefresh(): void {
    if (this.sessionRefreshInterval) {
      clearInterval(this.sessionRefreshInterval);
      this.sessionRefreshInterval = null;
    }
  }
}

export default NhostAuthService;
