/**
 * Video Call Modal
 *
 * Main modal component for video calls with all controls and layouts.
 */

"use client";

import React, { useRef, useEffect } from "react";
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Maximize2,
} from "lucide-react";
import { useVideoCall } from "@/hooks/use-video-call";
import { useVideoLayout } from "@/hooks/use-video-layout";
import { useCallStore, selectParticipants } from "@/stores/call-store";
import { VideoGrid } from "./VideoGrid";
import { SpeakerView } from "./SpeakerView";
import { VideoControls } from "./VideoControls";
import { Button } from "@/components/ui/button";

// =============================================================================
// Types
// =============================================================================

export interface VideoCallModalProps {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  onClose?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function VideoCallModal({
  userId,
  userName,
  userAvatarUrl,
  onClose,
}: VideoCallModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Call state
  const participants = useCallStore(selectParticipants);
  const participantIds = participants.map((p) => p.id);

  // Video call hook
  const {
    isInCall,
    isCallConnected,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    callDuration,
    localStream,
    remoteStreams,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    endCall,
    enterPictureInPicture,
  } = useVideoCall({
    userId,
    userName,
    userAvatarUrl,
    onCallEnded: () => {
      onClose?.();
    },
  });

  // Layout management
  const {
    mode,
    tiles,
    setMode,
    setSpeakingParticipant,
    setScreenShareParticipant,
  } = useVideoLayout({
    containerRef,
    participantIds,
    initialMode: "speaker",
  });

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle screen share detection
  useEffect(() => {
    const screenSharingParticipant = participants.find(
      (p) => p.isScreenSharing,
    );
    setScreenShareParticipant(screenSharingParticipant?.id || null);
  }, [participants, setScreenShareParticipant]);

  // Handle speaking detection (simplified - you'd use audio level detection)
  useEffect(() => {
    const speakingParticipant = participants.find((p) => p.isSpeaking);
    setSpeakingParticipant(speakingParticipant?.id || null);
  }, [participants, setSpeakingParticipant]);

  if (!isInCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Video Call</h2>
          {isCallConnected && (
            <span className="text-sm text-gray-400">
              {formatDuration(callDuration)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (mode === "grid") setMode("speaker");
              else setMode("grid");
            }}
          >
            {mode === "grid" ? "Speaker View" : "Grid View"}
          </Button>

          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Video Container */}
      <div ref={containerRef} className="relative flex-1 bg-gray-950">
        {mode === "grid" ? (
          <VideoGrid
            tiles={tiles}
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
          />
        ) : (
          <SpeakerView
            mainTile={tiles.find((t) => t.isMainTile) || null}
            thumbnails={tiles.filter((t) => !t.isMainTile)}
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
          />
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-gray-700 bg-gray-800 px-4 py-4">
        <VideoControls
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={() => {
            if (isScreenSharing) {
              stopScreenShare();
            } else {
              startScreenShare();
            }
          }}
          onEndCall={endCall}
        />
      </div>
    </div>
  );
}
