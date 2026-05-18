import { gql } from "@apollo/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type BotStatus = "active" | "inactive" | "suspended" | "pending";

export type BotPermission =
  | "read_messages"
  | "send_messages"
  | "manage_channels"
  | "manage_users"
  | "read_files"
  | "upload_files"
  | "use_slash_commands"
  | "send_notifications"
  | "access_user_data"
  | "manage_webhooks";

export interface Bot {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  token?: string;
  status: BotStatus;
  permissions: BotPermission[];
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  installedChannels?: {
    id: string;
    name: string;
    slug: string;
  }[];
  commandsCount?: number;
  installCount?: number;
  rating?: number;
  reviewsCount?: number;
  category?: string;
  website?: string;
  supportUrl?: string;
  privacyPolicyUrl?: string;
  featured?: boolean;
  verified?: boolean;
}

export interface BotCommand {
  id: string;
  botId: string;
  name: string;
  description: string;
  usage: string;
  examples?: string[];
}

export interface BotInstallation {
  id: string;
  botId: string;
  channelId: string;
  installedBy: string;
  installedAt: string;
  permissions: BotPermission[];
  bot?: Bot;
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface BotReview {
  id: string;
  botId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface GetInstalledBotsVariables {
  workspaceId?: string;
  channelId?: string;
  limit?: number;
  offset?: number;
}

export interface GetMarketplaceBotsVariables {
  category?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetBotVariables {
  id: string;
}

export interface InstallBotVariables {
  botId: string;
  channelIds: string[];
  permissions: BotPermission[];
}

export interface RemoveBotVariables {
  botId: string;
  channelId?: string;
}

export interface UpdateBotSettingsVariables {
  botId: string;
  channelId?: string;
  permissions?: BotPermission[];
  status?: BotStatus;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const BOT_BASIC_FRAGMENT = gql`
  fragment BotBasic on nchat_bots {
    id
    name
    description
    avatar_url
    status
    permissions
    created_at
    updated_at
  }
`;

export const BOT_DETAIL_FRAGMENT = gql`
  fragment BotDetail on nchat_bots {
    id
    name
    description
    avatar_url
    status
    permissions
    created_at
    updated_at
    owner_id
    category
    website
    support_url
    privacy_policy_url
    featured
    verified
    install_count
    rating
    reviews_count
    owner {
      id
      display_name
      avatar_url
    }
    commands {
      id
      name
      description
      usage
      examples
    }
  }
`;

export const BOT_INSTALLATION_FRAGMENT = gql`
  fragment BotInstallation on nchat_bot_installations {
    id
    bot_id
    channel_id
    installed_by
    installed_at
    permissions
    bot {
      ...BotBasic
    }
    channel {
      id
      name
      slug
    }
  }
  ${BOT_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all installed bots for a workspace or channel
 */
export const GET_INSTALLED_BOTS = gql`
  query GetInstalledBots(
    $workspaceId: uuid
    $channelId: uuid
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_bot_installations(
      where: {
        _and: [
          { channel: { workspace_id: { _eq: $workspaceId } } }
          { channel_id: { _eq: $channelId } }
        ]
      }
      order_by: { installed_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...BotInstallation
    }
    nchat_bot_installations_aggregate(
      where: {
        _and: [
          { channel: { workspace_id: { _eq: $workspaceId } } }
          { channel_id: { _eq: $channelId } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${BOT_INSTALLATION_FRAGMENT}
`;

/**
 * Get bots from marketplace with optional filtering
 */
export const GET_MARKETPLACE_BOTS = gql`
  query GetMarketplaceBots(
    $category: String
    $search: String
    $featured: Boolean
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_bots(
      where: {
        _and: [
          { status: { _eq: "active" } }
          { is_public: { _eq: true } }
          { category: { _eq: $category } }
          { featured: { _eq: $featured } }
          {
            _or: [
              { name: { _ilike: $search } }
              { description: { _ilike: $search } }
            ]
          }
        ]
      }
      order_by: [
        { featured: desc }
        { rating: desc_nulls_last }
        { install_count: desc_nulls_last }
      ]
      limit: $limit
      offset: $offset
    ) {
      ...BotDetail
    }
    nchat_bots_aggregate(
      where: {
        _and: [
          { status: { _eq: "active" } }
          { is_public: { _eq: true } }
          { category: { _eq: $category } }
          { featured: { _eq: $featured } }
          {
            _or: [
              { name: { _ilike: $search } }
              { description: { _ilike: $search } }
            ]
          }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${BOT_DETAIL_FRAGMENT}
`;

/**
 * Get a single bot by ID
 */
export const GET_BOT = gql`
  query GetBot($id: uuid!) {
    nchat_bots_by_pk(id: $id) {
      ...BotDetail
      installations_aggregate {
        aggregate {
          count
        }
      }
    }
  }
  ${BOT_DETAIL_FRAGMENT}
`;

/**
 * Get bot commands
 */
export const GET_BOT_COMMANDS = gql`
  query GetBotCommands($botId: uuid!) {
    nchat_bot_commands(
      where: { bot_id: { _eq: $botId } }
      order_by: { name: asc }
    ) {
      id
      name
      description
      usage
      examples
    }
  }
`;

/**
 * Get bot reviews
 */
export const GET_BOT_REVIEWS = gql`
  query GetBotReviews($botId: uuid!, $limit: Int = 10, $offset: Int = 0) {
    nchat_bot_reviews(
      where: { bot_id: { _eq: $botId } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      rating
      comment
      created_at
      user {
        id
        display_name
        avatar_url
      }
    }
    nchat_bot_reviews_aggregate(where: { bot_id: { _eq: $botId } }) {
      aggregate {
        count
        avg {
          rating
        }
      }
    }
  }
`;

/**
 * Get featured bots for marketplace homepage
 */
export const GET_FEATURED_BOTS = gql`
  query GetFeaturedBots($limit: Int = 6) {
    nchat_bots(
      where: {
        _and: [
          { status: { _eq: "active" } }
          { is_public: { _eq: true } }
          { featured: { _eq: true } }
        ]
      }
      order_by: { rating: desc_nulls_last }
      limit: $limit
    ) {
      ...BotBasic
      install_count
      rating
      verified
      category
    }
  }
  ${BOT_BASIC_FRAGMENT}
`;

/**
 * Get bot categories
 */
export const GET_BOT_CATEGORIES = gql`
  query GetBotCategories {
    nchat_bot_categories(order_by: { name: asc }) {
      id
      name
      slug
      description
      icon
      bots_count: bots_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

/**
 * Search bots
 */
export const SEARCH_BOTS = gql`
  query SearchBots($search: String!, $limit: Int = 10) {
    nchat_bots(
      where: {
        _and: [
          { status: { _eq: "active" } }
          { is_public: { _eq: true } }
          {
            _or: [
              { name: { _ilike: $search } }
              { description: { _ilike: $search } }
            ]
          }
        ]
      }
      order_by: { install_count: desc_nulls_last }
      limit: $limit
    ) {
      ...BotBasic
      install_count
      rating
      verified
    }
  }
  ${BOT_BASIC_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Install a bot to channels
 */
export const INSTALL_BOT = gql`
  mutation InstallBot(
    $botId: uuid!
    $channelIds: [uuid!]!
    $permissions: jsonb!
  ) {
    insert_nchat_bot_installations(
      objects: {
        bot_id: $botId
        channel_ids: $channelIds
        permissions: $permissions
      }
      on_conflict: {
        constraint: nchat_bot_installations_bot_id_channel_id_key
        update_columns: [permissions, installed_at]
      }
    ) {
      affected_rows
      returning {
        ...BotInstallation
      }
    }
    # Increment install count
    update_nchat_bots_by_pk(
      pk_columns: { id: $botId }
      _inc: { install_count: 1 }
    ) {
      id
      install_count
    }
  }
  ${BOT_INSTALLATION_FRAGMENT}
`;

/**
 * Remove a bot from a channel or all channels
 */
export const REMOVE_BOT = gql`
  mutation RemoveBot($botId: uuid!, $channelId: uuid) {
    delete_nchat_bot_installations(
      where: {
        _and: [{ bot_id: { _eq: $botId } }, { channel_id: { _eq: $channelId } }]
      }
    ) {
      affected_rows
      returning {
        id
        bot_id
        channel_id
      }
    }
    # Decrement install count
    update_nchat_bots_by_pk(
      pk_columns: { id: $botId }
      _inc: { install_count: -1 }
    ) {
      id
      install_count
    }
  }
`;

/**
 * Update bot settings/permissions for an installation
 */
export const UPDATE_BOT_SETTINGS = gql`
  mutation UpdateBotSettings(
    $botId: uuid!
    $channelId: uuid
    $permissions: jsonb
    $status: String
  ) {
    update_nchat_bot_installations(
      where: {
        _and: [{ bot_id: { _eq: $botId } }, { channel_id: { _eq: $channelId } }]
      }
      _set: { permissions: $permissions }
    ) {
      affected_rows
      returning {
        ...BotInstallation
      }
    }
  }
  ${BOT_INSTALLATION_FRAGMENT}
`;

/**
 * Add bot by token
 */
export const ADD_BOT_BY_TOKEN = gql`
  mutation AddBotByToken($token: String!, $channelIds: [uuid!]!) {
    add_bot_by_token(token: $token, channel_ids: $channelIds) {
      success
      bot {
        ...BotBasic
      }
      installations {
        ...BotInstallation
      }
      error
    }
  }
  ${BOT_BASIC_FRAGMENT}
  ${BOT_INSTALLATION_FRAGMENT}
`;

/**
 * Submit a bot review
 */
export const SUBMIT_BOT_REVIEW = gql`
  mutation SubmitBotReview($botId: uuid!, $rating: Int!, $comment: String) {
    insert_nchat_bot_reviews_one(
      object: { bot_id: $botId, rating: $rating, comment: $comment }
      on_conflict: {
        constraint: nchat_bot_reviews_bot_id_user_id_key
        update_columns: [rating, comment, updated_at]
      }
    ) {
      id
      rating
      comment
      created_at
    }
    # Update bot rating
    update_bot_rating(bot_id: $botId) {
      rating
      reviews_count
    }
  }
`;

/**
 * Delete a bot review
 */
export const DELETE_BOT_REVIEW = gql`
  mutation DeleteBotReview($reviewId: uuid!) {
    delete_nchat_bot_reviews_by_pk(id: $reviewId) {
      id
      bot_id
    }
  }
`;

/**
 * Register a new bot (for developers)
 */
export const REGISTER_BOT = gql`
  mutation RegisterBot(
    $name: String!
    $description: String!
    $avatarUrl: String
    $category: String
    $website: String
    $supportUrl: String
    $privacyPolicyUrl: String
    $permissions: jsonb!
  ) {
    insert_nchat_bots_one(
      object: {
        name: $name
        description: $description
        avatar_url: $avatarUrl
        category: $category
        website: $website
        support_url: $supportUrl
        privacy_policy_url: $privacyPolicyUrl
        permissions: $permissions
        status: "pending"
      }
    ) {
      id
      name
      token
      status
      created_at
    }
  }
`;

/**
 * Update bot details (for bot owners)
 */
export const UPDATE_BOT = gql`
  mutation UpdateBot(
    $botId: uuid!
    $name: String
    $description: String
    $avatarUrl: String
    $category: String
    $website: String
    $supportUrl: String
    $privacyPolicyUrl: String
  ) {
    update_nchat_bots_by_pk(
      pk_columns: { id: $botId }
      _set: {
        name: $name
        description: $description
        avatar_url: $avatarUrl
        category: $category
        website: $website
        support_url: $supportUrl
        privacy_policy_url: $privacyPolicyUrl
        updated_at: "now()"
      }
    ) {
      ...BotDetail
    }
  }
  ${BOT_DETAIL_FRAGMENT}
`;

/**
 * Delete a bot (for bot owners)
 */
export const DELETE_BOT = gql`
  mutation DeleteBot($botId: uuid!) {
    # First remove all installations
    delete_nchat_bot_installations(where: { bot_id: { _eq: $botId } }) {
      affected_rows
    }
    # Then delete the bot
    delete_nchat_bots_by_pk(id: $botId) {
      id
      name
    }
  }
`;

// ============================================================================
// BOT API - Token Management
// ============================================================================

/**
 * Get bot tokens
 */
export const GET_BOT_TOKENS = gql`
  query GetBotTokens($botId: uuid!) {
    nchat_bot_tokens(
      where: { bot_id: { _eq: $botId } }
      order_by: { created_at: desc }
    ) {
      id
      name
      scopes
      created_at
      last_used_at
      expires_at
      is_active
    }
  }
`;

/**
 * Create bot token
 */
export const CREATE_BOT_TOKEN = gql`
  mutation CreateBotToken(
    $botId: uuid!
    $name: String!
    $tokenHash: String!
    $scopes: [String!]!
    $expiresAt: timestamptz
  ) {
    insert_nchat_bot_tokens_one(
      object: {
        bot_id: $botId
        name: $name
        token_hash: $tokenHash
        scopes: $scopes
        expires_at: $expiresAt
      }
    ) {
      id
      name
      scopes
      created_at
      expires_at
    }
  }
`;

/**
 * Revoke bot token
 */
export const REVOKE_BOT_TOKEN = gql`
  mutation RevokeBotToken($tokenId: uuid!) {
    update_nchat_bot_tokens_by_pk(
      pk_columns: { id: $tokenId }
      _set: { is_active: false }
    ) {
      id
      is_active
    }
  }
`;

/**
 * Delete bot token
 */
export const DELETE_BOT_TOKEN = gql`
  mutation DeleteBotToken($tokenId: uuid!) {
    delete_nchat_bot_tokens_by_pk(id: $tokenId) {
      id
    }
  }
`;

// ============================================================================
// BOT API - Webhook Management
// ============================================================================

/**
 * Get bot webhooks
 */
export const GET_BOT_WEBHOOKS = gql`
  query GetBotWebhooks($botId: uuid!) {
    nchat_bot_webhooks(
      where: { bot_id: { _eq: $botId } }
      order_by: { created_at: desc }
    ) {
      id
      url
      events
      is_active
      created_at
      updated_at
      last_triggered_at
      delivery_count
      failure_count
    }
  }
`;

/**
 * Create bot webhook
 */
export const CREATE_BOT_WEBHOOK = gql`
  mutation CreateBotWebhook(
    $botId: uuid!
    $url: String!
    $events: [String!]!
    $secret: String!
  ) {
    insert_nchat_bot_webhooks_one(
      object: { bot_id: $botId, url: $url, events: $events, secret: $secret }
    ) {
      id
      url
      events
      created_at
    }
  }
`;

/**
 * Update bot webhook
 */
export const UPDATE_BOT_WEBHOOK = gql`
  mutation UpdateBotWebhook(
    $webhookId: uuid!
    $url: String
    $events: [String!]
    $isActive: Boolean
  ) {
    update_nchat_bot_webhooks_by_pk(
      pk_columns: { id: $webhookId }
      _set: { url: $url, events: $events, is_active: $isActive }
    ) {
      id
      url
      events
      is_active
      updated_at
    }
  }
`;

/**
 * Delete bot webhook
 */
export const DELETE_BOT_WEBHOOK = gql`
  mutation DeleteBotWebhook($webhookId: uuid!) {
    delete_nchat_bot_webhooks_by_pk(id: $webhookId) {
      id
    }
  }
`;

/**
 * Get webhook logs
 */
export const GET_WEBHOOK_LOGS = gql`
  query GetWebhookLogs($webhookId: uuid!, $limit: Int = 50) {
    nchat_bot_webhook_logs(
      where: { webhook_id: { _eq: $webhookId } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      event_type
      payload
      status_code
      response_body
      success
      attempt_number
      created_at
    }
  }
`;

// ============================================================================
// BOT API - Permissions Management
// ============================================================================

/**
 * Get bot permissions
 */
export const GET_BOT_PERMISSIONS = gql`
  query GetBotPermissions($botId: uuid!) {
    nchat_bot_permissions(
      where: { bot_id: { _eq: $botId } }
      order_by: { permission: asc }
    ) {
      id
      permission
      granted_by
      created_at
      granter {
        id
        display_name
      }
    }
  }
`;

/**
 * Grant bot permission
 */
export const GRANT_BOT_PERMISSION = gql`
  mutation GrantBotPermission(
    $botId: uuid!
    $permission: String!
    $grantedBy: uuid!
  ) {
    insert_nchat_bot_permissions_one(
      object: {
        bot_id: $botId
        permission: $permission
        granted_by: $grantedBy
      }
      on_conflict: { constraint: bot_permission_unique, update_columns: [] }
    ) {
      id
      permission
      created_at
    }
  }
`;

/**
 * Revoke bot permission
 */
export const REVOKE_BOT_PERMISSION = gql`
  mutation RevokeBotPermission($botId: uuid!, $permission: String!) {
    delete_nchat_bot_permissions(
      where: { bot_id: { _eq: $botId }, permission: { _eq: $permission } }
    ) {
      affected_rows
    }
  }
`;

/**
 * Get permission definitions
 */
export const GET_PERMISSION_DEFINITIONS = gql`
  query GetPermissionDefinitions {
    nchat_bot_permission_definitions(
      order_by: { category: asc, permission: asc }
    ) {
      permission
      description
      category
      is_dangerous
    }
  }
`;

/**
 * Get bot API logs
 */
export const GET_BOT_API_LOGS = gql`
  query GetBotApiLogs($botId: uuid!, $limit: Int = 100) {
    nchat_bot_api_logs(
      where: { bot_id: { _eq: $botId } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      endpoint
      method
      status_code
      response_time_ms
      created_at
      user_agent
      ip_address
    }
  }
`;

// ============================================================================
// ALIASES (for backward compatibility)
// ============================================================================

/**
 * Alias: GET_BOTS -> GET_MARKETPLACE_BOTS
 */
export const GET_BOTS = GET_MARKETPLACE_BOTS;

/**
 * Alias: CREATE_BOT -> REGISTER_BOT
 */
export const CREATE_BOT = REGISTER_BOT;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to bot installation changes
 */
export const BOT_INSTALLATIONS_SUBSCRIPTION = gql`
  subscription BotInstallationsSubscription($channelId: uuid!) {
    nchat_bot_installations(
      where: { channel_id: { _eq: $channelId } }
      order_by: { installed_at: desc }
    ) {
      ...BotInstallation
    }
  }
  ${BOT_INSTALLATION_FRAGMENT}
`;

/**
 * Subscribe to bot status changes
 */
export const BOT_STATUS_SUBSCRIPTION = gql`
  subscription BotStatusSubscription($botId: uuid!) {
    nchat_bots_by_pk(id: $botId) {
      id
      status
      updated_at
    }
  }
`;
