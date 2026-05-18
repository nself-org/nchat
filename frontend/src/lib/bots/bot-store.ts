import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
  Bot,
  BotInstallation,
  BotPermission,
  BotStatus,
  BotCommand,
  BotReview,
} from "@/graphql/bots";

// ============================================================================
// TYPES
// ============================================================================

export interface BotCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  botsCount: number;
}

export interface BotFilters {
  category?: string;
  search?: string;
  featured?: boolean;
  verified?: boolean;
  sortBy?: "rating" | "installs" | "newest" | "name";
}

export interface BotState {
  // Installed bots
  installedBots: BotInstallation[];
  installedBotsLoading: boolean;
  installedBotsError: string | null;

  // Marketplace bots
  marketplaceBots: Bot[];
  marketplaceLoading: boolean;
  marketplaceError: string | null;
  marketplaceFilters: BotFilters;
  marketplaceTotalCount: number;

  // Featured bots
  featuredBots: Bot[];
  featuredBotsLoading: boolean;

  // Categories
  categories: BotCategory[];
  categoriesLoading: boolean;

  // Selected bot for details/settings
  selectedBot: Bot | null;
  selectedBotCommands: BotCommand[];
  selectedBotReviews: BotReview[];
  selectedBotLoading: boolean;

  // UI state
  addBotModalOpen: boolean;
  settingsModalOpen: boolean;
  marketplaceOpen: boolean;

  // Actions - Installed Bots
  setInstalledBots: (bots: BotInstallation[]) => void;
  addInstalledBot: (installation: BotInstallation) => void;
  removeInstalledBot: (botId: string, channelId?: string) => void;
  updateInstalledBotPermissions: (
    botId: string,
    channelId: string,
    permissions: BotPermission[],
  ) => void;
  setInstalledBotsLoading: (loading: boolean) => void;
  setInstalledBotsError: (error: string | null) => void;

  // Actions - Marketplace
  setMarketplaceBots: (bots: Bot[], totalCount: number) => void;
  appendMarketplaceBots: (bots: Bot[]) => void;
  setMarketplaceFilters: (filters: Partial<BotFilters>) => void;
  clearMarketplaceFilters: () => void;
  setMarketplaceLoading: (loading: boolean) => void;
  setMarketplaceError: (error: string | null) => void;

  // Actions - Featured
  setFeaturedBots: (bots: Bot[]) => void;
  setFeaturedBotsLoading: (loading: boolean) => void;

  // Actions - Categories
  setCategories: (categories: BotCategory[]) => void;
  setCategoriesLoading: (loading: boolean) => void;

  // Actions - Selected Bot
  setSelectedBot: (bot: Bot | null) => void;
  setSelectedBotCommands: (commands: BotCommand[]) => void;
  setSelectedBotReviews: (reviews: BotReview[]) => void;
  setSelectedBotLoading: (loading: boolean) => void;
  clearSelectedBot: () => void;

  // Actions - UI
  openAddBotModal: () => void;
  closeAddBotModal: () => void;
  openSettingsModal: (bot: Bot) => void;
  closeSettingsModal: () => void;
  openMarketplace: () => void;
  closeMarketplace: () => void;

  // Actions - Utility
  getBotById: (botId: string) => Bot | BotInstallation | undefined;
  getInstalledBotsByChannel: (channelId: string) => BotInstallation[];
  isBotInstalled: (botId: string, channelId?: string) => boolean;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  // Installed bots
  installedBots: [],
  installedBotsLoading: false,
  installedBotsError: null,

  // Marketplace bots
  marketplaceBots: [],
  marketplaceLoading: false,
  marketplaceError: null,
  marketplaceFilters: {},
  marketplaceTotalCount: 0,

  // Featured bots
  featuredBots: [],
  featuredBotsLoading: false,

  // Categories
  categories: [],
  categoriesLoading: false,

  // Selected bot
  selectedBot: null,
  selectedBotCommands: [],
  selectedBotReviews: [],
  selectedBotLoading: false,

