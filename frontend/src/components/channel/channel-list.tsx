"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Star,
  ChevronDown,
  ChevronRight,
  Hash,
  Lock,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChannelItem } from "./channel-item";
import { ChannelCategory } from "./channel-category";
import { ChannelSkeleton } from "./channel-skeleton";
import { DirectMessageList } from "./direct-message-list";
import {
  useChannelStore,
  selectPublicChannels,
  selectPrivateChannels,
  selectStarredChannels,
  selectChannelsByCategory,
  type Channel,
  type ChannelCategory as ChannelCategoryType,
} from "@/stores/channel-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

type SortOrder = "manual" | "alphabetical" | "recent";

interface ChannelListProps {
  className?: string;
  onChannelSelect?: (channel: Channel) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelList({ className, onChannelSelect }: ChannelListProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  // Store state
  const {
    channels,
    categories,
    starredChannels,
    isLoading,
    collapsedCategories,
    toggleCategoryCollapse,
  } = useChannelStore();

  const { openModal } = useUIStore();

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("manual");
  const [showStarred, setShowStarred] = useState(true);
  const [showPublic, setShowPublic] = useState(true);
  const [showPrivate, setShowPrivate] = useState(true);

  // Selectors
  const publicChannels = useChannelStore(selectPublicChannels);
  const privateChannels = useChannelStore(selectPrivateChannels);
  const starredChannelsList = useChannelStore(selectStarredChannels);
  const { categorized, uncategorized } = useChannelStore(
    selectChannelsByCategory,
  );

  // Filter channels based on search
  const filteredChannels = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return null;

    const allChannels = Array.from(channels.values());
    return allChannels.filter(
      (channel) =>
        channel.name.toLowerCase().includes(query) ||
        channel.description?.toLowerCase().includes(query) ||
        channel.topic?.toLowerCase().includes(query),
    );
  }, [channels, searchQuery]);

  // Sort channels
  const sortChannels = (channelList: Channel[]): Channel[] => {
    const sorted = [...channelList];
    switch (sortOrder) {
      case "alphabetical":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "recent":
        return sorted.sort((a, b) => {
          const aTime = a.lastMessageAt
            ? new Date(a.lastMessageAt).getTime()
            : 0;
          const bTime = b.lastMessageAt
            ? new Date(b.lastMessageAt).getTime()
            : 0;
          return bTime - aTime;
        });
      case "manual":
      default:
        return sorted;
    }
  };

  // Handle create channel
  const handleCreateChannel = (categoryId?: string) => {
    openModal("create-channel", { categoryId });
  };

  // Render channel section
  const renderChannelSection = (
    title: string,
    channelList: Channel[],
    icon: React.ReactNode,
    sectionKey: string,
    isCollapsed: boolean,
    onToggle: () => void,
  ) => {
    const sortedChannels = sortChannels(channelList);
    if (sortedChannels.length === 0) return null;

    return (
      <div className="mb-4">
        <div
          className="hover:bg-accent/50 group flex cursor-pointer items-center justify-between rounded-md px-2 py-1 transition-colors"
          role="button"
          tabIndex={0}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle?.();
            }
          }}
        >
          <div className="flex items-center gap-1.5">
            <button className="p-0.5">
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {icon}
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </span>
            <span className="text-muted-foreground/60 text-xs">
              ({sortedChannels.length})
            </span>
          </div>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateChannel();
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {!isCollapsed && (
          <div className="mt-1 space-y-0.5">
            {sortedChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                onSelect={onChannelSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex flex-col", className)}>
        <ChannelSkeleton />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Channel List */}
      <ScrollArea className="flex-1 px-2">
        {/* Search Results */}
        {filteredChannels ? (
          <div className="py-2">
            <div className="mb-2 px-2">
              <span className="text-xs text-muted-foreground">
                {filteredChannels.length} result
                {filteredChannels.length !== 1 ? "s" : ""} for &quot;
                {searchQuery}&quot;
              </span>
            </div>
            {filteredChannels.length > 0 ? (
              <div className="space-y-0.5">
                {filteredChannels.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    onSelect={onChannelSelect}
                  />
                ))}
              </div>
            ) : (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No channels found
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {/* Starred Channels */}
            {starredChannelsList.length > 0 &&
              renderChannelSection(
                "Starred",
                starredChannelsList,
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />,
                "starred",
                !showStarred,
                () => setShowStarred(!showStarred),
              )}

            {/* Categorized Channels */}
            {categories.map((category) => {
              const categoryChannels = categorized[category.id] || [];
              if (categoryChannels.length === 0) return null;

              return (
                <ChannelCategory
                  key={category.id}
                  category={category}
                  onCreateChannel={handleCreateChannel}
                >
                  {sortChannels(categoryChannels).map((channel) => (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      onSelect={onChannelSelect}
                    />
                  ))}
                </ChannelCategory>
              );
            })}

            {/* Uncategorized Public Channels */}
            {uncategorized.filter((c) => c.type === "public").length > 0 &&
              renderChannelSection(
                "Channels",
                uncategorized.filter((c) => c.type === "public"),
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />,
                "public",
                !showPublic,
                () => setShowPublic(!showPublic),
              )}

            {/* Private Channels */}
            {privateChannels.length > 0 &&
              renderChannelSection(
                "Private",
                privateChannels,
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />,
                "private",
                !showPrivate,
                () => setShowPrivate(!showPrivate),
              )}

            {/* Direct Messages */}
            <DirectMessageList />
          </div>
        )}
      </ScrollArea>

      {/* Footer Actions */}
      {isAdmin && (
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => handleCreateChannel()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add channel
          </Button>
        </div>
      )}
    </div>
  );
}

ChannelList.displayName = "ChannelList";
