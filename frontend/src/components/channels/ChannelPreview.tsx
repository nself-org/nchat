"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import {
  Hash,
  Lock,
  Users,
  Calendar,
  Star,
  Bell,
  BellOff,
  Share2,
  Settings,
  Activity,
  MoreVertical,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JoinChannelButton } from "./JoinChannelButton";
import { ChannelStats } from "./ChannelStats";
import { SimilarChannels } from "./SimilarChannels";
import type { Channel } from "@/stores/channel-store";
import {
  formatMemberCount,
  formatTimeAgo,
  getActivityLevel,
  getActivityLevelLabel,
  getActivityLevelColor,
} from "@/lib/channels/channel-stats";

// ============================================================================
// Types
// ============================================================================

export interface ChannelPreviewProps {
  channel: Channel;
  allChannels?: Channel[];
  isJoined?: boolean;
  isMuted?: boolean;
  showStats?: boolean;
  showSimilar?: boolean;
  showActions?: boolean;
  onJoin?: (channelId: string) => void;
  onLeave?: (channelId: string) => void;
  onMuteToggle?: (channelId: string) => void;
  onShare?: (channelId: string) => void;
  trigger?: React.ReactNode;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelPreview({
  channel,
  allChannels = [],
  isJoined = false,
  isMuted = false,
  showStats = true,
  showSimilar = true,
  showActions = true,
  onJoin,
  onLeave,
  onMuteToggle,
  onShare,
  trigger,
  className,
}: ChannelPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isPrivate = channel.type === "private";
  const activityLevel = getActivityLevel(channel);

  const handleJoin = async () => {
    onJoin?.(channel.id);
  };

  const handleLeave = async () => {
    onLeave?.(channel.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            Preview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn("max-h-[85vh] max-w-2xl overflow-y-auto", className)}
      >
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "rounded-lg p-3",
                  channel.color ? `bg-[${channel.color}]/10` : "bg-muted",
                )}
              >
                {isPrivate ? (
                  <Lock className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Hash className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {channel.name}
                  {channel.isDefault && (
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  )}
                </DialogTitle>
                {channel.topic && (
                  <DialogDescription>{channel.topic}</DialogDescription>
                )}
              </div>
            </div>
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onShare?.(channel.id)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share channel
                  </DropdownMenuItem>
                  {isJoined && (
                    <>
                      <DropdownMenuItem
                        onClick={() => onMuteToggle?.(channel.id)}
                      >
                        {isMuted ? (
                          <>
                            <Bell className="mr-2 h-4 w-4" />
                            Unmute notifications
                          </>
                        ) : (
                          <>
                            <BellOff className="mr-2 h-4 w-4" />
                            Mute notifications
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/channels/${channel.id}/settings`}>
                          <Settings className="mr-2 h-4 w-4" />
                          Channel settings
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Quick Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{formatMemberCount(channel.memberCount)} members</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Created {formatTimeAgo(new Date(channel.createdAt))}</span>
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
                activityLevel === "inactive" && "border-gray-400 text-gray-500",
              )}
            >
              <Activity className="mr-1 h-3 w-3" />
              {getActivityLevelLabel(activityLevel)}
            </Badge>
          </div>

          {/* Description */}
          {channel.description && (
            <div>
              <h4 className="mb-2 text-sm font-medium">About</h4>
              <p className="text-sm text-muted-foreground">
                {channel.description}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <JoinChannelButton
              channelId={channel.id}
              channelName={channel.name}
              isJoined={isJoined}
              isPrivate={isPrivate}
              onJoin={handleJoin}
              onLeave={handleLeave}
              className="flex-1"
            />
            <Button variant="outline" asChild>
              <Link href={`/chat/channel/${channel.slug}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Channel
              </Link>
            </Button>
          </div>

          <Separator />

          {/* Detailed Stats */}
          {showStats && (
            <div>
              <h4 className="mb-3 text-sm font-medium">Channel Statistics</h4>
              <ChannelStats channel={channel} variant="compact" />
            </div>
          )}

          {/* Similar Channels */}
          {showSimilar && allChannels.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-medium">Similar Channels</h4>
              <SimilarChannels
                targetChannel={channel}
                allChannels={allChannels}
                limit={3}
                onJoin={onJoin}
              />
            </div>
          )}

          {/* Recent Members */}
          {channel.members && channel.members.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-medium">Recent Members</h4>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {channel.members.slice(0, 5).map((member, index) => (
                    <Avatar
                      key={member.userId}
                      className="h-8 w-8 border-2 border-background"
                    >
                      <AvatarFallback>
                        {member.userId.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {channel.members.length > 5 && (
                  <span className="text-sm text-muted-foreground">
                    +{channel.members.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

ChannelPreview.displayName = "ChannelPreview";
