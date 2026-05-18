"use client";

import * as React from "react";
import { Filter, X, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { PinFilters, PinSortBy, PinSortOrder } from "@/lib/pinned";

export interface PinnedFiltersProps {
  /** Current filters */
  filters: PinFilters;
  /** Current sort field */
  sortBy: PinSortBy;
  /** Current sort order */
  sortOrder: PinSortOrder;
  /** Callback when filters change */
  onFiltersChange: (filters: Partial<PinFilters>) => void;
  /** Callback when sort changes */
  onSortChange: (sortBy: PinSortBy, sortOrder: PinSortOrder) => void;
  /** Callback to clear filters */
  onClearFilters: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Filters for pinned messages.
 */
export function PinnedFilters({
  filters,
  sortBy,
  sortOrder,
  onFiltersChange,
  onSortChange,
  onClearFilters,
  className,
}: PinnedFiltersProps) {
  const hasActiveFilters =
    filters.searchQuery ||
    filters.pinnedByUserId ||
    filters.messageType ||
    filters.hasAttachments !== undefined;

  const activeFilterCount = [
    filters.searchQuery,
    filters.pinnedByUserId,
    filters.messageType,
    filters.hasAttachments !== undefined,
  ].filter(Boolean).length;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Search */}
      <div className="relative flex-1">
        <Input
          placeholder="Search pinned messages..."
          value={filters.searchQuery ?? ""}
          onChange={(e) =>
            onFiltersChange({ searchQuery: e.target.value || undefined })
          }
          className="h-8 text-sm"
        />
        {filters.searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
            onClick={() => onFiltersChange({ searchQuery: undefined })}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Sort */}
      <Select
        value={`${sortBy}-${sortOrder}`}
        onValueChange={(value) => {
          const [newSortBy, newSortOrder] = value.split("-") as [
            PinSortBy,
            PinSortOrder,
          ];
          onSortChange(newSortBy, newSortOrder);
        }}
      >
        <SelectTrigger className="h-8 w-[160px] text-sm">
          <ArrowUpDown className="mr-2 h-3 w-3" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="position-asc">Position</SelectItem>
          <SelectItem value="pinnedAt-desc">Recently pinned</SelectItem>
          <SelectItem value="pinnedAt-asc">Oldest pinned</SelectItem>
          <SelectItem value="messageDate-desc">Newest messages</SelectItem>
          <SelectItem value="messageDate-asc">Oldest messages</SelectItem>
        </SelectContent>
      </Select>

      {/* Filter popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Filter className="h-3 w-3" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="flex h-5 w-5 items-center justify-center p-0 text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="message-type-select"
                className="text-sm font-medium"
              >
                Message Type
              </label>
              <Select
                value={filters.messageType ?? "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    messageType: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="voice">Voice</SelectItem>
                  <SelectItem value="poll">Poll</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="attachments-select"
                className="text-sm font-medium"
              >
                Attachments
              </label>
              <Select
                value={
                  filters.hasAttachments === undefined
                    ? "all"
                    : filters.hasAttachments
                      ? "with"
                      : "without"
                }
                onValueChange={(value) =>
                  onFiltersChange({
                    hasAttachments:
                      value === "all" ? undefined : value === "with",
                  })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="with">With attachments</SelectItem>
                  <SelectItem value="without">Without attachments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="w-full"
              >
                <X className="mr-1 h-3 w-3" />
                Clear filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
