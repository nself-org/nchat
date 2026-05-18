import { gql } from "@apollo/client";
import { CHANNEL_BASIC_FRAGMENT, USER_BASIC_FRAGMENT } from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type WebhookStatus = "active" | "paused" | "disabled";
export type DeliveryStatus = "pending" | "success" | "failed" | "retrying";

export interface Webhook {
  id: string;
  name: string;
  avatar_url?: string;
  channel_id: string;
  token: string;
  url: string;
  status: WebhookStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  status: DeliveryStatus;
  request_body: string;
  request_headers?: Record<string, string>;
  response_body?: string;
  response_status?: number;
  error_message?: string;
  attempt_count: number;
  created_at: string;
  delivered_at?: string;
  next_retry_at?: string;
}

export interface GetWebhooksVariables {
  channelId?: string;
  status?: WebhookStatus;
  limit?: number;
  offset?: number;
}

export interface GetWebhookVariables {
  id: string;
}

export interface CreateWebhookVariables {
  name: string;
  channelId: string;
  avatarUrl?: string;
  createdBy: string;
}

export interface UpdateWebhookVariables {
  id: string;
  name?: string;
  channelId?: string;
  avatarUrl?: string;
  status?: WebhookStatus;
}

export interface DeleteWebhookVariables {
  id: string;
}

export interface RegenerateWebhookUrlVariables {
  id: string;
}

export interface TestWebhookVariables {
  id: string;
  content: string;
  username?: string;
  avatarUrl?: string;
}

export interface GetWebhookDeliveriesVariables {
  webhookId: string;
  status?: DeliveryStatus;
  limit?: number;
  offset?: number;
}

