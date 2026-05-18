/**
 * Auth Resource
 *
 * API methods for authentication and authorization.
 */

import { BaseResource } from "./base";
import type { User } from "../types";

/**
 * Sign In Options
 */
export interface SignInOptions {
  email: string;
  password: string;
}

/**
 * Sign Up Options
 */
export interface SignUpOptions {
  email: string;
  password: string;
  displayName: string;
  username?: string;
}

/**
 * Auth Response
 */
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt: string;
}

/**
 * Auth Resource Class
 *
 * @example
 * ```typescript
 * // Sign in
 * const { user, token } = await client.auth.signIn({
 *   email: 'user@example.com',
 * // sast-ignore: HARDCODED_CREDENTIAL -- JSDoc example with placeholder values, not real credentials
 *   password: 'password123'
 * })
 *
 * // Update client token
 * client.setToken(token)
 *
 * // Sign out
 * await client.auth.signOut()
 * ```
 */
export class AuthResource extends BaseResource {
  /**
   * Sign in with email and password
   */
  async signIn(options: SignInOptions): Promise<AuthResponse> {
    return this._post<AuthResponse>("/api/auth/signin", options);
  }

  /**
   * Sign up with email and password
   */
  async signUp(options: SignUpOptions): Promise<AuthResponse> {
    return this._post<AuthResponse>("/api/auth/signup", options);
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await this._post<void>("/api/auth/signout");
    this.client.clearAuth();
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return this._post<AuthResponse>("/api/auth/refresh", { refreshToken });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    return this._post<void>("/api/auth/password-reset", { email });
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    return this._post<void>("/api/auth/password-reset/confirm", {
      token,
      password: newPassword,
    });
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    return this._post<void>("/api/auth/verify-email", { token });
  }

  /**
   * Enable 2FA
   */
  async enable2FA(): Promise<{ secret: string; qrCode: string }> {
    return this._post<{ secret: string; qrCode: string }>(
      "/api/auth/2fa/setup",
    );
  }

  /**
   * Verify 2FA setup
   */
  async verify2FA(token: string): Promise<{ backupCodes: string[] }> {
    return this._post<{ backupCodes: string[] }>("/api/auth/2fa/verify-setup", {
      token,
    });
  }

  /**
   * Disable 2FA
   */
  async disable2FA(password: string): Promise<void> {
    return this._post<void>("/api/auth/2fa/disable", { password });
  }
}
