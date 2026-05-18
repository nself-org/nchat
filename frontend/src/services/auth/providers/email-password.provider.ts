/**
 * Email/Password Authentication Provider
 *
 * Traditional email and password authentication with support for:
 * - Sign up with email verification
 * - Sign in with credentials
 * - Password reset flow
 * - Email verification
 */

import { logger } from "@/lib/logger";
import {
  AuthProvider,
  AuthProviderMetadata,
  AuthProviderConfig,
  AuthCredentials,
  AuthResult,
  AuthUser,
  AuthError,
  AuthEventListener,
  EmailPasswordCredentials,
  OAuthState,
  BaseAuthProvider,
} from "../auth-plugin.interface";

export interface EmailPasswordConfig extends AuthProviderConfig {
  requireEmailVerification?: boolean;
  minPasswordLength?: number;
  requireStrongPassword?: boolean;
  allowSignUp?: boolean;
  authApiUrl?: string;
}

export class EmailPasswordProvider extends BaseAuthProvider {
  readonly metadata: AuthProviderMetadata = {
    id: "email-password",
    name: "Email & Password",
    type: "email",
    icon: "mail",
    description: "Sign in with your email address and password",
    requiresBackend: true,
    supportedFeatures: {
      signIn: true,
      signUp: true,
      signOut: true,
      tokenRefresh: true,
      passwordReset: true,
      emailVerification: true,
      phoneVerification: false,
      mfa: false,
      linkAccount: true,
    },
  };

  private extendedConfig: EmailPasswordConfig = {
    enabled: false,
    requireEmailVerification: true,
    minPasswordLength: 8,
    requireStrongPassword: true,
    allowSignUp: true,
  };

  async initialize(config: AuthProviderConfig): Promise<void> {
    await super.initialize(config);
    this.extendedConfig = { ...this.extendedConfig, ...config };
    await this.loadSession();
  }

  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    if (!this.isEnabled()) {
      return this.createErrorResult(
        this.createError(
          "PROVIDER_DISABLED",
          "Email/password authentication is not enabled",
        ),
      );
    }

    const emailCreds = credentials as EmailPasswordCredentials;
    if (!emailCreds.email || !emailCreds.password) {
      return this.createErrorResult(
        this.createError(
          "INVALID_CREDENTIALS",
          "Email and password are required",
        ),
      );
    }

