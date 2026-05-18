"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import {
  useBotStore,
  mockBots,
  mockCategories,
  type BotCategory,
} from "./bot-store";
import {
  GET_INSTALLED_BOTS,
  GET_MARKETPLACE_BOTS,
  GET_BOT,
  GET_FEATURED_BOTS,
  GET_BOT_CATEGORIES,
  GET_BOT_COMMANDS,
  GET_BOT_REVIEWS,
  INSTALL_BOT,
  REMOVE_BOT,
  UPDATE_BOT_SETTINGS,
  ADD_BOT_BY_TOKEN,
  BOT_INSTALLATIONS_SUBSCRIPTION,
  type Bot,
  type BotInstallation,
  type BotPermission,
  type BotCommand,
  type BotReview,
} from "@/graphql/bots";
import { useFeature } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";

// ============================================================================
// TYPES
// ============================================================================

export interface UseBotsOptions {
  channelId?: string;
  workspaceId?: string;
  autoFetch?: boolean;
  useMockData?: boolean;
}

export interface UseBotsResult {
  // Data
  installedBots: BotInstallation[];
  marketplaceBots: Bot[];
  featuredBots: Bot[];
  categories: BotCategory[];
  selectedBot: Bot | null;

  // Loading states
  isLoading: boolean;
  isInstalledLoading: boolean;
  isMarketplaceLoading: boolean;

  // Error states
  error: string | null;

  // Actions
  installBot: (
    botId: string,
    channelIds: string[],
    permissions: BotPermission[],
  ) => Promise<void>;
  removeBot: (botId: string, channelId?: string) => Promise<void>;
  updateBotSettings: (
    botId: string,
    channelId: string,
    permissions: BotPermission[],
  ) => Promise<void>;
  addBotByToken: (token: string, channelIds: string[]) => Promise<void>;

  // Marketplace actions
  searchBots: (query: string) => void;
  filterByCategory: (category: string | undefined) => void;
  loadMoreBots: () => void;

  // Bot details
  selectBot: (bot: Bot | null) => void;
  fetchBotDetails: (botId: string) => Promise<void>;

  // UI actions
  openAddBotModal: () => void;
  closeAddBotModal: () => void;
  openSettingsModal: (bot: Bot) => void;
  closeSettingsModal: () => void;
  openMarketplace: () => void;
  closeMarketplace: () => void;

  // Utilities
  isBotInstalled: (botId: string, channelId?: string) => boolean;
  getBotById: (botId: string) => Bot | BotInstallation | undefined;
  getInstalledBotsByChannel: (channelId: string) => BotInstallation[];
  refreshBots: () => void;

