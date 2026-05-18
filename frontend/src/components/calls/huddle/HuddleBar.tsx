/**
 * HuddleBar Component
 *
 * A slim bar that appears at the top or bottom of the chat area
 * showing the active huddle with quick controls.
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHuddle } from "@/hooks/use-huddle";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Users,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

// =============================================================================
// Types
// =============================================================================

export interface HuddleBarProps {
  className?: string;
  position?: "top" | "bottom";
  onExpand?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function HuddleBar({
  className,
  position = "bottom",
  onExpand,
}: HuddleBarProps) {
  const {
    isInHuddle,
    huddleInfo,
    participants,
    participantCount,
    formattedDuration,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    activeSpeaker,
    toggleMute,
    toggleVideo,
    leaveHuddle,
  } = useHuddle();

  if (!isInHuddle || !huddleInfo) {
    return null;
  }

  // Show max 5 participant avatars
  const visibleParticipants = participants.slice(0, 5);
  const remainingCount = Math.max(0, participantCount - 5);

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: position === "top" ? -20 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: position === "top" ? -20 : 20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center justify-between px-4 py-2",
          "bg-primary/10 border-primary/20",
          position === "top" ? "border-b" : "border-t",
          className,
        )}
      >
        {/* Left side - Huddle info */}
        <div className="flex items-center gap-3">
          {/* Huddle indicator */}
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              {huddleInfo.channelName || "Huddle"}
            </span>
          </div>

          {/* Duration */}
          <span className="text-xs text-muted-foreground">
            {formattedDuration}
          </span>

          {/* Active speaker */}
          {activeSpeaker && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="truncate max-w-[100px]">
                {activeSpeaker.name}
              </span>
            </div>
          )}
        </div>

        {/* Center - Participants */}
        <div
          className="flex items-center gap-1 cursor-pointer"
          onClick={onExpand}
        >
          <div className="flex -space-x-2">
            {visibleParticipants.map((participant) => (
              <Avatar
                key={participant.id}
                className={cn(
                  "w-6 h-6 border-2 border-background",
                  participant.isSpeaking && "ring-2 ring-primary ring-offset-1",
                )}
              >
                <AvatarImage
                  src={participant.avatarUrl}
                  alt={participant.name}
                />
                <AvatarFallback className="text-[10px]">
                  {participant.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {remainingCount > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              +{remainingCount}
            </span>
          )}
          <Users className="w-3 h-3 text-muted-foreground ml-1" />
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-1">
          {/* Mute */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMuted ? "destructive" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <MicOff className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
          </Tooltip>

          {/* Video */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isVideoEnabled ? "ghost" : "secondary"}
                size="icon"
                className="h-7 w-7"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? (
                  <Video className="h-3.5 w-3.5" />
                ) : (
                  <VideoOff className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            </TooltipContent>
          </Tooltip>

          {/* Screen share indicator */}
          {isScreenSharing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center px-2 py-1 bg-primary/20 rounded text-xs text-primary">
                  <Monitor className="h-3 w-3 mr-1" />
                  Sharing
                </div>
              </TooltipTrigger>
              <TooltipContent>You are sharing your screen</TooltipContent>
            </Tooltip>
          )}

          {/* Leave */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={() => leaveHuddle()}
              >
                <PhoneOff className="h-3.5 w-3.5 mr-1" />
                Leave
              </Button>
            </TooltipTrigger>
            <TooltipContent>Leave huddle</TooltipContent>
          </Tooltip>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}

export default HuddleBar;
