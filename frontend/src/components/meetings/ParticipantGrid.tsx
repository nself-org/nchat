"use client";

/**
 * ParticipantGrid - Video/audio participant grid layout
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  RemoteParticipant,
  LocalUserState,
} from "@/lib/meetings/meeting-types";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  Crown,
  MonitorUp,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface ParticipantGridProps {
  participants: RemoteParticipant[];
  localUser: LocalUserState | undefined;
  activeSpeakerId: string | null;
  screenShareUserId: string | null;
  maxVisible?: number;
}

// ============================================================================
// Component
// ============================================================================

export function ParticipantGrid({
  participants,
  localUser,
  activeSpeakerId,
  screenShareUserId,
  maxVisible = 16,
}: ParticipantGridProps) {
  // Calculate grid layout based on participant count
  const totalParticipants = participants.length + 1; // +1 for local user
  const visibleCount = Math.min(totalParticipants, maxVisible);
  const overflowCount = totalParticipants - maxVisible;

  const getGridClass = (count: number): string => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-3";
    if (count <= 9) return "grid-cols-3";
    if (count <= 12) return "grid-cols-4";
    return "grid-cols-4";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("grid h-full gap-2", getGridClass(visibleCount))}>
      {/* Local User Tile */}
      <ParticipantTile
        displayName="You"
        avatarUrl={null}
        isMuted={localUser?.isMuted ?? true}
        isVideoOn={localUser?.isVideoOn ?? false}
        isScreenSharing={localUser?.isScreenSharing ?? false}
        isHandRaised={localUser?.isHandRaised ?? false}
        isSpeaking={false}
        isHost={true}
        isLocal={true}
      />

      {/* Remote Participants */}
      {participants.slice(0, maxVisible - 1).map((participant) => (
        <ParticipantTile
          key={participant.peerId}
          displayName={participant.displayName}
          avatarUrl={participant.avatarUrl}
          isMuted={participant.isMuted}
          isVideoOn={participant.isVideoOn}
          isScreenSharing={participant.isScreenSharing}
          isHandRaised={participant.isHandRaised}
          isSpeaking={
            participant.isSpeaking || participant.peerId === activeSpeakerId
          }
          isHost={participant.role === "host"}
          connectionQuality={participant.connectionQuality}
        />
      ))}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <div className="flex items-center justify-center rounded-lg bg-gray-800">
          <span className="text-2xl font-semibold">+{overflowCount}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Participant Tile Sub-component
// ============================================================================

interface ParticipantTileProps {
  displayName: string;
  avatarUrl: string | null;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
  isHost?: boolean;
  isLocal?: boolean;
  connectionQuality?: "excellent" | "good" | "fair" | "poor" | "unknown";
}

function ParticipantTile({
  displayName,
  avatarUrl,
  isMuted,
  isVideoOn,
  isScreenSharing,
  isHandRaised,
  isSpeaking,
  isHost = false,
  isLocal = false,
  connectionQuality = "unknown",
}: ParticipantTileProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getConnectionColor = () => {
    switch (connectionQuality) {
      case "excellent":
        return "bg-green-500";
      case "good":
        return "bg-green-400";
      case "fair":
        return "bg-yellow-500";
      case "poor":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg bg-gray-800 transition-all",
        isSpeaking &&
          "ring-2 ring-green-500 ring-offset-2 ring-offset-gray-900",
      )}
    >
      {/* Video or Avatar */}
      {isVideoOn ? (
        <div className="from-primary/20 to-primary/5 absolute inset-0 bg-gradient-to-br">
          {/* Video element would go here */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Avatar className="h-20 w-20 border-2 border-white/20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/50 text-2xl">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      ) : (
        <Avatar
          className={cn(
            "h-20 w-20 border-2 transition-all",
            isSpeaking ? "scale-105 border-green-500" : "border-gray-600",
          )}
        >
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-gray-700 text-2xl">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 animate-pulse rounded-lg border-4 border-green-500 opacity-50" />
        </div>
      )}

      {/* Top-left badges */}
      <div className="absolute left-2 top-2 flex items-center gap-1">
        {isHost && (
          <div className="rounded bg-yellow-500/80 p-1 text-white">
            <Crown className="h-3 w-3" />
          </div>
        )}
        {isScreenSharing && (
          <div className="rounded bg-blue-500/80 p-1 text-white">
            <MonitorUp className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Top-right: Hand raised */}
      {isHandRaised && (
        <div className="absolute right-2 top-2 animate-bounce rounded-full bg-yellow-500 p-1.5 text-white">
          <Hand className="h-4 w-4" />
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium">
            {displayName}
            {isLocal && " (You)"}
          </span>
          <div className="flex items-center gap-1">
            {/* Connection quality */}
            {!isLocal && connectionQuality !== "unknown" && (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={cn(
                      "w-0.5 rounded-full",
                      bar <=
                        (connectionQuality === "excellent"
                          ? 4
                          : connectionQuality === "good"
                            ? 3
                            : connectionQuality === "fair"
                              ? 2
                              : 1)
                        ? getConnectionColor()
                        : "bg-gray-600",
                      bar === 1 && "h-1",
                      bar === 2 && "h-1.5",
                      bar === 3 && "h-2",
                      bar === 4 && "h-2.5",
                    )}
                  />
                ))}
              </div>
            )}

            {/* Audio indicator */}
            <div
              className={cn(
                "rounded p-0.5",
                isMuted ? "text-red-400" : "text-white",
              )}
            >
              {isMuted ? (
                <MicOff className="h-3.5 w-3.5" />
              ) : (
                <Mic
                  className={cn("h-3.5 w-3.5", isSpeaking && "text-green-400")}
                />
              )}
            </div>

            {/* Video indicator */}
            {!isVideoOn && (
              <div className="rounded p-0.5 text-red-400">
                <VideoOff className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