  // Feature flag
  botsEnabled: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useBots(options: UseBotsOptions = {}): UseBotsResult {
  const {
    channelId,
    workspaceId,
    autoFetch = true,
    useMockData = process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true",
  } = options;

  // Feature flag check
  const { enabled: botsEnabled } = useFeature(FEATURES.BOTS);

  // Store
  const store = useBotStore();

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Fetch installed bots
  const {
    data: installedData,
    loading: installedLoading,
    error: installedError,
    refetch: refetchInstalled,
  } = useQuery(GET_INSTALLED_BOTS, {
    variables: { workspaceId, channelId },
    skip: !autoFetch || useMockData || !botsEnabled,
    onCompleted: (data) => {
      const installations = data?.nchat_bot_installations?.map(
        transformInstallation,
      );
      if (installations) {
        store.setInstalledBots(installations);
      }
    },
    onError: (error) => {
      store.setInstalledBotsError(error.message);
    },
  });

  // Fetch marketplace bots
  const {
    data: marketplaceData,
    loading: marketplaceLoading,
    error: marketplaceError,
    refetch: refetchMarketplace,
    fetchMore: fetchMoreMarketplace,
  } = useQuery(GET_MARKETPLACE_BOTS, {
    variables: {
      category: store.marketplaceFilters.category,
      search: store.marketplaceFilters.search
        ? `%${store.marketplaceFilters.search}%`
        : undefined,
      featured: store.marketplaceFilters.featured,
      limit: 20,
      offset: 0,
    },
    skip: !autoFetch || useMockData || !botsEnabled,
    onCompleted: (data) => {
      const bots = data?.nchat_bots?.map(transformBot);
      const count = data?.nchat_bots_aggregate?.aggregate?.count ?? 0;
      if (bots) {
        store.setMarketplaceBots(bots, count);
      }
    },
    onError: (error) => {
      store.setMarketplaceError(error.message);
    },
  });

  // Fetch featured bots
  const { data: featuredData, loading: featuredLoading } = useQuery(
    GET_FEATURED_BOTS,
    {
      variables: { limit: 6 },
      skip: !autoFetch || useMockData || !botsEnabled,
      onCompleted: (data) => {
        const bots = data?.nchat_bots?.map(transformBot);
        if (bots) {
          store.setFeaturedBots(bots);
        }
      },
    },
  );

  // Fetch categories
  const { data: categoriesData, loading: categoriesLoading } = useQuery(
    GET_BOT_CATEGORIES,
    {
      skip: !autoFetch || useMockData || !botsEnabled,
      onCompleted: (data) => {
        const categories = data?.nchat_bot_categories?.map(transformCategory);
        if (categories) {
          store.setCategories(categories);
        }
      },
    },
  );

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const [installBotMutation, { loading: installLoading }] = useMutation(
    INSTALL_BOT,
    {
      onCompleted: (data) => {
        const installations = data?.insert_nchat_bot_installations?.returning;
        if (installations) {
          for (const installation of installations) {
            store.addInstalledBot(transformInstallation(installation));
          }
        }
      },
    },
  );

  const [removeBotMutation, { loading: removeLoading }] = useMutation(
    REMOVE_BOT,
    {
      onCompleted: (data, options) => {
        const variables = options?.variables;
        if (variables) {
          store.removeInstalledBot(variables.botId, variables.channelId);
        }
      },
    },
  );

  const [updateSettingsMutation, { loading: updateLoading }] = useMutation(
    UPDATE_BOT_SETTINGS,
    {
      onCompleted: (data) => {
        const installations = data?.update_nchat_bot_installations?.returning;
        if (installations?.[0]) {
          const installation = transformInstallation(installations[0]);
          store.updateInstalledBotPermissions(
            installation.botId,
            installation.channelId,
            installation.permissions,
          );
        }
      },
    },
  );

  const [addByTokenMutation, { loading: addByTokenLoading }] = useMutation(
    ADD_BOT_BY_TOKEN,
    {
      onCompleted: (data) => {
        const result = data?.add_bot_by_token;
        if (result?.success && result.installations) {
          for (const installation of result.installations) {
            store.addInstalledBot(transformInstallation(installation));
          }
        }
      },
    },
  );

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  useSubscription(BOT_INSTALLATIONS_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId || useMockData || !botsEnabled,
    onData: ({ data }) => {
      const installations = data?.data?.nchat_bot_installations?.map(
        transformInstallation,
      );
      if (installations && channelId) {
        // Update only installations for this channel
        const currentBots = store.installedBots.filter(
          (i) => i.channelId !== channelId,
        );
        store.setInstalledBots([...currentBots, ...installations]);
      }
    },
  });

  // ============================================================================
  // EFFECTS - Load mock data in dev mode
  // ============================================================================

