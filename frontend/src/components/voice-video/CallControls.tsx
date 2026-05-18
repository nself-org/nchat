/**
 * CallControls Component
 *
 * Reusable control bar for voice/video calls.
 * Features:
 * - Mute/unmute button with visual feedback
 * - Video on/off button
 * - Screen share button
 * - Recording button
 * - Participant count badge
 * - Settings button
 * - End call button (prominent red)
 * - More options menu
 * - Tooltips for all buttons
 * - Keyboard shortcuts support
 */

"use client";

import React, { useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorStop,
  PhoneOff,
  Settings,
  Users,
  MoreVertical,
  Volume2,
  VolumeX,
  Camera,
  Grid3x3,
  MessageSquare,
  Hand,
  Maximize,
  Minimize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface CallControlsProps {
  /** Mute state */
  isMuted: boolean;
  /** Video state */
  isVideoEnabled: boolean;
  /** Screen sharing state */
  isScreenSharing: boolean;
  /** Call type */
  callType: "voice" | "video";
  /** Number of participants */
  participantCount: number;
  /** Recording state (optional) */
  isRecording?: boolean;
  /** Show participant list */
  showParticipants?: boolean;
  /** Show chat */
  showChat?: boolean;
  /** Fullscreen state */
  isFullscreen?: boolean;
  /** Callbacks */
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onToggleRecording?: () => void;
  onToggleParticipants?: () => void;
  onToggleChat?: () => void;
  onOpenSettings?: () => void;
  onSwitchCamera?: () => void;
  onToggleFullscreen?: () => void;
  onRaiseHand?: () => void;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CallControls({
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  callType,
  participantCount,
  isRecording = false,
  showParticipants = false,
  showChat = false,
  isFullscreen = false,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  onToggleRecording,
  onToggleParticipants,
  onToggleChat,
  onOpenSettings,
  onSwitchCamera,
  onToggleFullscreen,
  onRaiseHand,
  className,
}: CallControlsProps) {
  // Keyboard shortcuts
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      // Only handle if no input is focused
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "m":
          onToggleMute();
          break;
        case "v":
          if (callType === "video") {
            onToggleVideo();
          }
          break;
        case "s":
          if (e.shiftKey) {
            onToggleScreenShare();
          }
          break;
        case "escape":
          if (isFullscreen && onToggleFullscreen) {
            onToggleFullscreen();
          }
          break;
        case "c":
          if (onToggleChat) {
            onToggleChat();
          }
          break;
        case "p":
          if (onToggleParticipants) {
            onToggleParticipants();
          }
          break;
      }
    },
    [
      onToggleMute,
      onToggleVideo,
      onToggleScreenShare,
      onToggleChat,
      onToggleParticipants,
      onToggleFullscreen,
      callType,
      isFullscreen,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  return (
    <TooltipProvider>
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6",
          className,
        )}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          {/* Left section - Info */}
          <div className="flex items-center gap-3">
            {onToggleParticipants && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showParticipants ? "default" : "secondary"}
                    size="icon"
                    onClick={onToggleParticipants}
                    className={cn(
                      "relative h-11 w-11 rounded-full",
                      showParticipants &&
                        "bg-white text-black hover:bg-white/90",
                    )}
                  >
                    <Users className="h-5 w-5" />
                    {participantCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -right-1 -top-1 h-5 min-w-[20px] rounded-full px-1 text-xs"
                      >
                        {participantCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Participants (P)</p>
                </TooltipContent>
              </Tooltip>
            )}

            {onToggleChat && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showChat ? "default" : "secondary"}
                    size="icon"
                    onClick={onToggleChat}
                    className={cn(
                      "h-11 w-11 rounded-full",
                      showChat && "bg-white text-black hover:bg-white/90",
                    )}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Chat (C)</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Center section - Main controls */}
          <div className="flex items-center gap-3">
            {/* Mute */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="icon"
                  onClick={onToggleMute}
                  className="h-12 w-12 rounded-full"
                >
                  {isMuted ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isMuted ? "Unmute" : "Mute"} (M)</p>
              </TooltipContent>
            </Tooltip>

            {/* Video (only for video calls) */}
            {callType === "video" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={!isVideoEnabled ? "destructive" : "secondary"}
                    size="icon"
                    onClick={onToggleVideo}
                    className="h-12 w-12 rounded-full"
                  >
                    {isVideoEnabled ? (
                      <Video className="h-5 w-5" />
                    ) : (
                      <VideoOff className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isVideoEnabled ? "Stop" : "Start"} Video (V)</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Screen Share */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isScreenSharing ? "default" : "secondary"}
                  size="icon"
                  onClick={onToggleScreenShare}
                  className={cn(
                    "h-12 w-12 rounded-full",
                    isScreenSharing && "bg-blue-600 hover:bg-blue-700",
                  )}
                >
                  {isScreenSharing ? (
                    <MonitorStop className="h-5 w-5" />
                  ) : (
                    <MonitorUp className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isScreenSharing ? "Stop" : "Share"} Screen (Shift+S)</p>
              </TooltipContent>
            </Tooltip>

            {/* End Call */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={onEndCall}
                  className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>End Call</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Right section - More options */}
          <div className="flex items-center gap-3">
            {/* More options menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-11 w-11 rounded-full"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {onSwitchCamera && callType === "video" && (
                  <>
                    <DropdownMenuItem onClick={onSwitchCamera}>
                      <Camera className="mr-2 h-4 w-4" />
                      Switch Camera
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {onToggleRecording && (
                  <DropdownMenuItem onClick={onToggleRecording}>
                    <div
                      className={cn(
                        "mr-2 h-2 w-2 rounded-full",
                        isRecording
                          ? "animate-pulse bg-red-600"
                          : "bg-gray-400",
                      )}
                    />
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </DropdownMenuItem>
                )}

                {onRaiseHand && (
                  <DropdownMenuItem onClick={onRaiseHand}>
                    <Hand className="mr-2 h-4 w-4" />
                    Raise Hand
                  </DropdownMenuItem>
                )}

                {onToggleFullscreen && (
                  <DropdownMenuItem onClick={onToggleFullscreen}>
                    {isFullscreen ? (
                      <>
                        <Minimize className="mr-2 h-4 w-4" />
                        Exit Fullscreen (Esc)
                      </>
                    ) : (
                      <>
                        <Maximize className="mr-2 h-4 w-4" />
                        Enter Fullscreen
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                {onOpenSettings && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onOpenSettings}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-2 text-center text-xs text-gray-400">
          Press M to {isMuted ? "unmute" : "mute"} • V to toggle video • Shift+S
          to share screen
        </div>
      </div>
    </TooltipProvider>
  );
}
