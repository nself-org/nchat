/**
 * Social Media Polling System
 * Periodically checks connected social accounts for new posts
 * and imports them to configured channels
 */

import { TwitterClient } from "./twitter-client";
import { InstagramClient } from "./instagram-client";
import { LinkedInClient } from "./linkedin-client";
import { decryptToken, encryptToken } from "./encryption";
import { matchesFilters } from "./filters";
import { createSocialEmbed, formatAsMessageContent } from "./embed-formatter";
import type {
  SocialAccount,
  SocialPost,
  SocialIntegration,
  SocialAPIClient,
  ImportResult,
  SocialPlatform,
} from "./types";
import { logger } from "@/lib/logger";

// Platform clients (lazy loaded to avoid build-time errors if credentials not configured)
let _clients: Record<SocialPlatform, SocialAPIClient> | null = null;

function getClients(): Record<SocialPlatform, SocialAPIClient> {
  if (!_clients) {
    _clients = {
      twitter: new TwitterClient(),
      instagram: new InstagramClient(),
      linkedin: new LinkedInClient(),
    };
  }
  return _clients;
}

/**
 * Poll all active social accounts for new posts
 */
export async function pollAllAccounts(
  apolloClient: any,
): Promise<ImportResult> {
  const result: ImportResult = {
    fetched: 0,
    imported: 0,
    filtered: 0,
    posted: 0,
    errors: [],
  };

  try {
    // Get all active accounts
    const { data } = await apolloClient.query({
      query: GET_ACTIVE_SOCIAL_ACCOUNTS,
      fetchPolicy: "network-only",
    });

    const accounts: SocialAccount[] = data?.nchat_social_accounts || [];

    // Poll each account
    for (const account of accounts) {
      try {
        const accountResult = await pollAccount(apolloClient, account);
        result.fetched += accountResult.fetched;
        result.imported += accountResult.imported;
        result.filtered += accountResult.filtered;
        result.posted += accountResult.posted;
        result.errors.push(...accountResult.errors);
      } catch (error) {
        const errorMsg = `Failed to poll ${account.platform} account ${account.account_name}: ${error}`;
        logger.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    return result;
  } catch (error) {
    const errorMsg = `Failed to poll social accounts: ${error}`;
    logger.error(errorMsg);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Poll a single social account for new posts
 */
export async function pollAccount(
  apolloClient: any,
  account: SocialAccount,
): Promise<ImportResult> {
  const result: ImportResult = {
    fetched: 0,
    imported: 0,
    filtered: 0,
    posted: 0,
    errors: [],
  };

  // Create import log
  const logId = await createImportLog(apolloClient, account.id, "scheduled");

  try {
    // Get client for this platform
    const clients = getClients();
    const client = clients[account.platform];
    if (!client) {
      throw new Error(`No client for platform: ${account.platform}`);
    }

    // Decrypt access token
    if (!account.access_token_encrypted) {
      throw new Error("Account has no access token");
    }
    const accessToken = decryptToken(account.access_token_encrypted);

    // Get last poll time to fetch only new posts
    const sinceId = await getLastPostId(apolloClient, account.id);

    // Fetch recent posts
    const posts = await client.getRecentPosts(
      accessToken,
      account.account_id,
      sinceId,
    );
    result.fetched = posts.length;

    if (posts.length === 0) {
      await updateImportLog(apolloClient, logId, result, "completed");
      await updateLastPollTime(apolloClient, account.id);
      return result;
    }

    // Get integrations for this account
    const integrations = await getAccountIntegrations(apolloClient, account.id);

    // Process each post
    for (const post of posts) {
      try {
        // Save post to database
        const savedPost = await savePost(apolloClient, account.id, post);
        result.imported++;

        // Check if any integrations match this post
        for (const integration of integrations) {
          if (!integration.auto_post) continue;

          // Check filters
          if (!matchesFilters(savedPost, integration)) {
            result.filtered++;
            continue;
          }

          // Post to channel
          await postToChannel(
            apolloClient,
            savedPost,
            integration,
            account.platform,
          );
          result.posted++;

          // Mark post as posted
          await markPostAsPosted(
            apolloClient,
            savedPost.id,
            integration.channel_id,
          );
        }
      } catch (error) {
        const errorMsg = `Failed to process post ${post.post_id}: ${error}`;
        logger.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    // Update import log
    await updateImportLog(apolloClient, logId, result, "completed");

    // Update last poll time
    await updateLastPollTime(apolloClient, account.id);

    return result;
  } catch (error) {
    const errorMsg = `Poll failed: ${error}`;
    logger.error(errorMsg);
    result.errors.push(errorMsg);
    await updateImportLog(apolloClient, logId, result, "failed");
    throw error;
  }
}

/**
 * Manually trigger import for an account
 */
export async function manualImport(
  apolloClient: any,
  accountId: string,
): Promise<ImportResult> {
  const { data } = await apolloClient.query({
    query: GET_SOCIAL_ACCOUNT,
    variables: { id: accountId },
  });

  const account = data?.nchat_social_accounts_by_pk;
  if (!account) {
    throw new Error("Account not found");
  }

  return pollAccount(apolloClient, account);
}

// GraphQL Queries and Mutations

const GET_ACTIVE_SOCIAL_ACCOUNTS = `
  query GetActiveSocialAccounts {
    nchat_social_accounts(where: { is_active: { _eq: true } }) {
      id
      platform
      account_id
      account_name
      access_token_encrypted
      refresh_token_encrypted
      token_expires_at
      last_poll_time
    }
  }
`;

const GET_SOCIAL_ACCOUNT = `
  query GetSocialAccount($id: uuid!) {
    nchat_social_accounts_by_pk(id: $id) {
      id
      platform
      account_id
      account_name
      access_token_encrypted
      refresh_token_encrypted
      token_expires_at
      last_poll_time
      is_active
    }
  }
`;

const GET_ACCOUNT_INTEGRATIONS = `
  query GetAccountIntegrations($accountId: uuid!) {
    nchat_social_integrations(
      where: {
        account_id: { _eq: $accountId }
        auto_post: { _eq: true }
      }
    ) {
      id
      channel_id
      auto_post
      filter_hashtags
      filter_keywords
      exclude_retweets
      exclude_replies
      min_engagement
    }
  }
`;

const GET_LAST_POST_ID = `
  query GetLastPostId($accountId: uuid!) {
    nchat_social_posts(
      where: { account_id: { _eq: $accountId } }
      order_by: { posted_at: desc }
      limit: 1
    ) {
      post_id
    }
  }
`;

const SAVE_POST = `
  mutation SavePost($post: nchat_social_posts_insert_input!) {
    insert_nchat_social_posts_one(
      object: $post
      on_conflict: {
        constraint: nchat_social_posts_account_id_post_id_key
        update_columns: [content, engagement]
      }
    ) {
      id
      post_id
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
      post_url
    }
  }
`;

const POST_TO_CHANNEL = `
  mutation PostToChannel($message: nchat_messages_insert_input!) {
    insert_nchat_messages_one(object: $message) {
      id
      created_at
    }
  }
`;

const MARK_POST_AS_POSTED = `
  mutation MarkPostAsPosted($postId: uuid!, $channelId: uuid!) {
    update_nchat_social_posts_by_pk(
      pk_columns: { id: $postId }
      _set: {
        was_posted_to_channel: true
        posted_to_channels: { _append: [$channelId] }
      }
    ) {
      id
    }
  }
`;

const CREATE_IMPORT_LOG = `
  mutation CreateImportLog($accountId: uuid!, $importType: String!) {
    insert_nchat_social_import_logs_one(
      object: {
        account_id: $accountId
        import_type: $importType
        status: "running"
      }
    ) {
      id
    }
  }
`;

const UPDATE_IMPORT_LOG = `
  mutation UpdateImportLog(
    $id: uuid!
    $fetched: Int!
    $imported: Int!
    $filtered: Int!
    $posted: Int!
    $errors: [String!]
    $status: String!
  ) {
    update_nchat_social_import_logs_by_pk(
      pk_columns: { id: $id }
      _set: {
        posts_fetched: $fetched
        posts_imported: $imported
        posts_filtered: $filtered
        posts_posted: $posted
        errors: $errors
        completed_at: "now()"
        status: $status
      }
    ) {
      id
    }
  }
`;

const UPDATE_LAST_POLL_TIME = `
  mutation UpdateLastPollTime($accountId: uuid!) {
    update_nchat_social_accounts_by_pk(
      pk_columns: { id: $accountId }
      _set: { last_poll_time: "now()" }
    ) {
      id
    }
  }
`;

// Helper functions

async function getAccountIntegrations(
  apolloClient: any,
  accountId: string,
): Promise<SocialIntegration[]> {
  const { data } = await apolloClient.query({
    query: GET_ACCOUNT_INTEGRATIONS,
    variables: { accountId },
    fetchPolicy: "network-only",
  });

  return data?.nchat_social_integrations || [];
}

async function getLastPostId(
  apolloClient: any,
  accountId: string,
): Promise<string | undefined> {
  const { data } = await apolloClient.query({
    query: GET_LAST_POST_ID,
    variables: { accountId },
    fetchPolicy: "network-only",
  });

  return data?.nchat_social_posts?.[0]?.post_id;
}

async function savePost(
  apolloClient: any,
  accountId: string,
  post: SocialPost,
): Promise<SocialPost> {
  const { data } = await apolloClient.mutate({
    mutation: SAVE_POST,
    variables: {
      post: {
        ...post,
        account_id: accountId,
      },
    },
  });

  return data?.insert_nchat_social_posts_one;
}

async function postToChannel(
  apolloClient: any,
  post: SocialPost,
  integration: SocialIntegration,
  platform: SocialPlatform,
): Promise<void> {
  const embed = createSocialEmbed(post, platform);
  const messageContent = formatAsMessageContent(embed);

  await apolloClient.mutate({
    mutation: POST_TO_CHANNEL,
    variables: {
      message: {
        channel_id: integration.channel_id,
        user_id: null, // System message
        content: JSON.stringify(messageContent),
        type: "social_embed",
      },
    },
  });
}

async function markPostAsPosted(
  apolloClient: any,
  postId: string,
  channelId: string,
): Promise<void> {
  await apolloClient.mutate({
    mutation: MARK_POST_AS_POSTED,
    variables: { postId, channelId },
  });
}

async function createImportLog(
  apolloClient: any,
  accountId: string,
  importType: string,
): Promise<string> {
  const { data } = await apolloClient.mutate({
    mutation: CREATE_IMPORT_LOG,
    variables: { accountId, importType },
  });

  return data?.insert_nchat_social_import_logs_one?.id;
}

async function updateImportLog(
  apolloClient: any,
  logId: string,
  result: ImportResult,
  status: string,
): Promise<void> {
  await apolloClient.mutate({
    mutation: UPDATE_IMPORT_LOG,
    variables: {
      id: logId,
      fetched: result.fetched,
      imported: result.imported,
      filtered: result.filtered,
      posted: result.posted,
      errors: result.errors,
      status,
    },
  });
}

async function updateLastPollTime(
  apolloClient: any,
  accountId: string,
): Promise<void> {
  await apolloClient.mutate({
    mutation: UPDATE_LAST_POLL_TIME,
    variables: { accountId },
  });
}
