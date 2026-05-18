"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useAppDirectoryStore,
  initializeAppDirectory,
  selectCategories,
  selectSearchResults,
  selectHasActiveFilters,
} from "@/stores/app-directory-store";
import { AppSearch } from "./AppSearch";
import { AppFilters } from "./AppFilters";
import { AppCategories } from "./AppCategories";
import { FeaturedApps } from "./FeaturedApps";
import { PopularApps } from "./PopularApps";
import { RecentApps } from "./RecentApps";
import { AppCard } from "./AppCard";
import { Skeleton } from "@/components/ui/skeleton";

interface AppDirectoryProps {
  className?: string;
}

export function AppDirectory({ className }: AppDirectoryProps) {
  const [initialized, setInitialized] = useState(false);

  const { searchQuery, isLoading, activeCategory, searchApps } =
    useAppDirectoryStore();

  const categories = useAppDirectoryStore(selectCategories);
  const searchResults = useAppDirectoryStore(selectSearchResults);
  const hasActiveFilters = useAppDirectoryStore(selectHasActiveFilters);

  // Initialize store on mount
  useEffect(() => {
    initializeAppDirectory();
    setInitialized(true);
  }, []);

  // Search when query, category, or filters change
  useEffect(() => {
    if (!initialized) return;

    if (searchQuery || activeCategory || hasActiveFilters) {
      searchApps({
        query: searchQuery,
        categories: activeCategory ? [activeCategory] : undefined,
      });
    }
  }, [initialized, searchQuery, activeCategory, hasActiveFilters, searchApps]);

  const isSearching = searchQuery || activeCategory || hasActiveFilters;

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">App Directory</h1>
          <p className="text-muted-foreground">
            Discover apps and integrations to supercharge your team&apos;s
            productivity
          </p>
        </div>

        {/* Search */}
        <AppSearch />

        {/* Filters */}
        <AppFilters />
      </div>

      {/* Categories Navigation */}
      <AppCategories categories={categories} />

      {/* Content */}
      {isLoading && !initialized ? (
        <AppDirectorySkeleton />
      ) : isSearching ? (
        <SearchResults results={searchResults} isLoading={isLoading} />
      ) : (
        <div className="flex flex-col gap-12">
          {/* Featured Apps */}
          <FeaturedApps />

          {/* Popular Apps */}
          <PopularApps />

          {/* Recently Updated */}
          <RecentApps />
        </div>
      )}
    </div>
  );
}

// Search Results Component
function SearchResults({
  results,
  isLoading,
}: {
  results: ReturnType<typeof selectSearchResults>;
  isLoading: boolean;
}) {
  const { searchQuery, activeCategory } = useAppDirectoryStore();
  const categories = useAppDirectoryStore(selectCategories);

  const categoryName = activeCategory
    ? categories.find((c) => c.id === activeCategory)?.name
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {searchQuery
            ? `Search results for "${searchQuery}"`
            : categoryName
              ? `Apps in ${categoryName}`
              : "All Apps"}
        </h2>
        <span className="text-sm text-muted-foreground">
          {results.length} {results.length === 1 ? "app" : "apps"} found
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-6xl">🔍</div>
          <h3 className="mb-2 text-lg font-medium">No apps found</h3>
          <p className="max-w-md text-muted-foreground">
            Try adjusting your search or filters to find what you&apos;re
            looking for.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}

// Loading Skeleton
function AppDirectorySkeleton() {
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
