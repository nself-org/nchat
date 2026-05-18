"use client";

import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import { useWebhookStore } from "./webhook-store";
import {
  Webhook,
  WebhookDelivery,
  WebhookStats,
  CreateWebhookFormData,
  UpdateWebhookFormData,
  TestWebhookFormData,
  GetWebhooksResponse,
  GetWebhookResponse,
  GetWebhookDeliveriesResponse,
  GetWebhookStatsResponse,
  CreateWebhookResponse,
  UpdateWebhookResponse,
  DeleteWebhookResponse,
  WebhookStatus,
  DeliveryStatus,
} from "./types";
import {
  GET_ALL_WEBHOOKS,
  GET_WEBHOOK,
  GET_WEBHOOK_DELIVERIES,
  GET_WEBHOOK_STATS,
  GET_RECENT_DELIVERIES,
  CREATE_WEBHOOK,
  UPDATE_WEBHOOK,
  DELETE_WEBHOOK,
  REGENERATE_WEBHOOK_URL,
  TEST_WEBHOOK,
  RETRY_WEBHOOK_DELIVERY,
  WEBHOOKS_SUBSCRIPTION,
  WEBHOOK_DELIVERIES_SUBSCRIPTION,
} from "@/graphql/webhooks";
import { useAppConfig } from "@/contexts/app-config-context";

// ============================================================================
// MAIN HOOK
// ============================================================================

export interface UseWebhooksOptions {
  /**
   * Auto-fetch webhooks on mount
   */
  autoFetch?: boolean;
  /**
   * Enable real-time updates via subscriptions
   */
  realtime?: boolean;
  /**
   * Filter by channel ID
   */
  channelId?: string;
  /**
   * Filter by status
   */
  status?: WebhookStatus;
  /**
   * Number of items per page
   */
  limit?: number;
}

