"use client";

import * as React from "react";
import Link from "next/link";
import {
  Hash,
  Lock,
  Users,
  MessageSquare,
  Star,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { JoinChannelButton } from "./JoinChannelButton";
import type { Channel } from "@/stores/channel-store";
import {
  formatMemberCount,
  getActivityLevel,
  getActivityLevelLabel,
} from "@/lib/channels/channel-stats";

// ============================================================================
// Types
// ============================================================================

export interface ChannelCardProps {
  channel: Channel;
  isJoined?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  showStats?: boolean;
  showJoinButton?: boolean;
  variant?: "default" | "compact" | "featured";
  onJoin?: (channelId: string) => void;
  onLeave?: (channelId: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelCard({
  channel,
  isJoined = false,
  isFeatured = false,
  isTrending = false,
  isNew = false,
  showStats = true,
  showJoinButton = true,
  variant = "default",
  onJoin,
  onLeave,
  className,
}: ChannelCardProps) {
  const activityLevel = getActivityLevel(channel);
  const isPrivate = channel.type === "private";

  const handleJoinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isJoined) {
      onLeave?.(channel.id);
    } else {
      onJoin?.(channel.id);
    }
  };

  if (variant === "compact") {
    return (
      <Link
        href={`/chat/channel/${channel.slug}`}
        className={cn(
          "hover:bg-accent/50 flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
          className,
        )}
      >
        <div className="flex-shrink-0">
          {isPrivate ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Hash className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{channel.name}</span>
            {isTrending && (
              <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-orange-500" />
            )}
            {isNew && (
              <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-purple-500" />
            )}
          </div>
          {channel.description && (
            <p className="truncate text-sm text-muted-foreground">
              {channel.description}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{formatMemberCount(channel.memberCount)}</span>
          </div>
          {showJoinButton && (
            <JoinChannelButton
              channelId={channel.id}
              isJoined={isJoined}
              isPrivate={isPrivate}
              size="sm"
              onClick={handleJoinClick}
            />
          )}
        </div>
      </Link>
    );
  }

  if (variant === "featured") {
    return (
      <Card
        className={cn(
          "overflow-hidden transition-shadow hover:shadow-md",
          "border-primary/20 from-primary/5 border-2 bg-gradient-to-br to-transparent",
          className,
        )}
      >
        <CardContent className="p-0">
          <Link href={`/chat/channel/${channel.slug}`} className="block">
            <div className="p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 rounded-lg p-2">
                    {isPrivate ? (
                      <Lock className="h-5 w-5 text-primary" />
                    ) : (
                      <Hash className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{channel.name}</h3>
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    </div>
                    {channel.topic && (
                      <p className="text-xs text-muted-foreground">
                        {channel.topic}
                      </p>
                    )}
                  </div>
                </div>
                {showJoinButton && (
                  <JoinChannelButton
                    channelId={channel.id}
                    isJoined={isJoined}
                    isPrivate={isPrivate}
                    onClick={handleJoinClick}
                  />
                )}
              </div>

              {channel.description && (
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                  {channel.description}
                </p>
              )}

              {showStats && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>
                      {formatMemberCount(channel.memberCount)} members
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getActivityLevelLabel(activityLevel)}
                  </Badge>
                </div>
              )}
            </div>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md",
        isFeatured && "border-primary/30",
        className,
      )}
    >
      <CardContent className="p-0">
        <Link href={`/chat/channel/${channel.slug}`} className="block">
          <div className="p-4">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "rounded-lg p-2",
                    channel.color ? `bg-[${channel.color}]/10` : "bg-muted",
                  )}
                >
                  {isPrivate ? (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Hash className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{channel.name}</h3>
                    {isFeatured && (
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    )}
                    {isTrending && (
                      <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                    )}
                    {isNew && (
                      <Badge
                        variant="secondary"
                        className="px-1.5 py-0 text-[10px]"
                      >
                        New
                      </Badge>
                    )}
                  </div>
                  {channel.topic && (
                    <p className="text-xs text-muted-foreground">
                      {channel.topic}
                    </p>
                  )}
                </div>
              </div>
              {showJoinButton && (
                <JoinChannelButton
                  channelId={channel.id}
                  isJoined={isJoined}
                  isPrivate={isPrivate}
                  onClick={handleJoinClick}
                />
              )}
            </div>

            {channel.description && (
              <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                {channel.description}
              </p>
            )}

            {showStats && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{formatMemberCount(channel.memberCount)}</span>
                  </div>
                  {channel.lastMessagePreview && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span className="max-w-[150px] truncate">
                        {channel.lastMessagePreview}
                      </span>
                    </div>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    activityLevel === "very-active" &&
                      "border-green-500 text-green-600",
                    activityLevel === "active" &&
                      "border-emerald-500 text-emerald-600",
                    activityLevel === "moderate" &&
                      "border-yellow-500 text-yellow-600",
                    activityLevel === "quiet" &&
                      "border-orange-500 text-orange-600",
                    activityLevel === "inactive" &&
                      "border-gray-400 text-gray-500",
                  )}
                >
                  {getActivityLevelLabel(activityLevel)}
                </Badge>
              </div>
            )}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

ChannelCard.displayName = "ChannelCard";
