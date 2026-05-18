/**
 * VideoTile Component
 *
 * Individual participant video tile for grid display.
 * Features:
 * - Video stream display
 * - Audio level indicator (speaking animation)
 * - Name label
 * - Muted/video-off indicators
 * - Pin/unpin button
 * - Connection quality indicator
 * - Fallback avatar when video is off
 * - Hover actions menu
 */

"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Mic,
  MicOff,
  VideoOff,
  Pin,
  PinOff,
  MoreVertical,
  Signal,
  MonitorUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface VideoTileProps {
  /** Participant ID */
  participantId: string;
  /** Participant name */
  name: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Video stream */
  stream: MediaStream | null;
  /** Is audio muted */
  isMuted: boolean;
  /** Is video off */
  isVideoOff: boolean;
  /** Is screen sharing */
  isScreenSharing: boolean;
  /** Is currently speaking */
  isSpeaking: boolean;
  /** Is this the local user */
  isLocal?: boolean;
  /** Is this tile pinned */
  isPinned?: boolean;
  /** Connection quality */
  connectionQuality?: "excellent" | "good" | "fair" | "poor";
  /** Current user is host */
  isHost?: boolean;
  /** Callbacks */
  onPin?: (participantId: string) => void;
  onMute?: (participantId: string) => void;
  onRemove?: (participantId: string) => void;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function VideoTile({
  participantId,
  name,
  avatarUrl,
  stream,
  isMuted,
  isVideoOff,
  isScreenSharing,
  isSpeaking,
  isLocal = false,
  isPinned = false,
  connectionQuality = "good",
  isHost = false,
  onPin,
  onMute,
  onRemove,
  className,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(false);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream && !isVideoOff) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoOff]);

  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get connection quality color
  const getQualityColor = (): string => {
    switch (connectionQuality) {
      case "excellent":
        return "text-green-500";
      case "good":
        return "text-blue-500";
      case "fair":
        return "text-yellow-500";
      case "poor":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div
      className={cn(
        "group relative aspect-video overflow-hidden rounded-lg bg-gray-900",
        isSpeaking && "ring-4 ring-green-500",
        isPinned && "ring-4 ring-blue-500",
        className,
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video stream or avatar */}
      {!isVideoOff && stream ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Overlay gradient for better text visibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />

      {/* Top indicators */}
      <div className="absolute left-2 top-2 flex items-center gap-1">
        {/* Connection quality */}
        {connectionQuality && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 bg-black/60 backdrop-blur-sm"
          >
            <Signal className={cn("h-3 w-3", getQualityColor())} />
          </Badge>
        )}

        {/* Screen sharing indicator */}
        {isScreenSharing && (
          <Badge
            variant="secondary"
            className="bg-blue-600/80 text-white backdrop-blur-sm"
          >
            <MonitorUp className="mr-1 h-3 w-3" />
            Sharing
          </Badge>
        )}

        {/* Pinned indicator */}
        {isPinned && (
          <Badge
            variant="secondary"
            className="bg-blue-600/80 text-white backdrop-blur-sm"
          >
            <Pin className="h-3 w-3" />
          </Badge>
        )}
      </div>

      {/* Top right controls (shown on hover) */}
      {(showControls || isPinned) && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {onPin && (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onPin(participantId)}
              className="h-8 w-8 bg-black/60 backdrop-blur-sm hover:bg-black/80"
            >
              {isPinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Host controls */}
          {isHost && !isLocal && (onMute || onRemove) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-black/60 backdrop-blur-sm hover:bg-black/80"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onMute && (
                  <DropdownMenuItem onClick={() => onMute(participantId)}>
                    {isMuted ? (
                      <>
                        <Volume2 className="mr-2 h-4 w-4" />
                        Unmute Participant
                      </>
                    ) : (
                      <>
                        <VolumeX className="mr-2 h-4 w-4" />
                        Mute Participant
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onRemove(participantId)}
                      className="text-red-600"
                    >
                      Remove from Call
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          {/* Name */}
          <span className="text-sm font-medium text-white drop-shadow-lg">
            {name}
            {isLocal && " (You)"}
          </span>

          {/* Muted indicator */}
          {isMuted && (
            <div className="rounded-full bg-red-600 p-1">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}

          {/* Video off indicator */}
          {isVideoOff && (
            <div className="rounded-full bg-gray-600 p-1">
              <VideoOff className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Speaking indicator */}
        {isSpeaking && !isMuted && (
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 animate-pulse rounded-full bg-green-500" />
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 delay-75" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500 delay-150" />
          </div>
        )}
      </div>
    </div>
  );
}
