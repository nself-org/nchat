/**
 * QuickRecallPanel Component
 *
 * Unified panel for accessing pins, bookmarks, saved messages, and stars.
 */

"use client";

import * as React from "react";
import { useQuickRecall } from "@/hooks/use-quick-recall";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Pin,
  Bookmark,
  Archive,
  Star,
  Search,
  X,
  ChevronRight,
  ExternalLink,
  Trash2,
  Zap,
} from "lucide-react";
import type {
  QuickRecallItem,
  QuickRecallFilter,
} from "@/hooks/use-quick-recall";
import { STAR_COLORS } from "@/lib/stars";

interface QuickRecallPanelProps {
  className?: string;
  channelId?: string;
  onClose?: () => void;
}

/**
 * Panel showing all saved items organized by type.
 */
export function QuickRecallPanel({
  className,
  channelId,
  onClose,
}: QuickRecallPanelProps) {
  const {
    items,
    recentItems,
    quickAccessItems,
    stats,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    jumpToMessage,
    removeItem,
    toggleQuickAccess,
    isLoading,
  } = useQuickRecall({ channelId });

  const [localSearch, setLocalSearch] = React.useState("");

  // Filter tabs
  const tabs: {
    value: QuickRecallFilter;
    label: string;
    icon: React.ReactNode;
    count: number;
  }[] = [
    {
      value: "all",
      label: "All",
      icon: null,
      count:
        stats.totalPins +
        stats.totalBookmarks +
        stats.totalSaved +
        stats.totalStarred,
    },
    {
      value: "pins",
      label: "Pins",
      icon: <Pin className="h-4 w-4" />,
      count: stats.totalPins,
    },
    {
      value: "bookmarks",
      label: "Bookmarks",
      icon: <Bookmark className="h-4 w-4" />,
      count: stats.totalBookmarks,
    },
    {
      value: "saved",
      label: "Saved",
      icon: <Archive className="h-4 w-4" />,
      count: stats.totalSaved,
    },
    {
      value: "stars",
      label: "Stars",
      icon: <Star className="h-4 w-4" />,
      count: stats.totalStarred,
    },
  ];

  return (
    <div
      className={cn("flex flex-col h-full bg-background border-l", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Quick Recall</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Quick Access Section */}
      {quickAccessItems.length > 0 && (
        <div className="px-4 py-3 border-b bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Quick Access</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickAccessItems.slice(0, 5).map((item) => (
              <QuickAccessChip
                key={item.id}
                item={item}
                onClick={() => jumpToMessage(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search saved items..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 justify-start">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5"
            >
              {tab.icon}
              <span>{tab.label}</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {tab.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Content */}
        <ScrollArea className="flex-1 mt-2">
          <TabsContent value="all" className="m-0 p-4">
            <ItemList
              items={items}
              searchQuery={localSearch}
              onJumpToMessage={jumpToMessage}
              onRemove={removeItem}
              onToggleQuickAccess={toggleQuickAccess}
            />
          </TabsContent>
          <TabsContent value="pins" className="m-0 p-4">
            <ItemList
              items={items.filter((i) => i.type === "pin")}
              searchQuery={localSearch}
              onJumpToMessage={jumpToMessage}
              onRemove={removeItem}
              onToggleQuickAccess={toggleQuickAccess}
            />
          </TabsContent>
          <TabsContent value="bookmarks" className="m-0 p-4">
            <ItemList
              items={items.filter((i) => i.type === "bookmark")}
              searchQuery={localSearch}
              onJumpToMessage={jumpToMessage}
              onRemove={removeItem}
              onToggleQuickAccess={toggleQuickAccess}
            />
          </TabsContent>
          <TabsContent value="saved" className="m-0 p-4">
            <ItemList
              items={items.filter((i) => i.type === "saved")}
              searchQuery={localSearch}
              onJumpToMessage={jumpToMessage}
              onRemove={removeItem}
              onToggleQuickAccess={toggleQuickAccess}
            />
          </TabsContent>
          <TabsContent value="stars" className="m-0 p-4">
            <ItemList
              items={items.filter((i) => i.type === "star")}
              searchQuery={localSearch}
              onJumpToMessage={jumpToMessage}
              onRemove={removeItem}
              onToggleQuickAccess={toggleQuickAccess}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Stats Footer */}
      <div className="px-4 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>
            {stats.totalPins +
              stats.totalBookmarks +
              stats.totalSaved +
              stats.totalStarred}{" "}
            items
          </span>
          <span>{stats.quickAccessCount} quick access</span>
          <span>{stats.highPriorityCount} high priority</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ItemListProps {
  items: QuickRecallItem[];
  searchQuery: string;
  onJumpToMessage: (item: QuickRecallItem) => void;
  onRemove: (item: QuickRecallItem) => void;
  onToggleQuickAccess: (item: QuickRecallItem) => void;
}

function ItemList({
  items,
  searchQuery,
  onJumpToMessage,
  onRemove,
  onToggleQuickAccess,
}: ItemListProps) {
  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.content.toLowerCase().includes(query) ||
        item.note?.toLowerCase().includes(query),
    );
  }, [items, searchQuery]);

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No items found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredItems.map((item) => (
        <QuickRecallItemCard
          key={item.id}
          item={item}
          onJumpToMessage={() => onJumpToMessage(item)}
          onRemove={() => onRemove(item)}
          onToggleQuickAccess={() => onToggleQuickAccess(item)}
        />
      ))}
    </div>
  );
}

interface QuickRecallItemCardProps {
  item: QuickRecallItem;
  onJumpToMessage: () => void;
  onRemove: () => void;
  onToggleQuickAccess: () => void;
}

function QuickRecallItemCard({
  item,
  onJumpToMessage,
  onRemove,
  onToggleQuickAccess,
}: QuickRecallItemCardProps) {
  const typeIcon = {
    pin: <Pin className="h-4 w-4" />,
    bookmark: <Bookmark className="h-4 w-4" />,
    saved: <Archive className="h-4 w-4" />,
    star: (
      <Star
        className="h-4 w-4"
        style={{
          color: item.starColor ? STAR_COLORS[item.starColor].hex : undefined,
        }}
        fill={item.starColor ? STAR_COLORS[item.starColor].hex : "none"}
      />
    ),
  };

  const typeLabel = {
    pin: "Pinned",
    bookmark: "Bookmarked",
    saved: "Saved",
    star: "Starred",
  };

  return (
    <div
      className={cn(
        "group relative p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
        item.isQuickAccess && "ring-1 ring-yellow-500/50",
      )}
      onClick={onJumpToMessage}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">{typeIcon[item.type]}</span>
        <span className="text-xs text-muted-foreground">
          {typeLabel[item.type]}
        </span>
        {item.isQuickAccess && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            <Zap className="h-3 w-3 mr-0.5" />
            Quick
          </Badge>
        )}
        <span className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(item.savedAt)}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm line-clamp-2">{item.content}</p>

      {/* Note */}
      {item.note && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
          Note: {item.note}
        </p>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {item.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {item.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{item.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onJumpToMessage();
          }}
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
        {item.type === "star" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onToggleQuickAccess();
            }}
          >
            <Zap
              className={cn("h-3 w-3", item.isQuickAccess && "text-yellow-500")}
            />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface QuickAccessChipProps {
  item: QuickRecallItem;
  onClick: () => void;
}

function QuickAccessChip({ item, onClick }: QuickAccessChipProps) {
  return (
    <button
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border hover:bg-accent transition-colors text-sm whitespace-nowrap"
      onClick={onClick}
    >
      <Star
        className="h-3 w-3"
        style={{
          color: item.starColor ? STAR_COLORS[item.starColor].hex : undefined,
        }}
        fill={item.starColor ? STAR_COLORS[item.starColor].hex : "none"}
      />
      <span className="max-w-[150px] truncate">{item.content}</span>
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
