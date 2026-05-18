/**
 * Bot SDK Store
 * Zustand store for managing installed bots, permissions, and status
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  BotId,
  BotStatus,
  BotPermission,
  InstalledBot,
  MarketplaceBot,
  ChannelId,
  UserId,
} from "@/lib/bot-sdk/types";

// ============================================================================
// TYPES
// ============================================================================

export interface BotSdkState {
  // Installed bots
  installedBots: Record<BotId, InstalledBot>;
  installedBotsOrder: BotId[];

  // Marketplace
  marketplaceBots: Record<BotId, MarketplaceBot>;
  featuredBots: BotId[];
  categories: string[];

  // UI state
  selectedBotId: BotId | null;
  searchQuery: string;
  categoryFilter: string | null;
  statusFilter: BotStatus | "all";

  // Loading states
  isLoadingInstalled: boolean;
  isLoadingMarketplace: boolean;
  isInstalling: BotId | null;
  isUninstalling: BotId | null;

  // Errors
  error: string | null;
}

export interface BotSdkActions {
  // Installed bots
  setInstalledBots: (bots: InstalledBot[]) => void;
  addInstalledBot: (bot: InstalledBot) => void;
  removeInstalledBot: (botId: BotId) => void;
  updateInstalledBot: (botId: BotId, updates: Partial<InstalledBot>) => void;

  // Bot status
  setBotStatus: (botId: BotId, status: BotStatus) => void;
  setBotPermissions: (botId: BotId, permissions: BotPermission[]) => void;
  setBotChannels: (botId: BotId, channels: ChannelId[]) => void;

  // Marketplace
  setMarketplaceBots: (bots: MarketplaceBot[]) => void;
  setFeaturedBots: (botIds: BotId[]) => void;
  setCategories: (categories: string[]) => void;

  // Selection
  selectBot: (botId: BotId | null) => void;
  getSelectedBot: () => InstalledBot | MarketplaceBot | null;

  // Filtering
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string | null) => void;
  setStatusFilter: (status: BotStatus | "all") => void;
  clearFilters: () => void;

  // Loading states
  setLoadingInstalled: (loading: boolean) => void;
  setLoadingMarketplace: (loading: boolean) => void;
  setInstalling: (botId: BotId | null) => void;
  setUninstalling: (botId: BotId | null) => void;

  // Errors
  setError: (error: string | null) => void;

  // Utility
  reset: () => void;
  isInstalled: (botId: BotId) => boolean;
  getBot: (botId: BotId) => InstalledBot | MarketplaceBot | undefined;
  getBotPermissions: (botId: BotId) => BotPermission[];
  hasPermission: (botId: BotId, permission: BotPermission) => boolean;
}

export type BotSdkStore = BotSdkState & BotSdkActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: BotSdkState = {
  installedBots: {},
  installedBotsOrder: [],
  marketplaceBots: {},
  featuredBots: [],
  categories: [],
  selectedBotId: null,
  searchQuery: "",
  categoryFilter: null,
  statusFilter: "all",
  isLoadingInstalled: false,
  isLoadingMarketplace: false,
  isInstalling: null,
  isUninstalling: null,
  error: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useBotSdkStore = create<BotSdkStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // ========================================================================
      // INSTALLED BOTS
      // ========================================================================

      setInstalledBots: (bots) =>
        set(
          (state) => {
            state.installedBots = {};
            state.installedBotsOrder = [];
            for (const bot of bots) {
              state.installedBots[bot.id] = bot;
              state.installedBotsOrder.push(bot.id);
            }
          },
          false,
          "botSdk/setInstalledBots",
        ),

      addInstalledBot: (bot) =>
        set(
          (state) => {
            state.installedBots[bot.id] = bot;
            if (!state.installedBotsOrder.includes(bot.id)) {
              state.installedBotsOrder.push(bot.id);
            }
          },
          false,
          "botSdk/addInstalledBot",
        ),

      removeInstalledBot: (botId) =>
        set(
          (state) => {
            delete state.installedBots[botId];
            state.installedBotsOrder = state.installedBotsOrder.filter(
              (id) => id !== botId,
            );
            if (state.selectedBotId === botId) {
              state.selectedBotId = null;
            }
          },
          false,
          "botSdk/removeInstalledBot",
        ),

      updateInstalledBot: (botId, updates) =>
        set(
          (state) => {
            if (state.installedBots[botId]) {
              state.installedBots[botId] = {
                ...state.installedBots[botId],
                ...updates,
              };
            }
          },
          false,
          "botSdk/updateInstalledBot",
        ),

      // ========================================================================
      // BOT STATUS AND PERMISSIONS
      // ========================================================================

      setBotStatus: (botId, status) =>
        set(
          (state) => {
            if (state.installedBots[botId]) {
              state.installedBots[botId].status = status;
            }
          },
          false,
          "botSdk/setBotStatus",
        ),

      setBotPermissions: (botId, permissions) =>
        set(
          (state) => {
            if (state.installedBots[botId]) {
              state.installedBots[botId].permissions = permissions;
            }
          },
          false,
          "botSdk/setBotPermissions",
        ),

      setBotChannels: (botId, channels) =>
        set(
          (state) => {
            if (state.installedBots[botId]) {
              state.installedBots[botId].channels = channels;
            }
          },
          false,
          "botSdk/setBotChannels",
        ),

      // ========================================================================
      // MARKETPLACE
      // ========================================================================

      setMarketplaceBots: (bots) =>
        set(
          (state) => {
            state.marketplaceBots = {};
            for (const bot of bots) {
              state.marketplaceBots[bot.id] = bot;
            }
          },
          false,
          "botSdk/setMarketplaceBots",
        ),

      setFeaturedBots: (botIds) =>
        set(
          (state) => {
            state.featuredBots = botIds;
          },
          false,
          "botSdk/setFeaturedBots",
        ),

      setCategories: (categories) =>
        set(
          (state) => {
            state.categories = categories;
          },
          false,
          "botSdk/setCategories",
        ),

      // ========================================================================
      // SELECTION
      // ========================================================================

      selectBot: (botId) =>
        set(
          (state) => {
            state.selectedBotId = botId;
          },
          false,
          "botSdk/selectBot",
        ),

      getSelectedBot: () => {
        const state = get();
        if (!state.selectedBotId) return null;
        return (
          state.installedBots[state.selectedBotId] ??
          state.marketplaceBots[state.selectedBotId] ??
          null
        );
      },

      // ========================================================================
      // FILTERING
      // ========================================================================

      setSearchQuery: (query) =>
        set(
          (state) => {
            state.searchQuery = query;
          },
          false,
          "botSdk/setSearchQuery",
        ),

      setCategoryFilter: (category) =>
        set(
          (state) => {
            state.categoryFilter = category;
          },
          false,
          "botSdk/setCategoryFilter",
        ),

      setStatusFilter: (status) =>
        set(
          (state) => {
            state.statusFilter = status;
          },
          false,
          "botSdk/setStatusFilter",
        ),

      clearFilters: () =>
        set(
          (state) => {
            state.searchQuery = "";
            state.categoryFilter = null;
            state.statusFilter = "all";
          },
          false,
          "botSdk/clearFilters",
        ),

      // ========================================================================
      // LOADING STATES
      // ========================================================================

      setLoadingInstalled: (loading) =>
        set(
          (state) => {
            state.isLoadingInstalled = loading;
          },
          false,
          "botSdk/setLoadingInstalled",
        ),

      setLoadingMarketplace: (loading) =>
        set(
          (state) => {
            state.isLoadingMarketplace = loading;
          },
          false,
          "botSdk/setLoadingMarketplace",
        ),

      setInstalling: (botId) =>
        set(
          (state) => {
            state.isInstalling = botId;
          },
          false,
          "botSdk/setInstalling",
        ),

      setUninstalling: (botId) =>
        set(
          (state) => {
            state.isUninstalling = botId;
          },
          false,
          "botSdk/setUninstalling",
        ),

      // ========================================================================
      // ERRORS
      // ========================================================================

      setError: (error) =>
        set(
          (state) => {
            state.error = error;
          },
          false,
          "botSdk/setError",
        ),

      // ========================================================================
      // UTILITY
      // ========================================================================

      reset: () => set(() => initialState, false, "botSdk/reset"),

      isInstalled: (botId) => !!get().installedBots[botId],

      getBot: (botId) => {
        const state = get();
        return state.installedBots[botId] ?? state.marketplaceBots[botId];
      },

      getBotPermissions: (botId) => {
        const bot = get().installedBots[botId];
        return bot?.permissions ?? [];
      },

      hasPermission: (botId, permission) => {
        const permissions = get().getBotPermissions(botId);
        return (
          permissions.includes(permission) || permissions.includes("admin")
        );
      },
    })),
    { name: "bot-sdk-store" },
  ),
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectInstalledBots = (state: BotSdkStore): InstalledBot[] =>
  state.installedBotsOrder.map((id) => state.installedBots[id]).filter(Boolean);

export const selectMarketplaceBots = (state: BotSdkStore): MarketplaceBot[] =>
  Object.values(state.marketplaceBots);

export const selectFeaturedBots = (state: BotSdkStore): MarketplaceBot[] =>
  state.featuredBots.map((id) => state.marketplaceBots[id]).filter(Boolean);

export const selectFilteredInstalledBots = (
  state: BotSdkStore,
): InstalledBot[] => {
  let bots = selectInstalledBots(state);

  // Apply search filter
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    bots = bots.filter(
      (bot) =>
        bot.name.toLowerCase().includes(query) ||
        bot.description?.toLowerCase().includes(query),
    );
  }

  // Apply status filter
  if (state.statusFilter !== "all") {
    bots = bots.filter((bot) => bot.status === state.statusFilter);
  }

  return bots;
};

export const selectFilteredMarketplaceBots = (
  state: BotSdkStore,
): MarketplaceBot[] => {
  let bots = selectMarketplaceBots(state);

  // Apply search filter
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    bots = bots.filter(
      (bot) =>
        bot.name.toLowerCase().includes(query) ||
        bot.description.toLowerCase().includes(query) ||
        bot.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }

  // Apply category filter
  if (state.categoryFilter) {
    bots = bots.filter((bot) => bot.category === state.categoryFilter);
  }

  return bots;
};

export const selectBotsByStatus =
  (status: BotStatus) =>
  (state: BotSdkStore): InstalledBot[] =>
    selectInstalledBots(state).filter((bot) => bot.status === status);

export const selectOnlineBots = (state: BotSdkStore): InstalledBot[] =>
  selectBotsByStatus("online")(state);

export const selectOfflineBots = (state: BotSdkStore): InstalledBot[] =>
  selectBotsByStatus("offline")(state);

export const selectBotsByPermission =
  (permission: BotPermission) =>
  (state: BotSdkStore): InstalledBot[] =>
    selectInstalledBots(state).filter(
      (bot) =>
        bot.permissions.includes(permission) ||
        bot.permissions.includes("admin"),
    );

export const selectBotById =
  (botId: BotId) =>
  (state: BotSdkStore): InstalledBot | MarketplaceBot | undefined =>
    state.installedBots[botId] ?? state.marketplaceBots[botId];

export const selectIsInstalled =
  (botId: BotId) =>
  (state: BotSdkStore): boolean =>
    !!state.installedBots[botId];

export const selectBotCount = (state: BotSdkStore): number =>
  state.installedBotsOrder.length;

export const selectCategories = (state: BotSdkStore): string[] =>
  state.categories;

// ============================================================================
// MOCK DATA HELPERS
// ============================================================================

export const createMockInstalledBot = (
  overrides: Partial<InstalledBot> = {},
): InstalledBot => ({
  id: `bot_${Date.now()}`,
  name: "Test Bot",
  description: "A test bot for development",
  avatar: "https://example.com/avatar.png",
  version: "1.0.0",
  status: "online",
  permissions: ["read_messages", "send_messages"],
  installedAt: new Date(),
  installedBy: "user_1",
  ...overrides,
});

export const createMockMarketplaceBot = (
  overrides: Partial<MarketplaceBot> = {},
): MarketplaceBot => ({
  id: `marketplace_bot_${Date.now()}`,
  name: "Marketplace Bot",
  description: "A bot available in the marketplace",
  longDescription: "A detailed description of the bot features",
  avatar: "https://example.com/avatar.png",
  version: "1.0.0",
  author: "Bot Developer",
  category: "productivity",
  tags: ["automation", "productivity"],
  rating: 4.5,
  ratingCount: 100,
  installCount: 1000,
  permissions: ["read_messages", "send_messages"],
  features: ["Feature 1", "Feature 2"],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
