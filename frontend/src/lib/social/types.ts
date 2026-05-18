/**
 * Social Media Integration Types
 * Common types and interfaces for social media integrations
 */

export type SocialPlatform = "twitter" | "instagram" | "linkedin";

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  account_id: string;
  account_name: string;
  account_handle?: string;
  avatar_url?: string;
  is_active: boolean;
  last_poll_time?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  token_expires_at?: string;
}

export interface SocialPost {
  id: string;
  account_id: string;
  post_id: string;
  post_url: string;
  content: string;
  author_name: string;
  author_handle?: string;
  author_avatar_url?: string;
  media_urls?: string[];
  media_types?: Array<"image" | "video" | "gif">;
  hashtags?: string[];
  mentions?: string[];
  engagement?: {
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number;
    shares?: number;
    comments?: number;
  };
  posted_at: string;
  imported_at: string;
  was_posted_to_channel: boolean;
  posted_to_channels?: string[];
  import_error?: string;
}

export interface SocialIntegration {
  id: string;
  account_id: string;
  channel_id: string;
  auto_post: boolean;
  filter_hashtags?: string[];
  filter_keywords?: string[];
  exclude_retweets?: boolean;
  exclude_replies?: boolean;
  min_engagement?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface SocialImportLog {
  id: string;
  account_id: string;
  import_type: "scheduled" | "manual" | "webhook";
  posts_fetched: number;
  posts_imported: number;
  posts_filtered: number;
  posts_posted: number;
  errors?: string[];
  started_at: string;
  completed_at?: string;
  status: "running" | "completed" | "failed";
}

export interface SocialEmbed {
  type: "social";
  platform: SocialPlatform;
  post_url: string;
  author: {
    name: string;
    handle?: string;
    avatar_url?: string;
  };
  content: string;
  media?: Array<{
    url: string;
    type: "image" | "video" | "gif";
    thumbnail_url?: string;
  }>;
  engagement?: {
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number;
    shares?: number;
    comments?: number;
  };
  posted_at: string;
  color?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface SocialAPIClient {
  authenticate(
    code: string,
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }>;
  refreshToken?(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt?: Date }>;
  getAccountInfo(
    accessToken: string,
  ): Promise<{ id: string; name: string; handle?: string; avatarUrl?: string }>;
  getRecentPosts(
    accessToken: string,
    accountId: string,
    since?: string,
  ): Promise<SocialPost[]>;
  revokeAccess?(accessToken: string): Promise<void>;
}

export interface FilterCriteria {
  hashtags?: string[];
  keywords?: string[];
  excludeRetweets?: boolean;
  excludeReplies?: boolean;
  minEngagement?: number;
}

export interface ImportResult {
  fetched: number;
  imported: number;
  filtered: number;
  posted: number;
  errors: string[];
}
