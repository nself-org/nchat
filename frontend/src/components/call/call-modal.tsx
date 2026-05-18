/**
 * Call Modal Component
 *
 * Full-screen modal for active voice/video calls with participant display
 * and call controls.
 */

"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { CallControls, formatCallDuration } from "./call-controls";
import { CallParticipants, type Participant } from "./call-participants";
import { CallStats, type CallStatsData } from "./call-stats";
import { ScreenSharePanel } from "./screen-share-panel";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// =============================================================================
// Types
// =============================================================================

export interface CallModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  callType: "voice" | "video";
  callState:
    | "initiating"
    | "ringing"
    | "connecting"
    | "connected"
    | "reconnecting";
  callDuration: number;
  participants: Participant[];
  localStream?: MediaStream;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onOpenSettings?: () => void;
  callStats?: CallStatsData;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  currentUserId?: string;
  currentUserName?: string;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CallModal({
  open,
  onOpenChange,
  callType,
  callState,
  callDuration,
  participants,
  localStream,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  onOpenSettings,
  callStats,
  isMinimized = false,
  onToggleMinimize,
  currentUserId = "current-user",
  currentUserName = "You",
  className,
}: CallModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [showStats, setShowStats] = React.useState(false);

  // Display local stream
  React.useEffect(() => {
    if (videoRef.current && localStream && isVideoEnabled) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled]);

  const getCallStateLabel = () => {
    switch (callState) {
      case "initiating":
        return "Initiating call...";
      case "ringing":
        return "Ringing...";
      case "connecting":
        return "Connecting...";
      case "reconnecting":
        return "Reconnecting...";
      case "connected":
        return formatCallDuration(callDuration);
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/90" />
        <DialogContent
          className={cn(
            "fixed inset-0 h-screen w-screen max-w-none rounded-none border-0 p-0",
            "bg-gradient-to-br from-gray-900 to-gray-950",
            "flex flex-col",
            isMinimized && "bottom-4 bottom-auto right-4 top-auto h-auto w-96",
            className,
          )}
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-black/20 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    callState === "connected"
                      ? "animate-pulse bg-green-500"
                      : callState === "reconnecting"
                        ? "animate-pulse bg-yellow-500"
                        : "bg-gray-500",
                  )}
                />
                <span className="text-sm font-medium text-white">
                  {getCallStateLabel()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {callStats && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStats(!showStats)}
                  className="text-white hover:bg-white/10"
                >
                  Stats
                </Button>
              )}
              {onToggleMinimize && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleMinimize}
                  className="text-white hover:bg-white/10"
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange?.(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Call Stats */}
          {showStats && callStats && (
            <div className="px-4 pb-2">
              <CallStats {...callStats} />
            </div>
          )}

          {/* Main Content */}
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-4">
            {/* Screen Share View */}
            {isScreenSharing ? (
              <ScreenSharePanel
                userId={currentUserId}
                userName={currentUserName}
                showAnnotations
                showRecording
                className="h-full w-full"
              />
            ) : (
              <>
                {/* Local Video Preview (Picture-in-Picture) */}
                {callType === "video" && isVideoEnabled && localStream && (
                  <div className="absolute right-4 top-4 z-10 h-36 w-48 overflow-hidden rounded-lg border-2 border-white/20 shadow-xl">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="mirror h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* Participants */}
                <CallParticipants
                  participants={participants}
                  callType={callType}
                  isScreenSharing={false}
                  className="h-full w-full"
                />
              </>
            )}
          </div>

          {/* Controls */}
          <div className="p-4">
            <CallControls
              isMuted={isMuted}
              isVideoEnabled={isVideoEnabled}
              isScreenSharing={isScreenSharing}
              onToggleMute={onToggleMute}
              onToggleVideo={onToggleVideo}
              onToggleScreenShare={onToggleScreenShare}
              onEndCall={onEndCall}
              onOpenSettings={onOpenSettings}
              showVideoControls={callType === "video"}
              showScreenShareControls
              variant="floating"
              className="justify-center"
            />
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

CallModal.displayName = "CallModal";

// =============================================================================
// Minimized Call View
// =============================================================================

export interface MinimizedCallProps {
  callType: "voice" | "video";
  callDuration: number;
  participantName: string;
  participantAvatar?: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  onExpand: () => void;
  className?: string;
}

export function MinimizedCall({
  callType,
  callDuration,
  participantName,
  participantAvatar,
  isMuted,
  onToggleMute,
  onEndCall,
  onExpand,
  className,
}: MinimizedCallProps) {
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 w-80 rounded-xl border bg-card shadow-2xl",
        "flex flex-col gap-3 p-4",
        className,
      )}
    >
      <button
        onClick={onExpand}
        className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-2 transition-colors"
      >
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted">
          {participantAvatar ? (
            <img
              src={participantAvatar}
              alt={participantName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium">
              {participantName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium">{participantName}</p>
          <p className="text-xs text-muted-foreground">
            {formatCallDuration(callDuration)}
          </p>
        </div>
        <Maximize2 className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex items-center justify-center gap-3">
        <CallControls
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onEndCall={onEndCall}
          showVideoControls={false}
          showScreenShareControls={false}
          size="sm"
        />
      </div>
    </div>
  );
}

MinimizedCall.displayName = "MinimizedCall";
