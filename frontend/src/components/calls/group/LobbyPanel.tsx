/**
 * Lobby Panel Component
 *
 * Displays participants waiting in the lobby and provides controls
 * to admit or deny them.
 */

"use client";

import React, { useMemo, useState } from "react";
import {
  DoorClosed,
  UserCheck,
  UserX,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupCallParticipant } from "@/services/calls/group-call.service";

// =============================================================================
// Types
// =============================================================================

export interface LobbyPanelProps {
  lobbyParticipants: GroupCallParticipant[];
  isHost: boolean;
  isCoHost: boolean;
  onAdmit: (participantId: string) => void;
  onAdmitAll: () => void;
  onDeny: (participantId: string, reason?: string) => void;
  onDenyAll: (reason?: string) => void;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatWaitTime(joinedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - joinedAt.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) {
    return `${diffSecs}s`;
  }

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) {
    return `${diffMins}m`;
  }

  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ${diffMins % 60}m`;
}

// =============================================================================
// Component
// =============================================================================

export function LobbyPanel({
  lobbyParticipants,
  isHost,
  isCoHost,
  onAdmit,
  onAdmitAll,
  onDeny,
  onDenyAll,
  className,
}: LobbyPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const canManage = isHost || isCoHost;

  const filteredParticipants = useMemo(() => {
    return lobbyParticipants.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [lobbyParticipants, searchQuery]);

  // Sort by wait time (longest first)
  const sortedParticipants = useMemo(() => {
    return [...filteredParticipants].sort(
      (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
    );
  }, [filteredParticipants]);

  if (!canManage) {
    return null;
  }

  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DoorClosed className="h-5 w-5" />
            Waiting Room
            {lobbyParticipants.length > 0 && (
              <Badge variant="secondary">{lobbyParticipants.length}</Badge>
            )}
          </CardTitle>
        </div>

        {lobbyParticipants.length > 0 && (
          <div className="mt-3 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 gap-2"
                onClick={onAdmitAll}
                disabled={lobbyParticipants.length === 0}
              >
                <CheckCircle className="h-4 w-4" />
                Admit All
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => onDenyAll()}
                disabled={lobbyParticipants.length === 0}
              >
                <XCircle className="h-4 w-4" />
                Deny All
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0">
        {lobbyParticipants.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No one is waiting</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New participants will appear here when the waiting room is enabled
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              {sortedParticipants.map((participant) => (
                <LobbyParticipantItem
                  key={participant.id}
                  participant={participant}
                  onAdmit={() => onAdmit(participant.id)}
                  onDeny={() => onDeny(participant.id)}
                />
              ))}

              {filteredParticipants.length === 0 && searchQuery && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No matching participants
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Lobby Participant Item Component
// =============================================================================

interface LobbyParticipantItemProps {
  participant: GroupCallParticipant;
  onAdmit: () => void;
  onDeny: () => void;
}

function LobbyParticipantItem({
  participant,
  onAdmit,
  onDeny,
}: LobbyParticipantItemProps) {
  const [waitTime, setWaitTime] = useState(
    formatWaitTime(participant.joinedAt),
  );

  // Update wait time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setWaitTime(formatWaitTime(participant.joinedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [participant.joinedAt]);

  return (
    <div className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50">
      {/* Avatar */}
      <Avatar className="h-10 w-10">
        <AvatarImage src={participant.avatarUrl} alt={participant.name} />
        <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{participant.name}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Waiting {waitTime}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-green-600 hover:bg-green-100 hover:text-green-700"
          onClick={onAdmit}
        >
          <UserCheck className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-red-600 hover:bg-red-100 hover:text-red-700"
          onClick={onDeny}
        >
          <UserX className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Waiting in Lobby View (for participants)
// =============================================================================

export interface WaitingInLobbyProps {
  hostName?: string;
  callTitle?: string;
  onLeave: () => void;
  className?: string;
}

export function WaitingInLobby({
  hostName,
  callTitle,
  onLeave,
  className,
}: WaitingInLobbyProps) {
  const [waitTime, setWaitTime] = useState(0);

  // Update wait time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setWaitTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-8 dark:from-blue-950/20 dark:to-purple-950/20",
        className,
      )}
    >
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <DoorClosed className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Title */}
        <h2 className="mb-2 text-2xl font-semibold">Waiting to be admitted</h2>

        {/* Description */}
        <p className="mb-6 text-muted-foreground">
          {callTitle ? (
            <>
              You're joining <strong>{callTitle}</strong>
            </>
          ) : (
            <>The host will let you in soon</>
          )}
        </p>

        {/* Host Name */}
        {hostName && (
          <p className="mb-4 text-sm text-muted-foreground">
            Host:{" "}
            <span className="font-medium text-foreground">{hostName}</span>
          </p>
        )}

        {/* Wait Time */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg font-medium">{formatTime(waitTime)}</span>
        </div>

        {/* Loading Animation */}
        <div className="mb-8 flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3 w-3 animate-bounce rounded-full bg-blue-600"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>

        {/* Leave Button */}
        <Button variant="outline" onClick={onLeave}>
          Leave Waiting Room
        </Button>
      </div>
    </div>
  );
}
