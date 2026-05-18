/**
 * Participant Grid Component
 *
 * Displays participants in a responsive grid layout with
 * video tiles, audio indicators, and role badges.
 */

"use client";

import { useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Pin,
  Hand,
  Crown,
  Shield,
  Eye,
  MoreVertical,
  VideoOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type {
  GroupCallParticipant,
  ParticipantRole,
  LayoutType,
} from "@/services/calls/group-call.service";

export interface ParticipantGridProps {
  participants: GroupCallParticipant[];
  localParticipantId: string;
  localStream: MediaStream | null;
  getParticipantStream: (participantId: string) => MediaStream | undefined;
  layout: LayoutType;
  activeSpeakerId: string | null;
  pinnedParticipantId: string | null;
  canManageParticipants: boolean;

  // Actions
  onPinParticipant?: (participantId: string) => void;
  onUnpinParticipant?: () => void;
  onMuteParticipant?: (participantId: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
  onSetRole?: (participantId: string, role: ParticipantRole) => void;
  onLowerHand?: (participantId: string) => void;

  className?: string;
}

function VideoTile({
  participant,
  stream,
  isLocal,
  isActiveSpeaker,
  isPinned,
  canManage,
  onPin,
  onUnpin,
  onMute,
  onRemove,
  onSetRole,
  onLowerHand,
  size = "medium",
}: {
  participant: GroupCallParticipant;
  stream: MediaStream | null | undefined;
  isLocal: boolean;
  isActiveSpeaker: boolean;
  isPinned: boolean;
  canManage: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  onMute?: () => void;
  onRemove?: () => void;
  onSetRole?: (role: ParticipantRole) => void;
  onLowerHand?: () => void;
  size?: "small" | "medium" | "large" | "full";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const sizeClasses = {
    small: "h-32 w-48",
    medium: "h-48 w-64",
    large: "h-64 w-80",
    full: "h-full w-full",
  };

  const roleIcon = {
    host: <Crown className="h-3 w-3" />,
    "co-host": <Shield className="h-3 w-3" />,
    participant: null,
    viewer: <Eye className="h-3 w-3" />,
  };

  const roleBadgeColor = {
    host: "bg-yellow-500",
    "co-host": "bg-blue-500",
    participant: "bg-gray-500",
    viewer: "bg-gray-600",
  };

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden bg-gray-800 group",
        sizeClasses[size],
        isActiveSpeaker && "ring-2 ring-green-500",
        isPinned && "ring-2 ring-blue-500",
      )}
    >
      {/* Video or Avatar */}
      {participant.isVideoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-gray-700">
          <Avatar className="h-20 w-20">
            <AvatarImage src={participant.avatarUrl} alt={participant.name} />
            <AvatarFallback className="text-2xl bg-gray-600">
              {participant.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Video off indicator */}
      {!participant.isVideoEnabled && (
        <div className="absolute top-2 right-2 p-1.5 bg-gray-900/80 rounded-full">
          <VideoOff className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Bottom info bar */}
      <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {/* Role badge */}
          {roleIcon[participant.role] && (
            <div
              className={cn(
                "flex items-center justify-center h-5 w-5 rounded-full",
                roleBadgeColor[participant.role],
              )}
            >
              {roleIcon[participant.role]}
            </div>
          )}

          {/* Name */}
          <span className="text-white text-sm font-medium truncate">
            {participant.name}
            {isLocal && " (You)"}
          </span>

          {/* Hand raised indicator */}
          {participant.isHandRaised && (
            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-yellow-500">
              <Hand className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Pinned indicator */}
          {isPinned && (
            <div className="p-1 bg-blue-500 rounded-full">
              <Pin className="h-3 w-3 text-white" />
            </div>
          )}

          {/* Mute indicator */}
          <div
            className={cn(
              "p-1.5 rounded-full",
              participant.isMuted ? "bg-red-500" : "bg-green-500",
            )}
          >
            {participant.isMuted ? (
              <MicOff className="h-3 w-3 text-white" />
            ) : (
              <Mic className="h-3 w-3 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Speaking indicator (audio level) */}
      {participant.isSpeaking && !participant.isMuted && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-2 border-green-500 rounded-lg animate-pulse" />
        </div>
      )}

      {/* Hover menu */}
      {(canManage || !isLocal) && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-gray-900/80 hover:bg-gray-900"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {!isLocal && (
                <>
                  {isPinned ? (
                    <DropdownMenuItem onClick={onUnpin}>
                      <Pin className="h-4 w-4 mr-2" />
                      Unpin
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={onPin}>
                      <Pin className="h-4 w-4 mr-2" />
                      Pin
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {canManage && !isLocal && (
                <>
                  <DropdownMenuSeparator />
                  {!participant.isMuted && (
                    <DropdownMenuItem onClick={onMute}>
                      <MicOff className="h-4 w-4 mr-2" />
                      Mute participant
                    </DropdownMenuItem>
                  )}
                  {participant.isHandRaised && (
                    <DropdownMenuItem onClick={onLowerHand}>
                      <Hand className="h-4 w-4 mr-2" />
                      Lower hand
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSetRole?.("co-host")}>
                    <Shield className="h-4 w-4 mr-2" />
                    Make co-host
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetRole?.("participant")}>
                    <Mic className="h-4 w-4 mr-2" />
                    Make participant
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetRole?.("viewer")}>
                    <Eye className="h-4 w-4 mr-2" />
                    Make viewer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onRemove} className="text-red-500">
                    Remove from call
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export function ParticipantGrid({
  participants,
  localParticipantId,
  localStream,
  getParticipantStream,
  layout,
  activeSpeakerId,
  pinnedParticipantId,
  canManageParticipants,
  onPinParticipant,
  onUnpinParticipant,
  onMuteParticipant,
  onRemoveParticipant,
  onSetRole,
  onLowerHand,
  className,
}: ParticipantGridProps) {
  // Determine grid layout based on participant count and layout type
  const gridConfig = useMemo(() => {
    const count = participants.length;

    if (layout === "speaker") {
      // Speaker view: active speaker large, others small
      return {
        columns: 1,
        mainSize: "full" as const,
        showThumbnails: true,
      };
    }

    if (layout === "spotlight") {
      // Spotlight: spotlighted large, others in strip
      return {
        columns: 1,
        mainSize: "full" as const,
        showThumbnails: true,
      };
    }

    if (layout === "sidebar") {
      // Sidebar: pinned/speaker main, sidebar for others
      return {
        columns: 1,
        mainSize: "full" as const,
        showThumbnails: true,
      };
    }

    // Grid layout
    if (count <= 1) return { columns: 1, mainSize: "large" as const };
    if (count <= 4) return { columns: 2, mainSize: "large" as const };
    if (count <= 9) return { columns: 3, mainSize: "medium" as const };
    if (count <= 16) return { columns: 4, mainSize: "medium" as const };
    return { columns: 5, mainSize: "small" as const };
  }, [participants.length, layout]);

  // Sort participants based on layout
  const sortedParticipants = useMemo(() => {
    const sorted = [...participants];

    if (layout === "speaker") {
      // Active speaker first
      return sorted.sort((a, b) => {
        if (a.id === activeSpeakerId) return -1;
        if (b.id === activeSpeakerId) return 1;
        return b.audioLevel - a.audioLevel;
      });
    }

    if (layout === "spotlight") {
      // Spotlighted first
      return sorted.sort((a, b) => {
        if (a.isSpotlight && !b.isSpotlight) return -1;
        if (!a.isSpotlight && b.isSpotlight) return 1;
        return 0;
      });
    }

    if (layout === "sidebar") {
      // Pinned first, then speaker
      return sorted.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.id === activeSpeakerId) return -1;
        if (b.id === activeSpeakerId) return 1;
        return 0;
      });
    }

    // Grid: pinned first, then by join time
    return sorted.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });
  }, [participants, layout, activeSpeakerId]);

  // Render based on layout type
  if (layout === "speaker" || layout === "spotlight" || layout === "sidebar") {
    const mainParticipant = sortedParticipants[0];
    const thumbnailParticipants = sortedParticipants.slice(1);

    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Main view */}
        <div className="flex-1 p-4">
          {mainParticipant && (
            <VideoTile
              participant={mainParticipant}
              stream={
                mainParticipant.id === localParticipantId
                  ? localStream
                  : getParticipantStream(mainParticipant.id)
              }
              isLocal={mainParticipant.id === localParticipantId}
              isActiveSpeaker={mainParticipant.id === activeSpeakerId}
              isPinned={mainParticipant.id === pinnedParticipantId}
              canManage={canManageParticipants}
              onPin={() => onPinParticipant?.(mainParticipant.id)}
              onUnpin={onUnpinParticipant}
              onMute={() => onMuteParticipant?.(mainParticipant.id)}
              onRemove={() => onRemoveParticipant?.(mainParticipant.id)}
              onSetRole={(role) => onSetRole?.(mainParticipant.id, role)}
              onLowerHand={() => onLowerHand?.(mainParticipant.id)}
              size="full"
            />
          )}
        </div>

        {/* Thumbnail strip */}
        {thumbnailParticipants.length > 0 && (
          <div className="h-36 flex gap-2 p-2 overflow-x-auto bg-gray-900/50">
            {thumbnailParticipants.map((participant) => (
              <VideoTile
                key={participant.id}
                participant={participant}
                stream={
                  participant.id === localParticipantId
                    ? localStream
                    : getParticipantStream(participant.id)
                }
                isLocal={participant.id === localParticipantId}
                isActiveSpeaker={participant.id === activeSpeakerId}
                isPinned={participant.id === pinnedParticipantId}
                canManage={canManageParticipants}
                onPin={() => onPinParticipant?.(participant.id)}
                onUnpin={onUnpinParticipant}
                onMute={() => onMuteParticipant?.(participant.id)}
                onRemove={() => onRemoveParticipant?.(participant.id)}
                onSetRole={(role) => onSetRole?.(participant.id, role)}
                onLowerHand={() => onLowerHand?.(participant.id)}
                size="small"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid layout
  return (
    <div
      className={cn("grid gap-2 p-4 h-full place-items-center", className)}
      style={{
        gridTemplateColumns: `repeat(${gridConfig.columns}, minmax(0, 1fr))`,
      }}
    >
      {sortedParticipants.map((participant) => (
        <VideoTile
          key={participant.id}
          participant={participant}
          stream={
            participant.id === localParticipantId
              ? localStream
              : getParticipantStream(participant.id)
          }
          isLocal={participant.id === localParticipantId}
          isActiveSpeaker={participant.id === activeSpeakerId}
          isPinned={participant.id === pinnedParticipantId}
          canManage={canManageParticipants}
          onPin={() => onPinParticipant?.(participant.id)}
          onUnpin={onUnpinParticipant}
          onMute={() => onMuteParticipant?.(participant.id)}
          onRemove={() => onRemoveParticipant?.(participant.id)}
          onSetRole={(role) => onSetRole?.(participant.id, role)}
          onLowerHand={() => onLowerHand?.(participant.id)}
          size={gridConfig.mainSize}
        />
      ))}
    </div>
  );
}
