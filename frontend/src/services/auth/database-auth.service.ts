import { authConfig } from "@/config/auth.config";
import bcrypt from "bcryptjs";

import { logger } from "@/lib/logger";

export interface AuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

export class DatabaseAuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private currentUser: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadSession();
    }
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      // Clear any existing session first
      this.clearSession();

      // For now, we'll use a direct database query through an API endpoint
      // In production, this would go through Hasura Auth service
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid email or password");
      }

      const data = await response.json();

      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      this.currentUser = data.user;
      this.persistSession();

      return data;
    } catch (error) {
      logger.error("Sign in error:", error);
      throw error;
    }
  }

  async signUp(
    email: string,
    password: string,
    username: string,
  ): Promise<AuthResponse> {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Sign up failed");
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      this.currentUser = data.user;
      this.persistSession();

      return data;
    } catch (error) {
      logger.error("Sign up error:", error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.clearSession();
  }

  async getCurrentUser(): Promise<any | null> {
    // Try to get user from session
    if (this.currentUser) {
      return this.currentUser;
    }

    // If we have a token, validate it
    if (this.accessToken) {
      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });

        if (response.ok) {
          const user = await response.json();
          this.currentUser = user;
          return user;
        }
      } catch (error) {
        logger.error("Get user error:", error);
      }
    }

    return null;
  }

  isUserAuthenticated(): boolean {
    return !!this.accessToken && !!this.currentUser;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private persistSession(): void {
    if (typeof window === "undefined") return;

    const session = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      user: this.currentUser,
      timestamp: Date.now(),
    };

    localStorage.setItem("nchat-session", JSON.stringify(session));
  }

  private loadSession(): void {
    if (typeof window === "undefined") return;

    const sessionStr = localStorage.getItem("nchat-session");
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        // Check if session is less than 24 hours old
        if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
          this.accessToken = session.accessToken;
          this.refreshToken = session.refreshToken;
          this.currentUser = session.user;
        } else {
          this.clearSession();
        }
      } catch {
        this.clearSession();
      }
    }
  }

  private clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("nchat-session");
  }
}
