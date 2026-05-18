/**
 * Video Grid
 *
 * Displays video tiles in a grid layout.
 */

"use client";

import React from "react";
import { VideoTile } from "./VideoTile";
import type { ParticipantTile } from "@/lib/calls/layout-manager";
import type { CallParticipant } from "@/stores/call-store";

// =============================================================================
// Types
// =============================================================================

export interface VideoGridProps {
  tiles: ParticipantTile[];
  localStream: MediaStream | null;
  remoteStreams: MediaStream[];
  participants: CallParticipant[];
}

// =============================================================================
// Component
// =============================================================================

export function VideoGrid({
  tiles,
  localStream,
  remoteStreams,
  participants,
}: VideoGridProps) {
  const getStreamForParticipant = (
    participantId: string,
  ): MediaStream | null => {
    // Check if it's local user
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return null;

    // Return appropriate stream
    const streamIndex = participants.findIndex(
      (p) => p.id === participantId && p.id !== participant.id,
    );
    return streamIndex >= 0 ? remoteStreams[streamIndex] : localStream;
  };

  return (
    <div className="relative h-full w-full">
      {tiles.map((tile) => {
        const participant = participants.find(
          (p) => p.id === tile.participantId,
        );
        if (!participant) return null;

        const stream = getStreamForParticipant(tile.participantId);

        return (
          <VideoTile
            key={tile.participantId}
            participant={participant}
            stream={stream}
            style={{
              position: "absolute",
              left: `${tile.x}px`,
              top: `${tile.y}px`,
              width: `${tile.width}px`,
              height: `${tile.height}px`,
              zIndex: tile.zIndex,
            }}
            isMain={tile.isMainTile}
          />
        );
      })}
    </div>
  );
}
