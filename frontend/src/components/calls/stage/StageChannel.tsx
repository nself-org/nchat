/**
 * Stage Channel Component
 *
 * Main stage channel UI with speaker spotlight, listener count,
 * active topic display, and stage controls.
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Mic,
  MicOff,
  Hand,
  Users,
  Settings,
  MoreVertical,
  Crown,
  Shield,
  Radio,
  Pause,
  Play,
  LogOut,
  X,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  Circle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  StageChannel as StageChannelType,
  StageParticipant,
  StageRole,
  RaiseHandRequest,
} from "@/types/stage";

// =============================================================================
// Types
// =============================================================================

export interface StageChannelProps {
  stage: StageChannelType;
  participants: StageParticipant[];
  currentUserId: string;
  currentUserRole: StageRole;
  raiseHandRequests: RaiseHandRequest[];
  activeSpeakerId: string | null;
  isMuted: boolean;
  hasRaisedHand: boolean;
  onMuteToggle: () => void;
  onRaiseHand: () => void;
  onLowerHand: () => void;
  onLeaveStage: () => void;
  onEndStage?: () => void;
  onPauseStage?: () => void;
  onResumeStage?: () => void;
  onInviteToSpeak?: (userId: string) => void;
  onMoveToAudience?: (userId: string) => void;
  onAcceptRaiseHand?: (requestId: string) => void;
  onDeclineRaiseHand?: (requestId: string) => void;
  onMuteSpeaker?: (userId: string) => void;
  onRemoveFromStage?: (userId: string) => void;
  onUpdateTopic?: (topic: string) => void;
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

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function getRoleBadge(role: StageRole): {
  icon: React.ReactNode;
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  switch (role) {
    case "moderator":
      return {
        icon: <Crown className="h-3 w-3" />,
        label: "Moderator",
        variant: "default",
      };
    case "speaker":
      return {
        icon: <Mic className="h-3 w-3" />,
        label: "Speaker",
        variant: "secondary",
      };
    case "listener":
      return {
        icon: <Volume2 className="h-3 w-3" />,
        label: "Listener",
        variant: "outline",
      };
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function StageChannel({
  stage,
  participants,
  currentUserId,
  currentUserRole,
  raiseHandRequests,
  activeSpeakerId,
  isMuted,
  hasRaisedHand,
  onMuteToggle,
  onRaiseHand,
  onLowerHand,
  onLeaveStage,
  onEndStage,
  onPauseStage,
  onResumeStage,
  onInviteToSpeak,
  onMoveToAudience,
  onAcceptRaiseHand,
  onDeclineRaiseHand,
  onMuteSpeaker,
  onRemoveFromStage,
  onUpdateTopic,
  className,
}: StageChannelProps) {
  const [duration, setDuration] = useState(0);
  const [showListeners, setShowListeners] = useState(true);
  const [showRaiseHands, setShowRaiseHands] = useState(true);

  const isModerator = currentUserRole === "moderator";
  const isSpeaker =
    currentUserRole === "speaker" || currentUserRole === "moderator";
  const isListener = currentUserRole === "listener";

  // Calculate duration
  useEffect(() => {
    if (!stage.startedAt || stage.status !== "live") return;

    const startTime = new Date(stage.startedAt).getTime();
    const updateDuration = () => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [stage.startedAt, stage.status]);

  // Separate speakers and listeners
  const { speakers, listeners } = useMemo(() => {
    const speakers = participants.filter(
      (p) => p.role === "speaker" || p.role === "moderator",
    );
    const listeners = participants.filter((p) => p.role === "listener");

    // Sort speakers: moderators first, then by position
    speakers.sort((a, b) => {
      if (a.role === "moderator" && b.role !== "moderator") return -1;
      if (a.role !== "moderator" && b.role === "moderator") return 1;
      return (a.speakerPosition ?? 0) - (b.speakerPosition ?? 0);
    });

    // Sort listeners: raised hands first
    listeners.sort((a, b) => {
      if (a.hasRaisedHand && !b.hasRaisedHand) return -1;
      if (!a.hasRaisedHand && b.hasRaisedHand) return 1;
      return 0;
    });

    return { speakers, listeners };
  }, [participants]);

  const pendingRequests = raiseHandRequests.filter(
    (r) => r.status === "pending",
  );

  return (
    <TooltipProvider>
      <div className={cn("flex h-full flex-col bg-background", className)}>
        {/* Stage Header */}
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Status Indicator */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
                  stage.status === "live" &&
                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                  stage.status === "paused" &&
                    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                  stage.status === "scheduled" &&
                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                  stage.status === "ended" &&
                    "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
                )}
              >
                {stage.status === "live" && (
                  <>
                    <Circle className="h-2 w-2 animate-pulse fill-current" />
                    LIVE
                  </>
                )}
                {stage.status === "paused" && (
                  <>
                    <Pause className="h-3 w-3" />
                    PAUSED
                  </>
                )}
                {stage.status === "scheduled" && (
                  <>
                    <Calendar className="h-3 w-3" />
                    SCHEDULED
                  </>
                )}
                {stage.status === "ended" && (
                  <>
                    <X className="h-3 w-3" />
                    ENDED
                  </>
                )}
              </div>

              {/* Duration */}
              {stage.status === "live" && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatDuration(duration)}
                </div>
              )}

              {/* Recording indicator */}
              {stage.isRecording && (
                <Badge variant="destructive" className="gap-1">
                  <Circle className="h-2 w-2 animate-pulse fill-current" />
                  REC
                </Badge>
              )}
            </div>

            {/* Moderator Controls */}
            {isModerator && (
              <div className="flex items-center gap-2">
                {stage.status === "live" && onPauseStage && (
                  <Button variant="outline" size="sm" onClick={onPauseStage}>
                    <Pause className="mr-1 h-4 w-4" />
                    Pause
                  </Button>
                )}
                {stage.status === "paused" && onResumeStage && (
                  <Button variant="outline" size="sm" onClick={onResumeStage}>
                    <Play className="mr-1 h-4 w-4" />
                    Resume
                  </Button>
                )}
                {onEndStage && (
                  <Button variant="destructive" size="sm" onClick={onEndStage}>
                    End Stage
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Topic */}
          <div className="mt-2">
            <h2 className="text-lg font-semibold">{stage.name}</h2>
            <p className="text-sm text-muted-foreground">{stage.topic}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Speakers Section */}
          <div className="flex flex-1 flex-col">
            {/* Speaker Spotlight Area */}
            <div className="flex-1 p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Speakers ({speakers.length})
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {speakers.map((speaker) => (
                  <SpeakerTile
                    key={speaker.userId}
                    participant={speaker}
                    isActiveSpeaker={speaker.userId === activeSpeakerId}
                    isCurrentUser={speaker.userId === currentUserId}
                    isModerator={isModerator}
                    onMute={onMuteSpeaker}
                    onMoveToAudience={onMoveToAudience}
                    onRemove={onRemoveFromStage}
                  />
                ))}
              </div>

              {speakers.length === 0 && (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  No speakers yet
                </div>
              )}
            </div>

            {/* Raise Hand Requests (Moderator Only) */}
            {isModerator && pendingRequests.length > 0 && (
              <div className="border-t p-4">
                <button
                  className="flex w-full items-center justify-between"
                  onClick={() => setShowRaiseHands(!showRaiseHands)}
                >
                  <h3 className="flex items-center gap-2 text-sm font-medium text-amber-600">
                    <Hand className="h-4 w-4" />
                    Raise Hand Requests ({pendingRequests.length})
                  </h3>
                  {showRaiseHands ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showRaiseHands && (
                  <div className="mt-3 space-y-2">
                    {pendingRequests.map((request) => (
                      <RaiseHandRequestItem
                        key={request.id}
                        request={request}
                        onAccept={() => onAcceptRaiseHand?.(request.id)}
                        onDecline={() => onDeclineRaiseHand?.(request.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Listeners Section */}
            <div className="border-t p-4">
              <button
                className="flex w-full items-center justify-between"
                onClick={() => setShowListeners(!showListeners)}
              >
                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Listeners ({listeners.length})
                </h3>
                {showListeners ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showListeners && (
                <ScrollArea className="mt-3 max-h-32">
                  <div className="flex flex-wrap gap-2">
                    {listeners.slice(0, 50).map((listener) => (
                      <ListenerAvatar
                        key={listener.userId}
                        participant={listener}
                        isCurrentUser={listener.userId === currentUserId}
                        isModerator={isModerator}
                        onInviteToSpeak={() =>
                          onInviteToSpeak?.(listener.userId)
                        }
                        onRemove={() => onRemoveFromStage?.(listener.userId)}
                      />
                    ))}
                    {listeners.length > 50 && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs">
                        +{listeners.length - 50}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="border-t bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mute Button (for speakers) */}
              {isSpeaker && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isMuted ? "destructive" : "secondary"}
                      size="lg"
                      className="h-12 w-12 rounded-full"
                      onClick={onMuteToggle}
                    >
                      {isMuted ? (
                        <MicOff className="h-5 w-5" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
                </Tooltip>
              )}

              {/* Raise Hand Button (for listeners) */}
              {isListener && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={hasRaisedHand ? "default" : "secondary"}
                      size="lg"
                      className={cn(
                        "h-12 rounded-full px-6",
                        hasRaisedHand && "bg-amber-500 hover:bg-amber-600",
                      )}
                      onClick={hasRaisedHand ? onLowerHand : onRaiseHand}
                    >
                      <Hand className="mr-2 h-5 w-5" />
                      {hasRaisedHand ? "Lower Hand" : "Raise Hand"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasRaisedHand ? "Lower your hand" : "Request to speak"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <Badge
                variant={getRoleBadge(currentUserRole).variant}
                className="gap-1"
              >
                {getRoleBadge(currentUserRole).icon}
                {getRoleBadge(currentUserRole).label}
              </Badge>
            </div>

            {/* Leave Button */}
            <Button
              variant="outline"
              onClick={onLeaveStage}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Leave Stage
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// =============================================================================
// Speaker Tile Component
// =============================================================================

interface SpeakerTileProps {
  participant: StageParticipant;
  isActiveSpeaker: boolean;
  isCurrentUser: boolean;
  isModerator: boolean;
  onMute?: (userId: string) => void;
  onMoveToAudience?: (userId: string) => void;
  onRemove?: (userId: string) => void;
}

function SpeakerTile({
  participant,
  isActiveSpeaker,
  isCurrentUser,
  isModerator,
  onMute,
  onMoveToAudience,
  onRemove,
}: SpeakerTileProps) {
  const canModerate =
    isModerator && !isCurrentUser && participant.role !== "moderator";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center rounded-xl p-4 transition-all",
        isActiveSpeaker && "bg-primary/10 ring-2 ring-primary",
        !isActiveSpeaker && "bg-muted/50",
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar
          className={cn(
            "h-16 w-16",
            isActiveSpeaker && "ring-4 ring-green-500",
          )}
        >
          <AvatarImage
            src={participant.user.avatarUrl}
            alt={participant.user.displayName}
          />
          <AvatarFallback>
            {getInitials(participant.user.displayName)}
          </AvatarFallback>
        </Avatar>

        {/* Speaking Indicator */}
        {isActiveSpeaker && (
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background bg-green-500 p-1">
            <Volume2 className="h-full w-full text-white" />
          </div>
        )}

        {/* Mute Indicator */}
        {participant.isMuted && (
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background bg-red-500 p-1">
            <MicOff className="h-full w-full text-white" />
          </div>
        )}

        {/* Role Badge */}
        {participant.role === "moderator" && (
          <div className="absolute -top-1 -right-1 rounded-full bg-primary p-1">
            <Crown className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Name */}
      <span className="mt-2 max-w-full truncate text-sm font-medium">
        {participant.user.displayName}
        {isCurrentUser && " (You)"}
      </span>

      {/* Moderator Actions */}
      {canModerate && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!participant.isMuted && (
              <DropdownMenuItem onClick={() => onMute?.(participant.userId)}>
                <MicOff className="mr-2 h-4 w-4" />
                Mute Speaker
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onMoveToAudience?.(participant.userId)}
            >
              <Users className="mr-2 h-4 w-4" />
              Move to Audience
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onRemove?.(participant.userId)}
            >
              <X className="mr-2 h-4 w-4" />
              Remove from Stage
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// =============================================================================
// Listener Avatar Component
// =============================================================================

interface ListenerAvatarProps {
  participant: StageParticipant;
  isCurrentUser: boolean;
  isModerator: boolean;
  onInviteToSpeak?: () => void;
  onRemove?: () => void;
}

function ListenerAvatar({
  participant,
  isCurrentUser,
  isModerator,
  onInviteToSpeak,
  onRemove,
}: ListenerAvatarProps) {
  const canModerate = isModerator && !isCurrentUser;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {canModerate ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative focus:outline-none">
                <Avatar
                  className={cn(
                    "h-10 w-10",
                    participant.hasRaisedHand && "ring-2 ring-amber-500",
                  )}
                >
                  <AvatarImage
                    src={participant.user.avatarUrl}
                    alt={participant.user.displayName}
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(participant.user.displayName)}
                  </AvatarFallback>
                </Avatar>
                {participant.hasRaisedHand && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-amber-500 p-0.5">
                    <Hand className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onInviteToSpeak}>
                <Mic className="mr-2 h-4 w-4" />
                Invite to Speak
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onRemove}>
                <X className="mr-2 h-4 w-4" />
                Remove from Stage
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="relative">
            <Avatar
              className={cn(
                "h-10 w-10",
                participant.hasRaisedHand && "ring-2 ring-amber-500",
              )}
            >
              <AvatarImage
                src={participant.user.avatarUrl}
                alt={participant.user.displayName}
              />
              <AvatarFallback className="text-xs">
                {getInitials(participant.user.displayName)}
              </AvatarFallback>
            </Avatar>
            {participant.hasRaisedHand && (
              <div className="absolute -right-1 -top-1 rounded-full bg-amber-500 p-0.5">
                <Hand className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p>{participant.user.displayName}</p>
        {isCurrentUser && (
          <p className="text-xs text-muted-foreground">(You)</p>
        )}
        {participant.hasRaisedHand && (
          <p className="text-xs text-amber-500">Hand raised</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// Raise Hand Request Item Component
// =============================================================================

interface RaiseHandRequestItemProps {
  request: RaiseHandRequest;
  onAccept: () => void;
  onDecline: () => void;
}

function RaiseHandRequestItem({
  request,
  onAccept,
  onDecline,
}: RaiseHandRequestItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
      <Avatar className="h-10 w-10">
        <AvatarImage
          src={request.user.avatarUrl}
          alt={request.user.displayName}
        />
        <AvatarFallback>{getInitials(request.user.displayName)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium">{request.user.displayName}</p>
        {request.message && (
          <p className="truncate text-sm text-muted-foreground">
            {request.message}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={onAccept}>
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={onDecline}>
          Decline
        </Button>
      </div>
    </div>
  );
}

export default StageChannel;
