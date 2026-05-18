"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Hash,
  Lock,
  ChevronRight,
  Folder,
  FolderOpen,
  LayoutGrid,
  List,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChannelCard } from "./ChannelCard";
import { JoinChannelButton } from "./JoinChannelButton";
import { DEFAULT_CATEGORIES } from "@/lib/channels/channel-categories";
import { formatMemberCount } from "@/lib/channels/channel-stats";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelDirectoryProps {
  channels: Channel[];
  joinedChannelIds?: Set<string>;
  showSearch?: boolean;
  showSort?: boolean;
  defaultExpanded?: boolean;
  layout?: "tree" | "grid" | "list";
  onJoin?: (channelId: string) => void;
  onLeave?: (channelId: string) => void;
  onChannelClick?: (channel: Channel) => void;
  className?: string;
}

type SortOption = "name" | "members" | "activity";

// ============================================================================
// Component
// ============================================================================

export function ChannelDirectory({
  channels,
  joinedChannelIds = new Set(),
  showSearch = true,
  showSort = true,
  defaultExpanded = true,
  layout = "tree",
  onJoin,
  onLeave,
  onChannelClick,
  className,
}: ChannelDirectoryProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(defaultExpanded ? DEFAULT_CATEGORIES.map((c) => c.id) : []),
  );

  // Group channels by category
  const channelsByCategory = useMemo(() => {
    const grouped = new Map<string | null, Channel[]>();

    // Initialize categories
    for (const category of DEFAULT_CATEGORIES) {
      grouped.set(category.id, []);
    }
    grouped.set(null, []); // Uncategorized

    // Group channels
    for (const channel of channels) {
      const categoryId = channel.categoryId;
      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, []);
      }
      grouped.get(categoryId)!.push(channel);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      for (const [categoryId, channelList] of grouped) {
        grouped.set(
          categoryId,
          channelList.filter(
            (c) =>
              c.name.toLowerCase().includes(query) ||
              c.description?.toLowerCase().includes(query),
          ),
        );
      }
    }

    // Sort channels within each category
    for (const [categoryId, channelList] of grouped) {
      grouped.set(categoryId, sortChannelList(channelList, sortBy));
    }

    return grouped;
  }, [channels, searchQuery, sortBy]);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Handle channel click
  const handleChannelClick = (channel: Channel) => {
    if (onChannelClick) {
      onChannelClick(channel);
    } else {
      router.push(`/chat/channel/${channel.slug}`);
    }
  };

  // Render channel item for tree view
  const renderTreeItem = (channel: Channel) => (
    <div
      key={channel.id}
      className="group flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"
      role="button"
      tabIndex={0}
      onClick={() => handleChannelClick(channel)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleChannelClick(channel);
        }
      }}
    >
      {channel.type === "private" ? (
        <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      ) : (
        <Hash className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <span className="truncate text-sm font-medium">{channel.name}</span>
      </div>
      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-xs text-muted-foreground">
          {formatMemberCount(channel.memberCount)}
        </span>
        <JoinChannelButton
          channelId={channel.id}
          isJoined={joinedChannelIds.has(channel.id)}
          isPrivate={channel.type === "private"}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (joinedChannelIds.has(channel.id)) {
              onLeave?.(channel.id);
            } else {
              onJoin?.(channel.id);
            }
          }}
        />
      </div>
    </div>
  );

  // Render category section
  const renderCategory = (
    categoryId: string,
    categoryName: string,
    categoryColor?: string,
  ) => {
    const categoryChannels = channelsByCategory.get(categoryId) || [];
    if (categoryChannels.length === 0) return null;

    const isExpanded = expandedCategories.has(categoryId);

    return (
      <Collapsible
        key={categoryId}
        open={isExpanded}
        onOpenChange={() => toggleCategory(categoryId)}
        className="space-y-1"
      >
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent">
            {isExpanded ? (
              <FolderOpen
                className="h-4 w-4"
                style={{ color: categoryColor }}
              />
            ) : (
              <Folder className="h-4 w-4" style={{ color: categoryColor }} />
            )}
            <span className="flex-1 text-sm font-medium">{categoryName}</span>
            <Badge variant="secondary" className="text-xs">
              {categoryChannels.length}
            </Badge>
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-2 space-y-0.5 border-l pl-4">
            {categoryChannels.map(renderTreeItem)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (layout === "grid") {
    return (
      <div className={cn("space-y-4", className)}>
        {showSearch && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            {showSort && (
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger className="w-[150px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="members">Members</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {DEFAULT_CATEGORIES.filter(
          (c) =>
            c.id !== "archived" &&
            (channelsByCategory.get(c.id)?.length || 0) > 0,
        ).map((category) => (
          <div key={category.id} className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
              <Badge variant="secondary" className="text-xs">
                {channelsByCategory.get(category.id)?.length || 0}
              </Badge>
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(channelsByCategory.get(category.id) || []).map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isJoined={joinedChannelIds.has(channel.id)}
                  variant="compact"
                  showStats={false}
                  onJoin={onJoin}
                  onLeave={onLeave}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Uncategorized */}
        {(channelsByCategory.get(null)?.length || 0) > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Other Channels</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(channelsByCategory.get(null) || []).map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isJoined={joinedChannelIds.has(channel.id)}
                  variant="compact"
                  showStats={false}
                  onJoin={onJoin}
                  onLeave={onLeave}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (layout === "list") {
    const allChannels = sortChannelList(
      Array.from(channelsByCategory.values()).flat(),
      sortBy,
    );

    return (
      <div className={cn("space-y-4", className)}>
        {showSearch && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            {showSort && (
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger className="w-[150px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="members">Members</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <div className="space-y-1">
          {allChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isJoined={joinedChannelIds.has(channel.id)}
              variant="compact"
              onJoin={onJoin}
              onLeave={onLeave}
            />
          ))}
        </div>
      </div>
    );
  }

  // Default: tree layout
  return (
    <div className={cn("space-y-4", className)}>
      {showSearch && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          {showSort && (
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger className="w-[150px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="members">Members</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div className="space-y-2">
        {DEFAULT_CATEGORIES.filter((c) => c.id !== "archived").map((category) =>
          renderCategory(category.id, category.name, category.color),
        )}

        {/* Uncategorized channels */}
        {(channelsByCategory.get(null)?.length || 0) > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">Other Channels</span>
              <Badge variant="secondary" className="text-xs">
                {channelsByCategory.get(null)?.length || 0}
              </Badge>
            </div>
            <div className="ml-2 space-y-0.5 border-l pl-4">
              {(channelsByCategory.get(null) || []).map(renderTreeItem)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to sort channels
function sortChannelList(channels: Channel[], sortBy: SortOption): Channel[] {
  return [...channels].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "members":
        return b.memberCount - a.memberCount;
      case "activity":
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      default:
        return 0;
    }
  });
}

ChannelDirectory.displayName = "ChannelDirectory";
