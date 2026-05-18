/**
 * VoiceChatPanel Component
 *
 * Main panel for Telegram-style voice chats showing participants,
 * controls, and voice chat status.
 */

"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mic,
  MicOff,
  Users,
  Hand,
  Crown,
  Shield,
  PhoneOff,
  Settings,
  Circle,
  Radio,
  MoreVertical,
  Volume2,
  VolumeX,
  Share2,
  Calendar,
  Clock,
} from "lucide-react";
import type {
  VoiceChat,
  VoiceChatParticipant,
  VoiceChatRole,
} from "@/types/voice-chat";

// =============================================================================
// Types
// =============================================================================

interface VoiceChatPanelProps {
  voiceChat: VoiceChat;
  participants: VoiceChatParticipant[];
  currentUserId: string;
  currentUserRole: VoiceChatRole;
  isMuted: boolean;
  isHandRaised: boolean;
  activeSpeakerId: string | null;
  pendingHandCount: number;
  isRecording: boolean;
  recordingDuration: number;
  onToggleMute: () => void;
  onRaiseHand: () => void;
  onLowerHand: () => void;
  onLeave: () => void;
  onEnd: () => void;
  onInviteToSpeak: (userId: string) => void;
  onMoveToListeners: (userId: string) => void;
  onMuteParticipant: (userId: string) => void;
  onRemoveParticipant: (userId: string) => void;
  onOpenSettings: () => void;
  onShareInviteLink: () => void;
  className?: string;
}

// =============================================================================
// Helper Components
// =============================================================================

function RoleIcon({ role }: { role: VoiceChatRole }) {
  switch (role) {
    case "creator":
      return <Crown className="h-3.5 w-3.5 text-amber-500" />;
    case "admin":
      return <Shield className="h-3.5 w-3.5 text-blue-500" />;
    default:
      return null;
  }
}

