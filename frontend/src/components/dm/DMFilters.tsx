"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Inbox,
  Mail,
  Star,
  Archive,
  VolumeX,
  ArrowUpDown,
  Clock,
  SortAsc,
  MessageCircle,
} from "lucide-react";
import type { DMFilterType, DMSortType } from "@/lib/dm/dm-types";

// ============================================================================
// Types
// ============================================================================

interface DMFiltersProps {
  currentFilter: DMFilterType;
  currentSort: DMSortType;
  onFilterChange: (filter: DMFilterType) => void;
  onSortChange: (sort: DMSortType) => void;
  className?: string;
}

// ============================================================================
// Filter & Sort Options
// ============================================================================

const filterOptions: Array<{
  value: DMFilterType;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "all", label: "All", icon: <Inbox className="h-4 w-4" /> },
  { value: "unread", label: "Unread", icon: <Mail className="h-4 w-4" /> },
  { value: "starred", label: "Starred", icon: <Star className="h-4 w-4" /> },
  {
    value: "archived",
    label: "Archived",
    icon: <Archive className="h-4 w-4" />,
  },
  { value: "muted", label: "Muted", icon: <VolumeX className="h-4 w-4" /> },
];

const sortOptions: Array<{
  value: DMSortType;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: "recent",
    label: "Most Recent",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    value: "unread",
    label: "Unread First",
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    value: "alphabetical",
    label: "Alphabetical",
    icon: <SortAsc className="h-4 w-4" />,
  },
];

// ============================================================================
// Component
// ============================================================================

export function DMFilters({
  currentFilter,
  currentSort,
  onFilterChange,
  onSortChange,
  className,
}: DMFiltersProps) {
  const currentFilterOption = filterOptions.find(
    (f) => f.value === currentFilter,
  );
  const currentSortOption = sortOptions.find((s) => s.value === currentSort);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            {currentFilterOption?.icon}
            <span>{currentFilterOption?.label || "All"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel className="text-xs">Filter by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={currentFilter}
            onValueChange={(value) => onFilterChange(value as DMFilterType)}
          >
            {filterOptions.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="gap-2"
              >
                {option.icon}
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {currentSortOption?.label || "Sort"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={currentSort}
            onValueChange={(value) => onSortChange(value as DMSortType)}
          >
            {sortOptions.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="gap-2"
              >
                {option.icon}
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Quick Filter Tabs (Alternative UI)
// ============================================================================

interface DMQuickFiltersProps {
  currentFilter: DMFilterType;
  onFilterChange: (filter: DMFilterType) => void;
  unreadCount?: number;
  className?: string;
}

export function DMQuickFilters({
  currentFilter,
  onFilterChange,
  unreadCount = 0,
  className,
}: DMQuickFiltersProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {filterOptions.slice(0, 3).map((option) => (
        <Button
          key={option.value}
          variant={currentFilter === option.value ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => onFilterChange(option.value)}
        >
          {option.label}
          {option.value === "unread" && unreadCount > 0 && (
            <span className="text-primary-foreground ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}

DMFilters.displayName = "DMFilters";
DMQuickFilters.displayName = "DMQuickFilters";
