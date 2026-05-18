"use client";

import * as React from "react";
import { ChevronRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChannelCard } from "./ChannelCard";
import type { Channel } from "@/stores/channel-store";
import { getRecentlyActiveChannels } from "@/lib/channels/channel-discovery";
import { formatTimeAgo } from "@/lib/channels/channel-stats";

// ============================================================================
// Types
// ============================================================================

export interface RecentChannelsProps {
  channels: Channel[];
  joinedChannelIds?: Set<string>;
  limit?: number;
  showViewAll?: boolean;
  layout?: "scroll" | "grid" | "list";
  onViewAll?: () => void;
  onJoin?: (channelId: string) => void;
  onLeave?: (channelId: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function RecentChannels({
  channels,
  joinedChannelIds = new Set(),
  limit = 10,
  showViewAll = true,
  layout = "scroll",
  onViewAll,
  onJoin,
  onLeave,
  className,
}: RecentChannelsProps) {
  const recentChannels = React.useMemo(
    () => getRecentlyActiveChannels(channels, limit),
    [channels, limit],
  );

  if (recentChannels.length === 0) {
    return null;
  }

  const renderChannels = () => {
    if (layout === "list") {
      return (
        <div className="space-y-2">
          {recentChannels.map((channel) => (
            <div key={channel.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <ChannelCard
                  channel={channel}
                  isJoined={joinedChannelIds.has(channel.id)}
                  variant="compact"
                  onJoin={onJoin}
                  onLeave={onLeave}
                />
              </div>
              {channel.lastMessageAt && (
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {formatTimeAgo(new Date(channel.lastMessageAt))}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (layout === "grid") {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isJoined={joinedChannelIds.has(channel.id)}
              showStats
              onJoin={onJoin}
              onLeave={onLeave}
            />
          ))}
        </div>
      );
    }

    // Default: scroll layout
    return (
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {recentChannels.map((channel) => (
            <div key={channel.id} className="w-[280px] flex-shrink-0">
              <ChannelCard
                channel={channel}
                isJoined={joinedChannelIds.has(channel.id)}
                showStats
                onJoin={onJoin}
                onLeave={onLeave}
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold">Recently Active</h2>
        </div>
        {showViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View all
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      {renderChannels()}
    </section>
  );
}

RecentChannels.displayName = "RecentChannels";
