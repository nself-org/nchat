"use client";

/**
 * AnalyticsHeader - Header component with date range picker and filters
 */

import * as React from "react";
import { format } from "date-fns";
import {
  Calendar,
  ChevronDown,
  RefreshCw,
  Download,
  Filter,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";

import { useAnalyticsStore } from "@/stores/analytics-store";
import type {
  DateRangePreset,
  TimeGranularity,
} from "@/lib/analytics/analytics-types";

// ============================================================================
// Types
// ============================================================================

interface AnalyticsHeaderProps {
  title?: string;
  showFilters?: boolean;
  showExport?: boolean;
  onExport?: () => void;
  className?: string;
}

// ============================================================================
// Date Range Presets
// ============================================================================

const dateRangePresets: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 days" },
  { value: "last30days", label: "Last 30 days" },
  { value: "last90days", label: "Last 90 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisYear", label: "This year" },
];

const granularityOptions: { value: TimeGranularity; label: string }[] = [
  { value: "hour", label: "Hourly" },
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

// ============================================================================
// Component
// ============================================================================

export function AnalyticsHeader({
  title = "Analytics",
  showFilters = true,
  showExport = true,
  onExport,
  className,
}: AnalyticsHeaderProps) {
  const {
    dateRange,
    dateRangePreset,
    granularity,
    selectedChannelIds,
    selectedUserIds,
    includeBots,
    isLoading,
    lastUpdated,
    setDateRangePreset,
    setGranularity,
    resetFilters,
    refreshData,
  } = useAnalyticsStore();

  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const activeFiltersCount =
    (selectedChannelIds.length > 0 ? 1 : 0) +
    (selectedUserIds.length > 0 ? 1 : 0) +
    (includeBots ? 1 : 0);

  const handleRefresh = async () => {
    await refreshData();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Title and Actions Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {format(lastUpdated, "MMM d, yyyy h:mm a")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
            />
            Refresh
          </Button>

          {showExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Filters Row */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <Select
            value={dateRangePreset}
            onValueChange={(value) =>
              setDateRangePreset(value as DateRangePreset)
            }
          >
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              {dateRangePresets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Display */}
          <div className="bg-muted/50 hidden rounded-md border px-3 py-2 text-sm sm:block">
            {format(dateRange.start, "MMM d, yyyy")} -{" "}
            {format(dateRange.end, "MMM d, yyyy")}
          </div>

          <Separator orientation="vertical" className="hidden h-8 sm:block" />

          {/* Granularity Selector */}
          <Select
            value={granularity}
            onValueChange={(value) => setGranularity(value as TimeGranularity)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Granularity" />
            </SelectTrigger>
            <SelectContent>
              {granularityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced Filters */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        resetFilters();
                        setIsFilterOpen(false);
                      }}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Clear all
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Channel Filter */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Channels</span>
                  <p className="text-xs text-muted-foreground">
                    {selectedChannelIds.length === 0
                      ? "All channels"
                      : // eslint-disable-next-line no-restricted-syntax
                        `${selectedChannelIds.length} selected`}
                  </p>
                  {/* Channel selector would go here */}
                </div>

                {/* User Filter */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Users</span>
                  <p className="text-xs text-muted-foreground">
                    {selectedUserIds.length === 0
                      ? "All users"
                      : // eslint-disable-next-line no-restricted-syntax
                        `${selectedUserIds.length} selected`}
                  </p>
                  {/* User selector would go here */}
                </div>

                {/* Include Bots Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Include bots</span>
                  <Badge variant={includeBots ? "default" : "outline"}>
                    {includeBots ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Active Filter Badges */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2">
              {selectedChannelIds.length > 0 && (
                <Badge variant="secondary">
                  {selectedChannelIds.length} channel
                  {selectedChannelIds.length > 1 ? "s" : ""}
                </Badge>
              )}
              {selectedUserIds.length > 0 && (
                <Badge variant="secondary">
                  {selectedUserIds.length} user
                  {selectedUserIds.length > 1 ? "s" : ""}
                </Badge>
              )}
              {includeBots && <Badge variant="secondary">Including bots</Badge>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalyticsHeader;
