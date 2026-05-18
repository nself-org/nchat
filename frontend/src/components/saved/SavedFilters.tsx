"use client";

import * as React from "react";
import { Filter, X, ArrowUpDown, Star, Tag } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type {
  SavedFilters as SavedFiltersType,
  SavedSortBy,
  SavedSortOrder,
} from "@/lib/saved";

export interface SavedFiltersProps {
  /** Current filters */
  filters: SavedFiltersType;
  /** Current sort field */
  sortBy: SavedSortBy;
  /** Current sort order */
  sortOrder: SavedSortOrder;
  /** Search query */
  searchQuery: string;
  /** Available tags for filtering */
  availableTags?: string[];
  /** Selected tags */
  selectedTags: string[];
  /** Callback when filters change */
  onFiltersChange: (filters: Partial<SavedFiltersType>) => void;
  /** Callback when sort changes */
  onSortChange: (sortBy: SavedSortBy, sortOrder: SavedSortOrder) => void;
  /** Callback when search changes */
  onSearchChange: (query: string) => void;
  /** Callback when tags selection changes */
  onTagsChange: (tags: string[]) => void;
  /** Callback to clear filters */
  onClearFilters: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Filters for saved messages.
 */
export function SavedFilters({
  filters,
  sortBy,
  sortOrder,
  searchQuery,
  availableTags = [],
  selectedTags,
  onFiltersChange,
  onSortChange,
  onSearchChange,
  onTagsChange,
  onClearFilters,
  className,
}: SavedFiltersProps) {
  const hasActiveFilters =
    searchQuery ||
    filters.starredOnly ||
    filters.hasReminder ||
    filters.messageType ||
    filters.hasAttachments !== undefined ||
    selectedTags.length > 0;

  const activeFilterCount = [
    searchQuery,
    filters.starredOnly,
    filters.hasReminder,
    filters.messageType,
    filters.hasAttachments !== undefined,
    selectedTags.length > 0,
  ].filter(Boolean).length;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Input
            placeholder="Search saved messages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={() => onSearchChange("")}
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
              SavedSortBy,
              SavedSortOrder,
            ];
            onSortChange(newSortBy, newSortOrder);
          }}
        >
          <SelectTrigger className="h-8 w-[160px] text-sm">
            <ArrowUpDown className="mr-2 h-3 w-3" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="savedAt-desc">Recently saved</SelectItem>
            <SelectItem value="savedAt-asc">Oldest saved</SelectItem>
            <SelectItem value="messageDate-desc">Newest messages</SelectItem>
            <SelectItem value="messageDate-asc">Oldest messages</SelectItem>
            <SelectItem value="channel-asc">By channel</SelectItem>
            <SelectItem value="reminder-asc">By reminder</SelectItem>
          </SelectContent>
        </Select>

        {/* Quick starred filter */}
        <Button
          variant={filters.starredOnly ? "secondary" : "outline"}
          size="sm"
          className="h-8 gap-1"
          onClick={() => onFiltersChange({ starredOnly: !filters.starredOnly })}
        >
          <Star
            className={cn(
              "h-3 w-3",
              filters.starredOnly && "fill-yellow-500 text-yellow-500",
            )}
          />
          Starred
        </Button>

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
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="reminders" className="text-sm font-medium">
                  With reminders
                </Label>
                <Switch
                  id="reminders"
                  checked={filters.hasReminder ?? false}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ hasReminder: checked || undefined })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="message-type-select"
                  className="text-sm font-medium"
                >
                  Message Type
                </Label>
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
                <Label
                  htmlFor="attachments-select"
                  className="text-sm font-medium"
                >
                  Attachments
                </Label>
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
                  Clear all filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tags filter */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <Tag className="mr-1 h-3 w-3 text-muted-foreground" />
          {availableTags.slice(0, 10).map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
          {availableTags.length > 10 && (
            <span className="text-xs text-muted-foreground">
              +{availableTags.length - 10} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
