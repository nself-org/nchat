"use client";

import * as React from "react";
import { TrendingUp, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChannelCard } from "./ChannelCard";
import type { Channel } from "@/stores/channel-store";
import { getPopularChannels } from "@/lib/channels/channel-discovery";
import { formatMemberCount } from "@/lib/channels/channel-stats";

// ============================================================================
// Types
// ============================================================================

export interface PopularChannelsProps {
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

export function PopularChannels({
  channels,
  joinedChannelIds = new Set(),
  limit = 10,
  showViewAll = true,
  layout = "scroll",
  onViewAll,
  onJoin,
  onLeave,
  className,
}: PopularChannelsProps) {
  const popularChannels = React.useMemo(
    () => getPopularChannels(channels, limit),
    [channels, limit],
  );

  if (popularChannels.length === 0) {
    return null;
  }

  const renderChannels = () => {
    if (layout === "list") {
      return (
        <div className="space-y-2">
          {popularChannels.map((channel, index) => (
            <div
              key={channel.id}
              className="hover:bg-accent/50 flex items-center gap-3 rounded-lg p-3 transition-colors"
            >
              <span className="w-6 text-center text-lg font-bold text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <ChannelCard
                  channel={channel}
                  isJoined={joinedChannelIds.has(channel.id)}
                  variant="compact"
                  onJoin={onJoin}
                  onLeave={onLeave}
                />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (layout === "grid") {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popularChannels.map((channel) => (
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
          {popularChannels.map((channel) => (
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
          <TrendingUp className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Popular Channels</h2>
          <span className="text-sm text-muted-foreground">
            (
            {formatMemberCount(
              popularChannels.reduce((sum, c) => sum + c.memberCount, 0),
            )}{" "}
            total members)
          </span>
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

PopularChannels.displayName = "PopularChannels";
