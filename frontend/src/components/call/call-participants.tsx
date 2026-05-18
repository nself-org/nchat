/**
 * Call Participants Component
 *
 * Displays participants in a grid layout for group calls,
 * with video streams or avatars.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Monitor, User } from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export interface Participant {
  id: string;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  stream?: MediaStream;
}

export interface CallParticipantsProps {
  participants: Participant[];
  callType: "voice" | "video";
  isScreenSharing?: boolean;
  className?: string;
}

// =============================================================================
// Participant Video Component
// =============================================================================

interface ParticipantVideoProps {
  participant: Participant;
  callType: "voice" | "video";
  layout: "grid" | "spotlight";
  className?: string;
}

function ParticipantVideo({
  participant,
  callType,
  layout,
  className,
}: ParticipantVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Attach stream to video element
  React.useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const showVideo =
    callType === "video" && participant.isVideoEnabled && participant.stream;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted",
        "flex items-center justify-center",
        layout === "grid" ? "aspect-video" : "h-full w-full",
        participant.isSpeaking && "ring-4 ring-green-500",
        className,
      )}
    >
      {/* Video Stream */}
      {showVideo ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        /* Avatar Fallback */
        <div className="flex flex-col items-center justify-center gap-3 p-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-background">
            {participant.avatarUrl ? (
              <img
                src={participant.avatarUrl}
                alt={participant.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <span className="text-sm font-medium text-foreground">
            {participant.name}
          </span>
        </div>
      )}

      {/* Overlay Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-white">
            {participant.name}
          </span>
          <div className="flex items-center gap-1">
            {participant.isScreenSharing && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                <Monitor className="h-3 w-3 text-white" />
              </div>
            )}
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full",
                participant.isMuted ? "bg-red-500" : "bg-transparent",
              )}
            >
              {participant.isMuted ? (
                <MicOff className="h-3 w-3 text-white" />
              ) : participant.isSpeaking ? (
                <Mic className="h-3 w-3 animate-pulse text-green-500" />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Speaking Indicator */}
      {participant.isSpeaking && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 animate-pulse rounded-lg border-4 border-green-500" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Call Participants Component
// =============================================================================

export function CallParticipants({
  participants,
  callType,
  isScreenSharing = false,
  className,
}: CallParticipantsProps) {
  const participantCount = participants.length;

  // Determine layout based on participant count
  const getGridLayout = () => {
    if (participantCount === 1) {
      return "grid-cols-1";
    } else if (participantCount === 2) {
      return "grid-cols-2";
    } else if (participantCount <= 4) {
      return "grid-cols-2 grid-rows-2";
    } else if (participantCount <= 6) {
      return "grid-cols-3 grid-rows-2";
    } else if (participantCount <= 9) {
      return "grid-cols-3 grid-rows-3";
    } else {
      return "grid-cols-4 grid-rows-3";
    }
  };

  // If someone is screen sharing, show spotlight layout
  const screenSharingParticipant = participants.find((p) => p.isScreenSharing);

  if (screenSharingParticipant && isScreenSharing) {
    const otherParticipants = participants.filter((p) => !p.isScreenSharing);

    return (
      <div className={cn("flex h-full gap-4", className)}>
        {/* Main Screen Share */}
        <div className="flex-1">
          <ParticipantVideo
            participant={screenSharingParticipant}
            callType={callType}
            layout="spotlight"
          />
        </div>

        {/* Sidebar with other participants */}
        {otherParticipants.length > 0 && (
          <div className="flex w-64 flex-col gap-2 overflow-y-auto">
            {otherParticipants.map((participant) => (
              <ParticipantVideo
                key={participant.id}
                participant={participant}
                callType={callType}
                layout="grid"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid layout for normal calls
  return (
    <div
      className={cn(
        "grid h-full w-full auto-rows-fr gap-4",
        getGridLayout(),
        "p-4",
        className,
      )}
    >
      {participants.map((participant) => (
        <ParticipantVideo
          key={participant.id}
          participant={participant}
          callType={callType}
          layout="grid"
        />
      ))}
    </div>
  );
}

CallParticipants.displayName = "CallParticipants";

// =============================================================================
// Empty State
// =============================================================================

export function EmptyCallState({
  message = "Waiting for participants to join...",
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <User className="h-16 w-16" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