function ParticipantItem({
  participant,
  isCurrentUser,
  canManage,
  isActiveSpeaker,
  onInviteToSpeak,
  onMoveToListeners,
  onMuteParticipant,
  onRemoveParticipant,
}: {
  participant: VoiceChatParticipant;
  isCurrentUser: boolean;
  canManage: boolean;
  isActiveSpeaker: boolean;
  onInviteToSpeak: () => void;
  onMoveToListeners: () => void;
  onMuteParticipant: () => void;
  onRemoveParticipant: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const isSpeaker = participant.role !== "listener";
  const initials =
    participant.user.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg transition-colors",
        isActiveSpeaker && "bg-primary/10 ring-2 ring-primary/30",
        !isActiveSpeaker && "hover:bg-muted/50",
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          {participant.user.avatarUrl && (
            <AvatarImage src={participant.user.avatarUrl} />
          )}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {participant.isSpeaking && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">
            {participant.user.displayName}
            {isCurrentUser && " (you)"}
          </span>
          <RoleIcon role={participant.role} />
        </div>
        {participant.hasRaisedHand && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <Hand className="h-3 w-3" />
            <span>Wants to speak</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {participant.isMuted ? (
          <MicOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Mic
            className={cn(
              "h-4 w-4",
              participant.isSpeaking
                ? "text-green-500"
                : "text-muted-foreground",
            )}
          />
        )}

        {canManage && !isCurrentUser && participant.role !== "creator" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>More actions</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {showMenu && canManage && (
        <div className="absolute right-2 mt-24 bg-popover rounded-lg shadow-lg p-1 z-10 min-w-[160px]">
          {!isSpeaker && (
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded"
              onClick={() => {
                onInviteToSpeak();
                setShowMenu(false);
              }}
            >
              Invite to speak
            </button>
          )}
          {isSpeaker && participant.role !== "creator" && (
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded"
              onClick={() => {
                onMoveToListeners();
                setShowMenu(false);
              }}
            >
              Move to listeners
            </button>
          )}
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded"
            onClick={() => {
              onMuteParticipant();
              setShowMenu(false);
            }}
          >
            {participant.isMuted ? "Request unmute" : "Mute"}
          </button>
          <Separator className="my-1" />
          <button
            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded"
            onClick={() => {
              onRemoveParticipant();
              setShowMenu(false);
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function VoiceChatPanel({
  voiceChat,
  participants,
  currentUserId,
  currentUserRole,
  isMuted,
  isHandRaised,
  activeSpeakerId,
  pendingHandCount,
  isRecording,
  recordingDuration,
  onToggleMute,
  onRaiseHand,
  onLowerHand,
  onLeave,
  onEnd,
  onInviteToSpeak,
  onMoveToListeners,
  onMuteParticipant,
  onRemoveParticipant,
  onOpenSettings,
  onShareInviteLink,
  className,
}: VoiceChatPanelProps) {
  const isCreator = currentUserRole === "creator";
  const isAdmin = currentUserRole === "admin" || isCreator;
  const canSpeak = currentUserRole !== "listener";

  const speakers = useMemo(
    () => participants.filter((p) => p.role !== "listener"),
    [participants],
  );

  const listeners = useMemo(
    () => participants.filter((p) => p.role === "listener"),
    [participants],
  );

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio className="h-5 w-5 text-green-500" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-lg">{voiceChat.title}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{participants.length} participants</span>
                {voiceChat.status === "live" && (
                  <>
                    <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
                    <span className="text-green-600">Live</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isRecording && (
              <Badge variant="destructive" className="gap-1">
                <Circle className="h-2 w-2 fill-current animate-pulse" />
                REC {formatDuration(recordingDuration)}
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onShareInviteLink}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share invite link</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {isCreator && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onOpenSettings}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {pendingHandCount > 0 && isAdmin && (
          <div className="mt-2 flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
            <Hand className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              {pendingHandCount}{" "}
              {pendingHandCount === 1 ? "person wants" : "people want"} to speak
            </span>
          </div>
        )}
      </div>

      {/* Participant Lists */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Speakers Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Speakers
              </h3>
              <Badge variant="secondary" className="text-xs">
                {speakers.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {speakers.map((participant) => (
                <ParticipantItem
                  key={participant.id}
                  participant={participant}
                  isCurrentUser={participant.userId === currentUserId}
                  canManage={isAdmin}
                  isActiveSpeaker={participant.userId === activeSpeakerId}
                  onInviteToSpeak={() => onInviteToSpeak(participant.userId)}
                  onMoveToListeners={() =>
                    onMoveToListeners(participant.userId)
                  }
                  onMuteParticipant={() =>
                    onMuteParticipant(participant.userId)
                  }
                  onRemoveParticipant={() =>
                    onRemoveParticipant(participant.userId)
                  }
                />
              ))}
            </div>
          </div>

          {/* Listeners Section */}
          {listeners.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Listeners
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {listeners.length}
                </Badge>
              </div>
              <div className="space-y-1">
                {listeners.map((participant) => (
                  <ParticipantItem
                    key={participant.id}
                    participant={participant}
                    isCurrentUser={participant.userId === currentUserId}
                    canManage={isAdmin}
                    isActiveSpeaker={false}
                    onInviteToSpeak={() => onInviteToSpeak(participant.userId)}
                    onMoveToListeners={() =>
                      onMoveToListeners(participant.userId)
                    }
                    onMuteParticipant={() =>
                      onMuteParticipant(participant.userId)
                    }
                    onRemoveParticipant={() =>
                      onRemoveParticipant(participant.userId)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Controls */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-center gap-2">
          {/* Mute Button */}
          {canSpeak && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMuted ? "secondary" : "default"}
                    size="lg"
                    className={cn(
                      "rounded-full w-14 h-14",
                      !isMuted && "bg-green-600 hover:bg-green-700",
                    )}
                    onClick={onToggleMute}
                  >
                    {isMuted ? (
                      <MicOff className="h-6 w-6" />
                    ) : (
                      <Mic className="h-6 w-6" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Raise/Lower Hand Button */}
          {!canSpeak && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isHandRaised ? "default" : "secondary"}
                    size="lg"
                    className={cn(
                      "rounded-full w-14 h-14",
                      isHandRaised && "bg-amber-500 hover:bg-amber-600",
                    )}
                    onClick={isHandRaised ? onLowerHand : onRaiseHand}
                  >
                    <Hand className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isHandRaised ? "Lower hand" : "Raise hand to speak"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Leave Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="lg"
                  className="rounded-full w-14 h-14"
                  onClick={isCreator ? onEnd : onLeave}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isCreator ? "End voice chat" : "Leave"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

export default VoiceChatPanel;