export function useWebhooks(options: UseWebhooksOptions = {}) {
  const {
    autoFetch = true,
    realtime = false,
    channelId,
    status,
    limit = 50,
  } = options;

  const { config } = useAppConfig();
  const webhooksEnabled = config?.integrations?.webhooks?.enabled ?? false;

  const {
    webhooks,
    selectedWebhook,
    deliveries,
    recentDeliveries,
    stats,
    isLoading,
    error,
    setWebhooks,
    addWebhook,
    updateWebhook: updateWebhookInStore,
    removeWebhook,
    setSelectedWebhook,
    setDeliveries,
    addDelivery,
    updateDelivery,
    setRecentDeliveries,
    setStats,
    setLoading,
    setError,
  } = useWebhookStore();

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  const {
    loading: webhooksLoading,
    error: webhooksError,
    refetch: refetchWebhooks,
  } = useQuery<GetWebhooksResponse>(GET_ALL_WEBHOOKS, {
    variables: { limit },
    skip: !autoFetch || !webhooksEnabled,
    onCompleted: (data) => {
      if (data?.nchat_webhooks) {
        setWebhooks(data.nchat_webhooks);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // ==========================================================================
  // SUBSCRIPTIONS (Optional real-time updates)
  // ==========================================================================

  useSubscription(WEBHOOKS_SUBSCRIPTION, {
    skip: !realtime || !webhooksEnabled,
    onData: ({ data }) => {
      if (data?.data?.nchat_webhooks) {
        setWebhooks(data.data.nchat_webhooks);
      }
    },
  });

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const [createWebhookMutation] = useMutation<CreateWebhookResponse>(
    CREATE_WEBHOOK,
    {
      onCompleted: (data) => {
        if (data?.insert_nchat_webhooks_one) {
          addWebhook(data.insert_nchat_webhooks_one);
        }
      },
      onError: (err) => {
        setError(err.message);
      },
    },
  );

  const [updateWebhookMutation] = useMutation<UpdateWebhookResponse>(
    UPDATE_WEBHOOK,
    {
      onCompleted: (data) => {
        if (data?.update_nchat_webhooks_by_pk) {
          const updated = data.update_nchat_webhooks_by_pk;
          updateWebhookInStore(updated.id, updated);
        }
      },
      onError: (err) => {
        setError(err.message);
      },
    },
  );

  const [deleteWebhookMutation] = useMutation<DeleteWebhookResponse>(
    DELETE_WEBHOOK,
    {
      onCompleted: (data) => {
        if (data?.delete_nchat_webhooks_by_pk) {
          removeWebhook(data.delete_nchat_webhooks_by_pk.id);
        }
      },
      onError: (err) => {
        setError(err.message);
      },
    },
  );

  const [regenerateUrlMutation] = useMutation(REGENERATE_WEBHOOK_URL, {
    onCompleted: (data) => {
      if (data?.update_nchat_webhooks_by_pk) {
        const updated = data.update_nchat_webhooks_by_pk;
        updateWebhookInStore(updated.id, updated);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const [testWebhookMutation] = useMutation(TEST_WEBHOOK, {
    onCompleted: (data) => {
      if (data?.insert_nchat_webhook_deliveries_one) {
        addDelivery(data.insert_nchat_webhook_deliveries_one);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const [retryDeliveryMutation] = useMutation(RETRY_WEBHOOK_DELIVERY, {
    onCompleted: (data) => {
      if (data?.update_nchat_webhook_deliveries_by_pk) {
        const updated = data.update_nchat_webhook_deliveries_by_pk;
        updateDelivery(updated.id, updated);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  /**
   * Create a new webhook
   */
  const createWebhook = useCallback(
    async (data: CreateWebhookFormData): Promise<Webhook | null> => {
      if (!webhooksEnabled) {
        setError("Webhooks feature is not enabled");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await createWebhookMutation({
          variables: {
            name: data.name,
            channelId: data.channelId,
            avatarUrl: data.avatarUrl,
            createdBy: "current-user-id", // This should come from auth context
          },
        });

        setLoading(false);
        return result.data?.insert_nchat_webhooks_one || null;
      } catch (err) {
        setLoading(false);
        return null;
      }
    },
    [webhooksEnabled, createWebhookMutation, setLoading, setError],
  );

  /**
   * Update an existing webhook
   */
  const updateWebhook = useCallback(
    async (data: UpdateWebhookFormData): Promise<Webhook | null> => {
      if (!webhooksEnabled) {
        setError("Webhooks feature is not enabled");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await updateWebhookMutation({
          variables: {
            id: data.id,
            name: data.name,
            channelId: data.channelId,
            avatarUrl: data.avatarUrl,
            status: data.status,
          },
        });

        setLoading(false);
        return result.data?.update_nchat_webhooks_by_pk || null;
      } catch (err) {
        setLoading(false);
        return null;
      }
    },
    [webhooksEnabled, updateWebhookMutation, setLoading, setError],
  );

  /**
   * Delete a webhook
   */
  const deleteWebhook = useCallback(
    async (id: string): Promise<boolean> => {
      if (!webhooksEnabled) {
        setError("Webhooks feature is not enabled");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        await deleteWebhookMutation({ variables: { id } });
        setLoading(false);
        return true;
      } catch (err) {
        setLoading(false);
        return false;
      }
    },
    [webhooksEnabled, deleteWebhookMutation, setLoading, setError],
  );

  /**
   * Regenerate webhook URL/token
   */
  const regenerateUrl = useCallback(
    async (id: string): Promise<Webhook | null> => {
      if (!webhooksEnabled) {
        setError("Webhooks feature is not enabled");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await regenerateUrlMutation({ variables: { id } });
        setLoading(false);
        return result.data?.update_nchat_webhooks_by_pk || null;
      } catch (err) {
        setLoading(false);
        return null;
      }
    },
    [webhooksEnabled, regenerateUrlMutation, setLoading, setError],
  );

  /**
   * Test a webhook by sending a sample message
   */
  const testWebhook = useCallback(
    async (data: TestWebhookFormData): Promise<WebhookDelivery | null> => {
      if (!webhooksEnabled) {
        setError("Webhooks feature is not enabled");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await testWebhookMutation({
          variables: {
            webhookId: data.webhookId,
            content: data.content,
            username: data.username,
            avatarUrl: data.avatarUrl,
          },
        });

        setLoading(false);
        return result.data?.insert_nchat_webhook_deliveries_one || null;
      } catch (err) {
        setLoading(false);
        return null;
      }
    },
    [webhooksEnabled, testWebhookMutation, setLoading, setError],
  );

  /**
   * Retry a failed delivery
   */
  const retryDelivery = useCallback(
    async (deliveryId: string): Promise<WebhookDelivery | null> => {
      if (!webhooksEnabled) {
        setError("Webhooks feature is not enabled");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await retryDeliveryMutation({
          variables: { id: deliveryId },
        });

        setLoading(false);
        return result.data?.update_nchat_webhook_deliveries_by_pk || null;
      } catch (err) {
        setLoading(false);
        return null;
      }
    },
    [webhooksEnabled, retryDeliveryMutation, setLoading, setError],
  );

  /**
   * Toggle webhook status (active/paused)
   */
  const toggleWebhookStatus = useCallback(
    async (id: string): Promise<Webhook | null> => {
      const webhook = webhooks.find((w) => w.id === id);
      if (!webhook) return null;

      const newStatus: WebhookStatus =
        webhook.status === "active" ? "paused" : "active";

      return updateWebhook({ id, status: newStatus });
    },
    [webhooks, updateWebhook],
  );

  /**
   * Select a webhook for viewing/editing
   */
  const selectWebhook = useCallback(
    (webhook: Webhook | null) => {
      setSelectedWebhook(webhook);
    },
    [setSelectedWebhook],
  );

  /**
   * Refresh webhooks list
   */
  const refresh = useCallback(async () => {
    if (!webhooksEnabled) return;
    await refetchWebhooks();
  }, [webhooksEnabled, refetchWebhooks]);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const activeWebhooks = webhooks.filter((w) => w.status === "active");
  const pausedWebhooks = webhooks.filter((w) => w.status === "paused");
  const totalWebhooks = webhooks.length;

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    webhooks,
    selectedWebhook,
    deliveries,
    recentDeliveries,
    stats,
    isLoading: isLoading || webhooksLoading,
    error: error || webhooksError?.message || null,
    webhooksEnabled,

    // Computed
    activeWebhooks,
    pausedWebhooks,
    totalWebhooks,

    // Actions
    createWebhook,
    updateWebhook,
    deleteWebhook,
    regenerateUrl,
    testWebhook,
    retryDelivery,
    toggleWebhookStatus,
    selectWebhook,
    refresh,

    // Store setters (for external data)
    setWebhooks,
    setDeliveries,
    setRecentDeliveries,
    setStats,
    setError,
  };
}

// ============================================================================
// SINGLE WEBHOOK HOOK
// ============================================================================

export interface UseWebhookOptions {
  webhookId: string;
  fetchDeliveries?: boolean;
  fetchStats?: boolean;
  realtime?: boolean;
}

export function useWebhook(options: UseWebhookOptions) {
  const {
    webhookId,
    fetchDeliveries = true,
    fetchStats = true,
    realtime = false,
  } = options;

  const { config } = useAppConfig();
  const webhooksEnabled = config?.integrations?.webhooks?.enabled ?? false;

  const {
    selectedWebhook,
    deliveries,
    stats,
    setSelectedWebhook,
    setDeliveries,
    setStats,
    updateDelivery,
    setError,
  } = useWebhookStore();

  // Fetch webhook details
  const {
    loading: webhookLoading,
    error: webhookError,
    refetch: refetchWebhook,
  } = useQuery<GetWebhookResponse>(GET_WEBHOOK, {
    variables: { id: webhookId },
    skip: !webhookId || !webhooksEnabled,
    onCompleted: (data) => {
      if (data?.nchat_webhooks_by_pk) {
        setSelectedWebhook(data.nchat_webhooks_by_pk);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // Fetch deliveries
  const {
    loading: deliveriesLoading,
    error: deliveriesError,
    refetch: refetchDeliveries,
  } = useQuery<GetWebhookDeliveriesResponse>(GET_WEBHOOK_DELIVERIES, {
    variables: { webhookId, limit: 20 },
    skip: !webhookId || !fetchDeliveries || !webhooksEnabled,
    onCompleted: (data) => {
      if (data?.nchat_webhook_deliveries) {
        setDeliveries(data.nchat_webhook_deliveries);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // Fetch stats
  const { loading: statsLoading, error: statsError } =
    useQuery<GetWebhookStatsResponse>(GET_WEBHOOK_STATS, {
      variables: { webhookId },
      skip: !webhookId || !fetchStats || !webhooksEnabled,
      onCompleted: (data) => {
        if (data) {
          const total = data.total?.aggregate?.count ?? 0;
          const success = data.success?.aggregate?.count ?? 0;
          const failed = data.failed?.aggregate?.count ?? 0;
          const pending = data.pending?.aggregate?.count ?? 0;

          setStats({
            total,
            success,
            failed,
            pending,
            successRate: total > 0 ? (success / total) * 100 : 0,
          });
        }
      },
      onError: (err) => {
        setError(err.message);
      },
    });

  // Real-time deliveries subscription
  useSubscription(WEBHOOK_DELIVERIES_SUBSCRIPTION, {
    variables: { webhookId },
    skip: !webhookId || !realtime || !webhooksEnabled,
    onData: ({ data }) => {
      if (data?.data?.nchat_webhook_deliveries) {
        setDeliveries(data.data.nchat_webhook_deliveries);
      }
    },
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      refetchWebhook(),
      fetchDeliveries && refetchDeliveries(),
    ]);
  }, [refetchWebhook, refetchDeliveries, fetchDeliveries]);

  return {
    webhook: selectedWebhook,
    deliveries,
    stats,
    isLoading: webhookLoading || deliveriesLoading || statsLoading,
    error:
      webhookError?.message ||
      deliveriesError?.message ||
      statsError?.message ||
      null,
    webhooksEnabled,
    refresh,
  };
}

// ============================================================================
// WEBHOOK DELIVERIES HOOK
// ============================================================================

export interface UseWebhookDeliveriesOptions {
  webhookId: string;
  status?: DeliveryStatus;
  limit?: number;
  realtime?: boolean;
}

export function useWebhookDeliveries(options: UseWebhookDeliveriesOptions) {
  const { webhookId, status, limit = 20, realtime = false } = options;

  const { config } = useAppConfig();
  const webhooksEnabled = config?.integrations?.webhooks?.enabled ?? false;

  const { deliveries, setDeliveries, updateDelivery, setError } =
    useWebhookStore();

  const { loading, error, refetch, fetchMore } =
    useQuery<GetWebhookDeliveriesResponse>(GET_WEBHOOK_DELIVERIES, {
      variables: { webhookId, status, limit },
      skip: !webhookId || !webhooksEnabled,
      onCompleted: (data) => {
        if (data?.nchat_webhook_deliveries) {
          setDeliveries(data.nchat_webhook_deliveries);
        }
      },
      onError: (err) => {
        setError(err.message);
      },
    });

  // Real-time updates
  useSubscription(WEBHOOK_DELIVERIES_SUBSCRIPTION, {
    variables: { webhookId },
    skip: !webhookId || !realtime || !webhooksEnabled,
    onData: ({ data }) => {
      if (data?.data?.nchat_webhook_deliveries) {
        setDeliveries(data.data.nchat_webhook_deliveries);
      }
    },
  });

  const loadMore = useCallback(async () => {
    await fetchMore({
      variables: {
        offset: deliveries.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          ...prev,
          nchat_webhook_deliveries: [
            ...prev.nchat_webhook_deliveries,
            ...fetchMoreResult.nchat_webhook_deliveries,
          ],
        };
      },
    });
  }, [fetchMore, deliveries.length]);

  return {
    deliveries,
    isLoading: loading,
    error: error?.message || null,
    webhooksEnabled,
    refetch,
    loadMore,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate webhook URL from parts
 */
export function generateWebhookUrl(
  baseUrl: string,
  webhookId: string,
  token: string,
): string {
  return `${baseUrl}/api/webhooks/${webhookId}/${token}`;
}

/**
 * Copy webhook URL to clipboard
 */
export async function copyWebhookUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format delivery timestamp
 */
export function formatDeliveryTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Get delivery status color
 */
export function getDeliveryStatusColor(
  status: DeliveryStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "success":
      return "default";
    case "pending":
    case "retrying":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Get webhook status color
 */
export function getWebhookStatusColor(
  status: WebhookStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "paused":
      return "secondary";
    case "disabled":
      return "destructive";
    default:
      return "outline";
  }
}

export default useWebhooks;
