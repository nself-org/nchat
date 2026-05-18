"use client";

import * as React from "react";
import { Link2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChannelCard } from "./ChannelCard";
import type { Channel } from "@/stores/channel-store";
import { getSimilarChannels } from "@/lib/channels/channel-suggestions";

// ============================================================================
// Types
// ============================================================================

export interface SimilarChannelsProps {
  targetChannel: Channel;
  allChannels: Channel[];
  joinedChannelIds?: Set<string>;
  limit?: number;
  showViewAll?: boolean;
  layout?: "grid" | "list";
  onViewAll?: () => void;
  onJoin?: (channelId: string) => void;
  onLeave?: (channelId: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SimilarChannels({
  targetChannel,
  allChannels,
  joinedChannelIds = new Set(),
  limit = 5,
  showViewAll = false,
  layout = "list",
  onViewAll,
  onJoin,
  onLeave,
  className,
}: SimilarChannelsProps) {
  const similarChannels = React.useMemo(
    () => getSimilarChannels(targetChannel, allChannels, limit),
    [targetChannel, allChannels, limit],
  );

  if (similarChannels.length === 0) {
    return (
      <div
        className={cn(
          "py-4 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        No similar channels found
      </div>
    );
  }

  return (
    <section className={cn("space-y-3", className)}>
      {showViewAll && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Similar Channels</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View all
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {layout === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {similarChannels.map((channel) => (
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
      ) : (
        <div className="space-y-2">
          {similarChannels.map((channel) => (
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
      )}
    </section>
  );
}

SimilarChannels.displayName = "SimilarChannels";
