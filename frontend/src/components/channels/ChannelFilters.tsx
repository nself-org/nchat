"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Filter,
  Hash,
  Lock,
  Users,
  TrendingUp,
  Sparkles,
  Activity,
  ChevronDown,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  DiscoveryFilters,
  DiscoverySortOption,
} from "@/lib/channels/channel-discovery";
import { DEFAULT_CATEGORIES } from "@/lib/channels/channel-categories";

// ============================================================================
// Types
// ============================================================================

export interface ChannelFiltersProps {
  filters: DiscoveryFilters;
  onFiltersChange: (filters: DiscoveryFilters) => void;
  showCategoryFilter?: boolean;
  showTypeFilter?: boolean;
  showSortFilter?: boolean;
  showAdvancedFilters?: boolean;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SORT_OPTIONS: Array<{ value: DiscoverySortOption; label: string }> = [
  { value: "activity", label: "Recently Active" },
  { value: "memberCount", label: "Most Members" },
  { value: "created", label: "Newest" },
  { value: "name", label: "Alphabetical" },
  { value: "trending", label: "Trending" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Channels", icon: Hash },
  { value: "public", label: "Public", icon: Hash },
  { value: "private", label: "Private", icon: Lock },
] as const;

// ============================================================================
// Component
// ============================================================================

export function ChannelFilters({
  filters,
  onFiltersChange,
  showCategoryFilter = true,
  showTypeFilter = true,
  showSortFilter = true,
  showAdvancedFilters = true,
  className,
}: ChannelFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Count active filters
  const activeFilterCount = [
    filters.type && filters.type !== "all",
    filters.categoryId !== undefined,
    filters.hasActivity,
    filters.memberCountMin !== undefined,
    filters.memberCountMax !== undefined,
    filters.excludeJoined,
  ].filter(Boolean).length;

  // Handle filter changes
  const updateFilter = useCallback(
    <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange],
  );

  // Handle clear all filters
  const clearFilters = useCallback(() => {
    onFiltersChange({
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection,
    });
  }, [filters.sortBy, filters.sortDirection, onFiltersChange]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Type Filter */}
      {showTypeFilter && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              {TYPE_OPTIONS.find((t) => t.value === (filters.type || "all"))
                ?.icon && <Hash className="mr-2 h-4 w-4" />}
              {TYPE_OPTIONS.find((t) => t.value === (filters.type || "all"))
                ?.label || "All Channels"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {TYPE_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={(filters.type || "all") === option.value}
                onCheckedChange={() =>
                  updateFilter("type", option.value as any)
                }
              >
                <option.icon className="mr-2 h-4 w-4" />
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Category Filter */}
      {showCategoryFilter && (
        <Select
          value={filters.categoryId ?? "all"}
          onValueChange={(value) =>
            updateFilter("categoryId", value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {DEFAULT_CATEGORIES.filter(
              (c) => !c.isSystem || c.id !== "archived",
            ).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Sort Filter */}
      {showSortFilter && (
        <Select
          value={filters.sortBy || "activity"}
          onValueChange={(value) =>
            updateFilter("sortBy", value as DiscoverySortOption)
          }
        >
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {/* Activity Filter */}
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="activity-filter"
                  className="flex items-center gap-2"
                >
                  <Activity className="h-4 w-4" />
                  Recently active only
                </Label>
                <Switch
                  id="activity-filter"
                  checked={filters.hasActivity || false}
                  onCheckedChange={(checked) =>
                    updateFilter("hasActivity", checked)
                  }
                />
              </div>

              {/* Exclude Joined Filter */}
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="exclude-joined"
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Hide channels I have joined
                </Label>
                <Switch
                  id="exclude-joined"
                  checked={filters.excludeJoined || false}
                  onCheckedChange={(checked) =>
                    updateFilter("excludeJoined", checked)
                  }
                />
              </div>

              {/* Member Count Range */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Member count range
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Min"
                    value={filters.memberCountMin ?? ""}
                    onChange={(e) =>
                      updateFilter(
                        "memberCountMin",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    className="h-8 w-20 rounded-md border px-2 text-sm"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Max"
                    value={filters.memberCountMax ?? ""}
                    onChange={(e) =>
                      updateFilter(
                        "memberCountMax",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    className="h-8 w-20 rounded-md border px-2 text-sm"
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="space-y-2">
                <Label>Quick filters</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={filters.hasActivity ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      updateFilter("hasActivity", !filters.hasActivity)
                    }
                  >
                    <Activity className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                  <Badge
                    variant={
                      filters.memberCountMin === 10 ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() =>
                      updateFilter(
                        "memberCountMin",
                        filters.memberCountMin === 10 ? undefined : 10,
                      )
                    }
                  >
                    <TrendingUp className="mr-1 h-3 w-3" />
                    Popular
                  </Badge>
                  <Badge
                    variant={
                      filters.createdAfter !== undefined ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => {
                      const weekAgo = new Date(
                        Date.now() - 7 * 24 * 60 * 60 * 1000,
                      );
                      updateFilter(
                        "createdAfter",
                        filters.createdAfter ? undefined : weekAgo,
                      );
                    }}
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    New
                  </Badge>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.hasActivity && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => updateFilter("hasActivity", false)}
            >
              Active only
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {filters.excludeJoined && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => updateFilter("excludeJoined", false)}
            >
              Not joined
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {filters.memberCountMin !== undefined && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => updateFilter("memberCountMin", undefined)}
            >
              Min {filters.memberCountMin} members
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

ChannelFilters.displayName = "ChannelFilters";
