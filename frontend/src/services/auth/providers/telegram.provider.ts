/**
 * Telegram Authentication Provider
 *
 * Telegram Login Widget authentication:
 * - Login via Telegram widget
 * - Bot-based authentication
 * - Requires Telegram Bot Token
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
  BaseAuthProvider,
} from "../auth-plugin.interface";

export interface TelegramConfig extends AuthProviderConfig {
  authApiUrl?: string;
  botUsername?: string;
  botToken?: string;
  requestWriteAccess?: boolean;
  cornerRadius?: number;
  showUserPhoto?: boolean;
  accessAllowed?: boolean;
}

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export class TelegramProvider extends BaseAuthProvider {
  readonly metadata: AuthProviderMetadata = {
    id: "telegram",
    name: "Telegram",
    type: "social",
    icon: "telegram",
    description: "Sign in with your Telegram account",
    requiresBackend: true,
    supportedFeatures: {
      signIn: true,
      signUp: true,
      signOut: true,
      tokenRefresh: true,
      passwordReset: false,
      emailVerification: false,
      phoneVerification: false,
      mfa: false,
      linkAccount: true,
    },
  };

  private extendedConfig: TelegramConfig = {
    enabled: false,
    requestWriteAccess: false,
    cornerRadius: 14,
    showUserPhoto: true,
    accessAllowed: true,
  };

  private widgetLoaded = false;

  async initialize(config: AuthProviderConfig): Promise<void> {
    await super.initialize(config);
    this.extendedConfig = { ...this.extendedConfig, ...config };
    await this.loadSession();
    this.checkForTelegramCallback();
  }

  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    if (!this.isEnabled()) {
      return this.createErrorResult(
        this.createError(
          "PROVIDER_DISABLED",
          "Telegram authentication is not enabled",
        ),
      );
    }

    // If credentials contain Telegram auth data
    const telegramCreds = credentials as unknown as TelegramAuthData;
    if (telegramCreds.id && telegramCreds.hash) {
      return this.verifyTelegramAuth(telegramCreds);
    }

    // Otherwise, show the Telegram login widget
    await this.showTelegramWidget();

    return {
      success: true,
      // User will interact with widget
    };
  }

  async signUp(
    credentials: AuthCredentials,
    metadata?: Record<string, unknown>,
  ): Promise<AuthResult> {
    // For Telegram, signUp is the same as signIn
    return this.signIn(credentials);
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

  async linkAccount(existingUserId: string): Promise<AuthResult> {
    await this.showTelegramWidget();
    return { success: true };
  }

  /**
   * Load and display the Telegram Login Widget
   */
  async showTelegramWidget(): Promise<void> {
    if (typeof window === "undefined") return;

    if (!this.extendedConfig.botUsername) {
      logger.error("Telegram bot username is required");
      return;
    }

    // Create or find widget container
    let container = document.getElementById("telegram-login-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "telegram-login-container";
      document.body.appendChild(container);
    }

    // Clear previous widget
    // sast-ignore: XSS -- assigning empty string to innerHTML is safe; clears widget for re-render
    container.innerHTML = "";

    // Set up the callback function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    win.onTelegramAuth = (user: TelegramAuthData) => {
      this.verifyTelegramAuth(user).then((result) => {
        if (result.success) {
          // Notify listeners
          this.emitEvent({
            type: "signIn",
            user: result.user,
            timestamp: Date.now(),
          });
        }
      });
    };

    // Create the script element for Telegram widget
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute(
      "data-telegram-login",
      this.extendedConfig.botUsername || "",
    );
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute(
      "data-request-access",
      this.extendedConfig.requestWriteAccess ? "write" : "read",
    );

    if (this.extendedConfig.cornerRadius !== undefined) {
      script.setAttribute(
        "data-radius",
        String(this.extendedConfig.cornerRadius),
      );
    }

    if (!this.extendedConfig.showUserPhoto) {
      script.setAttribute("data-userpic", "false");
    }

    script.async = true;
    container.appendChild(script);

    this.widgetLoaded = true;
  }

  /**
   * Verify Telegram authentication data with backend
   */
  private async verifyTelegramAuth(
    authData: TelegramAuthData,
  ): Promise<AuthResult> {
    // Validate auth_date (should be within 24 hours)
    const authAge = Date.now() / 1000 - authData.auth_date;
    if (authAge > 86400) {
      return this.createErrorResult(
        this.createError(
          "AUTH_EXPIRED",
          "Telegram authentication has expired. Please try again.",
        ),
      );
    }

    try {
      const response = await fetch(`${this.getAuthApiUrl()}/signin/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramData: authData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return this.createErrorResult(
          this.createError(
            "AUTH_FAILED",
            data.error?.message || "Telegram authentication failed",
          ),
        );
      }

      const user = this.mapUserResponse(data.user, authData);
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
      logger.error("Telegram auth verification error:", error);
      return this.createErrorResult(
        this.createError(
          "NETWORK_ERROR",
          "Failed to verify Telegram authentication",
        ),
      );
    }
  }

  private checkForTelegramCallback(): void {
    if (typeof window === "undefined") return;

    // Check for Telegram callback in URL hash
    const hash = window.location.hash;
    if (hash.includes("tgAuthResult=")) {
      try {
        const resultStr = hash.split("tgAuthResult=")[1];
        const authData = JSON.parse(decodeURIComponent(resultStr));
        this.verifyTelegramAuth(authData).then((result) => {
          if (result.success) {
            // Clean up URL
            window.history.replaceState(
              {},
              "",
              window.location.pathname + window.location.search,
            );
          }
        });
      } catch (error) {
        logger.error("Failed to parse Telegram callback:", error);
      }
    }
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

  private mapUserResponse(
    userData: Record<string, unknown>,
    telegramData: TelegramAuthData,
  ): AuthUser {
    const displayName =
      telegramData.first_name +
      (telegramData.last_name ? ` ${telegramData.last_name}` : "");

    return {
      id: (userData.id as string) || String(telegramData.id),
      email:
        (userData.email as string) || `${telegramData.id}@telegram.placeholder`,
      username: telegramData.username || `tg_${telegramData.id}`,
      displayName: (userData.displayName as string) || displayName,
      avatarUrl:
        telegramData.photo_url || (userData.avatarUrl as string | undefined),
      role: (userData.defaultRole as AuthUser["role"]) || "member",
      emailVerified: false,
      metadata: {
        ...((userData.metadata as Record<string, unknown>) || {}),
        provider: "telegram",
        telegramId: telegramData.id,
        telegramUsername: telegramData.username,
      },
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
      "nchat-telegram-session",
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
      const stored = localStorage.getItem("nchat-telegram-session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("nchat-telegram-session");
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

  destroy(): void {
    // Clean up Telegram widget
    if (typeof window !== "undefined") {
      const container = document.getElementById("telegram-login-container");
      if (container) {
        container.remove();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).onTelegramAuth;
    }
    super.destroy();
  }
}

export default TelegramProvider;