  // UI state
  addBotModalOpen: false,
  settingsModalOpen: false,
  marketplaceOpen: false,
};

// ============================================================================
// STORE
// ============================================================================

export const useBotStore = create<BotState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ====================================================================
        // INSTALLED BOTS ACTIONS
        // ====================================================================

        setInstalledBots: (bots) =>
          set({ installedBots: bots }, false, "setInstalledBots"),

        addInstalledBot: (installation) =>
          set(
            (state) => ({
              installedBots: [
                installation,
                ...state.installedBots.filter(
                  (i) =>
                    !(
                      i.botId === installation.botId &&
                      i.channelId === installation.channelId
                    ),
                ),
              ],
            }),
            false,
            "addInstalledBot",
          ),

        removeInstalledBot: (botId, channelId) =>
          set(
            (state) => ({
              installedBots: state.installedBots.filter((i) => {
                if (channelId) {
                  return !(i.botId === botId && i.channelId === channelId);
                }
                return i.botId !== botId;
              }),
            }),
            false,
            "removeInstalledBot",
          ),

        updateInstalledBotPermissions: (botId, channelId, permissions) =>
          set(
            (state) => ({
              installedBots: state.installedBots.map((i) =>
                i.botId === botId && i.channelId === channelId
                  ? { ...i, permissions }
                  : i,
              ),
            }),
            false,
            "updateInstalledBotPermissions",
          ),

        setInstalledBotsLoading: (loading) =>
          set(
            { installedBotsLoading: loading },
            false,
            "setInstalledBotsLoading",
          ),

        setInstalledBotsError: (error) =>
          set({ installedBotsError: error }, false, "setInstalledBotsError"),

        // ====================================================================
        // MARKETPLACE ACTIONS
        // ====================================================================

        setMarketplaceBots: (bots, totalCount) =>
          set(
            { marketplaceBots: bots, marketplaceTotalCount: totalCount },
            false,
            "setMarketplaceBots",
          ),

        appendMarketplaceBots: (bots) =>
          set(
            (state) => ({
              marketplaceBots: [...state.marketplaceBots, ...bots],
            }),
            false,
            "appendMarketplaceBots",
          ),

        setMarketplaceFilters: (filters) =>
          set(
            (state) => ({
              marketplaceFilters: { ...state.marketplaceFilters, ...filters },
            }),
            false,
            "setMarketplaceFilters",
          ),

        clearMarketplaceFilters: () =>
          set({ marketplaceFilters: {} }, false, "clearMarketplaceFilters"),

        setMarketplaceLoading: (loading) =>
          set({ marketplaceLoading: loading }, false, "setMarketplaceLoading"),

        setMarketplaceError: (error) =>
          set({ marketplaceError: error }, false, "setMarketplaceError"),

        // ====================================================================
        // FEATURED BOTS ACTIONS
        // ====================================================================

        setFeaturedBots: (bots) =>
          set({ featuredBots: bots }, false, "setFeaturedBots"),

        setFeaturedBotsLoading: (loading) =>
          set(
            { featuredBotsLoading: loading },
            false,
            "setFeaturedBotsLoading",
          ),

        // ====================================================================
        // CATEGORIES ACTIONS
        // ====================================================================

        setCategories: (categories) =>
          set({ categories }, false, "setCategories"),

        setCategoriesLoading: (loading) =>
          set({ categoriesLoading: loading }, false, "setCategoriesLoading"),

        // ====================================================================
        // SELECTED BOT ACTIONS
        // ====================================================================

        setSelectedBot: (bot) =>
          set({ selectedBot: bot }, false, "setSelectedBot"),

        setSelectedBotCommands: (commands) =>
          set(
            { selectedBotCommands: commands },
            false,
            "setSelectedBotCommands",
          ),

        setSelectedBotReviews: (reviews) =>
          set({ selectedBotReviews: reviews }, false, "setSelectedBotReviews"),

        setSelectedBotLoading: (loading) =>
          set({ selectedBotLoading: loading }, false, "setSelectedBotLoading"),

        clearSelectedBot: () =>
          set(
            {
              selectedBot: null,
              selectedBotCommands: [],
              selectedBotReviews: [],
            },
            false,
            "clearSelectedBot",
          ),

        // ====================================================================
        // UI ACTIONS
        // ====================================================================

        openAddBotModal: () =>
          set({ addBotModalOpen: true }, false, "openAddBotModal"),

        closeAddBotModal: () =>
          set({ addBotModalOpen: false }, false, "closeAddBotModal"),

        openSettingsModal: (bot) =>
          set(
            { settingsModalOpen: true, selectedBot: bot },
            false,
            "openSettingsModal",
          ),

        closeSettingsModal: () =>
          set(
            {
              settingsModalOpen: false,
              selectedBot: null,
              selectedBotCommands: [],
              selectedBotReviews: [],
            },
            false,
            "closeSettingsModal",
          ),

        openMarketplace: () =>
          set({ marketplaceOpen: true }, false, "openMarketplace"),

        closeMarketplace: () =>
          set({ marketplaceOpen: false }, false, "closeMarketplace"),

        // ====================================================================
        // UTILITY ACTIONS
        // ====================================================================

        getBotById: (botId) => {
          const state = get();
          // Check installed bots first
          const installed = state.installedBots.find((i) => i.botId === botId);
          if (installed) return installed;

          // Check marketplace bots
          const marketplace = state.marketplaceBots.find((b) => b.id === botId);
          if (marketplace) return marketplace;

          // Check featured bots
          const featured = state.featuredBots.find((b) => b.id === botId);
          if (featured) return featured;

          return undefined;
        },

        getInstalledBotsByChannel: (channelId) => {
          const state = get();
          return state.installedBots.filter((i) => i.channelId === channelId);
        },

        isBotInstalled: (botId, channelId) => {
          const state = get();
          if (channelId) {
            return state.installedBots.some(
              (i) => i.botId === botId && i.channelId === channelId,
            );
          }
          return state.installedBots.some((i) => i.botId === botId);
        },

        reset: () => set(initialState, false, "reset"),
      }),
      {
        name: "nchat-bots-store",
        partialize: (state) => ({
          // Only persist certain state
          marketplaceFilters: state.marketplaceFilters,
        }),
      },
    ),
    {
      name: "BotStore",
    },
  ),
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectInstalledBots = (state: BotState) => state.installedBots;
export const selectInstalledBotsLoading = (state: BotState) =>
  state.installedBotsLoading;
