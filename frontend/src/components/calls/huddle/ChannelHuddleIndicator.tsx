/**
 * ChannelHuddleIndicator Component
 *
 * Shows active huddle in channel sidebar with quick join button.
 */

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHuddle, type ActiveHuddle } from "@/hooks/use-huddle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Headphones, Users, Monitor, Mic, Phone } from "lucide-react";
import { formatHuddleDuration } from "@/services/calls/huddle.service";

// =============================================================================
// Types
// =============================================================================

export interface ChannelHuddleIndicatorProps {
  channelId: string;
  channelName?: string;
  isDM?: boolean;
  className?: string;
  variant?: "compact" | "expanded" | "inline";
}

// =============================================================================
// Component
// =============================================================================

export function ChannelHuddleIndicator({
  channelId,
  channelName,
  isDM = false,
  className,
  variant = "compact",
}: ChannelHuddleIndicatorProps) {
  const {
    isInHuddle,
    huddleInfo,
    getActiveHuddleForChannel,
    startHuddle,
    joinHuddle,
  } = useHuddle();

  const activeHuddle = getActiveHuddleForChannel(channelId);

  // Check if we're in THIS channel's huddle
  const isInThisHuddle = isInHuddle && huddleInfo?.channelId === channelId;

  const handleStartOrJoin = async () => {
    if (activeHuddle) {
      await joinHuddle(activeHuddle.id, channelId, { channelName, isDM });
    } else {
      await startHuddle(channelId, { channelName, isDM });
    }
  };

  // Inline variant - just shows headphones icon when active
  if (variant === "inline") {
    return (
      <TooltipProvider>
        <div className={cn("inline-flex items-center gap-1", className)}>
          {activeHuddle ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1 text-primary",
                    isInThisHuddle && "animate-pulse",
                  )}
                  onClick={handleStartOrJoin}
                  disabled={isInThisHuddle}
                >
                  <Headphones className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    {activeHuddle.participantCount}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-medium">
                    {isInThisHuddle ? "In huddle" : "Join huddle"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeHuddle.participantCount} participant
                    {activeHuddle.participantCount !== 1 && "s"}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={handleStartOrJoin}
                  disabled={isInHuddle && !isInThisHuddle}
                >
                  <Headphones className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Start huddle</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Compact variant - small indicator with avatars
  if (variant === "compact") {
    return (
      <TooltipProvider>
        <AnimatePresence>
          {activeHuddle ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md",
                "bg-primary/10 border border-primary/20",
                className,
              )}
            >
              <div className="flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5 text-primary" />
                <div className="flex -space-x-1.5">
                  {activeHuddle.participants.slice(0, 3).map((p) => (
                    <Avatar
                      key={p.id}
                      className="w-5 h-5 border border-background"
                    >
                      <AvatarImage src={p.avatarUrl} alt={p.name} />
                      <AvatarFallback className="text-[8px]">
                        {p.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {activeHuddle.participantCount > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{activeHuddle.participantCount - 3}
                  </span>
                )}
              </div>

              {!isInThisHuddle && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleStartOrJoin}
                      disabled={isInHuddle}
                    >
                      <Phone className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Join huddle</TooltipContent>
                </Tooltip>
              )}
            </motion.div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 px-2", className)}
                  onClick={handleStartOrJoin}
                  disabled={isInHuddle}
                >
                  <Headphones className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">Huddle</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start a huddle</TooltipContent>
            </Tooltip>
          )}
        </AnimatePresence>
      </TooltipProvider>
    );
  }

  // Expanded variant - full card with details
  return (
    <TooltipProvider>
      <AnimatePresence>
        {activeHuddle ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-3 rounded-lg bg-primary/10 border border-primary/20",
              className,
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Headphones className="h-4 w-4 text-primary" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <span className="text-sm font-medium">Huddle in progress</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatHuddleDuration(activeHuddle.duration)}
              </span>
            </div>

            {/* Participants */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex -space-x-2">
                {activeHuddle.participants.slice(0, 5).map((p) => (
                  <Tooltip key={p.id}>
                    <TooltipTrigger asChild>
                      <Avatar
                        className={cn(
                          "w-7 h-7 border-2 border-background",
                          p.isSpeaking && !p.isMuted && "ring-2 ring-green-500",
                        )}
                      >
                        <AvatarImage src={p.avatarUrl} alt={p.name} />
                        <AvatarFallback className="text-xs">
                          {p.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex items-center gap-1">
                        <span>{p.name}</span>
                        {p.isMuted && (
                          <Mic className="h-3 w-3 text-destructive" />
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              {activeHuddle.participantCount > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{activeHuddle.participantCount - 5} more
                </span>
              )}
            </div>

            {/* Screen share indicator */}
            {activeHuddle.hasScreenShare && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Monitor className="h-3 w-3" />
                <span>Screen is being shared</span>
              </div>
            )}

            {/* Join button */}
            {!isInThisHuddle && (
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={handleStartOrJoin}
                disabled={isInHuddle}
              >
                <Phone className="h-4 w-4 mr-2" />
                {isInHuddle ? "Already in a huddle" : "Join huddle"}
              </Button>
            )}

            {isInThisHuddle && (
              <div className="flex items-center justify-center gap-1 text-xs text-primary">
                <Headphones className="h-3 w-3" />
                <span>You're in this huddle</span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "p-3 rounded-lg border border-dashed border-muted-foreground/30",
              "hover:border-primary/50 hover:bg-primary/5 transition-colors",
              "cursor-pointer",
              className,
            )}
            onClick={handleStartOrJoin}
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Headphones className="h-5 w-5" />
              <div className="text-sm text-center">
                <span className="font-medium">Start a huddle</span>
                <p className="text-xs mt-0.5">
                  Talk with others in{" "}
                  {isDM ? "this conversation" : "this channel"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}

// =============================================================================
// Sidebar Huddle Status (for channel list)
// =============================================================================

export interface SidebarHuddleStatusProps {
  channelId: string;
  className?: string;
}

export function SidebarHuddleStatus({
  channelId,
  className,
}: SidebarHuddleStatusProps) {
  const { getActiveHuddleForChannel, huddleInfo, isInHuddle } = useHuddle();

  const activeHuddle = getActiveHuddleForChannel(channelId);
  const isInThisHuddle = isInHuddle && huddleInfo?.channelId === channelId;

  if (!activeHuddle) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1",
              isInThisHuddle ? "text-primary" : "text-muted-foreground",
              className,
            )}
          >
            <Headphones className="h-3 w-3" />
            <span className="text-xs">{activeHuddle.participantCount}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <div className="font-medium">
              {activeHuddle.participantCount} in huddle
            </div>
            <div className="text-xs text-muted-foreground">
              {activeHuddle.participants
                .slice(0, 3)
                .map((p) => p.name)
                .join(", ")}
              {activeHuddle.participantCount > 3 &&
                ` +${activeHuddle.participantCount - 3} more`}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ChannelHuddleIndicator;
