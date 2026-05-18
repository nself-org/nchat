"use client";

/**
 * HuddlePanel - Active huddle display panel
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Huddle, HuddleParticipant } from "@/lib/meetings/meeting-types";
import { useHuddle } from "@/hooks/useHuddle";
import {
  Headphones,
  Video,
  Phone,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  X,
  Minimize2,
  Maximize2,
  Users,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface HuddlePanelProps {
  channelId: string;
  userId?: string;
  onClose?: () => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function HuddlePanel({
  channelId,
  userId,
  onClose,
  isMinimized = false,
  onMinimize,
}: HuddlePanelProps) {
  const {
    huddle,
    isActive,
    isInHuddle,
    participantCount,
    participants,
    isMuted,
    isVideoOn,
    isHost,
    toggleMute,
    toggleVideo,
    leaveHuddle,
    endHuddle,
  } = useHuddle({ channelId, userId });

  // Get initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isActive || !isInHuddle) {
    return null;
  }

  const handleLeave = async () => {
    await leaveHuddle();
    onClose?.();
  };

  const handleEnd = async () => {
    await endHuddle();
    onClose?.();
  };

  // Minimized view
  if (isMinimized) {
    return (
      <div
        className={cn(
          "fixed bottom-4 right-4 z-50",
          "rounded-lg bg-gray-900 text-white shadow-xl",
          "flex items-center gap-2 p-2",
        )}
      >
        <div className="flex -space-x-2">
          {participants.slice(0, 3).map((p) => (
            <Avatar
              key={p.userId}
              className={cn(
                "h-8 w-8 border-2 border-gray-900",
                p.isSpeaking && "ring-2 ring-green-500",
              )}
            >
              <AvatarImage src={p.avatarUrl || undefined} />
              <AvatarFallback className="bg-gray-700 text-xs">
                {getInitials(p.displayName)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-white"
          onClick={() => toggleMute()}
        >
          {isMuted ? (
            <MicOff className="h-4 w-4 text-red-400" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-white"
          onClick={onMinimize}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <Button variant="destructive" size="sm" onClick={handleLeave}>
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Full panel view
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "rounded-xl bg-gray-900 text-white shadow-2xl",
        "w-80 overflow-hidden",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4" />
          <span className="text-sm font-medium">Huddle</span>
          <Badge className="bg-green-500 text-xs text-white">
            {participantCount}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-white"
            onClick={onMinimize}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Participants */}
      <div className="p-4">
        <div className="flex flex-wrap justify-center gap-4">
          {participants.map((participant) => (
            <ParticipantAvatar
              key={participant.userId}
              participant={participant}
              isCurrentUser={participant.userId === userId}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 px-4 pb-4">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          className={cn("h-10 w-10 rounded-full", !isMuted && "bg-gray-700")}
          onClick={toggleMute}
        >
          {isMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {huddle?.roomType === "video" && (
          <Button
            variant={!isVideoOn ? "destructive" : "secondary"}
            size="icon"
            className={cn("h-10 w-10 rounded-full", isVideoOn && "bg-gray-700")}
            onClick={toggleVideo}
          >
            {isVideoOn ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>
        )}

        <div className="h-8 w-px bg-gray-700" />

        <Button
          variant="destructive"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={handleLeave}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      {/* Host Actions */}
      {isHost && (
        <div className="border-t border-gray-800 px-4 pb-3 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-red-400/50 text-red-400 hover:bg-red-400/10"
            onClick={handleEnd}
          >
            End Huddle for All
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ParticipantAvatarProps {
  participant: HuddleParticipant;
  isCurrentUser?: boolean;
}

function ParticipantAvatar({
  participant,
  isCurrentUser,
}: ParticipantAvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <Avatar
          className={cn(
            "h-14 w-14 border-2 transition-all",
            participant.isSpeaking
              ? "scale-105 border-green-500 ring-2 ring-green-500/30"
              : "border-gray-600",
          )}
        >
          <AvatarImage src={participant.avatarUrl || undefined} />
          <AvatarFallback className="bg-gray-700 text-lg">
            {getInitials(participant.displayName)}
          </AvatarFallback>
        </Avatar>

        {/* Mute indicator */}
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full",
            participant.isMuted ? "bg-red-500" : "bg-green-500",
          )}
        >
          {participant.isMuted ? (
            <MicOff className="h-3 w-3" />
          ) : (
            <Mic className="h-3 w-3" />
          )}
        </div>

        {/* Speaking animation */}
        {participant.isSpeaking && !participant.isMuted && (
          <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
        )}
      </div>

      <span className="max-w-[60px] truncate text-xs">
        {isCurrentUser ? "You" : participant.displayName}
      </span>
    </div>
  );
}