export interface RetryDeliveryVariables {
  deliveryId: string;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const WEBHOOK_FRAGMENT = gql`
  fragment WebhookFragment on nchat_webhooks {
    id
    name
    avatar_url
    channel_id
    token
    url
    status
    created_by
    created_at
    updated_at
    last_used_at
    channel {
      ...ChannelBasic
    }
    creator {
      ...UserBasic
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

export const WEBHOOK_DELIVERY_FRAGMENT = gql`
  fragment WebhookDeliveryFragment on nchat_webhook_deliveries {
    id
    webhook_id
    status
    request_body
    request_headers
    response_body
    response_status
    error_message
    attempt_count
    created_at
    delivered_at
    next_retry_at
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all webhooks with optional filtering
 */
export const GET_WEBHOOKS = gql`
  query GetWebhooks(
    $channelId: uuid
    $status: String
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_webhooks(
      where: {
        _and: [
          { channel_id: { _eq: $channelId } }
          { status: { _eq: $status } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...WebhookFragment
    }
    nchat_webhooks_aggregate(
      where: {
        _and: [
          { channel_id: { _eq: $channelId } }
          { status: { _eq: $status } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${WEBHOOK_FRAGMENT}
`;

/**
 * Get all webhooks without filtering (for admin view)
 */
export const GET_ALL_WEBHOOKS = gql`
  query GetAllWebhooks($limit: Int = 50, $offset: Int = 0) {
    nchat_webhooks(
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...WebhookFragment
    }
    nchat_webhooks_aggregate {
      aggregate {
        count
      }
    }
  }
  ${WEBHOOK_FRAGMENT}
`;

/**
 * Get a single webhook by ID
 */
export const GET_WEBHOOK = gql`
  query GetWebhook($id: uuid!) {
    nchat_webhooks_by_pk(id: $id) {
      ...WebhookFragment
    }
  }
  ${WEBHOOK_FRAGMENT}
`;

/**
 * Get webhook by token (for incoming webhook requests)
 */
export const GET_WEBHOOK_BY_TOKEN = gql`
  query GetWebhookByToken($token: String!) {
    nchat_webhooks(
      where: { token: { _eq: $token }, status: { _eq: "active" } }
      limit: 1
    ) {
      ...WebhookFragment
    }
  }
  ${WEBHOOK_FRAGMENT}
`;

/**
 * Get webhook deliveries with optional filtering
 */
export const GET_WEBHOOK_DELIVERIES = gql`
  query GetWebhookDeliveries(
    $webhookId: uuid!
    $status: String
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_webhook_deliveries(
      where: { webhook_id: { _eq: $webhookId }, status: { _eq: $status } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...WebhookDeliveryFragment
    }
    nchat_webhook_deliveries_aggregate(
      where: { webhook_id: { _eq: $webhookId }, status: { _eq: $status } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${WEBHOOK_DELIVERY_FRAGMENT}
`;

/**
 * Get recent deliveries across all webhooks (for dashboard)
 */
export const GET_RECENT_DELIVERIES = gql`
  query GetRecentDeliveries($limit: Int = 10) {
    nchat_webhook_deliveries(order_by: { created_at: desc }, limit: $limit) {
      ...WebhookDeliveryFragment
      webhook {
        id
        name
        channel {
          name
          slug
        }
      }
    }
  }
  ${WEBHOOK_DELIVERY_FRAGMENT}
`;

/**
 * Get webhook statistics
 */
export const GET_WEBHOOK_STATS = gql`
  query GetWebhookStats($webhookId: uuid!) {
    total: nchat_webhook_deliveries_aggregate(
      where: { webhook_id: { _eq: $webhookId } }
    ) {
      aggregate {
        count
      }
    }
    success: nchat_webhook_deliveries_aggregate(
      where: { webhook_id: { _eq: $webhookId }, status: { _eq: "success" } }
    ) {
      aggregate {
        count
      }
    }
    failed: nchat_webhook_deliveries_aggregate(
      where: { webhook_id: { _eq: $webhookId }, status: { _eq: "failed" } }
    ) {
      aggregate {
        count
      }
    }
    pending: nchat_webhook_deliveries_aggregate(
      where: {
        webhook_id: { _eq: $webhookId }
        status: { _in: ["pending", "retrying"] }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new webhook
 */
export const CREATE_WEBHOOK = gql`
  mutation CreateWebhook(
    $name: String!
    $channelId: uuid!
    $avatarUrl: String
    $createdBy: uuid!
  ) {
    insert_nchat_webhooks_one(
      object: {
        name: $name
        channel_id: $channelId
        avatar_url: $avatarUrl
        created_by: $createdBy
        status: "active"
      }
    ) {
      ...WebhookFragment
    }
  }
  ${WEBHOOK_FRAGMENT}
`;

/**
 * Update an existing webhook
 */
export const UPDATE_WEBHOOK = gql`
  mutation UpdateWebhook(
    $id: uuid!
    $name: String
    $channelId: uuid
    $avatarUrl: String
    $status: String
  ) {
    update_nchat_webhooks_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        channel_id: $channelId
        avatar_url: $avatarUrl
        status: $status
        updated_at: "now()"
      }
    ) {
      ...WebhookFragment
    }
  }
  ${WEBHOOK_FRAGMENT}
`;

/**
 * Delete a webhook
 */
export const DELETE_WEBHOOK = gql`
  mutation DeleteWebhook($id: uuid!) {
    delete_nchat_webhooks_by_pk(id: $id) {
      id
      name
    }
  }
`;

/**
 * Regenerate webhook URL/token
 */
export const REGENERATE_WEBHOOK_URL = gql`
  mutation RegenerateWebhookUrl($id: uuid!) {
    update_nchat_webhooks_by_pk(
      pk_columns: { id: $id }
      _set: { token: null, updated_at: "now()" }
    ) {
      ...WebhookFragment
    }
  }
  ${WEBHOOK_FRAGMENT}
`;

/**
 * Test a webhook by sending a sample message
 */
export const TEST_WEBHOOK = gql`
  mutation TestWebhook(
    $webhookId: uuid!
    $content: String!
    $username: String
    $avatarUrl: String
  ) {
    insert_nchat_webhook_deliveries_one(
      object: {
        webhook_id: $webhookId
        status: "pending"
        request_body: $content
        request_headers: {}
      }
    ) {
      ...WebhookDeliveryFragment
    }
  }
  ${WEBHOOK_DELIVERY_FRAGMENT}
