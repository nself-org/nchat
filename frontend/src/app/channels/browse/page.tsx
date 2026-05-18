"use client";

/**
 * Channel Browse Page
 *
 * Demonstrates the complete channel discovery and browse functionality
 */

import * as React from "react";
import { useCallback } from "react";
import { ChannelBrowser } from "@/components/channels/ChannelBrowser";
import { ChannelDirectory } from "@/components/channels/ChannelDirectory";
import { useChannelDiscovery } from "@/hooks/use-channel-discovery";
import { useChannelMutations } from "@/hooks/use-channels";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============================================================================
// Page Component
// ============================================================================

export default function ChannelBrowsePage() {
  const { user } = useAuth();
  const { joinChannel, leaveChannel } = useChannelMutations();

  // Use channel discovery hook
  const {
    channels,
    filteredChannels,
    results,
    stats,
    filters,
    isLoading,
    error,
    hasMore,
    total,
    setFilters,
    resetFilters,
    applyQuickFilter,
    search,
    clearSearch,
    fetchChannels,
    fetchMore,
    refresh,
    getFeatured,
    getPopular,
    getTrending,
    getNew,
    getSuggested,
  } = useChannelDiscovery({
    autoFetch: true,
    enableRealtime: false,
    limit: 50,
    includeJoined: true,
  });

  // Get user's joined channels
  const joinedChannelIds = React.useMemo(() => {
    // In a real app, this would come from the user's channel memberships
    return new Set<string>();
  }, []);

  // Handle join channel
  const handleJoin = useCallback(
    async (channelId: string) => {
      try {
        logger.info("Joining channel", { channelId, userId: user?.id });
        await joinChannel(channelId);
      } catch (error) {
        logger.error("Failed to join channel", error as Error, { channelId });
      }
    },
    [joinChannel, user],
  );

  // Handle leave channel
  const handleLeave = useCallback(
    async (channelId: string) => {
      try {
        logger.info("Leaving channel", { channelId, userId: user?.id });
        await leaveChannel(channelId);
      } catch (error) {
        logger.error("Failed to leave channel", error as Error, { channelId });
      }
    },
    [leaveChannel, user],
  );

  return (
    <div className="container max-w-7xl space-y-8 py-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Browse Channels</h1>
        <p className="text-muted-foreground">
          Discover and join channels that match your interests
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{stats.totalChannels}</div>
            <div className="text-xs text-muted-foreground">Total Channels</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{stats.publicChannels}</div>
            <div className="text-xs text-muted-foreground">Public</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{stats.privateChannels}</div>
            <div className="text-xs text-muted-foreground">Private</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <div className="text-xs text-muted-foreground">Members</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{stats.activeToday}</div>
            <div className="text-xs text-muted-foreground">Active Today</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{stats.newThisWeek}</div>
            <div className="text-xs text-muted-foreground">New This Week</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="browser" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browser">Browser View</TabsTrigger>
          <TabsTrigger value="directory">Directory View</TabsTrigger>
        </TabsList>

        {/* Browser View */}
        <TabsContent value="browser" className="space-y-6">
          <ChannelBrowser
            channels={channels}
            joinedChannelIds={joinedChannelIds}
            isLoading={isLoading}
            showCreateButton={true}
            showSearch={true}
            showFilters={true}
            showCategories={true}
            showFeatured={true}
            showPopular={true}
            showRecent={true}
            showTrending={true}
            showSuggestions={true}
            defaultView="discover"
            onJoin={handleJoin}
            onLeave={handleLeave}
            onRefresh={refresh}
          />
        </TabsContent>

        {/* Directory View */}
        <TabsContent value="directory" className="space-y-6">
          <ChannelDirectory
            channels={channels}
            joinedChannelIds={joinedChannelIds}
            showSearch={true}
            showSort={true}
            defaultExpanded={true}
            layout="tree"
            onJoin={handleJoin}
            onLeave={handleLeave}
          />
        </TabsContent>
      </Tabs>

      {/* Load More */}
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => fetchMore()}
            className="rounded-lg border bg-card px-6 py-2 transition-colors hover:bg-accent"
          >
            Load More Channels
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 rounded-lg border border-destructive p-4 text-destructive">
          <p className="font-medium">Failed to load channels</p>
          <p className="mt-1 text-sm">{error.message}</p>
          <button
            onClick={() => refresh()}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
