import { authConfig } from "@/config/auth.config";

import { logger } from "@/lib/logger";

export interface AuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

export class RealAuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadTokens();
    }
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${authConfig.authUrl}/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Sign in failed");
    }

    const data = await response.json();
    this.accessToken = data.session.accessToken;
    this.refreshToken = data.session.refreshToken;
    this.persistTokens();

    return {
      user: data.session.user,
      accessToken: data.session.accessToken,
      refreshToken: data.session.refreshToken,
    };
  }

  async signUp(
    email: string,
    password: string,
    username: string,
  ): Promise<AuthResponse> {
    const response = await fetch(`${authConfig.authUrl}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        options: {
          displayName: username,
          metadata: {
            username,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Sign up failed");
    }

    const data = await response.json();
    this.accessToken = data.session.accessToken;
    this.refreshToken = data.session.refreshToken;
    this.persistTokens();

    return {
      user: data.session.user,
      accessToken: data.session.accessToken,
      refreshToken: data.session.refreshToken,
    };
  }

  async signOut(): Promise<void> {
    if (this.refreshToken) {
      try {
        await fetch(`${authConfig.authUrl}/signout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      } catch (error) {
        logger.error("Signout error:", error);
      }
    }

    this.accessToken = null;
    this.refreshToken = null;
    this.clearTokens();
  }

  async refreshAccessToken(): Promise<AuthResponse | null> {
    if (!this.refreshToken) return null;

    try {
      const response = await fetch(`${authConfig.authUrl}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return null;
      }

      const data = await response.json();
      this.accessToken = data.session.accessToken;
      this.refreshToken = data.session.refreshToken;
      this.persistTokens();

      return {
        user: data.session.user,
        accessToken: data.session.accessToken,
        refreshToken: data.session.refreshToken,
      };
    } catch (error) {
      logger.error("Token refresh error:", error);
      this.clearTokens();
      return null;
    }
  }

  async getCurrentUser(): Promise<any | null> {
    if (!this.accessToken) return null;

    try {
      const response = await fetch(`${authConfig.authUrl}/user`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        // Try to refresh token
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) return null;

        // Retry with new token
        const retryResponse = await fetch(`${authConfig.authUrl}/user`, {
          headers: {
            Authorization: `Bearer ${refreshed.accessToken}`,
          },
        });

        if (!retryResponse.ok) return null;
        return await retryResponse.json();
      }

      return await response.json();
    } catch (error) {
      logger.error("Get user error:", error);
      return null;
    }
  }

  isUserAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private persistTokens(): void {
    if (typeof window === "undefined") return;

    if (this.accessToken && this.refreshToken) {
      // Store tokens securely
      // In production, consider using httpOnly cookies instead
      sessionStorage.setItem("nchat-access-token", this.accessToken);
      localStorage.setItem("nchat-refresh-token", this.refreshToken);
    }
  }

  private loadTokens(): void {
    if (typeof window === "undefined") return;

    this.accessToken = sessionStorage.getItem("nchat-access-token");
    this.refreshToken = localStorage.getItem("nchat-refresh-token");
  }

  private clearTokens(): void {
    if (typeof window === "undefined") return;

    sessionStorage.removeItem("nchat-access-token");
    localStorage.removeItem("nchat-refresh-token");
  }
}
