"use client";

import * as React from "react";
import { History, Hash, MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/search/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ForwardDestinationItem,
  ForwardDestinationItemSkeleton,
} from "./forward-destination-item";
import type { ForwardDestination } from "@/lib/forward/forward-store";

// ============================================================================
// Types
// ============================================================================

export interface ForwardDestinationListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Recent destinations for quick access */
  recentDestinations?: ForwardDestination[];
  /** All available channels */
  channels?: ForwardDestination[];
  /** Direct messages */
  directMessages?: ForwardDestination[];
  /** Currently selected destinations */
  selectedDestinations: ForwardDestination[];
  /** Called when a destination is toggled */
  onToggleDestination: (destination: ForwardDestination) => void;
  /** Search query */
  searchQuery: string;
  /** Called when search query changes */
  onSearchChange: (query: string) => void;
  /** Called when search is submitted */
  onSearchSubmit?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Maximum height for scroll area */
  maxHeight?: string | number;
  /** Show recent destinations section */
  showRecent?: boolean;
  /** Placeholder text for search */
  searchPlaceholder?: string;
  /** Empty state message */
  emptyMessage?: string;
}

// ============================================================================
// Section Header Component
// ============================================================================

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
}

function SectionHeader({ icon, title, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {icon}
      <span>{title}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          {count}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export const ForwardDestinationList = React.forwardRef<
  HTMLDivElement,
  ForwardDestinationListProps
>(
  (
    {
      className,
      recentDestinations = [],
      channels = [],
      directMessages = [],
      selectedDestinations,
      onToggleDestination,
      searchQuery,
      onSearchChange,
      onSearchSubmit,
      isLoading = false,
      maxHeight = "400px",
      showRecent = true,
      searchPlaceholder = "Search channels and conversations...",
      emptyMessage = "No destinations found",
      ...props
    },
    ref,
  ) => {
    // Filter destinations based on search
    const filteredChannels = React.useMemo(() => {
      if (!searchQuery) return channels;
      const query = searchQuery.toLowerCase();
      return channels.filter(
        (ch) =>
          ch.name.toLowerCase().includes(query) ||
          ch.slug?.toLowerCase().includes(query),
      );
    }, [channels, searchQuery]);

    const filteredDMs = React.useMemo(() => {
      if (!searchQuery) return directMessages;
      const query = searchQuery.toLowerCase();
      return directMessages.filter(
        (dm) =>
          dm.name.toLowerCase().includes(query) ||
          dm.members?.some((m) => m.displayName.toLowerCase().includes(query)),
      );
    }, [directMessages, searchQuery]);

    const filteredRecent = React.useMemo(() => {
      if (!searchQuery) return recentDestinations;
      const query = searchQuery.toLowerCase();
      return recentDestinations.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.members?.some((m) => m.displayName.toLowerCase().includes(query)),
      );
    }, [recentDestinations, searchQuery]);

    // Check if a destination is selected
    const isSelected = React.useCallback(
      (destinationId: string) =>
        selectedDestinations.some((d) => d.id === destinationId),
      [selectedDestinations],
    );

    // Check if we have any results
    const hasResults =
      filteredChannels.length > 0 ||
      filteredDMs.length > 0 ||
      filteredRecent.length > 0;

    return (
      <div ref={ref} className={cn("flex flex-col", className)} {...props}>
        {/* Search Input */}
        <div className="px-3 pb-3">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            onSubmit={onSearchSubmit}
            placeholder={searchPlaceholder}
            size="sm"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- Intentional UX for modal focus
            autoFocus
          />
        </div>

        <Separator />

        {/* Destinations List */}
        <ScrollArea
          className="flex-1"
          style={{
            maxHeight:
              typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
          }}
        >
          <div className="py-2">
            {/* Loading State */}
            {isLoading && (
              <div className="space-y-1 px-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <ForwardDestinationItemSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !hasResults && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-2 rounded-full bg-muted p-3">
                  <MessageCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                {searchQuery && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different search term
                  </p>
                )}
              </div>
            )}

            {/* Recent Destinations */}
            {!isLoading &&
              showRecent &&
              filteredRecent.length > 0 &&
              !searchQuery && (
                <div className="mb-2">
                  <SectionHeader
                    icon={<History className="h-3 w-3" />}
                    title="Recent"
                    count={filteredRecent.length}
                  />
                  <div className="space-y-0.5 px-1">
                    {filteredRecent.map((destination) => (
                      <ForwardDestinationItem
                        key={destination.id}
                        destination={destination}
                        isSelected={isSelected(destination.id)}
                        onSelectDestination={onToggleDestination}
                        showActivity={false}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}

            {/* Channels */}
            {!isLoading && filteredChannels.length > 0 && (
              <div className="mb-2">
                <SectionHeader
                  icon={<Hash className="h-3 w-3" />}
                  title="Channels"
                  count={filteredChannels.length}
                />
                <div className="space-y-0.5 px-1">
                  {filteredChannels.map((channel) => (
                    <ForwardDestinationItem
                      key={channel.id}
                      destination={channel}
                      isSelected={isSelected(channel.id)}
                      onSelectDestination={onToggleDestination}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Direct Messages */}
            {!isLoading && filteredDMs.length > 0 && (
              <div>
                <SectionHeader
                  icon={<MessageCircle className="h-3 w-3" />}
                  title="Direct Messages"
                  count={filteredDMs.length}
                />
                <div className="space-y-0.5 px-1">
                  {filteredDMs.map((dm) => (
                    <ForwardDestinationItem
                      key={dm.id}
                      destination={dm}
                      isSelected={isSelected(dm.id)}
                      onSelectDestination={onToggleDestination}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Selected Count */}
        {selectedDestinations.length > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {selectedDestinations.length} selected
              </span>
              <span className="text-xs text-muted-foreground">
                Max 10 destinations
              </span>
            </div>
          </>
        )}
      </div>
    );
  },
);

ForwardDestinationList.displayName = "ForwardDestinationList";

// ============================================================================
// Loading State Component
// ============================================================================

export function ForwardDestinationListSkeleton() {
  return (
    <div className="flex flex-col">
      {/* Search skeleton */}
      <div className="px-3 pb-3">
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <Separator />
      {/* List skeleton */}
      <div className="space-y-1 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <ForwardDestinationItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default ForwardDestinationList;
