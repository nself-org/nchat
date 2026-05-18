/**
 * LinkedIn API Integration Client
 * Uses LinkedIn API v2 for fetching posts and profile info
 */

import type { SocialPost, SocialAPIClient, OAuthConfig } from "./types";

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";
const LINKEDIN_AUTH_BASE = "https://www.linkedin.com/oauth/v2";

export class LinkedInClient implements SocialAPIClient {
  private config: OAuthConfig;

  constructor() {
    this.config = {
      clientId: process.env.LINKEDIN_CLIENT_ID || "",
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
      redirectUri:
        process.env.NEXT_PUBLIC_APP_URL + "/api/social/linkedin/callback" || "",
      scopes: [
        "r_liteprofile",
        "r_emailaddress",
        "w_member_social",
        "r_organization_social",
      ],
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error("LinkedIn API credentials not configured");
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
    });

    return `${LINKEDIN_AUTH_BASE}/authorization?${params.toString()}`;
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
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await fetch(`${LINKEDIN_AUTH_BASE}/accessToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn authentication failed: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token, // LinkedIn may not provide refresh tokens
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  /**
   * Get authenticated user's profile information
   */
  async getAccountInfo(accessToken: string): Promise<{
    id: string;
    name: string;
    handle?: string;
    avatarUrl?: string;
  }> {
    // Get basic profile
    const profileResponse = await fetch(
      `${LINKEDIN_API_BASE}/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch LinkedIn profile");
    }

    const profile = await profileResponse.json();

    // Get profile picture URL
    let avatarUrl: string | undefined;
    const pictures = profile.profilePicture?.["displayImage~"]?.elements;
    if (pictures && pictures.length > 0) {
      // Get the largest image
      const largest = pictures[pictures.length - 1];
      avatarUrl = largest.identifiers?.[0]?.identifier;
    }

    const firstName =
      profile.firstName?.localized?.en_US ||
      profile.firstName?.localized?.["*"] ||
      "";
    const lastName =
      profile.lastName?.localized?.en_US ||
      profile.lastName?.localized?.["*"] ||
      "";
    const name = `${firstName} ${lastName}`.trim();

    return {
      id: profile.id,
      name: name || "LinkedIn User",
      avatarUrl,
    };
  }

  /**
   * Get recent posts (shares) from the user
   */
  async getRecentPosts(
    accessToken: string,
    personUrn: string,
    since?: string,
  ): Promise<SocialPost[]> {
    // LinkedIn uses URN format: urn:li:person:ABC123
    const author = `urn:li:person:${personUrn}`;

    let url = `${LINKEDIN_API_BASE}/ugcPosts?q=authors&authors=List(${encodeURIComponent(author)})`;
    url += "&count=100";
    url +=
      "&projection=(elements*(created,id,specificContent,ugcPostShareContent,text))";

    if (since) {
      // LinkedIn uses millisecond timestamps
      const sinceTs = new Date(since).getTime();
      url += `&start=${sinceTs}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch LinkedIn posts: ${error}`);
    }

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      return [];
    }

    // Get profile info for author details
    const accountInfo = await this.getAccountInfo(accessToken);

    return data.elements.map((post: any) => {
      const shareContent =
        post.specificContent?.["com.linkedin.ugc.ShareContent"];
      const text = post.text?.text || "";
      const hashtags =
        text.match(/#\w+/g)?.map((h: string) => h.slice(1)) || [];
      const mentions =
        text.match(/@\w+/g)?.map((m: string) => m.slice(1)) || [];

      // Extract media
      const mediaUrls: string[] = [];
      const mediaTypes: Array<"image" | "video" | "gif"> = [];

      if (shareContent?.media) {
        for (const media of shareContent.media) {
          if (media.status === "READY") {
            const thumbnail = media.thumbnails?.[0];
            if (thumbnail) {
              mediaUrls.push(thumbnail);
              mediaTypes.push(media.mediaType === "VIDEO" ? "video" : "image");
            }
          }
        }
      }

      // Extract post ID from URN
      const postId = post.id.split(":").pop();

      return {
        id: "", // Will be generated by database
        account_id: "", // Will be set by caller
        post_id: postId,
        post_url: `https://www.linkedin.com/feed/update/${post.id}`,
        content: text,
        author_name: accountInfo.name,
        author_handle: undefined, // LinkedIn doesn't have handles
        author_avatar_url: accountInfo.avatarUrl,
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        media_types: mediaTypes.length > 0 ? mediaTypes : undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
        engagement: {
          // LinkedIn API v2 doesn't easily provide engagement metrics
          // Would need additional API calls to get likes, comments, shares
        },
        posted_at: new Date(post.created.time).toISOString(),
        imported_at: new Date().toISOString(),
        was_posted_to_channel: false,
      };
    });
  }

  /**
   * Revoke access token (not supported by LinkedIn API v2)
   */
  async revokeAccess(accessToken: string): Promise<void> {
    // LinkedIn doesn't provide a token revocation endpoint
    // Tokens expire automatically after 60 days
  }
}
