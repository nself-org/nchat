"use client";

/**
 * ActivityFilters Component
 *
 * Filter controls for the activity feed
 */

import * as React from "react";
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
  getAllCategories,
  getCategoryLabel,
  hasActiveFilters,
  clearFilters,
} from "@/lib/activity/activity-filters";
import type {
  ActivityFilters as ActivityFiltersType,
  ActivityCategory,
  ActivityFiltersProps,
} from "@/lib/activity/activity-types";

// Search icon component
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// X icon component
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Calendar icon component
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function ActivityFilters({
  filters,
  onChange,
  availableCategories,
  showSearch = true,
  showDateRange = false,
}: ActivityFiltersProps) {
  const [searchValue, setSearchValue] = React.useState(
    filters.searchQuery || "",
  );
  const categories = availableCategories || getAllCategories();

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.searchQuery) {
        onChange({ ...filters, searchQuery: searchValue || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, filters, onChange]);

  const handleCategoryChange = (category: string) => {
    const newCategory =
      category === "all" ? undefined : (category as ActivityCategory);
    onChange({ ...filters, category: newCategory });
  };

  const handleClearFilters = () => {
    setSearchValue("");
    onChange(clearFilters());
  };

  const hasFilters = hasActiveFilters(filters);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {/* Category filter */}
        <Select
          value={filters.category || "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Activity" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {getCategoryLabel(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search input */}
        {showSearch && (
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search activities..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => setSearchValue("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Clear filters button */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="shrink-0"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Date range filter */}
      {showDateRange && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={filters.dateFrom?.split("T")[0] || ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  dateFrom: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
              className="w-[150px] pl-9"
              placeholder="From"
            />
          </div>
          <span className="text-muted-foreground">to</span>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={filters.dateTo?.split("T")[0] || ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  dateTo: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
              className="w-[150px] pl-9"
              placeholder="To"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tab-style filter for common categories
 */
export function ActivityFilterTabs({
  activeCategory,
  onChange,
  counts,
  className,
}: {
  activeCategory: ActivityCategory;
  onChange: (category: ActivityCategory) => void;
  counts?: Partial<Record<ActivityCategory, number>>;
  className?: string;
}) {
  const tabs: { category: ActivityCategory; label: string }[] = [
    { category: "all", label: "All" },
    { category: "mentions", label: "Mentions" },
    { category: "threads", label: "Threads" },
    { category: "reactions", label: "Reactions" },
    { category: "files", label: "Files" },
  ];

  return (
    <div
      className={cn(
        "bg-muted/50 flex items-center gap-1 rounded-lg p-1",
        className,
      )}
    >
      {tabs.map(({ category, label }) => {
        const count = counts?.[category];
        const isActive = activeCategory === category;

        return (
          <button
            key={category}
            type="button"
            onClick={() => onChange(category)}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                  isActive
                    ? "text-primary-foreground bg-primary"
                    : "bg-muted-foreground/20",
                )}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ActivityFilters;
