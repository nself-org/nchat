/**
 * Video Tile
 *
 * Individual participant video tile with controls and status indicators.
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Pin, User } from "lucide-react";
import type { CallParticipant } from "@/stores/call-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// =============================================================================
// Types
// =============================================================================

export interface VideoTileProps {
  participant: CallParticipant;
  stream: MediaStream | null;
  isMain?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  style?: React.CSSProperties;
}

// =============================================================================
// Component
// =============================================================================

export function VideoTile({
  participant,
  stream,
  isMain = false,
  isPinned = false,
  onPin,
  style,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Set video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border-2 bg-gray-900",
        participant.isSpeaking ? "border-blue-500" : "border-transparent",
        isMain && "border-4",
      )}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video or Avatar */}
      {participant.isVideoEnabled && stream ? (
        /* eslint-disable-next-line jsx-a11y/media-has-caption -- Live video call does not have captions */
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false} // Only mute local video to prevent feedback
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
          {participant.avatarUrl ? (
            <img
              src={participant.avatarUrl}
              alt={participant.name}
              className="h-1/3 w-1/3 rounded-full object-cover"
            />
          ) : (
            <User className="h-1/3 w-1/3 text-white opacity-50" />
          )}
        </div>
      )}

      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent",
          "transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Name and Status */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white drop-shadow-md">
              {participant.name}
            </span>
            {participant.isMuted && (
              <MicOff className="h-4 w-4 text-red-500 drop-shadow-md" />
            )}
          </div>

          {onPin && isHovered && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-black/50 hover:bg-black/70"
              onClick={onPin}
            >
              <Pin className={cn("h-3 w-3", isPinned && "fill-current")} />
            </Button>
          )}
        </div>
      </div>

      {/* Screen Sharing Indicator */}
      {participant.isScreenSharing && (
        <div className="absolute right-2 top-2 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white">
          Sharing Screen
        </div>
      )}

      {/* Connection Status */}
      {participant.connectionState !== "connected" && (
        <div className="absolute left-2 top-2 rounded bg-yellow-600 px-2 py-1 text-xs font-medium text-white">
          {participant.connectionState}...
        </div>
      )}
    </div>
  );
}
