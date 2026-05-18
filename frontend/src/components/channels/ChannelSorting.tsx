"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  ArrowUpDown,
  Clock,
  MessageSquare,
  Hash,
  Users,
  Star,
  SortAsc,
  SortDesc,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export type SortField =
  | "name"
  | "activity"
  | "members"
  | "created"
  | "custom"
  | "unread";
export type SortDirection = "asc" | "desc";

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

export interface ChannelSortingProps {
  value?: SortOption;
  onChange?: (option: SortOption) => void;
  variant?: "dropdown" | "popover" | "inline";
  showLabel?: boolean;
  className?: string;
}

// ============================================================================
// Sort Field Definitions
// ============================================================================

const SORT_FIELDS: Array<{
  field: SortField;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultDirection: SortDirection;
}> = [
  {
    field: "activity",
    label: "Recent Activity",
    description: "Channels with recent messages first",
    icon: Clock,
    defaultDirection: "desc",
  },
  {
    field: "name",
    label: "Alphabetical",
    description: "Sort by channel name (A-Z or Z-A)",
    icon: Hash,
    defaultDirection: "asc",
  },
  {
    field: "members",
    label: "Member Count",
    description: "Channels with most members first",
    icon: Users,
    defaultDirection: "desc",
  },
  {
    field: "created",
    label: "Date Created",
    description: "Newest or oldest channels first",
    icon: MessageSquare,
    defaultDirection: "desc",
  },
  {
    field: "unread",
    label: "Unread Messages",
    description: "Channels with unread messages first",
    icon: Star,
    defaultDirection: "desc",
  },
  {
    field: "custom",
    label: "Custom Order",
    description: "Your manually arranged order",
    icon: ArrowUpDown,
    defaultDirection: "asc",
  },
];

// ============================================================================
// Component
// ============================================================================

export function ChannelSorting({
  value = { field: "activity", direction: "desc" },
  onChange,
  variant = "dropdown",
  showLabel = true,
  className,
}: ChannelSortingProps) {
  const currentField =
    SORT_FIELDS.find((f) => f.field === value.field) || SORT_FIELDS[0];

  const handleFieldChange = (field: SortField) => {
    const fieldDef = SORT_FIELDS.find((f) => f.field === field);
    onChange?.({
      field,
      direction: fieldDef?.defaultDirection || "asc",
    });
  };

  const handleDirectionToggle = () => {
    onChange?.({
      ...value,
      direction: value.direction === "asc" ? "desc" : "asc",
    });
  };

  // Dropdown variant
  if (variant === "dropdown") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
          >
            <ArrowUpDown className="h-4 w-4" />
            {showLabel && <span>{currentField.label}</span>}
            {value.direction === "asc" ? (
              <SortAsc className="h-3 w-3" />
            ) : (
              <SortDesc className="h-3 w-3" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          <DropdownMenuLabel>Sort channels by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {SORT_FIELDS.map(({ field, label, icon: Icon }) => (
              <DropdownMenuItem
                key={field}
                onClick={() => handleFieldChange(field)}
                className="gap-2"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{label}</span>
                {value.field === field && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Direction</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value.direction}
            onValueChange={(dir) =>
              onChange?.({ ...value, direction: dir as SortDirection })
            }
          >
            <DropdownMenuRadioItem value="asc" className="gap-2">
              <SortAsc className="h-4 w-4" />
              Ascending
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc" className="gap-2">
              <SortDesc className="h-4 w-4" />
              Descending
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Popover variant
  if (variant === "popover") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
          >
            <ArrowUpDown className="h-4 w-4" />
            {showLabel && <span>{currentField.label}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px]" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Sort by
              </Label>
              <RadioGroup
                value={value.field}
                onValueChange={(field) => handleFieldChange(field as SortField)}
                className="gap-2"
              >
                {SORT_FIELDS.map(
                  ({ field, label, description, icon: Icon }) => (
                    <div key={field} className="flex items-start space-x-3">
                      <RadioGroupItem
                        value={field}
                        id={`sort-${field}`}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-0.5">
                        <Label
                          htmlFor={`sort-${field}`}
                          className="flex cursor-pointer items-center gap-2 font-medium"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {description}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Direction
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={value.direction === "asc" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => onChange?.({ ...value, direction: "asc" })}
                >
                  <SortAsc className="h-4 w-4" />
                  Ascending
                </Button>
                <Button
                  variant={value.direction === "desc" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => onChange?.({ ...value, direction: "desc" })}
                >
                  <SortDesc className="h-4 w-4" />
                  Descending
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Inline variant
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <select
        value={value.field}
        onChange={(e) => handleFieldChange(e.target.value as SortField)}
        className={cn(
          "h-9 rounded-md border border-input bg-background px-3 py-1",
          "text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        )}
      >
        {SORT_FIELDS.map(({ field, label }) => (
          <option key={field} value={field}>
            {label}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={handleDirectionToggle}
        title={value.direction === "asc" ? "Ascending" : "Descending"}
      >
        {value.direction === "asc" ? (
          <SortAsc className="h-4 w-4" />
        ) : (
          <SortDesc className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// Sorting Helper Function
// ============================================================================

export function sortChannels(
  channels: Channel[],
  sortOption: SortOption,
  unreadCounts?: Map<string, number>,
): Channel[] {
  const sorted = [...channels];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortOption.field) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;

      case "activity":
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        comparison = bTime - aTime;
        break;

      case "members":
        comparison = (b.memberCount || 0) - (a.memberCount || 0);
        break;

      case "created":
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = bCreated - aCreated;
        break;

      case "unread":
        const aUnread = unreadCounts?.get(a.id) || 0;
        const bUnread = unreadCounts?.get(b.id) || 0;
        comparison = bUnread - aUnread;
        break;

      case "custom":
        // Custom order would rely on a position field
        // For now, maintain insertion order
        comparison = 0;
        break;

      default:
        comparison = 0;
    }

    // Apply direction
    return sortOption.direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

// ============================================================================
// Hook for Channel Sorting
// ============================================================================

const SORT_STORAGE_KEY = "nchat-channel-sort-preference";

export function useChannelSorting(defaultSort?: SortOption) {
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    // Try to load from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SORT_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Invalid JSON, use default
        }
      }
    }
    return defaultSort || { field: "activity", direction: "desc" };
  });

  const handleSortChange = React.useCallback((option: SortOption) => {
    setSortOption(option);
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(option));
    }
  }, []);

  const sortedChannels = React.useCallback(
    (channels: Channel[], unreadCounts?: Map<string, number>) => {
      return sortChannels(channels, sortOption, unreadCounts);
    },
    [sortOption],
  );

  return {
    sortOption,
    setSortOption: handleSortChange,
    sortChannels: sortedChannels,
  };
}

ChannelSorting.displayName = "ChannelSorting";
