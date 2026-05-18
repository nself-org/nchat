"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Plus, Hash, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelSearch } from "./ChannelSearch";
import { ChannelFilters } from "./ChannelFilters";
import { ChannelCategories } from "./ChannelCategories";
import { ChannelCard } from "./ChannelCard";
import { FeaturedChannels } from "./FeaturedChannels";
import { PopularChannels } from "./PopularChannels";
import { RecentChannels } from "./RecentChannels";
import { TrendingChannels } from "./TrendingChannels";
import { ChannelSuggestions } from "./ChannelSuggestions";
import {
  getDiscoveryResults,
  filterChannels,
  type DiscoveryFilters,
} from "@/lib/channels/channel-discovery";
import type { Channel } from "@/stores/channel-store";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

export interface ChannelBrowserProps {
  channels: Channel[];
  joinedChannelIds?: Set<string>;
  isLoading?: boolean;
  showCreateButton?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  showCategories?: boolean;
  showFeatured?: boolean;
  showPopular?: boolean;
  showRecent?: boolean;
  showTrending?: boolean;
  showSuggestions?: boolean;
  defaultView?: "discover" | "browse" | "categories";
  onJoin?: (channelId: string) => void;
  onLeave?: (channelId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

type ViewLayout = "grid" | "list";

// ============================================================================
// Component
// ============================================================================

export function ChannelBrowser({
  channels,
  joinedChannelIds = new Set(),
  isLoading = false,
  showCreateButton = true,
  showSearch = true,
  showFilters = true,
  showCategories = true,
  showFeatured = true,
  showPopular = true,
  showRecent = true,
  showTrending = true,
  showSuggestions = true,
  defaultView = "discover",
  onJoin,
  onLeave,
  onRefresh,
  className,
}: ChannelBrowserProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(defaultView);
  const [layout, setLayout] = useState<ViewLayout>("grid");
  const [filters, setFilters] = useState<DiscoveryFilters>({
    sortBy: "activity",
    sortDirection: "desc",
    excludePrivate: true,
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // User context for suggestions
  const userContext = useMemo(
    () => ({
      userId: user?.id || "",
      joinedChannelIds: Array.from(joinedChannelIds),
      recentActivityChannelIds: [],
      role: user?.role,
    }),
    [user, joinedChannelIds],
  );

  // Filtered channels based on current filters
  const filteredChannels = useMemo(() => {
    let result = channels;

    // Apply category filter
    if (selectedCategory !== null) {
      result = result.filter((c) => c.categoryId === selectedCategory);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query) ||
          c.topic?.toLowerCase().includes(query),
      );
    }

    // Apply other filters
    result = filterChannels(result, filters);

    return result;
  }, [channels, selectedCategory, searchQuery, filters]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setActiveTab("browse");
  }, []);

  // Handle channel selection from search
  const handleSearchResultSelect = useCallback(
    (channel: Channel) => {
      router.push(`/chat/channel/${channel.slug}`);
    },
    [router],
  );

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    if (categoryId !== null) {
      setActiveTab("browse");
    }
  }, []);

  // Handle create channel
  const handleCreateChannel = useCallback(() => {
    router.push("/channels/create");
  }, [router]);

  // Render channel grid/list
  const renderChannelList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (filteredChannels.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Hash className="text-muted-foreground/50 mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-medium">No channels found</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {searchQuery
              ? `No channels match "${searchQuery}"`
              : "Try adjusting your filters or create a new channel"}
          </p>
          {showCreateButton && (
            <Button onClick={handleCreateChannel}>
              <Plus className="mr-2 h-4 w-4" />
              Create Channel
            </Button>
          )}
        </div>
      );
    }

    if (layout === "list") {
      return (
        <div className="space-y-2">
          {filteredChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isJoined={joinedChannelIds.has(channel.id)}
              variant="compact"
              onJoin={onJoin}
              onLeave={onLeave}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredChannels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            isJoined={joinedChannelIds.has(channel.id)}
            showStats
            onJoin={onJoin}
            onLeave={onLeave}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Channel Browser</h1>
          <p className="text-muted-foreground">
            Discover and join channels that interest you
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {showCreateButton && (
            <Button onClick={handleCreateChannel}>
              <Plus className="mr-2 h-4 w-4" />
              Create Channel
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <ChannelSearch
          channels={channels}
          onSearch={handleSearch}
          onResultSelect={handleSearchResultSelect}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="browse">Browse All</TabsTrigger>
            {showCategories && (
              <TabsTrigger value="categories">Categories</TabsTrigger>
            )}
          </TabsList>

          {activeTab === "browse" && (
            <div className="flex items-center gap-2">
              <Button
                variant={layout === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setLayout("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={layout === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setLayout("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Discover Tab */}
        <TabsContent value="discover" className="mt-6 space-y-8">
          {showSuggestions && user && (
            <ChannelSuggestions
              channels={channels}
              userContext={userContext}
              joinedChannelIds={joinedChannelIds}
              limit={6}
              layout="scroll"
              onJoin={onJoin}
              onLeave={onLeave}
            />
          )}

          {showFeatured && (
            <FeaturedChannels
              channels={channels}
              joinedChannelIds={joinedChannelIds}
              limit={4}
              onViewAll={() => setActiveTab("browse")}
              onJoin={onJoin}
              onLeave={onLeave}
            />
          )}

          {showTrending && (
            <TrendingChannels
              channels={channels}
              joinedChannelIds={joinedChannelIds}
              limit={6}
              layout="scroll"
              onViewAll={() => setActiveTab("browse")}
              onJoin={onJoin}
              onLeave={onLeave}
            />
          )}

          {showPopular && (
            <PopularChannels
              channels={channels}
              joinedChannelIds={joinedChannelIds}
              limit={6}
              layout="scroll"
              onViewAll={() => setActiveTab("browse")}
              onJoin={onJoin}
              onLeave={onLeave}
            />
          )}

          {showRecent && (
            <RecentChannels
              channels={channels}
              joinedChannelIds={joinedChannelIds}
              limit={6}
              layout="scroll"
              onViewAll={() => setActiveTab("browse")}
              onJoin={onJoin}
              onLeave={onLeave}
            />
          )}
        </TabsContent>

        {/* Browse Tab */}
        <TabsContent value="browse" className="mt-6 space-y-4">
          {showFilters && (
            <ChannelFilters filters={filters} onFiltersChange={setFilters} />
          )}

          {showCategories && (
            <ChannelCategories
              channels={channels}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              variant="pills"
              showCounts
            />
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredChannels.length} channels</span>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            )}
          </div>

          {renderChannelList()}
        </TabsContent>

        {/* Categories Tab */}
        {showCategories && (
          <TabsContent value="categories" className="mt-6">
            <ChannelCategories
              channels={channels}
              selectedCategory={selectedCategory}
              onCategorySelect={(categoryId) => {
                handleCategorySelect(categoryId);
                if (categoryId !== null) {
                  setActiveTab("browse");
                }
              }}
              variant="default"
              showCounts
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

ChannelBrowser.displayName = "ChannelBrowser";
