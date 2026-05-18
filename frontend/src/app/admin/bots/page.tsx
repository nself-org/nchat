"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Store, RefreshCw, Bot as BotIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BotList, BotListCards } from "@/components/bots/bot-list";
import { AddBotModal } from "@/components/bots/add-bot-modal";
import { BotSettingsModal } from "@/components/bots/bot-settings-modal";
import {
  BotMarketplace,
  BotMarketplaceInline,
} from "@/components/bots/bot-marketplace";
import { BotProfile } from "@/components/bots/bot-profile";
import { useBots, useBotCommands, useBotReviews } from "@/lib/bots/use-bots";
import { useBotStore } from "@/lib/bots/bot-store";
import { useFeature } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";
import type { Bot, BotPermission } from "@/graphql/bots";

// Mock channels for demo purposes
const mockChannels = [
  { id: "ch-1", name: "general" },
  { id: "ch-2", name: "random" },
  { id: "ch-3", name: "engineering" },
  { id: "ch-4", name: "design" },
  { id: "ch-5", name: "product" },
];

type ViewMode = "list" | "marketplace" | "profile";

export default function BotsManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { enabled: botsEnabled } = useFeature(FEATURES.BOTS);

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [listStyle, setListStyle] = useState<"table" | "cards">("table");
  const [selectedBotForProfile, setSelectedBotForProfile] =
    useState<Bot | null>(null);

  // Bots hook
  const {
    installedBots,
    marketplaceBots,
    featuredBots,
    categories,
    isLoading,
    isInstalledLoading,
    isMarketplaceLoading,
    error,
    installBot,
    removeBot,
    updateBotSettings,
    addBotByToken,
    searchBots,
    filterByCategory,
    loadMoreBots,
    refreshBots,
  } = useBots({
    autoFetch: true,
    useMockData: process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true",
  });

  // Store for UI state
  const store = useBotStore();

  // Bot details hooks
  const { commands, loading: commandsLoading } = useBotCommands(
    selectedBotForProfile?.id || null,
  );
  const {
    reviews,
    loading: reviewsLoading,
    loadMore: loadMoreReviews,
  } = useBotReviews(selectedBotForProfile?.id || null);

  // Get installations for selected bot
  const selectedBotInstallations = selectedBotForProfile
    ? installedBots.filter((i) => i.botId === selectedBotForProfile.id)
    : [];

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || !["owner", "admin"].includes(user.role))) {
      router.push("/chat");
    }
  }, [user, authLoading, router]);

  // Handlers
  const handleConfigureBot = useCallback((bot: Bot) => {
    store.openSettingsModal(bot);
  }, []);

  const handleRemoveBot = useCallback(
    async (botId: string, channelId?: string) => {
      await removeBot(botId, channelId);
    },
    [removeBot],
  );

  const handleViewBotDetails = useCallback((bot: Bot) => {
    setSelectedBotForProfile(bot);
    setViewMode("profile");
  }, []);

  const handleInstallBot = useCallback((bot: Bot) => {
    setSelectedBotForProfile(bot);
    store.openAddBotModal();
  }, []);

  const handleInstallFromModal = useCallback(
    async (
      botId: string,
      channelIds: string[],
      permissions: BotPermission[],
    ) => {
      await installBot(botId, channelIds, permissions);
      store.closeAddBotModal();
    },
    [installBot],
  );

  const handleAddByToken = useCallback(
    async (token: string, channelIds: string[]) => {
      await addBotByToken(token, channelIds);
      store.closeAddBotModal();
    },
    [addBotByToken],
  );

  const handleUpdatePermissions = useCallback(
    async (botId: string, channelId: string, permissions: BotPermission[]) => {
      await updateBotSettings(botId, channelId, permissions);
    },
    [updateBotSettings],
  );

  const handleBackFromProfile = useCallback(() => {
    setSelectedBotForProfile(null);
    setViewMode("list");
  }, []);

  // Loading / auth state
  if (authLoading || !user || !["owner", "admin"].includes(user.role)) {
    return null;
  }

  // Bundle upsell — bots plugin not installed
  if (!botsEnabled) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 rounded-full bg-muted p-4">
            <BotIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">
            Bots require the nChat bundle
          </h2>
          <p className="mb-6 max-w-md text-center text-muted-foreground">
            The bots plugin — programmable bot accounts and slash-command
            runtime — is part of the nChat bundle ($0.99/mo). Install it to
            create and manage bots for this workspace.
          </p>
          <div className="flex flex-col items-center gap-3">
            <a
              href="https://nself.org/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get nChat Bundle
              <Plus className="h-4 w-4" />
            </a>
            <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              nself plugin install bots &amp;&amp; nself build &amp;&amp; nself
              start
            </code>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bots</h1>
            <p className="text-muted-foreground">
              Manage bot integrations for your workspace
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshBots}
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("marketplace")}
            >
              <Store className="mr-2 h-4 w-4" />
              Marketplace
            </Button>
            <Button size="sm" onClick={store.openAddBotModal}>
              <Plus className="mr-2 h-4 w-4" />
              Add Bot
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4 text-destructive">
            {error}
          </div>
        )}

        {/* Content */}
        {viewMode === "profile" && selectedBotForProfile ? (
          <BotProfile
            bot={selectedBotForProfile}
            commands={commands}
            reviews={reviews}
            installed={installedBots.some(
              (i) => i.botId === selectedBotForProfile.id,
            )}
            loading={commandsLoading || reviewsLoading}
            onInstall={handleInstallBot}
            onBack={handleBackFromProfile}
            onLoadMoreReviews={loadMoreReviews}
          />
        ) : viewMode === "marketplace" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Bot Marketplace</h2>
              <Button variant="ghost" onClick={() => setViewMode("list")}>
                Back to Installed
              </Button>
            </div>
            <BotMarketplaceInline
              bots={marketplaceBots}
              featuredBots={featuredBots}
              categories={categories}
              loading={isMarketplaceLoading}
              totalCount={marketplaceBots.length}
              onSearch={searchBots}
              onFilterCategory={filterByCategory}
              onLoadMore={loadMoreBots}
              onInstall={handleInstallBot}
              onViewDetails={handleViewBotDetails}
              installedBotIds={installedBots.map((i) => i.botId)}
            />
          </div>
        ) : (
          <Tabs defaultValue="installed" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="installed">
                  Installed ({installedBots.length})
                </TabsTrigger>
                <TabsTrigger value="available">Available</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button
                  variant={listStyle === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setListStyle("table")}
                >
                  Table
                </Button>
                <Button
                  variant={listStyle === "cards" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setListStyle("cards")}
                >
                  Cards
                </Button>
              </div>
            </div>

            <TabsContent value="installed">
              {listStyle === "table" ? (
                <BotList
                  bots={installedBots}
                  loading={isInstalledLoading}
                  onConfigure={handleConfigureBot}
                  onRemove={handleRemoveBot}
                  onViewDetails={handleViewBotDetails}
                  showChannels
                  emptyMessage="No bots installed yet"
                />
              ) : (
                <BotListCards
                  bots={installedBots}
                  loading={isInstalledLoading}
                  onConfigure={handleConfigureBot}
                  onRemove={handleRemoveBot}
                  onViewDetails={handleViewBotDetails}
                  emptyMessage="No bots installed yet"
                />
              )}
            </TabsContent>

            <TabsContent value="available">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredBots
                  .filter(
                    (bot) => !installedBots.some((i) => i.botId === bot.id),
                  )
                  .slice(0, 6)
                  .map((bot) => (
                    <div
                      key={bot.id}
                      className="space-y-3 rounded-lg border bg-card p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                          <BotIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{bot.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {bot.category}
                          </p>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {bot.description}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewBotDetails(bot)}
                        >
                          Details
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleInstallBot(bot)}
                        >
                          Install
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setViewMode("marketplace")}
                >
                  Browse All Bots
                  <Store className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Add Bot Modal */}
      <AddBotModal
        open={store.addBotModalOpen}
        onOpenChange={store.closeAddBotModal}
        channels={mockChannels}
        marketplaceBots={marketplaceBots.slice(0, 5)}
        marketplaceLoading={isMarketplaceLoading}
        onAddByToken={handleAddByToken}
        onInstallBot={handleInstallFromModal}
        onOpenMarketplace={() => {
          store.closeAddBotModal();
          setViewMode("marketplace");
        }}
      />

      {/* Bot Settings Modal */}
      <BotSettingsModal
        open={store.settingsModalOpen}
        onOpenChange={store.closeSettingsModal}
        bot={store.selectedBot}
        installations={selectedBotInstallations}
        onUpdatePermissions={handleUpdatePermissions}
        onRemoveBot={handleRemoveBot}
        onViewProfile={handleViewBotDetails}
      />

      {/* Marketplace Sheet (alternative to inline) */}
      <BotMarketplace
        open={store.marketplaceOpen}
        onOpenChange={store.closeMarketplace}
        bots={marketplaceBots}
        featuredBots={featuredBots}
        categories={categories}
        loading={isMarketplaceLoading}
        totalCount={marketplaceBots.length}
        onSearch={searchBots}
        onFilterCategory={filterByCategory}
        onLoadMore={loadMoreBots}
        onInstall={handleInstallBot}
        onViewDetails={handleViewBotDetails}
        installedBotIds={installedBots.map((i) => i.botId)}
      />
    </AdminLayout>
  );
}
