/**
 * Social Media GraphQL Operations
 * Queries and mutations for social media integration
 */

import { gql } from "@apollo/client";

// ============================================================================
// Queries
// ============================================================================

export const GET_SOCIAL_ACCOUNTS = gql`
  query GetSocialAccounts {
    nchat_social_accounts(order_by: { created_at: desc }) {
      id
      platform
      account_id
      account_name
      account_handle
      avatar_url
      is_active
      last_poll_time
      token_expires_at
      created_at
      updated_at
    }
  }
`;

export const GET_SOCIAL_ACCOUNT_BY_ID = gql`
  query GetSocialAccountById($id: uuid!) {
    nchat_social_accounts_by_pk(id: $id) {
      id
      platform
      account_id
      account_name
      account_handle
      avatar_url
      is_active
      last_poll_time
      token_expires_at
      created_at
      updated_at
      access_token_encrypted
      refresh_token_encrypted
    }
  }
`;

export const GET_SOCIAL_INTEGRATIONS = gql`
  query GetSocialIntegrations($accountId: uuid) {
    nchat_social_integrations(
      where: { account_id: { _eq: $accountId } }
      order_by: { created_at: desc }
    ) {
      id
      account_id
      channel_id
      auto_post
      filter_hashtags
      filter_keywords
      exclude_retweets
      exclude_replies
      min_engagement
      created_at
      updated_at
      account {
        id
        platform
        account_name
        account_handle
      }
      channel {
        id
        name
        slug
      }
    }
  }
`;

export const GET_SOCIAL_POSTS = gql`
  query GetSocialPosts($accountId: uuid, $limit: Int = 50) {
    nchat_social_posts(
      where: { account_id: { _eq: $accountId } }
      order_by: { imported_at: desc }
      limit: $limit
    ) {
      id
      post_id
      post_url
      content
      author_name
      author_handle
      author_avatar_url
      media_urls
      media_types
      hashtags
      mentions
      engagement
      posted_at
      imported_at
      was_posted_to_channel
      posted_to_channels
      import_error
      account {
        platform
        account_name
      }
    }
  }
`;

export const GET_SOCIAL_IMPORT_LOGS = gql`
  query GetSocialImportLogs($accountId: uuid, $limit: Int = 20) {
    nchat_social_import_logs(
      where: { account_id: { _eq: $accountId } }
      order_by: { started_at: desc }
      limit: $limit
    ) {
      id
      import_type
      posts_fetched
      posts_imported
      posts_filtered
      posts_posted
      errors
      started_at
      completed_at
      status
    }
  }
`;

// ============================================================================
// Mutations
// ============================================================================

export const CREATE_SOCIAL_ACCOUNT = gql`
  mutation CreateSocialAccount($account: nchat_social_accounts_insert_input!) {
    insert_nchat_social_accounts_one(object: $account) {
      id
      platform
      account_id
      account_name
      account_handle
      avatar_url
      is_active
      created_at
    }
  }
`;

export const UPDATE_SOCIAL_ACCOUNT = gql`
  mutation UpdateSocialAccount(
    $id: uuid!
    $updates: nchat_social_accounts_set_input!
  ) {
    update_nchat_social_accounts_by_pk(
      pk_columns: { id: $id }
      _set: $updates
    ) {
      id
      is_active
      last_poll_time
      token_expires_at
    }
  }
`;

export const DELETE_SOCIAL_ACCOUNT = gql`
  mutation DeleteSocialAccount($id: uuid!) {
    delete_nchat_social_accounts_by_pk(id: $id) {
      id
    }
  }
`;

export const CREATE_SOCIAL_INTEGRATION = gql`
  mutation CreateSocialIntegration(
    $integration: nchat_social_integrations_insert_input!
  ) {
    insert_nchat_social_integrations_one(object: $integration) {
      id
      account_id
      channel_id
      auto_post
      filter_hashtags
      filter_keywords
      exclude_retweets
      exclude_replies
      min_engagement
      created_at
    }
  }
`;

export const UPDATE_SOCIAL_INTEGRATION = gql`
  mutation UpdateSocialIntegration(
    $id: uuid!
    $updates: nchat_social_integrations_set_input!
  ) {
    update_nchat_social_integrations_by_pk(
      pk_columns: { id: $id }
      _set: $updates
    ) {
      id
      auto_post
      filter_hashtags
      filter_keywords
      exclude_retweets
      exclude_replies
      min_engagement
    }
  }
`;

export const DELETE_SOCIAL_INTEGRATION = gql`
  mutation DeleteSocialIntegration($id: uuid!) {
    delete_nchat_social_integrations_by_pk(id: $id) {
      id
    }
  }
`;

export const SAVE_SOCIAL_POST = gql`
  mutation SaveSocialPost($post: nchat_social_posts_insert_input!) {
    insert_nchat_social_posts_one(
      object: $post
      on_conflict: {
        constraint: nchat_social_posts_account_id_post_id_key
        update_columns: [content, engagement, media_urls]
      }
    ) {
      id
      post_id
      content
      author_name
      posted_at
    }
  }
`;

// ============================================================================
// Subscriptions
// ============================================================================

export const SUBSCRIBE_TO_SOCIAL_POSTS = gql`
  subscription SubscribeToSocialPosts($accountId: uuid!) {
    nchat_social_posts(
      where: { account_id: { _eq: $accountId } }
      order_by: { imported_at: desc }
      limit: 1
    ) {
      id
      post_id
      content
      author_name
      posted_at
      imported_at
    }
  }
`;

// ============================================================================
// Type Definitions
// ============================================================================

export interface SocialAccountInput {
  platform: "twitter" | "instagram" | "linkedin";
  account_id: string;
  account_name: string;
  account_handle?: string;
  avatar_url?: string;
  access_token_encrypted: string;
  refresh_token_encrypted?: string;
  token_expires_at?: string;
  is_active: boolean;
  created_by: string;
}

export interface SocialIntegrationInput {
  account_id: string;
  channel_id: string;
  auto_post: boolean;
  filter_hashtags?: string[];
  filter_keywords?: string[];
  exclude_retweets?: boolean;
  exclude_replies?: boolean;
  min_engagement?: number;
  created_by: string;
}

export interface SocialPostInput {
  account_id: string;
  post_id: string;
  post_url: string;
  content: string;
  author_name: string;
  author_handle?: string;
  author_avatar_url?: string;
  media_urls?: string[];
  media_types?: string[];
  hashtags?: string[];
  mentions?: string[];
  engagement?: object;
  posted_at: string;
}
