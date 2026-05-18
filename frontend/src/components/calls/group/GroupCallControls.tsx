/**
 * Group Call Controls Component
 *
 * Control bar for group video/voice calls with host controls,
 * layout options, and participant management.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  ScreenShare,
  ScreenShareOff,
  Hand,
  MoreVertical,
  Users,
  Lock,
  Unlock,
  Grid3X3,
  LayoutGrid,
  LayoutList,
  Maximize2,
  Settings,
  UserMinus,
  VolumeX,
  Volume2,
  Circle,
  Square,
  ChevronUp,
} from "lucide-react";

import type {
  LayoutType,
  ParticipantRole,
} from "@/services/calls/group-call.service";

export interface GroupCallControlsProps {
  // Media state
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;

  // Role and permissions
  isHost: boolean;
  isCoHost: boolean;
  myRole: ParticipantRole | null;

  // Room state
  isLocked: boolean;
  isRecording: boolean;
  layout: LayoutType;
  participantCount: number;
  lobbyCount: number;

  // Actions
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onRaiseHand: () => void;
  onLowerHand: () => void;
  onEndCall: () => void;
  onEndCallForEveryone?: () => void;

  // Host controls
  onMuteAll?: () => void;
  onUnmuteAll?: () => void;
  onLockRoom?: () => void;
  onUnlockRoom?: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;

  // Layout controls
  onSetLayout: (layout: LayoutType) => void;
  onOpenParticipants?: () => void;
  onOpenSettings?: () => void;

  className?: string;
}

export function GroupCallControls({
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  isHandRaised,
  isHost,
  isCoHost,
  myRole,
  isLocked,
  isRecording,
  layout,
  participantCount,
  lobbyCount,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onRaiseHand,
  onLowerHand,
  onEndCall,
  onEndCallForEveryone,
  onMuteAll,
  onUnmuteAll,
  onLockRoom,
  onUnlockRoom,
  onStartRecording,
  onStopRecording,
  onSetLayout,
  onOpenParticipants,
  onOpenSettings,
  className,
}: GroupCallControlsProps) {
  const [showEndOptions, setShowEndOptions] = useState(false);

  const canManageParticipants = isHost || isCoHost;
  const canRecord = isHost;
  const canUnmute = myRole !== "viewer";
  const canEnableVideo = myRole !== "viewer";
  const canShareScreen =
    myRole === "host" || myRole === "co-host" || myRole === "participant";

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex items-center justify-center gap-2 p-4 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg",
          className,
        )}
      >
        {/* Left section: Media controls */}
        <div className="flex items-center gap-2">
          {/* Microphone */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="icon"
                onClick={onToggleMute}
                disabled={!canUnmute && !isMuted}
                className="rounded-full h-12 w-12"
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

          {/* Camera */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isVideoEnabled ? "secondary" : "destructive"}
                size="icon"
                onClick={onToggleVideo}
                disabled={!canEnableVideo && !isVideoEnabled}
                className="rounded-full h-12 w-12"
              >
                {isVideoEnabled ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            </TooltipContent>
          </Tooltip>

          {/* Screen Share */}
          {canShareScreen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isScreenSharing ? "default" : "secondary"}
                  size="icon"
                  onClick={onToggleScreenShare}
                  className="rounded-full h-12 w-12"
                >
                  {isScreenSharing ? (
                    <ScreenShareOff className="h-5 w-5" />
                  ) : (
                    <ScreenShare className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isScreenSharing ? "Stop sharing" : "Share screen"}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Raise Hand */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isHandRaised ? "default" : "secondary"}
                size="icon"
                onClick={isHandRaised ? onLowerHand : onRaiseHand}
                className={cn(
                  "rounded-full h-12 w-12",
                  isHandRaised &&
                    "bg-yellow-500 hover:bg-yellow-600 text-white",
                )}
              >
                <Hand className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isHandRaised ? "Lower hand" : "Raise hand"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-600 mx-2" />

        {/* Center section: Layout and participants */}
        <div className="flex items-center gap-2">
          {/* Layout selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full h-10 w-10"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem
                onClick={() => onSetLayout("grid")}
                className={layout === "grid" ? "bg-accent" : ""}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Grid View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSetLayout("speaker")}
                className={layout === "speaker" ? "bg-accent" : ""}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Speaker View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSetLayout("spotlight")}
                className={layout === "spotlight" ? "bg-accent" : ""}
              >
                <LayoutList className="h-4 w-4 mr-2" />
                Spotlight
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSetLayout("sidebar")}
                className={layout === "sidebar" ? "bg-accent" : ""}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Sidebar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Participants */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="default"
                onClick={onOpenParticipants}
                className="rounded-full h-10 px-4 gap-2"
              >
                <Users className="h-4 w-4" />
                <span>{participantCount}</span>
                {lobbyCount > 0 && (
                  <span className="bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {lobbyCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {lobbyCount > 0
                ? `${participantCount} participants, ${lobbyCount} in lobby`
                : `${participantCount} participants`}
            </TooltipContent>
          </Tooltip>

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-full text-sm">
              <Circle className="h-3 w-3 fill-current animate-pulse" />
              REC
            </div>
          )}

          {/* Lock indicator */}
          {isLocked && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 bg-yellow-600 text-white px-3 py-1.5 rounded-full text-sm">
                  <Lock className="h-3 w-3" />
                  Locked
                </div>
              </TooltipTrigger>
              <TooltipContent>Meeting is locked</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-600 mx-2" />

        {/* Right section: Host controls and settings */}
        <div className="flex items-center gap-2">
          {/* Host controls dropdown */}
          {canManageParticipants && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full h-10 w-10"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onMuteAll}>
                  <VolumeX className="h-4 w-4 mr-2" />
                  Mute all participants
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onUnmuteAll}>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Ask all to unmute
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isLocked ? (
                  <DropdownMenuItem onClick={onUnlockRoom}>
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock meeting
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onLockRoom}>
                    <Lock className="h-4 w-4 mr-2" />
                    Lock meeting
                  </DropdownMenuItem>
                )}
                {canRecord && (
                  <>
                    <DropdownMenuSeparator />
                    {isRecording ? (
                      <DropdownMenuItem onClick={onStopRecording}>
                        <Square className="h-4 w-4 mr-2" />
                        Stop recording
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={onStartRecording}>
                        <Circle className="h-4 w-4 mr-2 text-red-500" />
                        Start recording
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={onOpenSettings}
                className="rounded-full h-10 w-10"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>

          {/* End call button */}
          <div className="relative">
            {isHost && onEndCallForEveryone ? (
              <div className="flex items-center">
                <Button
                  variant="destructive"
                  onClick={onEndCall}
                  className="rounded-l-full h-12 px-6"
                >
                  <Phone className="h-5 w-5 rotate-[135deg] mr-2" />
                  Leave
                </Button>
                <DropdownMenu
                  open={showEndOptions}
                  onOpenChange={setShowEndOptions}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="rounded-r-full h-12 w-10 border-l border-red-400"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEndCall}>
                      <UserMinus className="h-4 w-4 mr-2" />
                      Leave meeting
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onEndCallForEveryone}
                      className="text-red-500"
                    >
                      <Phone className="h-4 w-4 mr-2 rotate-[135deg]" />
                      End meeting for everyone
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    onClick={onEndCall}
                    className="rounded-full h-12 px-6"
                  >
                    <Phone className="h-5 w-5 rotate-[135deg]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Leave call</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
