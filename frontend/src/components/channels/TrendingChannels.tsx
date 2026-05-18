"use client";

import * as React from "react";
import { Flame, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChannelCard } from "./ChannelCard";
import type { Channel } from "@/stores/channel-store";
import {
  isChannelActive,
  isChannelNew,
} from "@/lib/channels/channel-discovery";

// ============================================================================
// Types
// ============================================================================

export interface TrendingChannelsProps {
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
// Helper Functions
// ============================================================================

function getTrendingScore(channel: Channel): number {
  let score = 0;

  // Activity score
  if (isChannelActive(channel, 24)) {
    score += 10;
  } else if (isChannelActive(channel, 72)) {
    score += 5;
  }

  // Member count score
  score += Math.min(channel.memberCount, 50) / 5;

  // New channel bonus
  if (isChannelNew(channel)) {
    score += 5;
  }

  return score;
}

function getTrendingChannels(channels: Channel[], limit: number): Channel[] {
  return [...channels]
    .filter(
      (c) => c.type === "public" && !c.isArchived && isChannelActive(c, 72),
    )
    .map((channel) => ({
      channel,
      score: getTrendingScore(channel),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.channel);
}

// ============================================================================
// Component
// ============================================================================

export function TrendingChannels({
  channels,
  joinedChannelIds = new Set(),
  limit = 10,
  showViewAll = true,
  layout = "scroll",
  onViewAll,
  onJoin,
  onLeave,
  className,
}: TrendingChannelsProps) {
  const trendingChannels = React.useMemo(
    () => getTrendingChannels(channels, limit),
    [channels, limit],
  );

  if (trendingChannels.length === 0) {
    return null;
  }

  const renderChannels = () => {
    if (layout === "list") {
      return (
        <div className="space-y-2">
          {trendingChannels.map((channel, index) => (
            <div
              key={channel.id}
              className="hover:bg-accent/50 flex items-center gap-3 rounded-lg p-3 transition-colors"
            >
              <div className="flex w-8 items-center gap-2">
                {index < 3 ? (
                  <Flame
                    className={cn(
                      "h-5 w-5",
                      index === 0 && "text-red-500",
                      index === 1 && "text-orange-500",
                      index === 2 && "text-yellow-500",
                    )}
                  />
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <ChannelCard
                  channel={channel}
                  isJoined={joinedChannelIds.has(channel.id)}
                  isTrending
                  variant="compact"
                  onJoin={onJoin}
                  onLeave={onLeave}
                />
              </div>
              {isChannelNew(channel) && (
                <Badge variant="secondary" className="text-xs">
                  New
                </Badge>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (layout === "grid") {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trendingChannels.map((channel, index) => (
            <div key={channel.id} className="relative">
              {index < 3 && (
                <Badge
                  className={cn(
                    "absolute -right-2 -top-2 z-10",
                    index === 0 && "bg-red-500",
                    index === 1 && "bg-orange-500",
                    index === 2 && "bg-yellow-500",
                  )}
                >
                  #{index + 1}
                </Badge>
              )}
              <ChannelCard
                channel={channel}
                isJoined={joinedChannelIds.has(channel.id)}
                isTrending
                isNew={isChannelNew(channel)}
                showStats
                onJoin={onJoin}
                onLeave={onLeave}
              />
            </div>
          ))}
        </div>
      );
    }

    // Default: scroll layout
    return (
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {trendingChannels.map((channel, index) => (
            <div key={channel.id} className="relative w-[280px] flex-shrink-0">
              {index < 3 && (
                <Badge
                  className={cn(
                    "absolute -right-2 -top-2 z-10",
                    index === 0 && "bg-red-500",
                    index === 1 && "bg-orange-500",
                    index === 2 && "bg-yellow-500",
                  )}
                >
                  <Flame className="mr-1 h-3 w-3" />#{index + 1}
                </Badge>
              )}
              <ChannelCard
                channel={channel}
                isJoined={joinedChannelIds.has(channel.id)}
                isTrending
                isNew={isChannelNew(channel)}
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
          <Flame className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold">Trending Now</h2>
          <Badge variant="outline" className="text-xs">
            <TrendingUp className="mr-1 h-3 w-3" />
            Hot
          </Badge>
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

TrendingChannels.displayName = "TrendingChannels";
