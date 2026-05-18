/**
 * GitHub OAuth Authentication Provider
 *
 * GitHub OAuth integration supporting:
 * - OAuth 2.0 flow
 * - Public and private email retrieval
 * - Organization membership verification (optional)
 */

import { nhost } from "@/lib/nhost";
import {
  AuthProvider,
  AuthProviderType,
  AuthResult,
  AuthError,
  OAuthProviderConfig,
} from "./types";

import { logger } from "@/lib/logger";

// ============================================================================
// Configuration
// ============================================================================

export interface GitHubProviderConfig extends OAuthProviderConfig {
  allowPrivateEmails: boolean;
  requireOrganization?: string; // Restrict to specific org
}

export const defaultGitHubConfig: GitHubProviderConfig = {
  enabled: false,
  name: "github",
  displayName: "GitHub",
  icon: "github",
  order: 4,
  clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "",
  scopes: ["read:user", "user:email"],
  allowPrivateEmails: true,
};

// ============================================================================
// Provider Implementation
// ============================================================================

export class GitHubProvider implements AuthProvider {
  type: AuthProviderType = "github";
  name = "GitHub";
  private config: GitHubProviderConfig;

  constructor(config: Partial<GitHubProviderConfig> = {}) {
    this.config = { ...defaultGitHubConfig, ...config };
  }

  isConfigured(): boolean {
    return this.config.enabled && !!this.config.clientId;
  }

  async authenticate(): Promise<AuthResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: {
          code: "provider_not_configured",
          message: "GitHub Sign-In is not configured",
        },
      };
    }

    try {
      await nhost.auth.signIn({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      return {
        success: true,
        requiresVerification: true,
      };
    } catch (err) {
      logger.error("GitHubProvider.authenticate error:", err);
      return {
        success: false,
        error: {
          code: "oauth_error",
          message: "Failed to initiate GitHub Sign-In",
        },
      };
    }
  }

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: `${window.location.origin}/auth/callback`,
      scope: this.config.scopes?.join(" ") || "read:user user:email",
      state: state || this.generateState(),
      allow_signup: "true",
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, state?: string): Promise<AuthResult> {
    try {
      const session = nhost.auth.getSession();

      if (!session) {
        return {
          success: false,
          error: {
            code: "callback_error",
            message: "Failed to complete GitHub Sign-In",
          },
        };
      }

      // Check organization membership if required
      if (this.config.requireOrganization) {
        const isMember = await this.checkOrgMembership(
          session.accessToken,
          this.config.requireOrganization,
        );

        if (!isMember) {
          // Sign out the user if they're not a member
          await nhost.auth.signOut();
          return {
            success: false,
            error: {
              code: "org_membership_required",
              message: `You must be a member of the ${this.config.requireOrganization} organization`,
            },
          };
        }
      }

      return {
        success: true,
        session: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken ?? undefined,
          expiresAt: new Date(session.accessTokenExpiresIn * 1000 + Date.now()),
          user: {
            id: session.user.id,
            email: session.user.email ?? undefined,
            username: session.user.metadata?.["login"] as string,
            displayName: session.user.displayName ?? undefined,
            avatarUrl: session.user.avatarUrl ?? undefined,
            emailVerified: true,
            provider: "github",
            providerUserId: session.user.metadata?.["id"] as string,
            metadata: {
              githubUsername: session.user.metadata?.["login"],
              githubBio: session.user.metadata?.["bio"],
              githubCompany: session.user.metadata?.["company"],
              githubLocation: session.user.metadata?.["location"],
              githubBlog: session.user.metadata?.["blog"],
            },
          },
        },
      };
    } catch (err) {
      logger.error("GitHubProvider.handleCallback error:", err);
      return {
        success: false,
        error: {
          code: "callback_error",
          message: "Failed to complete GitHub Sign-In",
        },
      };
    }
  }

  async linkAccount(userId: string): Promise<AuthResult> {
    try {
      await nhost.auth.signIn({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/settings/auth-methods?link=github`,
        },
      });

      return {
        success: true,
        requiresVerification: true,
      };
    } catch (err) {
      logger.error("GitHubProvider.linkAccount error:", err);
      return {
        success: false,
        error: {
          code: "link_error",
          message: "Failed to link GitHub account",
        },
      };
    }
  }

  async unlinkAccount(
    userId: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    try {
      const response = await fetch("/api/auth/unlink-provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          provider: "github",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: {
            code: "unlink_error",
            message: data.message || "Failed to unlink GitHub account",
          },
        };
      }

      return { success: true };
    } catch (err) {
      logger.error("GitHubProvider.unlinkAccount error:", err);
      return {
        success: false,
        error: {
          code: "unlink_error",
          message: "Failed to unlink GitHub account",
        },
      };
    }
  }

  /**
   * Check if user is a member of a GitHub organization
   */
  private async checkOrgMembership(
    accessToken: string,
    org: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(`https://api.github.com/user/orgs`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        return false;
      }

      const orgs = await response.json();
      return orgs.some(
        (o: { login: string }) => o.login.toLowerCase() === org.toLowerCase(),
      );
    } catch {
      return false;
    }
  }

  /**
   * Get user's GitHub repositories (useful for integrations)
   */
  async getRepositories(accessToken: string): Promise<
    Array<{
      id: number;
      name: string;
      fullName: string;
      private: boolean;
      url: string;
    }>
  > {
    try {
      const response = await fetch(
        "https://api.github.com/user/repos?per_page=100",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      if (!response.ok) {
        return [];
      }

      const repos = await response.json();
      return repos.map((repo: Record<string, unknown>) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        url: repo.html_url,
      }));
    } catch {
      return [];
    }
  }

  private generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  getConfig(): GitHubProviderConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<GitHubProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const githubProvider = new GitHubProvider();
