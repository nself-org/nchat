/**
 * Speaker View
 *
 * Displays main speaker with thumbnails of other participants.
 */

"use client";

import React from "react";
import { VideoTile } from "./VideoTile";
import type { ParticipantTile } from "@/lib/calls/layout-manager";
import type { CallParticipant } from "@/stores/call-store";

// =============================================================================
// Types
// =============================================================================

export interface SpeakerViewProps {
  mainTile: ParticipantTile | null;
  thumbnails: ParticipantTile[];
  localStream: MediaStream | null;
  remoteStreams: MediaStream[];
  participants: CallParticipant[];
}

// =============================================================================
// Component
// =============================================================================

export function SpeakerView({
  mainTile,
  thumbnails,
  localStream,
  remoteStreams,
  participants,
}: SpeakerViewProps) {
  const getStreamForParticipant = (
    participantId: string,
  ): MediaStream | null => {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return null;

    const streamIndex = participants.findIndex(
      (p) => p.id === participantId && p.id !== participant.id,
    );
    return streamIndex >= 0 ? remoteStreams[streamIndex] : localStream;
  };

  return (
    <div className="relative h-full w-full">
      {/* Main Speaker */}
      {mainTile &&
        (() => {
          const participant = participants.find(
            (p) => p.id === mainTile.participantId,
          );
          if (!participant) return null;

          const stream = getStreamForParticipant(mainTile.participantId);

          return (
            <VideoTile
              key={mainTile.participantId}
              participant={participant}
              stream={stream}
              isMain
              style={{
                position: "absolute",
                left: `${mainTile.x}px`,
                top: `${mainTile.y}px`,
                width: `${mainTile.width}px`,
                height: `${mainTile.height}px`,
                zIndex: mainTile.zIndex,
              }}
            />
          );
        })()}

      {/* Thumbnails */}
      {thumbnails.map((tile) => {
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
          />
        );
      })}
    </div>
  );
}
