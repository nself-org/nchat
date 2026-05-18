"use client";

import { useState, useCallback } from "react";
import {
  Search,
  Bot,
  Sparkles,
  Filter,
  X,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BotCard, BotCardSkeleton } from "./bot-card";
import { cn } from "@/lib/utils";
import type { Bot as BotType } from "@/graphql/bots";
import type { BotCategory } from "@/lib/bots/bot-store";

// ============================================================================
// TYPES
// ============================================================================

export interface BotMarketplaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bots: BotType[];
  featuredBots?: BotType[];
  categories?: BotCategory[];
  loading?: boolean;
  totalCount?: number;
  selectedCategory?: string;
  searchQuery?: string;
  onSearch: (query: string) => void;
  onFilterCategory: (category: string | undefined) => void;
  onLoadMore?: () => void;
  onInstall: (bot: BotType) => void;
  onViewDetails: (bot: BotType) => void;
  installedBotIds?: string[];
}

type SortOption = "popular" | "rating" | "newest" | "name";

// ============================================================================
// COMPONENT
// ============================================================================

export function BotMarketplace({
  open,
  onOpenChange,
  bots,
  featuredBots = [],
  categories = [],
  loading = false,
  totalCount = 0,
  selectedCategory,
  searchQuery = "",
  onSearch,
  onFilterCategory,
  onLoadMore,
  onInstall,
  onViewDetails,
  installedBotIds = [],
}: BotMarketplaceProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [sortBy, setSortBy] = useState<SortOption>("popular");

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(localSearch);
    },
    [localSearch, onSearch],
  );

  const handleClearSearch = useCallback(() => {
    setLocalSearch("");
    onSearch("");
  }, [onSearch]);

  const handleCategoryClick = useCallback(
    (categorySlug: string) => {
      if (selectedCategory === categorySlug) {
        onFilterCategory(undefined);
      } else {
        onFilterCategory(categorySlug);
      }
    },
    [selectedCategory, onFilterCategory],
  );

  const sortedBots = [...bots].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return (b.installCount || 0) - (a.installCount || 0);
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      case "newest":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const hasMore = bots.length < totalCount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <SheetHeader className="border-b p-6 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Bot Marketplace
            </SheetTitle>
            <SheetDescription>
              Discover and install bots to enhance your workspace
            </SheetDescription>
          </SheetHeader>

          {/* Search and Filters */}
          <div className="space-y-3 border-b p-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search bots..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>

            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {selectedCategory && (
                <Badge
                  variant="secondary"
                  className="hover:bg-secondary/80 cursor-pointer"
                  onClick={() => onFilterCategory(undefined)}
                >
                  {categories.find((c) => c.slug === selectedCategory)?.name ||
                    selectedCategory}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-4">
              {/* Featured Section (only shown when no filters) */}
              {!searchQuery && !selectedCategory && featuredBots.length > 0 && (
                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Featured Bots
                  </h3>
                  <div className="grid gap-3">
                    {featuredBots.slice(0, 3).map((bot) => (
                      <BotCard
                        key={bot.id}
                        bot={bot}
                        compact
                        installed={installedBotIds.includes(bot.id)}
                        onInstall={onInstall}
                        onViewDetails={onViewDetails}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Categories */}
              {!searchQuery && categories.length > 0 && (
                <section>
                  <h3 className="mb-3 font-semibold">Categories</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.slug)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
                          selectedCategory === category.slug
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted",
                        )}
                      >
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.botsCount} bots
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* All Bots / Search Results */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">
                    {searchQuery
                      ? `Search results for "${searchQuery}"`
                      : selectedCategory
                        ? categories.find((c) => c.slug === selectedCategory)
                            ?.name || "Bots"
                        : "All Bots"}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {totalCount} bots
                  </span>
                </div>

                {loading && bots.length === 0 ? (
                  <div className="grid gap-3">
                    <BotCardSkeleton />
                    <BotCardSkeleton />
                    <BotCardSkeleton />
                  </div>
                ) : sortedBots.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bot className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                    <p className="font-medium">No bots found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {sortedBots.map((bot) => (
                      <BotCard
                        key={bot.id}
                        bot={bot}
                        installed={installedBotIds.includes(bot.id)}
                        onInstall={onInstall}
                        onViewDetails={onViewDetails}
                      />
                    ))}

                    {loading && (
                      <div className="grid gap-3">
                        <BotCardSkeleton />
                        <BotCardSkeleton />
                      </div>
                    )}

                    {hasMore && onLoadMore && !loading && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={onLoadMore}
                      >
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// INLINE MARKETPLACE (non-sheet version)
// ============================================================================

export function BotMarketplaceInline({
  bots,
  featuredBots = [],
  categories = [],
  loading = false,
  totalCount = 0,
  selectedCategory,
  searchQuery = "",
  onSearch,
  onFilterCategory,
  onLoadMore,
  onInstall,
  onViewDetails,
  installedBotIds = [],
  className,
}: Omit<BotMarketplaceProps, "open" | "onOpenChange"> & {
  className?: string;
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [sortBy, setSortBy] = useState<SortOption>("popular");

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(localSearch);
    },
    [localSearch, onSearch],
  );

  const sortedBots = [...bots].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return (b.installCount || 0) - (a.installCount || 0);
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      case "newest":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const hasMore = bots.length < totalCount;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bots..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9"
          />
        </form>

        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortOption)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!selectedCategory ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterCategory(undefined)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={
                selectedCategory === category.slug ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                onFilterCategory(
                  selectedCategory === category.slug
                    ? undefined
                    : category.slug,
                )
              }
            >
              {category.name}
            </Button>
          ))}
        </div>
      )}

      {/* Featured Bots */}
      {!searchQuery && !selectedCategory && featuredBots.length > 0 && (
        <section>
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Featured Bots
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredBots.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                installed={installedBotIds.includes(bot.id)}
                onInstall={onInstall}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Bots */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">
            {searchQuery
              ? `Search results`
              : selectedCategory
                ? categories.find((c) => c.slug === selectedCategory)?.name
                : "All Bots"}
          </h3>
          <span className="text-sm text-muted-foreground">
            {sortedBots.length} of {totalCount} bots
          </span>
        </div>

        {loading && bots.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <BotCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedBots.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <Bot className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">No bots found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedBots.map((bot) => (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  installed={installedBotIds.includes(bot.id)}
                  onInstall={onInstall}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>

            {hasMore && onLoadMore && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={onLoadMore}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
