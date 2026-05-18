/**
 * ParticipantGrid Component
 *
 * Dynamic grid layout for call participants with adaptive sizing,
 * spotlight mode, screen share support, and pagination for large calls.
 */

"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Monitor,
  Pin,
  PinOff,
  MoreVertical,
  UserX,
  Volume2,
  VolumeX,
  Crown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { CallParticipant as BaseCallParticipant } from "@/types/calls";

// ============================================================================
// Types
// ============================================================================

export interface LocalParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  stream?: MediaStream;
}

// Extend CallParticipant with additional UI properties
export interface UICallParticipant extends BaseCallParticipant {
  /** Participant stream */
  stream?: MediaStream;
  /** Whether this is the host */
  isHost?: boolean;
  /** Pinned by current user */
  isPinned?: boolean;
  /** Display name (derived from user) */
  name?: string;
  /** Avatar URL (derived from user) */
  avatarUrl?: string;
}

export type GridLayout = "auto" | "grid" | "spotlight" | "sidebar";

export interface ParticipantGridProps {
  /** All call participants */
  participants: UICallParticipant[];
  /** Local participant (current user) */
  localParticipant: LocalParticipant;
  /** Layout mode */
  layout?: GridLayout;
  /** ID of pinned participant */
  pinnedParticipantId?: string;
  /** Whether current user is host */
  isHost?: boolean;
  /** Callback when participant is pinned */
  onPinParticipant?: (id: string) => void;
  /** Callback when participant is removed (host only) */
  onRemoveParticipant?: (id: string) => void;
  /** Callback when participant is muted by host */
  onMuteParticipant?: (id: string) => void;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Grid Layout Calculator
// ============================================================================

function calculateGridLayout(participantCount: number): string {
  if (participantCount === 1) return "grid-cols-1";
  if (participantCount === 2) return "grid-cols-2";
  if (participantCount <= 4) return "grid-cols-2 md:grid-cols-2";
  if (participantCount <= 6) return "grid-cols-2 md:grid-cols-3";
  if (participantCount <= 9) return "grid-cols-3 md:grid-cols-3";
  if (participantCount <= 12) return "grid-cols-3 md:grid-cols-4";
  if (participantCount <= 16) return "grid-cols-4 md:grid-cols-4";
  return "grid-cols-4 md:grid-cols-5";
}

// ============================================================================
// Participant Tile Component
// ============================================================================

interface ParticipantTileProps {
  participant: UICallParticipant | LocalParticipant;
  isLocal?: boolean;
  isHost?: boolean;
  isPinned?: boolean;
  isSpotlight?: boolean;
  showControls?: boolean;
  onPin?: () => void;
  onRemove?: () => void;
  onMute?: () => void;
  className?: string;
}

function ParticipantTile({
  participant,
  isLocal = false,
  isHost = false,
  isPinned = false,
  isSpotlight = false,
  showControls = false,
  onPin,
  onRemove,
  onMute,
  className,
}: ParticipantTileProps) {
  const [showMenu, setShowMenu] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Attach stream to video element
  React.useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const initials = (participant.name || "User")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const showVideo = !participant.isVideoOff && participant.stream;
  const participantData = participant as UICallParticipant;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-gray-900",
        isSpotlight ? "h-full" : "aspect-video",
        participantData.isSpeaking &&
          "ring-4 ring-green-500 ring-offset-2 ring-offset-gray-950",
        isLocal && "border-2 border-blue-500",
        isPinned && "border-2 border-yellow-500",
        "transition-all duration-200",
        className,
      )}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Video or Avatar */}
      {showVideo ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "h-full w-full object-cover",
            isLocal && "scale-x-[-1]", // Mirror local video
          )}
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <Avatar className={cn("h-20 w-20", isSpotlight && "h-32 w-32")}>
            <AvatarImage
              src={participant.avatarUrl || ""}
              alt={participant.name || "User"}
            />
            <AvatarFallback className="bg-gray-700 text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Participant Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3">
        <div className="flex items-center justify-between gap-2">
          {/* Name and Badges */}
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate text-sm font-medium text-white">
              {participant.name || "User"}
              {isLocal && " (You)"}
            </span>
            {participantData.isHost && (
              <Badge variant="secondary" className="bg-yellow-500 text-black">
                <Crown className="mr-1 h-3 w-3" />
                Host
              </Badge>
            )}
            {isPinned && (
              <Badge variant="secondary" className="bg-blue-500">
                <Pin className="h-3 w-3" />
              </Badge>
            )}
          </div>

          {/* Status Icons */}
          <div className="flex shrink-0 items-center gap-1">
            {participantData.isMuted ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
                <MicOff className="h-3 w-3 text-white" />
              </div>
            ) : participantData.isSpeaking ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                <Mic className="h-3 w-3 animate-pulse text-white" />
              </div>
            ) : null}
            {participantData.isScreenSharing && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                <Monitor className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Quality Indicator */}
      {participantData.connectionQuality !== undefined && (
        <div className="absolute right-2 top-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              participantData.connectionQuality >= 80 && "bg-green-500",
              participantData.connectionQuality >= 50 &&
                participantData.connectionQuality < 80 &&
                "bg-yellow-500",
              participantData.connectionQuality < 50 && "bg-red-500",
              participantData.connectionQuality < 50 && "animate-pulse",
            )}
            title={`Connection quality: ${participantData.connectionQuality}%`}
          />
        </div>
      )}

      {/* Controls Menu (Host Only) */}
      {showControls && (showMenu || isPinned) && !isLocal && (
        <div className="absolute left-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full bg-black/60 backdrop-blur hover:bg-black/80"
              >
                <MoreVertical className="h-4 w-4 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {onPin && (
                <DropdownMenuItem onClick={onPin}>
                  {isPinned ? (
                    <>
                      <PinOff className="mr-2 h-4 w-4" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="mr-2 h-4 w-4" />
                      Pin
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {isHost && onMute && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onMute}>
                    {participantData.isMuted ? (
                      <>
                        <Volume2 className="mr-2 h-4 w-4" />
                        Unmute
                      </>
                    ) : (
                      <>
                        <VolumeX className="mr-2 h-4 w-4" />
                        Mute
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
              {isHost && onRemove && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onRemove} className="text-red-500">
                    <UserX className="mr-2 h-4 w-4" />
                    Remove from call
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Speaking Indicator Animation */}
      {participantData.isSpeaking && !participantData.isMuted && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 animate-pulse rounded-lg ring-4 ring-green-500" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ParticipantGrid Component
// ============================================================================

export function ParticipantGrid({
  participants,
  localParticipant,
  layout = "auto",
  pinnedParticipantId,
  isHost = false,
  onPinParticipant,
  onRemoveParticipant,
  onMuteParticipant,
  className,
}: ParticipantGridProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const PARTICIPANTS_PER_PAGE = 16;

  // Combine local participant with remote participants
  const allParticipants = useMemo(
    () =>
      [localParticipant, ...participants] as (
        | LocalParticipant
        | UICallParticipant
      )[],
    [localParticipant, participants],
  );

  // Find screen sharing participant
  const screenSharingParticipant = useMemo(
    () => participants.find((p) => p.isScreenSharing),
    [participants],
  );

  // Determine effective layout
  const effectiveLayout = useMemo(() => {
    if (layout !== "auto") return layout;
    if (screenSharingParticipant) return "sidebar";
    if (allParticipants.length === 1) return "spotlight";
    if (allParticipants.length <= 4) return "grid";
    return "grid";
  }, [layout, screenSharingParticipant, allParticipants.length]);

  // Pagination for large calls
  const totalPages = Math.ceil(allParticipants.length / PARTICIPANTS_PER_PAGE);
  const paginatedParticipants = useMemo(() => {
    if (allParticipants.length <= PARTICIPANTS_PER_PAGE) return allParticipants;
    const start = currentPage * PARTICIPANTS_PER_PAGE;
    return allParticipants.slice(start, start + PARTICIPANTS_PER_PAGE);
  }, [allParticipants, currentPage]);

  // Spotlight layout - single participant
  if (effectiveLayout === "spotlight") {
    const spotlightParticipant = pinnedParticipantId
      ? allParticipants.find((p) => p.id === pinnedParticipantId) ||
        allParticipants[0]
      : allParticipants[0];

    return (
      <div
        className={cn("flex h-full items-center justify-center p-4", className)}
      >
        <ParticipantTile
          participant={spotlightParticipant}
          isLocal={spotlightParticipant.id === localParticipant.id}
          isHost={isHost}
          isPinned={spotlightParticipant.id === pinnedParticipantId}
          isSpotlight
          showControls={isHost}
          onPin={
            onPinParticipant
              ? () => onPinParticipant(spotlightParticipant.id)
              : undefined
          }
          onRemove={
            onRemoveParticipant &&
            spotlightParticipant.id !== localParticipant.id
              ? () => onRemoveParticipant(spotlightParticipant.id)
              : undefined
          }
          onMute={
            onMuteParticipant && spotlightParticipant.id !== localParticipant.id
              ? () => onMuteParticipant(spotlightParticipant.id)
              : undefined
          }
          className="max-h-full max-w-full"
        />
      </div>
    );
  }

  // Sidebar layout - screen share + thumbnails
  if (effectiveLayout === "sidebar" && screenSharingParticipant) {
    const otherParticipants = allParticipants.filter(
      (p) => p.id !== screenSharingParticipant.id,
    );

    return (
      <div className={cn("flex h-full gap-4 p-4", className)}>
        {/* Main screen share */}
        <div className="flex-1">
          <ParticipantTile
            participant={screenSharingParticipant}
            isLocal={screenSharingParticipant.id === localParticipant.id}
            isHost={isHost}
            isSpotlight
            showControls={isHost}
            onPin={
              onPinParticipant
                ? () => onPinParticipant(screenSharingParticipant.id)
                : undefined
            }
          />
        </div>

        {/* Sidebar thumbnails */}
        <div className="flex w-64 flex-col gap-2 overflow-y-auto">
          {otherParticipants.map((participant) => (
            <ParticipantTile
              key={participant.id}
              participant={participant}
              isLocal={participant.id === localParticipant.id}
              isHost={isHost}
              isPinned={participant.id === pinnedParticipantId}
              showControls={isHost}
              onPin={
                onPinParticipant
                  ? () => onPinParticipant(participant.id)
                  : undefined
              }
              onRemove={
                onRemoveParticipant && participant.id !== localParticipant.id
                  ? () => onRemoveParticipant(participant.id)
                  : undefined
              }
              onMute={
                onMuteParticipant && participant.id !== localParticipant.id
                  ? () => onMuteParticipant(participant.id)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    );
  }

  // Grid layout - all participants in grid
  const gridCols = calculateGridLayout(paginatedParticipants.length);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Grid */}
      <div className={cn("grid flex-1 gap-2 p-4", gridCols, "auto-rows-fr")}>
        {paginatedParticipants.map((participant) => (
          <ParticipantTile
            key={participant.id}
            participant={participant}
            isLocal={participant.id === localParticipant.id}
            isHost={isHost}
            isPinned={participant.id === pinnedParticipantId}
            showControls={isHost}
            onPin={
              onPinParticipant
                ? () => onPinParticipant(participant.id)
                : undefined
            }
            onRemove={
              onRemoveParticipant && participant.id !== localParticipant.id
                ? () => onRemoveParticipant(participant.id)
                : undefined
            }
            onMute={
              onMuteParticipant && participant.id !== localParticipant.id
                ? () => onMuteParticipant(participant.id)
                : undefined
            }
          />
        ))}
      </div>

      {/* Pagination controls for large calls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-gray-700 bg-gray-800 p-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-400">
            Page {currentPage + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
            }
            disabled={currentPage === totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default ParticipantGrid;
