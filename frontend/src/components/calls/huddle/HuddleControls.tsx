/**
 * HuddleControls Component
 *
 * Compact control panel for huddle audio/video controls.
 */

"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Settings,
  MoreVertical,
  UserPlus,
  MessageSquare,
  Hand,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

// =============================================================================
// Types
// =============================================================================

export interface HuddleControlsProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isInitiator: boolean;
  canScreenShare?: boolean;
  className?: string;
  compact?: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  onEndForAll?: () => void;
  onInvite?: () => void;
  onOpenSettings?: () => void;
  onOpenThread?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function HuddleControls({
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  isInitiator,
  canScreenShare = true,
  className,
  compact = false,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
  onEndForAll,
  onInvite,
  onOpenSettings,
  onOpenThread,
}: HuddleControlsProps) {
  const buttonSize = compact ? "h-8 w-8" : "h-10 w-10";
  const iconSize = compact ? "h-4 w-4" : "h-5 w-5";

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Mute */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              className={cn(buttonSize, "rounded-full")}
              onClick={onToggleMute}
            >
              {isMuted ? (
                <MicOff className={iconSize} />
              ) : (
                <Mic className={iconSize} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isMuted ? "Unmute (M)" : "Mute (M)"}</TooltipContent>
        </Tooltip>

        {/* Video */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isVideoEnabled ? "secondary" : "outline"}
              size="icon"
              className={cn(buttonSize, "rounded-full")}
              onClick={onToggleVideo}
            >
              {isVideoEnabled ? (
                <Video className={iconSize} />
              ) : (
                <VideoOff className={iconSize} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isVideoEnabled ? "Turn off camera (V)" : "Turn on camera (V)"}
          </TooltipContent>
        </Tooltip>

        {/* Screen share */}
        {canScreenShare && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isScreenSharing ? "default" : "outline"}
                size="icon"
                className={cn(buttonSize, "rounded-full")}
                onClick={onToggleScreenShare}
              >
                {isScreenSharing ? (
                  <MonitorOff className={iconSize} />
                ) : (
                  <Monitor className={iconSize} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isScreenSharing ? "Stop sharing (S)" : "Share screen (S)"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Message thread */}
        {onOpenThread && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(buttonSize, "rounded-full")}
                onClick={onOpenThread}
              >
                <MessageSquare className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Huddle thread</TooltipContent>
          </Tooltip>
        )}

        {/* More options */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(buttonSize, "rounded-full")}
                >
                  <MoreVertical className={iconSize} />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>More options</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            {onInvite && (
              <DropdownMenuItem onClick={onInvite}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite people
              </DropdownMenuItem>
            )}
            {onOpenSettings && (
              <DropdownMenuItem onClick={onOpenSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Audio & video settings
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLeave}
              className="text-destructive focus:text-destructive"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Leave huddle
            </DropdownMenuItem>
            {isInitiator && onEndForAll && (
              <DropdownMenuItem
                onClick={onEndForAll}
                className="text-destructive focus:text-destructive"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                End huddle for all
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Leave button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className={cn(buttonSize, "rounded-full")}
              onClick={onLeave}
            >
              <PhoneOff className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Leave huddle</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export default HuddleControls;
