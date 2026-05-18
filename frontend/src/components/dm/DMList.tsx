"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { DMItem } from "./DMItem";
import { DMSearch } from "./DMSearch";
import { DMFilters } from "./DMFilters";
import { NewDMButton } from "./NewDMButton";
import {
  useDMStore,
  selectFilteredDMs,
  selectActiveDM,
} from "@/stores/dm-store";
import { useAuth } from "@/contexts/auth-context";
import type {
  DirectMessage,
  DMFilterType,
  DMSortType,
} from "@/lib/dm/dm-types";

// ============================================================================
// Types
// ============================================================================

interface DMListProps {
  className?: string;
  onDMSelect?: (dm: DirectMessage) => void;
  showFilters?: boolean;
  showSearch?: boolean;
  showNewDMButton?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function DMList({
  className,
  onDMSelect,
  showFilters = true,
  showSearch = true,
  showNewDMButton = true,
}: DMListProps) {
  const { user } = useAuth();
  const currentUserId = user?.id || "";

  // Store state
  const {
    isLoading,
    error,
    filterType,
    sortType,
    searchQuery,
    setFilterType,
    setSortType,
    setSearchQuery,
    activeDMId,
  } = useDMStore();

  const filteredDMs = useDMStore(selectFilteredDMs);

  // Group DMs by type for display
  const groupedDMs = useMemo(() => {
    const starred: DirectMessage[] = [];
    const regular: DirectMessage[] = [];
    const { starredDMs } = useDMStore.getState();

    filteredDMs.forEach((dm) => {
      if (starredDMs.has(dm.id)) {
        starred.push(dm);
      } else {
        regular.push(dm);
      }
    });

    return { starred, regular };
  }, [filteredDMs]);

  const handleFilterChange = (filter: DMFilterType) => {
    setFilterType(filter);
  };

  const handleSortChange = (sort: DMSortType) => {
    setSortType(sort);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex h-full flex-col", className)}>
        <div className="space-y-3 px-3 py-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("flex h-full flex-col", className)}>
        <div className="px-3 py-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="border-b px-3 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          {showNewDMButton && <NewDMButton />}
        </div>

        {/* Search */}
        {showSearch && (
          <DMSearch
            value={searchQuery}
            onChange={handleSearchChange}
            className="mb-2"
          />
        )}

        {/* Filters */}
        {showFilters && (
          <DMFilters
            currentFilter={filterType}
            currentSort={sortType}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
          />
        )}
      </div>

      {/* DM List */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          {filteredDMs.length === 0 ? (
            <EmptyState filterType={filterType} searchQuery={searchQuery} />
          ) : (
            <>
              {/* Starred DMs */}
              {groupedDMs.starred.length > 0 && filterType !== "starred" && (
                <div className="mb-4">
                  <h3 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Starred
                  </h3>
                  <div className="space-y-0.5">
                    {groupedDMs.starred.map((dm) => (
                      <DMItem
                        key={dm.id}
                        dm={dm}
                        currentUserId={currentUserId}
                        isActive={dm.id === activeDMId}
                        onSelect={onDMSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular DMs */}
              <div className="space-y-0.5">
                {filterType !== "starred" && groupedDMs.starred.length > 0 && (
                  <h3 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    All Messages
                  </h3>
                )}
                {(filterType === "starred"
                  ? groupedDMs.starred
                  : groupedDMs.regular
                ).map((dm) => (
                  <DMItem
                    key={dm.id}
                    dm={dm}
                    currentUserId={currentUserId}
                    isActive={dm.id === activeDMId}
                    onSelect={onDMSelect}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({
  filterType,
  searchQuery,
}: {
  filterType: DMFilterType;
  searchQuery: string;
}) {
  if (searchQuery) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          No messages found for &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  const messages: Record<DMFilterType, { title: string; description: string }> =
    {
      all: {
        title: "No messages yet",
        description: "Start a conversation to see your messages here.",
      },
      unread: {
        title: "All caught up!",
        description: "No unread messages.",
      },
      starred: {
        title: "No starred messages",
        description: "Star important conversations for quick access.",
      },
      archived: {
        title: "No archived messages",
        description: "Archived conversations will appear here.",
      },
      muted: {
        title: "No muted messages",
        description: "Muted conversations will appear here.",
      },
    };

  const { title, description } = messages[filterType];

  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

DMList.displayName = "DMList";
