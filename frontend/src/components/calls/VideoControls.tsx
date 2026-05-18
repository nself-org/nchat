/**
 * Video Controls
 *
 * Control bar for video calls with mute, video, screen share, and hang up.
 */

"use client";

import React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorStop,
  PhoneOff,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface VideoControlsProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onSettings?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function VideoControls({
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  onSettings,
}: VideoControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {/* Mute/Unmute */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-12 w-12 rounded-full",
          isMuted
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-gray-700 text-white hover:bg-gray-600",
        )}
        onClick={onToggleMute}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>

      {/* Video On/Off */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-12 w-12 rounded-full",
          !isVideoEnabled
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-gray-700 text-white hover:bg-gray-600",
        )}
        onClick={onToggleVideo}
        title={isVideoEnabled ? "Turn off video" : "Turn on video"}
      >
        {isVideoEnabled ? (
          <Video className="h-5 w-5" />
        ) : (
          <VideoOff className="h-5 w-5" />
        )}
      </Button>

      {/* Screen Share */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-12 w-12 rounded-full",
          isScreenSharing
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-700 text-white hover:bg-gray-600",
        )}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? "Stop sharing" : "Share screen"}
      >
        {isScreenSharing ? (
          <MonitorStop className="h-5 w-5" />
        ) : (
          <MonitorUp className="h-5 w-5" />
        )}
      </Button>

      {/* Settings */}
      {onSettings && (
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-gray-700 text-white hover:bg-gray-600"
          onClick={onSettings}
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      )}

      {/* End Call */}
      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-full bg-red-600 text-white hover:bg-red-700"
        onClick={onEndCall}
        title="End call"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}
