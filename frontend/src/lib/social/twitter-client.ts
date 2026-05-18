/**
 * Twitter API Integration Client
 * Uses Twitter API v2 for fetching tweets and account info
 */

import type { SocialPost, SocialAPIClient, OAuthConfig } from "./types";

const TWITTER_API_BASE = "https://api.twitter.com/2";
const TWITTER_AUTH_BASE = "https://twitter.com/i/oauth2";

export class TwitterClient implements SocialAPIClient {
  private config: OAuthConfig;

  constructor() {
    this.config = {
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
      redirectUri:
        process.env.NEXT_PUBLIC_APP_URL + "/api/social/twitter/callback" || "",
      scopes: ["tweet.read", "users.read", "offline.access"],
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error("Twitter API credentials not configured");
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(" "),
      state,
      code_challenge: "challenge", // In production, use PKCE
      code_challenge_method: "plain",
    });

    return `${TWITTER_AUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async authenticate(
    code: string,
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: "challenge",
    });

    const basicAuth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString("base64");

    const response = await fetch(`${TWITTER_AUTH_BASE}/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitter authentication failed: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  /**
   * Refresh an expired access token
   */
  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt?: Date }> {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const basicAuth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString("base64");

    const response = await fetch(`${TWITTER_AUTH_BASE}/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error("Twitter token refresh failed");
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  /**
   * Get authenticated user's account information
   */
  async getAccountInfo(accessToken: string): Promise<{
    id: string;
    name: string;
    handle?: string;
    avatarUrl?: string;
  }> {
    const response = await fetch(
      `${TWITTER_API_BASE}/users/me?user.fields=profile_image_url,username`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Twitter account info");
    }

    const data = await response.json();
    const user = data.data;

    return {
      id: user.id,
      name: user.name,
      handle: user.username,
      avatarUrl: user.profile_image_url,
    };
  }

  /**
   * Get recent tweets from a user
   */
  async getRecentPosts(
    accessToken: string,
    userId: string,
    sinceId?: string,
  ): Promise<SocialPost[]> {
    const params = new URLSearchParams({
      "tweet.fields": "created_at,public_metrics,entities,attachments",
      "media.fields": "url,preview_image_url,type",
      expansions: "attachments.media_keys,author_id",
      max_results: "100",
    });

    if (sinceId) {
      params.append("since_id", sinceId);
    }

    const response = await fetch(
      `${TWITTER_API_BASE}/users/${userId}/tweets?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch tweets: ${error}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return [];
    }

    // Map media from includes
    const mediaMap = new Map();
    if (data.includes?.media) {
      for (const media of data.includes.media) {
        mediaMap.set(media.media_key, media);
      }
    }

    // Map users from includes
    const userMap = new Map();
    if (data.includes?.users) {
      for (const user of data.includes.users) {
        userMap.set(user.id, user);
      }
    }

    return data.data.map((tweet: any) => {
      const author = userMap.get(tweet.author_id) || {};
      const hashtags = tweet.entities?.hashtags?.map((h: any) => h.tag) || [];
      const mentions =
        tweet.entities?.mentions?.map((m: any) => m.username) || [];

      // Get media
      const mediaUrls: string[] = [];
      const mediaTypes: Array<"image" | "video" | "gif"> = [];

      if (tweet.attachments?.media_keys) {
        for (const key of tweet.attachments.media_keys) {
          const media = mediaMap.get(key);
          if (media) {
            mediaUrls.push(media.url || media.preview_image_url);
            mediaTypes.push(media.type === "animated_gif" ? "gif" : media.type);
          }
        }
      }

      return {
        id: "", // Will be generated by database
        account_id: "", // Will be set by caller
        post_id: tweet.id,
        post_url: `https://twitter.com/${author.username}/status/${tweet.id}`,
        content: tweet.text,
        author_name: author.name,
        author_handle: author.username,
        author_avatar_url: author.profile_image_url,
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        media_types: mediaTypes.length > 0 ? mediaTypes : undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
        engagement: {
          likes: tweet.public_metrics?.like_count,
          retweets: tweet.public_metrics?.retweet_count,
          replies: tweet.public_metrics?.reply_count,
          views: tweet.public_metrics?.impression_count,
        },
        posted_at: tweet.created_at,
        imported_at: new Date().toISOString(),
        was_posted_to_channel: false,
      };
    });
  }

  /**
   * Revoke access token
   */
  async revokeAccess(accessToken: string): Promise<void> {
    const params = new URLSearchParams({
      token: accessToken,
      token_type_hint: "access_token",
    });

    const basicAuth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString("base64");

    await fetch(`${TWITTER_AUTH_BASE}/revoke`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
  }
}