export const selectMarketplaceBots = (state: BotState) => state.marketplaceBots;
export const selectMarketplaceLoading = (state: BotState) =>
  state.marketplaceLoading;
export const selectFeaturedBots = (state: BotState) => state.featuredBots;
export const selectCategories = (state: BotState) => state.categories;
export const selectSelectedBot = (state: BotState) => state.selectedBot;
export const selectAddBotModalOpen = (state: BotState) => state.addBotModalOpen;
export const selectSettingsModalOpen = (state: BotState) =>
  state.settingsModalOpen;
export const selectMarketplaceOpen = (state: BotState) => state.marketplaceOpen;

// ============================================================================
// MOCK DATA (for development)
// ============================================================================

export const mockBots: Bot[] = [
  {
    id: "bot-1",
    name: "GitHub Bot",
    description:
      "Get notifications about GitHub events, create issues, and manage pull requests directly from chat.",
    avatarUrl: "/bots/github.png",
    status: "active",
    permissions: [
      "read_messages",
      "send_messages",
      "use_slash_commands",
      "send_notifications",
    ],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
    ownerId: "owner-1",
    installCount: 15420,
    rating: 4.8,
    reviewsCount: 342,
    category: "productivity",
    website: "https://github.com",
    featured: true,
    verified: true,
  },
  {
    id: "bot-2",
    name: "Jira Bot",
    description:
      "Track and manage Jira issues, create tickets, and get project updates without leaving chat.",
    avatarUrl: "/bots/jira.png",
    status: "active",
    permissions: [
      "read_messages",
      "send_messages",
      "use_slash_commands",
      "send_notifications",
    ],
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
    ownerId: "owner-2",
    installCount: 8930,
    rating: 4.5,
    reviewsCount: 189,
    category: "productivity",
    website: "https://atlassian.com/jira",
    featured: true,
    verified: true,
  },
  {
    id: "bot-3",
    name: "Poll Bot",
    description:
      "Create polls and surveys to gather feedback from your team quickly and easily.",
    avatarUrl: "/bots/poll.png",
    status: "active",
    permissions: ["read_messages", "send_messages", "use_slash_commands"],
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-18T00:00:00Z",
    ownerId: "owner-3",
    installCount: 12500,
    rating: 4.7,
    reviewsCount: 567,
    category: "utilities",
    featured: false,
    verified: true,
  },
  {
    id: "bot-4",
    name: "Welcome Bot",
    description:
      "Automatically greet new members with customizable welcome messages and onboarding flows.",
    avatarUrl: "/bots/welcome.png",
    status: "active",
    permissions: [
      "read_messages",
      "send_messages",
      "access_user_data",
      "send_notifications",
    ],
    createdAt: "2024-01-08T00:00:00Z",
    updatedAt: "2024-01-22T00:00:00Z",
    ownerId: "owner-4",
    installCount: 9870,
    rating: 4.6,
    reviewsCount: 234,
    category: "moderation",
    featured: true,
    verified: true,
  },
  {
    id: "bot-5",
    name: "Reminder Bot",
    description:
      "Set personal and team reminders. Never miss an important deadline or meeting again.",
    avatarUrl: "/bots/reminder.png",
    status: "active",
    permissions: [
      "read_messages",
      "send_messages",
      "use_slash_commands",
      "send_notifications",
    ],
    createdAt: "2024-01-12T00:00:00Z",
    updatedAt: "2024-01-25T00:00:00Z",
    ownerId: "owner-5",
    installCount: 7650,
    rating: 4.4,
    reviewsCount: 178,
    category: "utilities",
    featured: false,
    verified: false,
  },
  {
    id: "bot-6",
    name: "Analytics Bot",
    description:
      "Get insights about your workspace activity, message trends, and team engagement.",
    avatarUrl: "/bots/analytics.png",
    status: "active",
    permissions: [
      "read_messages",
      "send_messages",
      "access_user_data",
      "use_slash_commands",
    ],
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-28T00:00:00Z",
    ownerId: "owner-6",
    installCount: 4320,
    rating: 4.2,
    reviewsCount: 89,
    category: "analytics",
    featured: false,
    verified: true,
  },
];

export const mockCategories: BotCategory[] = [
  {
    id: "cat-1",
    name: "Productivity",
    slug: "productivity",
    description: "Bots that help you work more efficiently",
    icon: "Zap",
    botsCount: 45,
  },
  {
    id: "cat-2",
    name: "Developer Tools",
    slug: "developer-tools",
    description: "Integrations with development platforms",
    icon: "Code",
    botsCount: 32,
  },
  {
    id: "cat-3",
    name: "Utilities",
    slug: "utilities",
    description: "Helpful utility bots for everyday tasks",
    icon: "Wrench",
    botsCount: 28,
  },
  {
    id: "cat-4",
    name: "Moderation",
    slug: "moderation",
    description: "Bots for managing and moderating channels",
    icon: "Shield",
    botsCount: 15,
  },
  {
    id: "cat-5",
    name: "Analytics",
    slug: "analytics",
    description: "Track metrics and gain insights",
    icon: "BarChart",
    botsCount: 12,
  },
  {
    id: "cat-6",
    name: "Fun & Games",
    slug: "fun-games",
    description: "Entertainment and team bonding bots",
    icon: "Gamepad",
    botsCount: 20,
  },
];