    try {
      const response = await fetch(
        `${this.getAuthApiUrl()}/signin/email-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailCreds.email,
            password: emailCreds.password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return this.createErrorResult(
          this.createError(
            data.error?.code || "AUTH_FAILED",
            data.error?.message || "Authentication failed",
          ),
        );
      }

      const user = this.mapUserResponse(data.user);
      this.currentUser = user;
      this.authenticated = true;
      this.persistSession(data.session);

      this.emitEvent({
        type: "signIn",
        user,
        timestamp: Date.now(),
      });

      return this.createSuccessResult(
        user,
        data.session.accessToken,
        data.session.refreshToken,
      );
    } catch (error) {
      logger.error("Email/password sign in error:", error);
      return this.createErrorResult(
        this.createError(
          "NETWORK_ERROR",
          "Failed to connect to authentication service",
        ),
      );
    }
  }

  async signUp(
    credentials: AuthCredentials,
    metadata?: Record<string, unknown>,
  ): Promise<AuthResult> {
    if (!this.isEnabled()) {
      return this.createErrorResult(
        this.createError(
          "PROVIDER_DISABLED",
          "Email/password authentication is not enabled",
        ),
      );
    }

    if (!this.extendedConfig.allowSignUp) {
      return this.createErrorResult(
        this.createError(
          "SIGNUP_DISABLED",
          "Sign up is not allowed for this provider",
        ),
      );
    }

    const emailCreds = credentials as EmailPasswordCredentials;
    if (!emailCreds.email || !emailCreds.password) {
      return this.createErrorResult(
        this.createError(
          "INVALID_CREDENTIALS",
          "Email and password are required",
        ),
      );
    }

    const passwordValidation = this.validatePassword(emailCreds.password);
    if (!passwordValidation.valid) {
      return this.createErrorResult(
        this.createError(
          "WEAK_PASSWORD",
          passwordValidation.message || "Password does not meet requirements",
        ),
      );
    }

    try {
      const response = await fetch(
        `${this.getAuthApiUrl()}/signup/email-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailCreds.email,
            password: emailCreds.password,
            options: {
              displayName:
                metadata?.displayName || emailCreds.email.split("@")[0],
              metadata,
            },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return this.createErrorResult(
          this.createError(
            data.error?.code || "SIGNUP_FAILED",
            data.error?.message || "Sign up failed",
          ),
        );
      }

      // If email verification is required, user won't be authenticated yet
      if (this.extendedConfig.requireEmailVerification && !data.session) {
        return {
          success: true,
          user: this.mapUserResponse(data.user),
        };
      }

      const user = this.mapUserResponse(data.user);
      this.currentUser = user;
      this.authenticated = true;
      this.persistSession(data.session);

      this.emitEvent({
        type: "signUp",
        user,
        timestamp: Date.now(),
      });

      return this.createSuccessResult(
        user,
        data.session.accessToken,
        data.session.refreshToken,
      );
    } catch (error) {
      logger.error("Email/password sign up error:", error);
      return this.createErrorResult(
        this.createError(
          "NETWORK_ERROR",
          "Failed to connect to authentication service",
        ),
      );
    }
  }

  async signOut(): Promise<void> {
    try {
      await fetch(`${this.getAuthApiUrl()}/signout`, {
        method: "POST",
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      logger.error("Sign out error:", error);
    }

    this.clearSession();
    await super.signOut();
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.getAuthApiUrl()}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.clearSession();
        return this.createErrorResult(
          this.createError("TOKEN_REFRESH_FAILED", "Failed to refresh token"),
        );
      }

      this.persistSession(data.session);

      this.emitEvent({
        type: "tokenRefresh",
        timestamp: Date.now(),
      });

      return this.createSuccessResult(
        this.currentUser!,
        data.session.accessToken,
        data.session.refreshToken,
      );
    } catch (error) {
      logger.error("Token refresh error:", error);
      return this.createErrorResult(
        this.createError("NETWORK_ERROR", "Failed to refresh token"),
      );
    }
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    try {
      const response = await fetch(
        `${this.getAuthApiUrl()}/user/password/reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: this.createError(
            "RESET_FAILED",
            data.error?.message || "Failed to send reset email",
          ),
        };
      }

      return { success: true };
    } catch (error) {
      logger.error("Password reset request error:", error);
      return {
        success: false,
        error: this.createError(
          "NETWORK_ERROR",
          "Failed to request password reset",
        ),
      };
    }
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: this.createError(
          "WEAK_PASSWORD",
          passwordValidation.message || "Password does not meet requirements",
        ),
      };
    }

    try {
      const response = await fetch(
        `${this.getAuthApiUrl()}/user/password/reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket: token, newPassword }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: this.createError(
            "RESET_FAILED",
            data.error?.message || "Failed to reset password",
          ),
        };
      }

      this.emitEvent({
        type: "passwordReset",
        timestamp: Date.now(),
      });

      return { success: true };
    } catch (error) {
      logger.error("Password reset error:", error);
      return {
        success: false,
        error: this.createError("NETWORK_ERROR", "Failed to reset password"),
      };
    }
  }

  async verifyEmail(
    token: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    try {
      const response = await fetch(
        `${this.getAuthApiUrl()}/user/email/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket: token }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: this.createError(
            "VERIFICATION_FAILED",
            data.error?.message || "Email verification failed",
          ),
        };
      }

      if (this.currentUser) {
        this.currentUser.emailVerified = true;
      }

      this.emitEvent({
        type: "emailVerified",
        user: this.currentUser || undefined,
        timestamp: Date.now(),
      });

      return { success: true };
    } catch (error) {
      logger.error("Email verification error:", error);
      return {
        success: false,
        error: this.createError("NETWORK_ERROR", "Failed to verify email"),
      };
    }
  }

  async linkAccount(existingUserId: string): Promise<AuthResult> {
    // Email/password can be linked to existing OAuth accounts
    return this.createErrorResult(
      this.createError(
        "NOT_IMPLEMENTED",
        "Account linking not yet implemented",
      ),
    );
  }

  private validatePassword(password: string): {
    valid: boolean;
    message?: string;
  } {
    if (password.length < (this.extendedConfig.minPasswordLength || 8)) {
      return {
        valid: false,
        message: `Password must be at least ${this.extendedConfig.minPasswordLength || 8} characters`,
      };
    }

    if (this.extendedConfig.requireStrongPassword) {
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUppercase || !hasLowercase || !hasNumber) {
        return {
          valid: false,
          message: "Password must contain uppercase, lowercase, and numbers",
        };
      }
    }

    return { valid: true };
  }

  private getAuthApiUrl(): string {
    return (
      this.extendedConfig.authApiUrl ||
      process.env.NEXT_PUBLIC_AUTH_URL ||
      "http://localhost:4000/v1"
    );
  }

  private getAuthHeaders(): Record<string, string> {
    const session = this.getStoredSession();
    return {
      "Content-Type": "application/json",
      ...(session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
    };
  }

  private mapUserResponse(userData: Record<string, unknown>): AuthUser {
    return {
      id: userData.id as string,
      email: userData.email as string,
      username:
        (userData.displayName as string)?.replace(/\s+/g, "_").toLowerCase() ||
        (userData.email as string).split("@")[0],
      displayName:
        (userData.displayName as string) ||
        (userData.email as string).split("@")[0],
      avatarUrl: userData.avatarUrl as string | undefined,
      role: (userData.defaultRole as AuthUser["role"]) || "member",
      emailVerified: (userData.emailVerified as boolean) || false,
      metadata: (userData.metadata as Record<string, unknown>) || {},
      createdAt: userData.createdAt as string,
      lastLoginAt: new Date().toISOString(),
    };
  }

  private persistSession(session: {
    accessToken: string;
    refreshToken: string;
  }): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      "nchat-email-session",
      JSON.stringify({
        ...session,
        timestamp: Date.now(),
      }),
    );
  }

  private getStoredSession(): {
    accessToken: string;
    refreshToken: string;
  } | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("nchat-email-session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("nchat-email-session");
  }

  private async loadSession(): Promise<void> {
    const session = this.getStoredSession();
    if (session?.refreshToken) {
      const result = await this.refreshToken(session.refreshToken);
      if (result.success && result.user) {
        this.currentUser = result.user;
        this.authenticated = true;
      }
    }
  }
}

export default EmailPasswordProvider;