  useEffect(() => {
    if (useMockData && botsEnabled) {
      // Simulate loading
      store.setInstalledBotsLoading(true);
      store.setMarketplaceLoading(true);
      store.setFeaturedBotsLoading(true);

      // Load mock data after a small delay to simulate network
      const timer = setTimeout(() => {
        store.setInstalledBots(
          mockBots.slice(0, 3).map((bot, index) => ({
            id: `install-${index}`,
            botId: bot.id,
            channelId: channelId || "default-channel",
            installedBy: "owner-1",
            installedAt: new Date().toISOString(),
            permissions: bot.permissions,
            bot,
          })),
        );
        store.setMarketplaceBots(mockBots, mockBots.length);
        store.setFeaturedBots(mockBots.filter((b) => b.featured));
        store.setCategories(mockCategories);
        store.setInstalledBotsLoading(false);
        store.setMarketplaceLoading(false);
        store.setFeaturedBotsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [useMockData, botsEnabled, channelId]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const installBot = useCallback(
    async (
      botId: string,
      channelIds: string[],
      permissions: BotPermission[],
    ) => {
      if (useMockData) {
        // Mock installation
        const bot = mockBots.find((b) => b.id === botId);
        if (bot) {
          for (const chId of channelIds) {
            store.addInstalledBot({
              id: `install-${Date.now()}-${chId}`,
              botId,
              channelId: chId,
              installedBy: "current-user",
              installedAt: new Date().toISOString(),
              permissions,
              bot,
            });
          }
        }
        return;
      }

      await installBotMutation({
        variables: {
          botId,
          channelIds,
          permissions,
        },
      });
    },
    [useMockData, installBotMutation],
  );

  const removeBot = useCallback(
    async (botId: string, chId?: string) => {
      if (useMockData) {
        store.removeInstalledBot(botId, chId);
        return;
      }

      await removeBotMutation({
        variables: {
          botId,
          channelId: chId,
        },
      });
    },
    [useMockData, removeBotMutation],
  );

  const updateBotSettings = useCallback(
    async (botId: string, chId: string, permissions: BotPermission[]) => {
      if (useMockData) {
        store.updateInstalledBotPermissions(botId, chId, permissions);
        return;
      }

      await updateSettingsMutation({
        variables: {
          botId,
          channelId: chId,
          permissions,
        },
      });
    },
    [useMockData, updateSettingsMutation],
  );

  const addBotByToken = useCallback(
    async (token: string, channelIds: string[]) => {
      if (useMockData) {
        // Mock - just pick a random bot
        const bot = mockBots[Math.floor(Math.random() * mockBots.length)];
        for (const chId of channelIds) {
          store.addInstalledBot({
            id: `install-${Date.now()}-${chId}`,
            botId: bot.id,
            channelId: chId,
            installedBy: "current-user",
            installedAt: new Date().toISOString(),
            permissions: bot.permissions,
            bot,
          });
        }
        return;
      }

      await addByTokenMutation({
        variables: {
          token,
          channelIds,
        },
      });
    },
    [useMockData, addByTokenMutation],
  );

  const searchBots = useCallback(
    (query: string) => {
      store.setMarketplaceFilters({ search: query || undefined });
      if (!useMockData) {
        refetchMarketplace?.();
      } else {
        // Filter mock data
        const filtered = query
          ? mockBots.filter(
              (b) =>
                b.name.toLowerCase().includes(query.toLowerCase()) ||
                b.description.toLowerCase().includes(query.toLowerCase()),
            )
          : mockBots;
        store.setMarketplaceBots(filtered, filtered.length);
      }
    },
    [useMockData, refetchMarketplace],
  );

  const filterByCategory = useCallback(
    (category: string | undefined) => {
      store.setMarketplaceFilters({ category });
      if (!useMockData) {
        refetchMarketplace?.();
      } else {
        const filtered = category
          ? mockBots.filter((b) => b.category === category)
          : mockBots;
        store.setMarketplaceBots(filtered, filtered.length);
      }
    },
    [useMockData, refetchMarketplace],
  );

  const loadMoreBots = useCallback(() => {
    if (!useMockData && fetchMoreMarketplace) {
      const currentCount = store.marketplaceBots.length;
      fetchMoreMarketplace({
        variables: {
          offset: currentCount,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          const newBots = fetchMoreResult.nchat_bots?.map(transformBot) ?? [];
          store.appendMarketplaceBots(newBots);
          return {
            ...prev,
            nchat_bots: [
              ...(prev.nchat_bots ?? []),
              ...fetchMoreResult.nchat_bots,
            ],
          };
        },
      });
    }
  }, [useMockData, fetchMoreMarketplace]);

  const selectBot = useCallback((bot: Bot | null) => {
    store.setSelectedBot(bot);
  }, []);

  const fetchBotDetails = useCallback(async (botId: string) => {
    store.setSelectedBotLoading(true);
    // In a real implementation, this would fetch from GraphQL
    // For now, find in mock data
    const bot = mockBots.find((b) => b.id === botId);
    if (bot) {
      store.setSelectedBot(bot);
    }
    store.setSelectedBotLoading(false);
  }, []);

  const refreshBots = useCallback(() => {
    if (!useMockData) {
      refetchInstalled?.();
      refetchMarketplace?.();
    }
  }, [useMockData, refetchInstalled, refetchMarketplace]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isLoading = useMemo(
    () =>
      store.installedBotsLoading ||
      store.marketplaceLoading ||
      installedLoading ||
      marketplaceLoading ||
      installLoading ||
      removeLoading ||
      updateLoading ||
      addByTokenLoading,
    [
      store.installedBotsLoading,
      store.marketplaceLoading,
      installedLoading,
      marketplaceLoading,
      installLoading,
      removeLoading,
      updateLoading,
      addByTokenLoading,
    ],
  );

  const error = useMemo(
    () =>
      store.installedBotsError ||
      store.marketplaceError ||
      installedError?.message ||
      marketplaceError?.message ||
      null,
    [
      store.installedBotsError,
      store.marketplaceError,
      installedError,
      marketplaceError,
    ],
  );

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    installedBots: store.installedBots,
    marketplaceBots: store.marketplaceBots,
    featuredBots: store.featuredBots,
    categories: store.categories,
    selectedBot: store.selectedBot,

    // Loading states
    isLoading,
    isInstalledLoading: store.installedBotsLoading || installedLoading,
    isMarketplaceLoading: store.marketplaceLoading || marketplaceLoading,

    // Error states
    error,

    // Actions
    installBot,
    removeBot,
    updateBotSettings,
    addBotByToken,

    // Marketplace actions
    searchBots,
    filterByCategory,
    loadMoreBots,

    // Bot details
    selectBot,
    fetchBotDetails,

    // UI actions
    openAddBotModal: store.openAddBotModal,
    closeAddBotModal: store.closeAddBotModal,
    openSettingsModal: store.openSettingsModal,
    closeSettingsModal: store.closeSettingsModal,
    openMarketplace: store.openMarketplace,
    closeMarketplace: store.closeMarketplace,

    // Utilities
    isBotInstalled: store.isBotInstalled,
    getBotById: store.getBotById,
    getInstalledBotsByChannel: store.getInstalledBotsByChannel,
    refreshBots,

    // Feature flag
    botsEnabled,
  };
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

function transformBot(data: Record<string, unknown>): Bot {
  return {
    id: data.id as string,
    name: data.name as string,
    description: data.description as string,
    avatarUrl: data.avatar_url as string | undefined,
    status: data.status as Bot["status"],
    permissions: data.permissions as BotPermission[],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    ownerId: data.owner_id as string,
    owner: data.owner
      ? {
          id: (data.owner as Record<string, unknown>).id as string,
          displayName: (data.owner as Record<string, unknown>)
            .display_name as string,
          avatarUrl: (data.owner as Record<string, unknown>).avatar_url as
            | string
            | undefined,
        }
      : undefined,
    installCount: data.install_count as number | undefined,
    rating: data.rating as number | undefined,
    reviewsCount: data.reviews_count as number | undefined,
    category: data.category as string | undefined,
    website: data.website as string | undefined,
    supportUrl: data.support_url as string | undefined,
    privacyPolicyUrl: data.privacy_policy_url as string | undefined,
    featured: data.featured as boolean | undefined,
    verified: data.verified as boolean | undefined,
  };
}

function transformInstallation(data: Record<string, unknown>): BotInstallation {
  return {
    id: data.id as string,
    botId: data.bot_id as string,
    channelId: data.channel_id as string,
    installedBy: data.installed_by as string,
    installedAt: data.installed_at as string,
    permissions: data.permissions as BotPermission[],
    bot: data.bot
      ? transformBot(data.bot as Record<string, unknown>)
      : undefined,
    channel: data.channel
      ? {
          id: (data.channel as Record<string, unknown>).id as string,
          name: (data.channel as Record<string, unknown>).name as string,
          slug: (data.channel as Record<string, unknown>).slug as string,
        }
      : undefined,
  };
}

function transformCategory(data: Record<string, unknown>): BotCategory {
  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    description: data.description as string | undefined,
    icon: data.icon as string | undefined,
    botsCount:
      ((
        (data.bots_count as Record<string, unknown>)?.aggregate as Record<
          string,
          unknown
        >
      )?.count as number) ?? 0,
  };
}

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

/**
 * Hook to get a single bot's details
 */
export function useBot(botId: string | null) {
  const store = useBotStore();
  const useMockData = process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true";

  const { data, loading, error, refetch } = useQuery(GET_BOT, {
    variables: { id: botId },
    skip: !botId || useMockData,
    onCompleted: (data) => {
      const bot = data?.nchat_bots_by_pk
        ? transformBot(data.nchat_bots_by_pk)
        : null;
      store.setSelectedBot(bot);
    },
  });

  useEffect(() => {
    if (useMockData && botId) {
      const bot = mockBots.find((b) => b.id === botId);
      store.setSelectedBot(bot || null);
    }
  }, [botId, useMockData]);

  return {
    bot: store.selectedBot,
    loading: loading || store.selectedBotLoading,
    error: error?.message,
    refetch,
  };
}

/**
 * Hook to get bot commands
 */
export function useBotCommands(botId: string | null) {
  const store = useBotStore();
  const useMockData = process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true";

  const { data, loading, error } = useQuery(GET_BOT_COMMANDS, {
    variables: { botId },
    skip: !botId || useMockData,
    onCompleted: (data) => {
      const commands =
        data?.nchat_bot_commands?.map(
          (cmd: Record<string, unknown>): BotCommand => ({
            id: cmd.id as string,
            botId: cmd.bot_id as string,
            name: cmd.name as string,
            description: cmd.description as string,
            usage: cmd.usage as string,
            examples: cmd.examples as string[] | undefined,
          }),
        ) ?? [];
      store.setSelectedBotCommands(commands);
    },
  });

  useEffect(() => {
    if (useMockData && botId) {
      // Mock commands
      store.setSelectedBotCommands([
        {
          id: "cmd-1",
          botId,
          name: "/help",
          description: "Show available commands",
          usage: "/help [command]",
          examples: ["/help", "/help create"],
        },
        {
          id: "cmd-2",
          botId,
          name: "/create",
          description: "Create a new item",
          usage: "/create <type> <name>",
          examples: ['/create issue "Bug report"', '/create task "Review PR"'],
        },
      ]);
    }
  }, [botId, useMockData]);

  return {
    commands: store.selectedBotCommands,
    loading,
    error: error?.message,
  };
}

/**
 * Hook to get bot reviews
 */
export function useBotReviews(botId: string | null) {
  const store = useBotStore();
  const useMockData = process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true";

  const { data, loading, error, fetchMore } = useQuery(GET_BOT_REVIEWS, {
    variables: { botId, limit: 10, offset: 0 },
    skip: !botId || useMockData,
    onCompleted: (data) => {
      const reviews =
        data?.nchat_bot_reviews?.map(
          (rev: Record<string, unknown>): BotReview => ({
            id: rev.id as string,
            botId: rev.bot_id as string,
            userId: rev.user_id as string,
            rating: rev.rating as number,
            comment: rev.comment as string | undefined,
            createdAt: rev.created_at as string,
            user: rev.user
              ? {
                  id: (rev.user as Record<string, unknown>).id as string,
                  displayName: (rev.user as Record<string, unknown>)
                    .display_name as string,
                  avatarUrl: (rev.user as Record<string, unknown>)
                    .avatar_url as string | undefined,
                }
              : undefined,
          }),
        ) ?? [];
      store.setSelectedBotReviews(reviews);
    },
  });

  useEffect(() => {
    if (useMockData && botId) {
      // Mock reviews
      store.setSelectedBotReviews([
        {
          id: "review-1",
          botId,
          userId: "user-1",
          rating: 5,
          comment: "Great bot! Really helps with our workflow.",
          createdAt: "2024-01-20T00:00:00Z",
          user: {
            id: "user-1",
            displayName: "Alice Johnson",
            avatarUrl: undefined,
          },
        },
        {
          id: "review-2",
          botId,
          userId: "user-2",
          rating: 4,
          comment: "Very useful, would recommend.",
          createdAt: "2024-01-18T00:00:00Z",
          user: {
            id: "user-2",
            displayName: "Bob Smith",
            avatarUrl: undefined,
          },
        },
      ]);
    }
  }, [botId, useMockData]);

  return {
    reviews: store.selectedBotReviews,
    loading,
    error: error?.message,
    loadMore: () => {
      if (fetchMore) {
        fetchMore({
          variables: {
            offset: store.selectedBotReviews.length,
          },
        });
      }
    },
  };
}
