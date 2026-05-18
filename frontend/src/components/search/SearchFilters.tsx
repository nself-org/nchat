"use client";

/**
 * SearchFilters Component
 *
 * Advanced search filters for date range, channel, user, file type
 */

import React from "react";
import { Calendar, User, Hash, FileType, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export interface SearchFiltersProps {
  filters: Record<string, unknown>;
  onChange: (filters: Record<string, unknown>) => void;
}

export function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const updateFilter = (key: string, value: unknown) => {
    onChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Advanced Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-auto px-2 py-1 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label htmlFor="dateFrom" className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            From Date
          </Label>
          <Input
            id="dateFrom"
            type="date"
            value={(filters.dateFrom as string) || ""}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo" className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            To Date
          </Label>
          <Input
            id="dateTo"
            type="date"
            value={(filters.dateTo as string) || ""}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {/* Channel Filter */}
        <div className="space-y-2">
          <Label
            htmlFor="channelIds"
            className="flex items-center gap-1 text-xs"
          >
            <Hash className="h-3 w-3" />
            Channels
          </Label>
          <Input
            id="channelIds"
            type="text"
            placeholder="channel-id-1, channel-id-2"
            value={(filters.channelIds as string[])?.join(", ") || ""}
            onChange={(e) =>
              updateFilter(
                "channelIds",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            className="h-8 text-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            Comma-separated channel IDs (or use in:channel in search)
          </p>
        </div>

        {/* User Filter */}
        <div className="space-y-2">
          <Label htmlFor="userIds" className="flex items-center gap-1 text-xs">
            <User className="h-3 w-3" />
            Users
          </Label>
          <Input
            id="userIds"
            type="text"
            placeholder="user-id-1, user-id-2"
            value={(filters.userIds as string[])?.join(", ") || ""}
            onChange={(e) =>
              updateFilter(
                "userIds",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            className="h-8 text-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            Comma-separated user IDs (or use from:username in search)
          </p>
        </div>
      </div>

      {/* Content Type Filters */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1 text-xs">
          <FileType className="h-3 w-3" />
          Content Types
        </Label>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasLink"
              checked={(filters.hasLink as boolean) || false}
              onCheckedChange={(checked) => updateFilter("hasLink", checked)}
            />
            <label
              htmlFor="hasLink"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Has Link
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasFile"
              checked={(filters.hasFile as boolean) || false}
              onCheckedChange={(checked) => updateFilter("hasFile", checked)}
            />
            <label
              htmlFor="hasFile"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Has File
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasImage"
              checked={(filters.hasImage as boolean) || false}
              onCheckedChange={(checked) => updateFilter("hasImage", checked)}
            />
            <label
              htmlFor="hasImage"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Has Image
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPinned"
              checked={(filters.isPinned as boolean) || false}
              onCheckedChange={(checked) => updateFilter("isPinned", checked)}
            />
            <label
              htmlFor="isPinned"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Pinned Only
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isStarred"
              checked={(filters.isStarred as boolean) || false}
              onCheckedChange={(checked) => updateFilter("isStarred", checked)}
            />
            <label
              htmlFor="isStarred"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Starred Only
            </label>
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="space-y-2">
        <Label htmlFor="sortBy" className="text-xs">
          Sort By
        </Label>
        <div className="flex gap-2">
          <select
            id="sortBy"
            value={(filters.sortBy as string) || "relevance"}
            onChange={(e) => updateFilter("sortBy", e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="relevance">Relevance</option>
            <option value="date">Date</option>
          </select>

          <select
            id="sortOrder"
            value={(filters.sortOrder as string) || "desc"}
            onChange={(e) => updateFilter("sortOrder", e.target.value)}
            className="flex h-8 w-32 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default SearchFilters;
