"use client";

import * as React from "react";
import { useState } from "react";
import {
  MessageSquare,
  Megaphone,
  Users,
  FolderKanban,
  HelpCircle,
  Coffee,
  BookOpen,
  Archive,
  Hash,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DEFAULT_CATEGORIES,
  type ChannelCategoryDefinition,
} from "@/lib/channels/channel-categories";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelCategoriesProps {
  channels: Channel[];
  selectedCategory?: string | null;
  onCategorySelect?: (categoryId: string | null) => void;
  variant?: "default" | "compact" | "pills" | "sidebar";
  showCounts?: boolean;
  showAllOption?: boolean;
  className?: string;
}

// ============================================================================
// Icon Mapping
// ============================================================================

const CATEGORY_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  MessageSquare,
  Megaphone,
  Users,
  FolderKanban,
  HelpCircle,
  Coffee,
  BookOpen,
  Archive,
  Hash,
};

function getCategoryIcon(iconName: string) {
  return CATEGORY_ICON_MAP[iconName] || Hash;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelCategories({
  channels,
  selectedCategory,
  onCategorySelect,
  variant = "default",
  showCounts = true,
  showAllOption = true,
  className,
}: ChannelCategoriesProps) {
  // Calculate channel counts per category
  const categoryCounts = React.useMemo(() => {
    const counts = new Map<string | null, number>();
    counts.set(null, channels.length); // All channels

    for (const channel of channels) {
      const categoryId = channel.categoryId;
      counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
    }

    return counts;
  }, [channels]);

  // Filter categories that have channels
  const visibleCategories = DEFAULT_CATEGORIES.filter(
    (cat) => cat.id !== "archived" && (categoryCounts.get(cat.id) || 0) > 0,
  );

  if (variant === "pills") {
    return (
      <ScrollArea className={cn("w-full whitespace-nowrap", className)}>
        <div className="flex gap-2 pb-2">
          {showAllOption && (
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => onCategorySelect?.(null)}
              className="flex-shrink-0"
            >
              All
              {showCounts && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {categoryCounts.get(null) || 0}
                </Badge>
              )}
            </Button>
          )}
          {visibleCategories.map((category) => {
            const Icon = getCategoryIcon(category.icon);
            const isSelected = selectedCategory === category.id;
            const count = categoryCounts.get(category.id) || 0;

            return (
              <Button
                key={category.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onCategorySelect?.(category.id)}
                className="flex-shrink-0"
              >
                <Icon className="mr-1.5 h-4 w-4" />
                {category.name}
                {showCounts && (
                  <Badge
                    variant={isSelected ? "outline" : "secondary"}
                    className="ml-2 h-5 px-1.5"
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {showAllOption && (
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent"
            onClick={() => onCategorySelect?.(null)}
          >
            All {showCounts && `(${categoryCounts.get(null) || 0})`}
          </Badge>
        )}
        {visibleCategories.map((category) => {
          const isSelected = selectedCategory === category.id;
          const count = categoryCounts.get(category.id) || 0;

          return (
            <Badge
              key={category.id}
              variant={isSelected ? "default" : "outline"}
              className="cursor-pointer hover:bg-accent"
              onClick={() => onCategorySelect?.(category.id)}
            >
              {category.name} {showCounts && `(${count})`}
            </Badge>
          );
        })}
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={cn("space-y-1", className)}>
        {showAllOption && (
          <button
            onClick={() => onCategorySelect?.(null)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
              "hover:bg-accent",
              selectedCategory === null && "bg-accent font-medium",
            )}
          >
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span>All Channels</span>
            </div>
            {showCounts && (
              <span className="text-xs text-muted-foreground">
                {categoryCounts.get(null) || 0}
              </span>
            )}
          </button>
        )}
        {visibleCategories.map((category) => {
          const Icon = getCategoryIcon(category.icon);
          const isSelected = selectedCategory === category.id;
          const count = categoryCounts.get(category.id) || 0;

          return (
            <button
              key={category.id}
              onClick={() => onCategorySelect?.(category.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                "hover:bg-accent",
                isSelected && "bg-accent font-medium",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: category.color }} />
                <span>{category.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {showCounts && (
                  <span className="text-xs text-muted-foreground">{count}</span>
                )}
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Default variant - card style
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4",
        className,
      )}
    >
      {showAllOption && (
        <button
          onClick={() => onCategorySelect?.(null)}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border p-4 transition-colors",
            "hover:border-primary/50 hover:bg-accent",
            selectedCategory === null && "bg-primary/5 border-primary",
          )}
        >
          <div className="mb-2 rounded-lg bg-muted p-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium">All Channels</span>
          {showCounts && (
            <span className="mt-1 text-xs text-muted-foreground">
              {categoryCounts.get(null) || 0} channels
            </span>
          )}
        </button>
      )}
      {visibleCategories.map((category) => {
        const Icon = getCategoryIcon(category.icon);
        const isSelected = selectedCategory === category.id;
        const count = categoryCounts.get(category.id) || 0;

        return (
          <button
            key={category.id}
            onClick={() => onCategorySelect?.(category.id)}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border p-4 transition-colors",
              "hover:border-primary/50 hover:bg-accent",
              isSelected && "bg-primary/5 border-primary",
            )}
          >
            <div
              className="mb-2 rounded-lg p-2"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <Icon className="h-5 w-5" style={{ color: category.color }} />
            </div>
            <span className="text-sm font-medium">{category.name}</span>
            {showCounts && (
              <span className="mt-1 text-xs text-muted-foreground">
                {count} channels
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

ChannelCategories.displayName = "ChannelCategories";
