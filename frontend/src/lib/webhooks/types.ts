// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export type WebhookStatus = "active" | "paused" | "disabled";
export type DeliveryStatus = "pending" | "success" | "failed" | "retrying";

/**
 * Channel information associated with a webhook
 */
export interface WebhookChannel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type?: string;
  is_private?: boolean;
}

/**
 * User who created the webhook
 */
export interface WebhookCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

/**
 * Main Webhook interface
 */
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
  channel?: WebhookChannel;
  creator?: WebhookCreator;
}

/**
 * Webhook delivery record
 */
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
  webhook?: {
    id: string;
    name: string;
    channel?: {
      name: string;
      slug: string;
    };
  };
}

/**
 * Webhook statistics
 */
export interface WebhookStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  successRate: number;
}

// ============================================================================
// FORM TYPES
// ============================================================================

/**
 * Create webhook form data
 */
export interface CreateWebhookFormData {
  name: string;
  channelId: string;
  avatarUrl?: string;
}

/**
 * Update webhook form data
 */
export interface UpdateWebhookFormData {
  id: string;
  name?: string;
  channelId?: string;
  avatarUrl?: string;
  status?: WebhookStatus;
}

/**
 * Test webhook form data
 */
export interface TestWebhookFormData {
  webhookId: string;
  content: string;
  username?: string;
  avatarUrl?: string;
}

// ============================================================================
// STORE TYPES
// ============================================================================

/**
 * Webhooks store state
 */
export interface WebhooksState {
  webhooks: Webhook[];
  selectedWebhook: Webhook | null;
  deliveries: WebhookDelivery[];
  recentDeliveries: WebhookDelivery[];
  stats: WebhookStats | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Webhooks store actions
 */
export interface WebhooksActions {
  setWebhooks: (webhooks: Webhook[]) => void;
  addWebhook: (webhook: Webhook) => void;
  updateWebhook: (id: string, updates: Partial<Webhook>) => void;
  removeWebhook: (id: string) => void;
  setSelectedWebhook: (webhook: Webhook | null) => void;
  setDeliveries: (deliveries: WebhookDelivery[]) => void;
  addDelivery: (delivery: WebhookDelivery) => void;
  updateDelivery: (id: string, updates: Partial<WebhookDelivery>) => void;
  setRecentDeliveries: (deliveries: WebhookDelivery[]) => void;
  setStats: (stats: WebhookStats | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type WebhooksStore = WebhooksState & WebhooksActions;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * GraphQL response for getting webhooks
 */
export interface GetWebhooksResponse {
  nchat_webhooks: Webhook[];
  nchat_webhooks_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

/**
 * GraphQL response for getting a single webhook
 */
export interface GetWebhookResponse {
  nchat_webhooks_by_pk: Webhook | null;
}

/**
 * GraphQL response for creating a webhook
 */
export interface CreateWebhookResponse {
  insert_nchat_webhooks_one: Webhook;
}

/**
 * GraphQL response for updating a webhook
 */
export interface UpdateWebhookResponse {
  update_nchat_webhooks_by_pk: Webhook;
}

/**
 * GraphQL response for deleting a webhook
 */
export interface DeleteWebhookResponse {
  delete_nchat_webhooks_by_pk: {
    id: string;
    name: string;
  };
}

/**
 * GraphQL response for getting webhook deliveries
 */
export interface GetWebhookDeliveriesResponse {
  nchat_webhook_deliveries: WebhookDelivery[];
  nchat_webhook_deliveries_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

/**
 * GraphQL response for webhook stats
 */
export interface GetWebhookStatsResponse {
  total: { aggregate: { count: number } };
  success: { aggregate: { count: number } };
  failed: { aggregate: { count: number } };
  pending: { aggregate: { count: number } };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Webhook URL generation helper
 */
export interface WebhookUrlParts {
  baseUrl: string;
  webhookId: string;
  token: string;
}

/**
 * Webhook message payload (incoming)
 */
export interface WebhookMessagePayload {
  content: string;
  username?: string;
  avatar_url?: string;
  embeds?: WebhookEmbed[];
  attachments?: WebhookAttachment[];
}

/**
 * Webhook embed (rich content)
 */
export interface WebhookEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
}

/**
 * Webhook attachment
 */
export interface WebhookAttachment {
  id: string;
  filename: string;
  description?: string;
  content_type?: string;
  size?: number;
  url: string;
  proxy_url?: string;
  height?: number;
  width?: number;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Webhook list filter options
 */
export interface WebhookFilterOptions {
  status?: WebhookStatus | "all";
  channelId?: string | "all";
  search?: string;
  sortBy?: "name" | "created_at" | "last_used_at";
  sortOrder?: "asc" | "desc";
}

/**
 * Delivery list filter options
 */
export interface DeliveryFilterOptions {
  status?: DeliveryStatus | "all";
  dateRange?: {
    from: Date;
    to: Date;
  };
  sortBy?: "created_at" | "delivered_at";
  sortOrder?: "asc" | "desc";
}
