import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  Webhook,
  WebhookDelivery,
  WebhookStats,
  WebhooksStore,
  WebhooksState,
} from "./types";

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: WebhooksState = {
  webhooks: [],
  selectedWebhook: null,
  deliveries: [],
  recentDeliveries: [],
  stats: null,
  isLoading: false,
  error: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useWebhookStore = create<WebhooksStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ====================================================================
        // WEBHOOK ACTIONS
        // ====================================================================

        /**
         * Set all webhooks (replaces existing)
         */
        setWebhooks: (webhooks: Webhook[]) => {
          set({ webhooks }, false, "setWebhooks");
        },

        /**
         * Add a new webhook to the list
         */
        addWebhook: (webhook: Webhook) => {
          set(
            (state) => ({
              webhooks: [webhook, ...state.webhooks],
            }),
            false,
            "addWebhook",
          );
        },

        /**
         * Update an existing webhook
         */
        updateWebhook: (id: string, updates: Partial<Webhook>) => {
          set(
            (state) => ({
              webhooks: state.webhooks.map((w) =>
                w.id === id ? { ...w, ...updates } : w,
              ),
              selectedWebhook:
                state.selectedWebhook?.id === id
                  ? { ...state.selectedWebhook, ...updates }
                  : state.selectedWebhook,
            }),
            false,
            "updateWebhook",
          );
        },

        /**
         * Remove a webhook from the list
         */
        removeWebhook: (id: string) => {
          set(
            (state) => ({
              webhooks: state.webhooks.filter((w) => w.id !== id),
              selectedWebhook:
                state.selectedWebhook?.id === id ? null : state.selectedWebhook,
            }),
            false,
            "removeWebhook",
          );
        },

        /**
         * Set the currently selected webhook
         */
        setSelectedWebhook: (webhook: Webhook | null) => {
          set({ selectedWebhook: webhook }, false, "setSelectedWebhook");
        },

        // ====================================================================
        // DELIVERY ACTIONS
        // ====================================================================

        /**
         * Set deliveries for selected webhook
         */
        setDeliveries: (deliveries: WebhookDelivery[]) => {
          set({ deliveries }, false, "setDeliveries");
        },

        /**
         * Add a new delivery to the list
         */
        addDelivery: (delivery: WebhookDelivery) => {
          set(
            (state) => ({
              deliveries: [delivery, ...state.deliveries],
              recentDeliveries: [delivery, ...state.recentDeliveries].slice(
                0,
                10,
              ),
            }),
            false,
            "addDelivery",
          );
        },

        /**
         * Update an existing delivery
         */
        updateDelivery: (id: string, updates: Partial<WebhookDelivery>) => {
          set(
            (state) => ({
              deliveries: state.deliveries.map((d) =>
                d.id === id ? { ...d, ...updates } : d,
              ),
              recentDeliveries: state.recentDeliveries.map((d) =>
                d.id === id ? { ...d, ...updates } : d,
              ),
            }),
            false,
            "updateDelivery",
          );
        },

        /**
         * Set recent deliveries (across all webhooks)
         */
        setRecentDeliveries: (deliveries: WebhookDelivery[]) => {
          set({ recentDeliveries: deliveries }, false, "setRecentDeliveries");
        },

        // ====================================================================
        // STATS ACTIONS
        // ====================================================================

        /**
         * Set webhook statistics
         */
        setStats: (stats: WebhookStats | null) => {
          set({ stats }, false, "setStats");
        },

        // ====================================================================
        // UI STATE ACTIONS
        // ====================================================================

        /**
         * Set loading state
         */
        setLoading: (loading: boolean) => {
          set({ isLoading: loading }, false, "setLoading");
        },

        /**
         * Set error state
         */
        setError: (error: string | null) => {
          set({ error }, false, "setError");
        },

        /**
         * Reset store to initial state
         */
        reset: () => {
          set(initialState, false, "reset");
        },
      }),
      {
        name: "nchat-webhooks-store",
        partialize: (state) => ({
          // Only persist non-sensitive data
          selectedWebhook: state.selectedWebhook
            ? { id: state.selectedWebhook.id }
            : null,
        }),
      },
    ),
    { name: "WebhooksStore" },
  ),
);

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Select webhooks by status
 */
export const selectWebhooksByStatus = (status: Webhook["status"]) => {
  return useWebhookStore.getState().webhooks.filter((w) => w.status === status);
};

/**
 * Select webhooks by channel
 */
export const selectWebhooksByChannel = (channelId: string) => {
  return useWebhookStore
    .getState()
    .webhooks.filter((w) => w.channel_id === channelId);
};

/**
 * Select active webhooks count
 */
export const selectActiveWebhooksCount = () => {
  return useWebhookStore
    .getState()
    .webhooks.filter((w) => w.status === "active").length;
};

/**
 * Select failed deliveries
 */
export const selectFailedDeliveries = () => {
  return useWebhookStore
    .getState()
    .deliveries.filter((d) => d.status === "failed");
};

/**
 * Select pending deliveries
 */
export const selectPendingDeliveries = () => {
  return useWebhookStore
    .getState()
    .deliveries.filter(
      (d) => d.status === "pending" || d.status === "retrying",
    );
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to get webhooks filtered by status
 */
export const useWebhooksByStatus = (status: Webhook["status"] | "all") => {
  return useWebhookStore((state) =>
    status === "all"
      ? state.webhooks
      : state.webhooks.filter((w) => w.status === status),
  );
};

/**
 * Hook to get webhooks filtered by channel
 */
export const useWebhooksByChannel = (channelId: string | "all") => {
  return useWebhookStore((state) =>
    channelId === "all"
      ? state.webhooks
      : state.webhooks.filter((w) => w.channel_id === channelId),
  );
};

/**
 * Hook to get webhook by ID
 */
export const useWebhookById = (id: string) => {
  return useWebhookStore((state) => state.webhooks.find((w) => w.id === id));
};

/**
 * Hook to get deliveries filtered by status
 */
export const useDeliveriesByStatus = (
  status: WebhookDelivery["status"] | "all",
) => {
  return useWebhookStore((state) =>
    status === "all"
      ? state.deliveries
      : state.deliveries.filter((d) => d.status === status),
  );
};

export default useWebhookStore;