`;

/**
 * Update webhook last used timestamp
 */
export const UPDATE_WEBHOOK_LAST_USED = gql`
  mutation UpdateWebhookLastUsed($id: uuid!) {
    update_nchat_webhooks_by_pk(
      pk_columns: { id: $id }
      _set: { last_used_at: "now()" }
    ) {
      id
      last_used_at
    }
  }
`;

/**
 * Create a webhook delivery record
 */
export const CREATE_WEBHOOK_DELIVERY = gql`
  mutation CreateWebhookDelivery(
    $webhookId: uuid!
    $requestBody: String!
    $requestHeaders: jsonb
    $status: String = "pending"
  ) {
    insert_nchat_webhook_deliveries_one(
      object: {
        webhook_id: $webhookId
        request_body: $requestBody
        request_headers: $requestHeaders
        status: $status
      }
    ) {
      ...WebhookDeliveryFragment
    }
  }
  ${WEBHOOK_DELIVERY_FRAGMENT}
`;

/**
 * Update webhook delivery status
 */
export const UPDATE_WEBHOOK_DELIVERY = gql`
  mutation UpdateWebhookDelivery(
    $id: uuid!
    $status: String!
    $responseBody: String
    $responseStatus: Int
    $errorMessage: String
    $deliveredAt: timestamptz
  ) {
    update_nchat_webhook_deliveries_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: $status
        response_body: $responseBody
        response_status: $responseStatus
        error_message: $errorMessage
        delivered_at: $deliveredAt
      }
    ) {
      ...WebhookDeliveryFragment
    }
  }
  ${WEBHOOK_DELIVERY_FRAGMENT}
`;

/**
 * Retry a failed webhook delivery
 */
export const RETRY_WEBHOOK_DELIVERY = gql`
  mutation RetryWebhookDelivery($id: uuid!) {
    update_nchat_webhook_deliveries_by_pk(
      pk_columns: { id: $id }
      _set: { status: "retrying", next_retry_at: "now()" }
      _inc: { attempt_count: 1 }
    ) {
      ...WebhookDeliveryFragment
    }
  }
  ${WEBHOOK_DELIVERY_FRAGMENT}
`;

/**
 * Delete old webhook deliveries (cleanup)
 */
export const DELETE_OLD_DELIVERIES = gql`
  mutation DeleteOldDeliveries($webhookId: uuid!, $beforeDate: timestamptz!) {
    delete_nchat_webhook_deliveries(
      where: {
        webhook_id: { _eq: $webhookId }
        created_at: { _lt: $beforeDate }
      }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to webhook updates
 */
export const WEBHOOK_SUBSCRIPTION = gql`
  subscription WebhookSubscription($id: uuid!) {
    nchat_webhooks_by_pk(id: $id) {
      ...WebhookFragment
    }
  }
  ${WEBHOOK_FRAGMENT}
`;

/**
 * Subscribe to all webhooks (for admin dashboard)
 */
export const WEBHOOKS_SUBSCRIPTION = gql`
  subscription WebhooksSubscription {
    nchat_webhooks(order_by: { created_at: desc }) {
      ...WebhookFragment
    }
  }
  ${WEBHOOK_FRAGMENT}
`;

/**
 * Subscribe to webhook deliveries
 */
export const WEBHOOK_DELIVERIES_SUBSCRIPTION = gql`
  subscription WebhookDeliveriesSubscription($webhookId: uuid!) {
    nchat_webhook_deliveries(
      where: { webhook_id: { _eq: $webhookId } }
      order_by: { created_at: desc }
      limit: 20
    ) {
      ...WebhookDeliveryFragment
    }
  }
  ${WEBHOOK_DELIVERY_FRAGMENT}
`;

/**
 * Subscribe to recent deliveries across all webhooks
 */
export const RECENT_DELIVERIES_SUBSCRIPTION = gql`
  subscription RecentDeliveriesSubscription($limit: Int = 10) {
    nchat_webhook_deliveries(order_by: { created_at: desc }, limit: $limit) {
      ...WebhookDeliveryFragment
      webhook {
        id
        name
        channel {
          name
          slug
        }
      }
    }
  }
  ${WEBHOOK_DELIVERY_FRAGMENT}
`;
