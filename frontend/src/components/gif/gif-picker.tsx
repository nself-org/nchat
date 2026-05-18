"use client";

/**
 * GIF Picker Component
 *
 * Main GIF picker with search, trending, categories, and recent tabs.
 * Integrates with the feature flag system.
 *
 * @example
 * ```tsx
 * <GifPicker
 *   onSelect={(gif) => sendMessage({ gif })}
 *   onClose={() => setShowPicker(false)}
 *   open={showPicker}
 * />
 * ```
 */

import { useState, useCallback, useMemo, memo, useEffect } from "react";
import {
  TrendingUp,
  Search,
  Grid3X3,
  Clock,
  Heart,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeature, FEATURES } from "@/lib/features";
import {
  useGif,
  useGifSearch,
  useGifTrending,
  useGifCategories,
} from "@/lib/gif/use-gif";
import { useGifStore } from "@/lib/gif/gif-store";
import { getGifProvider } from "@/lib/gif/gif-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GifSearch, GifSearchHistory } from "./gif-search";
import { GifGrid, GifGridWithFavorites, GifFlatGrid } from "./gif-grid";
import { GifCategories, PopularCategories } from "./gif-categories";
import type { Gif, GifCategory, GifPickerProps } from "@/types/gif";

// ============================================================================
// Constants
// ============================================================================

const TABS = {
  TRENDING: "trending",
  SEARCH: "search",
  CATEGORIES: "categories",
  RECENT: "recent",
  FAVORITES: "favorites",
} as const;

type TabValue = (typeof TABS)[keyof typeof TABS];

// ============================================================================
// Main GIF Picker Component
// ============================================================================

