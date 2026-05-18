"use client";

import * as React from "react";
import { Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChannelCard } from "./ChannelCard";
import type { Channel } from "@/stores/channel-store";
import { getFeaturedChannels } from "@/lib/channels/channel-discovery";

// ============================================================================
// Types
// ============================================================================

export interface FeaturedChannelsProps {
  channels: Channel[];
  joinedChannelIds?: Set<string>;
  limit?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  onJoin?: (channelId: string) => void;
  onLeave?: (channelId: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function FeaturedChannels({
  channels,
  joinedChannelIds = new Set(),
  limit = 6,
  showViewAll = true,
  onViewAll,
  onJoin,
  onLeave,
  className,
}: FeaturedChannelsProps) {
  const featuredChannels = React.useMemo(
    () => getFeaturedChannels(channels).slice(0, limit),
    [channels, limit],
  );

  if (featuredChannels.length === 0) {
    return null;
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
          <h2 className="text-lg font-semibold">Featured Channels</h2>
        </div>
        {showViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View all
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {featuredChannels.map((channel) => (
            <div key={channel.id} className="w-[300px] flex-shrink-0">
              <ChannelCard
                channel={channel}
                isJoined={joinedChannelIds.has(channel.id)}
                isFeatured
                variant="featured"
                onJoin={onJoin}
                onLeave={onLeave}
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}

FeaturedChannels.displayName = "FeaturedChannels";
