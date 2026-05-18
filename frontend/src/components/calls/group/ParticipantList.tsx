/**
 * Participant List Component
 *
 * Displays a list of participants in a group call with their status,
 * role badges, and action buttons for hosts.
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MoreVertical,
  Crown,
  Shield,
  Hand,
  Monitor,
  UserMinus,
  UserCog,
  Pin,
  Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  GroupCallParticipant,
  ParticipantRole,
} from "@/services/calls/group-call.service";

// =============================================================================
// Types
// =============================================================================

export interface ParticipantListProps {
  participants: GroupCallParticipant[];
  currentUserId: string;
  isHost: boolean;
  isCoHost: boolean;
  activeSpeakerId: string | null;
  pinnedParticipantId: string | null;
  onMuteParticipant?: (participantId: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
  onSetRole?: (participantId: string, role: ParticipantRole) => void;
  onPinParticipant?: (participantId: string) => void;
  onUnpinParticipant?: () => void;
  onSpotlightParticipant?: (participantId: string) => void;
  onLowerHand?: (participantId: string) => void;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getRoleBadgeVariant(
  role: ParticipantRole,
): "default" | "secondary" | "outline" {
  switch (role) {
    case "host":
      return "default";
    case "co-host":
      return "secondary";
    default:
      return "outline";
  }
}

function getRoleIcon(role: ParticipantRole): React.ReactNode {
  switch (role) {
    case "host":
      return <Crown className="mr-1 h-3 w-3" />;
    case "co-host":
      return <Shield className="mr-1 h-3 w-3" />;
    default:
      return null;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// Component
// =============================================================================

export function ParticipantList({
  participants,
  currentUserId,
  isHost,
  isCoHost,
  activeSpeakerId,
  pinnedParticipantId,
  onMuteParticipant,
  onRemoveParticipant,
  onSetRole,
  onPinParticipant,
  onUnpinParticipant,
  onSpotlightParticipant,
  onLowerHand,
  className,
}: ParticipantListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const canManageParticipants = isHost || isCoHost;

  // Sort participants: Host first, then co-hosts, then raised hands, then alphabetically
  const sortedParticipants = useMemo(() => {
    const roleOrder: Record<ParticipantRole, number> = {
      host: 0,
      "co-host": 1,
      participant: 2,
      viewer: 3,
    };

    return [...participants]
      .filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => {
        // Role order
        const roleCompare = roleOrder[a.role] - roleOrder[b.role];
        if (roleCompare !== 0) return roleCompare;

        // Raised hands first within same role
        if (a.isHandRaised && !b.isHandRaised) return -1;
        if (!a.isHandRaised && b.isHandRaised) return 1;

        // Alphabetically
        return a.name.localeCompare(b.name);
      });
  }, [participants, searchQuery]);

  const raisedHandsCount = participants.filter((p) => p.isHandRaised).length;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="mb-2 font-semibold">
          Participants ({participants.length})
        </h3>
        <Input
          placeholder="Search participants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8"
        />
      </div>

      {/* Raised Hands Section */}
      {raisedHandsCount > 0 && (
        <div className="border-b bg-amber-50 p-3 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
            <Hand className="h-4 w-4" />
            {raisedHandsCount} raised hand{raisedHandsCount > 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Participant List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {sortedParticipants.map((participant) => (
            <ParticipantItem
              key={participant.id}
              participant={participant}
              isCurrentUser={participant.id === currentUserId}
              isActiveSpeaker={participant.id === activeSpeakerId}
              isPinned={participant.id === pinnedParticipantId}
              canManage={
                canManageParticipants && participant.id !== currentUserId
              }
              canManageRoles={isHost && participant.id !== currentUserId}
              onMute={onMuteParticipant}
              onRemove={onRemoveParticipant}
              onSetRole={onSetRole}
              onPin={onPinParticipant}
              onUnpin={onUnpinParticipant}
              onSpotlight={onSpotlightParticipant}
              onLowerHand={onLowerHand}
            />
          ))}

          {sortedParticipants.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No participants found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// Participant Item Component
// =============================================================================

interface ParticipantItemProps {
  participant: GroupCallParticipant;
  isCurrentUser: boolean;
  isActiveSpeaker: boolean;
  isPinned: boolean;
  canManage: boolean;
  canManageRoles: boolean;
  onMute?: (participantId: string) => void;
  onRemove?: (participantId: string) => void;
  onSetRole?: (participantId: string, role: ParticipantRole) => void;
  onPin?: (participantId: string) => void;
  onUnpin?: () => void;
  onSpotlight?: (participantId: string) => void;
  onLowerHand?: (participantId: string) => void;
}

function ParticipantItem({
  participant,
  isCurrentUser,
  isActiveSpeaker,
  isPinned,
  canManage,
  canManageRoles,
  onMute,
  onRemove,
  onSetRole,
  onPin,
  onUnpin,
  onSpotlight,
  onLowerHand,
}: ParticipantItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg p-2 transition-colors",
        isActiveSpeaker && "bg-blue-50 dark:bg-blue-900/20",
        participant.isHandRaised && "bg-amber-50 dark:bg-amber-900/20",
        "hover:bg-muted/50",
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={participant.avatarUrl} alt={participant.name} />
          <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
        </Avatar>

        {/* Speaking Indicator */}
        {isActiveSpeaker && (
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
        )}
      </div>

      {/* Name and Status */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {participant.name}
            {isCurrentUser && (
              <span className="ml-1 text-muted-foreground">(You)</span>
            )}
          </span>

          {/* Role Badge */}
          {(participant.role === "host" || participant.role === "co-host") && (
            <Badge
              variant={getRoleBadgeVariant(participant.role)}
              className="h-5 text-xs"
            >
              {getRoleIcon(participant.role)}
              {participant.role === "host" ? "Host" : "Co-host"}
            </Badge>
          )}
        </div>

        {/* Status Icons */}
        <div className="mt-1 flex items-center gap-2">
          {participant.isMuted ? (
            <MicOff className="h-3 w-3 text-red-500" />
          ) : (
            <Mic className="h-3 w-3 text-muted-foreground" />
          )}

          {participant.isVideoEnabled ? (
            <Video className="h-3 w-3 text-muted-foreground" />
          ) : (
            <VideoOff className="h-3 w-3 text-red-500" />
          )}

          {participant.isScreenSharing && (
            <Monitor className="h-3 w-3 text-blue-500" />
          )}

          {participant.isHandRaised && (
            <Hand className="h-3 w-3 text-amber-500" />
          )}

          {isPinned && <Pin className="h-3 w-3 text-purple-500" />}
        </div>
      </div>

      {/* Actions */}
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Mute */}
            {!participant.isMuted && (
              <DropdownMenuItem onClick={() => onMute?.(participant.id)}>
                <MicOff className="mr-2 h-4 w-4" />
                Mute
              </DropdownMenuItem>
            )}

            {/* Pin/Unpin */}
            {isPinned ? (
              <DropdownMenuItem onClick={() => onUnpin?.()}>
                <Pin className="mr-2 h-4 w-4" />
                Unpin
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onPin?.(participant.id)}>
                <Pin className="mr-2 h-4 w-4" />
                Pin
              </DropdownMenuItem>
            )}

            {/* Spotlight */}
            <DropdownMenuItem onClick={() => onSpotlight?.(participant.id)}>
              <Presentation className="mr-2 h-4 w-4" />
              Spotlight
            </DropdownMenuItem>

            {/* Lower Hand */}
            {participant.isHandRaised && (
              <DropdownMenuItem onClick={() => onLowerHand?.(participant.id)}>
                <Hand className="mr-2 h-4 w-4" />
                Lower Hand
              </DropdownMenuItem>
            )}

            {/* Role Management */}
            {canManageRoles && participant.role !== "host" && (
              <>
                <DropdownMenuSeparator />
                {participant.role === "co-host" ? (
                  <DropdownMenuItem
                    onClick={() => onSetRole?.(participant.id, "participant")}
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Remove Co-host
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => onSetRole?.(participant.id, "co-host")}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Make Co-host
                  </DropdownMenuItem>
                )}
              </>
            )}

            {/* Remove */}
            {participant.role !== "host" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRemove?.(participant.id)}
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Remove from Call
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