export const GifPicker = memo(function GifPicker({
  onSelect,
  onClose,
  open,
  onOpenChange,
  className,
  disabled = false,
  defaultTab = "trending",
  rating = "pg-13",
}: GifPickerProps) {
  // Feature flag check
  const { enabled: gifPickerEnabled } = useFeature(FEATURES.GIF_PICKER);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Category browsing state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Store state
  const {
    recentGifs,
    favoriteGifs,
    searchHistory,
    addRecentGif,
    addFavoriteGif,
    removeFavoriteGif,
    isFavoriteGif,
    addSearchHistory,
    removeSearchHistory,
    clearSearchHistory,
  } = useGifStore();

  // Hooks for data fetching
  const trendingHook = useGifTrending({
    rating,
    autoFetch: activeTab === TABS.TRENDING,
  });
  const searchHook = useGifSearch({
    rating,
    debounceMs: 300,
    autoSearch: true,
  });
  const categoriesHook = useGifCategories();

  // Get provider for attribution
  const provider = useMemo(() => getGifProvider(), []);

  // Handle search query change
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      searchHook.setQuery(query);
      if (query.trim()) {
        setActiveTab(TABS.SEARCH);
      }
    },
    [searchHook],
  );

  // Handle search execution
  const handleSearch = useCallback(
    (query: string) => {
      if (query.trim()) {
        searchHook.search(query);
        addSearchHistory(query);
      }
    },
    [searchHook, addSearchHistory],
  );

  // Handle category selection
  const handleCategorySelect = useCallback(
    (category: GifCategory) => {
      setSelectedCategory(category.id);
      setSearchQuery(category.name);
      searchHook.setQuery(category.name);
      searchHook.search(category.name);
      setActiveTab(TABS.SEARCH);
    },
    [searchHook],
  );

  // Handle GIF selection
  const handleGifSelect = useCallback(
    (gif: Gif) => {
      addRecentGif(gif);
      onSelect(gif);
      onClose?.();
    },
    [addRecentGif, onSelect, onClose],
  );

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(
    (gif: Gif) => {
      if (isFavoriteGif(gif.id)) {
        removeFavoriteGif(gif.id);
      } else {
        addFavoriteGif(gif);
      }
    },
    [isFavoriteGif, addFavoriteGif, removeFavoriteGif],
  );

  // Handle search history selection
  const handleSearchHistorySelect = useCallback(
    (query: string) => {
      setSearchQuery(query);
      searchHook.setQuery(query);
      searchHook.search(query);
      setActiveTab(TABS.SEARCH);
    },
    [searchHook],
  );

  // Handle popular category selection
  const handlePopularSelect = useCallback(
    (query: string) => {
      setSearchQuery(query);
      searchHook.setQuery(query);
      searchHook.search(query);
      setActiveTab(TABS.SEARCH);
    },
    [searchHook],
  );

  // Create favorite GIF IDs set for efficient lookup
  const favoriteGifIds = useMemo(
    () => new Set(favoriteGifs.map((g) => g.id)),
    [favoriteGifs],
  );

  // Don't render if feature is disabled
  if (!gifPickerEnabled) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-[360px] flex-col",
        "rounded-xl border border-border bg-popover shadow-lg",
        "overflow-hidden",
        className,
      )}
    >
      {/* Search Header */}
      <div className="border-b border-border p-3">
        <GifSearch
          value={searchQuery}
          onChange={handleSearchChange}
          onSearch={handleSearch}
          loading={searchHook.loading}
          placeholder="Search GIFs..."
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-2 py-1">
          <TabsTrigger
            value={TABS.TRENDING}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs data-[state=active]:bg-muted"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Trending
          </TabsTrigger>
          <TabsTrigger
            value={TABS.CATEGORIES}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs data-[state=active]:bg-muted"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            Categories
          </TabsTrigger>
          <TabsTrigger
            value={TABS.RECENT}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs data-[state=active]:bg-muted"
          >
            <Clock className="h-3.5 w-3.5" />
            Recent
          </TabsTrigger>
          <TabsTrigger
            value={TABS.FAVORITES}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs data-[state=active]:bg-muted"
          >
            <Heart className="h-3.5 w-3.5" />
            Favorites
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[320px] flex-1">
          {/* Search Tab - shows when there's a search query */}
          <TabsContent value={TABS.SEARCH} className="mt-0 p-2">
            {searchHook.gifs.length > 0 || searchHook.loading ? (
              <GifGridWithFavorites
                gifs={searchHook.gifs}
                onSelect={handleGifSelect}
                loading={searchHook.loading}
                onLoadMore={searchHook.loadMore}
                hasMore={searchHook.hasMore}
                columns={2}
                favoriteGifIds={favoriteGifIds}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="text-muted-foreground/50 mb-2 h-8 w-8" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : "Search for GIFs"}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Trending Tab */}
          <TabsContent value={TABS.TRENDING} className="mt-0 p-2">
            <GifGridWithFavorites
              gifs={trendingHook.gifs}
              onSelect={handleGifSelect}
              loading={trendingHook.loading}
              onLoadMore={trendingHook.loadMore}
              hasMore={trendingHook.hasMore}
              columns={2}
              favoriteGifIds={favoriteGifIds}
              onFavoriteToggle={handleFavoriteToggle}
            />
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value={TABS.CATEGORIES} className="mt-0 space-y-4 p-2">
            {/* Popular searches */}
            <PopularCategories onSelect={handlePopularSelect} />

            {/* Categories grid */}
            <div className="space-y-2">
              <span className="px-1 text-xs font-medium text-muted-foreground">
                Browse Categories
              </span>
              <GifCategories
                categories={categoriesHook.categories}
                onSelect={handleCategorySelect}
                loading={categoriesHook.loading}
              />
            </div>

            {/* Search history */}
            {searchHistory.length > 0 && (
              <GifSearchHistory
                history={searchHistory}
                onSelect={handleSearchHistorySelect}
                onRemove={removeSearchHistory}
                onClear={clearSearchHistory}
              />
            )}
          </TabsContent>

          {/* Recent Tab */}
          <TabsContent value={TABS.RECENT} className="mt-0 p-2">
            {recentGifs.length > 0 ? (
              <GifGridWithFavorites
                gifs={recentGifs}
                onSelect={handleGifSelect}
                columns={2}
                favoriteGifIds={favoriteGifIds}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="text-muted-foreground/50 mb-2 h-8 w-8" />
                <p className="text-sm text-muted-foreground">No recent GIFs</p>
                <p className="text-muted-foreground/70 mt-1 text-xs">
                  GIFs you use will appear here
                </p>
              </div>
            )}
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value={TABS.FAVORITES} className="mt-0 p-2">
            {favoriteGifs.length > 0 ? (
              <GifGridWithFavorites
                gifs={favoriteGifs}
                onSelect={handleGifSelect}
                columns={2}
                favoriteGifIds={favoriteGifIds}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Heart className="text-muted-foreground/50 mb-2 h-8 w-8" />
                <p className="text-sm text-muted-foreground">
                  No favorite GIFs
                </p>
                <p className="text-muted-foreground/70 mt-1 text-xs">
                  Click the heart on a GIF to save it
                </p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Attribution Footer */}
      <div className="bg-muted/30 border-t border-border px-3 py-2">
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Powered by</span>
          {provider === "giphy" ? (
            <GiphyLogo className="h-3" />
          ) : (
            <TenorLogo className="h-3" />
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Provider Logos (for attribution)
// ============================================================================

function GiphyLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 163 35"
      fill="currentColor"
      className={cn("text-foreground", className)}
    >
      <path d="M4.04 10.36a7.2 7.2 0 0 0-2.48 5.53v6.98c0 2.2.84 4.16 2.48 5.48a8.15 8.15 0 0 0 5.5 2.12c2.08 0 4-0.76 5.48-2.12a7.3 7.3 0 0 0 2.48-5.48v-3.34H9.52v4.72h3.3v-1.32c0 .74-.24 1.38-.7 1.84a2.62 2.62 0 0 1-1.84.74c-.74 0-1.34-.24-1.84-.74-.5-.46-.74-1.1-.74-1.84v-6.96c0-.74.24-1.38.74-1.84.5-.46 1.1-.74 1.84-.74.74 0 1.34.28 1.84.74.46.46.7 1.1.7 1.84h5.32c0-2.2-.88-4.12-2.48-5.54-1.5-1.36-3.4-2.08-5.48-2.08-2.12 0-4 .72-5.5 2.08zm19.8 19.7h5.3V8.28h-5.3v21.8zm13.08 0h5.3V8.28h-5.3v21.8zm14.04-21.78v21.78h5.3v-8.42h4.34c2.14 0 3.98-.74 5.48-2.14a7 7 0 0 0 2.16-5.24c0-2.04-.72-3.82-2.16-5.2a7.56 7.56 0 0 0-5.48-2.2h-9.64v1.42zm5.3 3.28h4.32c.76 0 1.38.24 1.84.68.48.44.72 1.02.72 1.7 0 .68-.24 1.26-.72 1.74-.46.46-1.08.72-1.84.72h-4.32v-4.84zM72.7 8.28v21.78h5.3V19.72h6.62V8.28H72.7zm5.3 6.8V13h6.62v2.08H78zm18.68-6.8h-5.32v21.78h5.32v-8.52l5.52 8.52h6.5l-7.24-10.9 6.56-10.88h-6.12l-5.22 8.68V8.28zM108.6 8.28v21.78h5.3V19.72h6.62V8.28h-11.92zm5.3 6.8V13h6.62v2.08h-6.62z" />
    </svg>
  );
}

function TenorLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 24"
      fill="currentColor"
      className={cn("text-foreground", className)}
    >
      <path d="M9.39 5.77H0v3.57h2.91v9.45h3.57v-9.45h2.91V5.77zm11.58 0H12v13.02h8.97v-3.57h-5.4v-1.74h4.8v-3.15h-4.8V9.34h5.4V5.77zm17.76 0h-3.57v13.02h3.57V10.6l5.46 8.19h3.57V5.77h-3.57v8.19l-5.46-8.19zm25.1-.23c-3.85 0-6.98 2.93-6.98 6.75 0 3.82 3.13 6.75 6.98 6.75s6.98-2.93 6.98-6.75c0-3.82-3.13-6.75-6.98-6.75zm0 10.05c-1.85 0-3.35-1.48-3.35-3.3 0-1.82 1.5-3.3 3.35-3.3 1.85 0 3.35 1.48 3.35 3.3 0 1.82-1.5 3.3-3.35 3.3zM85.6 5.77h-6.31v13.02h3.57v-4.2h2.74c3.1 0 5.07-1.91 5.07-4.41 0-2.5-1.97-4.41-5.07-4.41zm-.35 5.72h-2.39V9.34h2.39c.95 0 1.65.57 1.65 1.07 0 .51-.7 1.08-1.65 1.08z" />
    </svg>
  );
}

// ============================================================================
// Compact GIF Picker (for inline use)
// ============================================================================

export interface CompactGifPickerProps {
  onSelect: (gif: Gif) => void;
  className?: string;
}

export function CompactGifPicker({
  onSelect,
  className,
}: CompactGifPickerProps) {
  const { enabled: gifPickerEnabled } = useFeature(FEATURES.GIF_PICKER);
  const trendingHook = useGifTrending({ pageSize: 12 });

  if (!gifPickerEnabled) {
    return null;
  }

  return (
    <div className={cn("p-2", className)}>
      <GifFlatGrid
        gifs={trendingHook.gifs.slice(0, 12)}
        onSelect={onSelect}
        loading={trendingHook.loading}
        columns={4}
      />
    </div>
  );
}

export default GifPicker;
