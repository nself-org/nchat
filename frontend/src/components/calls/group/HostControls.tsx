/**
 * Host Controls Component
 *
 * Provides host-only controls for managing a group call including
 * mute all, lock meeting, end call for all, and room settings.
 */

"use client";

import React, { useState } from "react";
import {
  MicOff,
  VideoOff,
  Lock,
  Unlock,
  DoorClosed,
  Users,
  Settings,
  Shield,
  Crown,
  PhoneOff,
  Hand,
  UserPlus,
  Circle,
  StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// =============================================================================
// Types
// =============================================================================

export interface HostControlsProps {
  isHost: boolean;
  isCoHost: boolean;
  isLocked: boolean;
  isRecording: boolean;
  lobbyEnabled: boolean;
  lobbyCount: number;
  raisedHandsCount: number;
  participantCount: number;
  maxParticipants: number;
  muteOnEntry: boolean;
  videoOffOnEntry: boolean;
  allowParticipantUnmute: boolean;
  allowParticipantScreenShare: boolean;
  onMuteAll: () => void;
  onUnmuteAll: () => void;
  onDisableAllVideo: () => void;
  onLockRoom: () => void;
  onUnlockRoom: () => void;
  onEndCallForAll: () => void;
  onToggleLobby: (enabled: boolean) => void;
  onLowerAllHands: () => void;
  onInviteParticipant: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSettingsChange: (settings: {
    muteOnEntry?: boolean;
    videoOffOnEntry?: boolean;
    allowParticipantUnmute?: boolean;
    allowParticipantScreenShare?: boolean;
  }) => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function HostControls({
  isHost,
  isCoHost,
  isLocked,
  isRecording,
  lobbyEnabled,
  lobbyCount,
  raisedHandsCount,
  participantCount,
  maxParticipants,
  muteOnEntry,
  videoOffOnEntry,
  allowParticipantUnmute,
  allowParticipantScreenShare,
  onMuteAll,
  onUnmuteAll,
  onDisableAllVideo,
  onLockRoom,
  onUnlockRoom,
  onEndCallForAll,
  onToggleLobby,
  onLowerAllHands,
  onInviteParticipant,
  onStartRecording,
  onStopRecording,
  onSettingsChange,
  className,
}: HostControlsProps) {
  const canManage = isHost || isCoHost;

  if (!canManage) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Mute All */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <MicOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Mute</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Mute controls</TooltipContent>
          </Tooltip>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onMuteAll}>
              <MicOff className="mr-2 h-4 w-4" />
              Mute All Participants
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onUnmuteAll}>
              Request All to Unmute
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDisableAllVideo}>
              <VideoOff className="mr-2 h-4 w-4" />
              Turn Off All Video
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Lock/Unlock Room */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isLocked ? "destructive" : "outline"}
              size="sm"
              onClick={isLocked ? onUnlockRoom : onLockRoom}
              className="gap-2"
            >
              {isLocked ? (
                <>
                  <Lock className="h-4 w-4" />
                  <span className="hidden sm:inline">Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  <span className="hidden sm:inline">Lock</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLocked
              ? "Unlock room to allow new participants"
              : "Lock room to prevent new joins"}
          </TooltipContent>
        </Tooltip>

        {/* Lobby Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={lobbyEnabled ? "secondary" : "outline"}
              size="sm"
              onClick={() => onToggleLobby(!lobbyEnabled)}
              className="relative gap-2"
            >
              <DoorClosed className="h-4 w-4" />
              <span className="hidden sm:inline">Lobby</span>
              {lobbyCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {lobbyCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {lobbyEnabled
              ? `Waiting room enabled (${lobbyCount} waiting)`
              : "Enable waiting room for new participants"}
          </TooltipContent>
        </Tooltip>

        {/* Raised Hands */}
        {raisedHandsCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onLowerAllHands}
                className="relative gap-2"
              >
                <Hand className="h-4 w-4 text-amber-500" />
                <Badge variant="secondary" className="h-5 min-w-[20px] px-1">
                  {raisedHandsCount}
                </Badge>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lower all raised hands</TooltipContent>
          </Tooltip>
        )}

        {/* Invite */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onInviteParticipant}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Invite participants ({participantCount}/{maxParticipants})
          </TooltipContent>
        </Tooltip>

        {/* Recording (Host only) */}
        {isHost && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={isRecording ? onStopRecording : onStartRecording}
                className="gap-2"
              >
                {isRecording ? (
                  <>
                    <StopCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Stop</span>
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4 fill-red-500 text-red-500" />
                    <span className="hidden sm:inline">Record</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isRecording ? "Stop recording" : "Start recording"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Settings */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Room settings</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Room Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={muteOnEntry}
              onCheckedChange={(checked) =>
                onSettingsChange({ muteOnEntry: checked })
              }
            >
              Mute on entry
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={videoOffOnEntry}
              onCheckedChange={(checked) =>
                onSettingsChange({ videoOffOnEntry: checked })
              }
            >
              Video off on entry
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={allowParticipantUnmute}
              onCheckedChange={(checked) =>
                onSettingsChange({ allowParticipantUnmute: checked })
              }
            >
              Allow participants to unmute
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={allowParticipantScreenShare}
              onCheckedChange={(checked) =>
                onSettingsChange({ allowParticipantScreenShare: checked })
              }
            >
              Allow screen sharing
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* End Call for All */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <PhoneOff className="h-4 w-4" />
              <span className="hidden sm:inline">End</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End call for everyone?</AlertDialogTitle>
              <AlertDialogDescription>
                This will end the call for all {participantCount} participants.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onEndCallForAll}
                className="bg-destructive"
              >
                End Call for All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Role Indicator */}
        <div className="hidden items-center gap-1 border-l pl-2 md:flex">
          {isHost ? (
            <Badge variant="default" className="gap-1">
              <Crown className="h-3 w-3" />
              Host
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Co-host
            </Badge>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
