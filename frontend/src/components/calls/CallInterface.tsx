/**
 * Call Interface
 *
 * Complete call interface with all features:
 * - Incoming call modal
 * - Active call UI (voice/video)
 * - Call controls
 * - Network quality indicator
 * - Call timer
 * - Reconnection UI
 */

"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorStop,
  Settings,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IncomingCallModal } from "./IncomingCallModal";

// =============================================================================
// Types
// =============================================================================

export interface CallInterfaceProps {
  // Call state
  isInCall: boolean;
  callType: "voice" | "video" | null;
  callState:
    | "idle"
    | "initiating"
    | "ringing"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "ended";
  callDuration: number;

  // Participants
  remoteUser: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;

  // Media state
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  // Network quality
  connectionQuality?: "excellent" | "good" | "fair" | "poor";
  isReconnecting?: boolean;

  // Incoming calls
  incomingCall?: {
    id: string;
    callerId: string;
    callerName: string;
    callerAvatarUrl?: string;
    type: "voice" | "video";
  } | null;

  // Actions
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onAcceptIncoming: (callId: string, withVideo: boolean) => void;
  onDeclineIncoming: (callId: string) => void;
  onSettings?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function CallInterface({
  isInCall,
  callType,
  callState,
  callDuration,
  remoteUser,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  localStream,
  remoteStream,
  connectionQuality = "good",
  isReconnecting = false,
  incomingCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  onAcceptIncoming,
  onDeclineIncoming,
  onSettings,
}: CallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Attach streams to video/audio elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (callType === "video" && remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (callType === "voice" && remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callType]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Get connection quality icon
  const getQualityIcon = () => {
    switch (connectionQuality) {
      case "excellent":
        return <SignalHigh className="h-4 w-4 text-green-500" />;
      case "good":
        return <Signal className="h-4 w-4 text-green-400" />;
      case "fair":
        return <SignalMedium className="h-4 w-4 text-yellow-500" />;
      case "poor":
        return <SignalLow className="h-4 w-4 text-red-500" />;
      default:
        return <SignalZero className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStateText = () => {
    switch (callState) {
      case "initiating":
        return "Starting call...";
      case "ringing":
        return "Ringing...";
      case "connecting":
        return "Connecting...";
      case "connected":
        return formatDuration(callDuration);
      case "reconnecting":
        return "Reconnecting...";
      default:
        return "";
    }
  };

  // Render incoming call modal
  if (incomingCall) {
    return (
      <IncomingCallModal
        callId={incomingCall.id}
        callerId={incomingCall.callerId}
        callerName={incomingCall.callerName}
        callerAvatarUrl={incomingCall.callerAvatarUrl}
        callType={incomingCall.type}
        onAccept={(withVideo) => onAcceptIncoming(incomingCall.id, withVideo)}
        onDecline={() => onDeclineIncoming(incomingCall.id)}
      />
    );
  }

  // Don't render if not in call
  if (!isInCall || !remoteUser) {
    return null;
  }

  // Video Call UI
  if (callType === "video") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between bg-gray-800/90 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={remoteUser.avatarUrl} alt={remoteUser.name} />
              <AvatarFallback>
                {remoteUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {remoteUser.name}
              </h3>
              <div className="flex items-center gap-2">
                {getQualityIcon()}
                <p className="text-xs text-gray-400">{getStateText()}</p>
              </div>
            </div>
          </div>

          {/* Reconnecting indicator */}
          {isReconnecting && (
            <div className="flex items-center gap-2 rounded-full bg-yellow-500/20 px-3 py-1">
              <div className="animate-spin">
                <Wifi className="h-4 w-4 text-yellow-500" />
              </div>
              <span className="text-xs text-yellow-500">Reconnecting...</span>
            </div>
          )}
        </div>

        {/* Video Container */}
        <div className="relative flex-1 bg-gray-950">
          {/* Remote Video */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- Live video call does not have captions */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Local Video (Picture-in-Picture) */}
          {localStream && (
            <div className="absolute right-4 top-4 h-24 w-32 overflow-hidden rounded-lg border-2 border-gray-700 shadow-xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="mirror h-full w-full object-cover"
              />
            </div>
          )}

          {/* State Overlay */}
          {callState !== "connected" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="border-primary/50 h-24 w-24 border-4">
                  <AvatarImage
                    src={remoteUser.avatarUrl}
                    alt={remoteUser.name}
                  />
                  <AvatarFallback className="text-2xl">
                    {remoteUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center gap-1">
                  <h2 className="text-2xl font-bold text-white">
                    {remoteUser.name}
                  </h2>
                  <p className="text-gray-400">{getStateText()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800/90 px-4 py-6 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-4">
            {/* Mute */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full transition-all",
                isMuted
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-700 text-white hover:bg-gray-600",
              )}
              onClick={onToggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>

            {/* Video */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full transition-all",
                !isVideoEnabled
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-700 text-white hover:bg-gray-600",
              )}
              onClick={onToggleVideo}
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoEnabled ? (
                <Video className="h-6 w-6" />
              ) : (
                <VideoOff className="h-6 w-6" />
              )}
            </Button>

            {/* Screen Share */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full transition-all",
                isScreenSharing
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-700 text-white hover:bg-gray-600",
              )}
              onClick={onToggleScreenShare}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              {isScreenSharing ? (
                <MonitorStop className="h-6 w-6" />
              ) : (
                <MonitorUp className="h-6 w-6" />
              )}
            </Button>

            {/* Settings */}
            {onSettings && (
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full bg-gray-700 text-white transition-all hover:bg-gray-600"
                onClick={onSettings}
                title="Settings"
              >
                <Settings className="h-6 w-6" />
              </Button>
            )}

            {/* End Call */}
            <Button
              variant="ghost"
              size="icon"
              className="h-16 w-16 rounded-full bg-red-600 text-white shadow-lg shadow-red-600/50 transition-all hover:scale-105 hover:bg-red-700"
              onClick={onEndCall}
              title="End call"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Voice Call UI
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hidden audio element for remote stream */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- Live audio call does not have captions */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 p-8">
        {/* Remote User Avatar */}
        <Avatar className="border-primary/50 h-40 w-40 border-4">
          <AvatarImage src={remoteUser.avatarUrl} alt={remoteUser.name} />
          <AvatarFallback className="text-primary-foreground bg-primary text-4xl font-semibold">
            {remoteUser.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* User Info */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-3xl font-bold text-white">{remoteUser.name}</h2>
          <div className="flex items-center gap-2">
            {getQualityIcon()}
            <p className="text-lg text-gray-300">{getStateText()}</p>
          </div>
        </div>

        {/* Reconnecting indicator */}
        {isReconnecting && (
          <div className="flex items-center gap-3 rounded-full bg-yellow-500/20 px-6 py-3 backdrop-blur-sm">
            <div className="animate-spin">
              <Wifi className="h-5 w-5 text-yellow-500" />
            </div>
            <span className="text-sm font-medium text-yellow-500">
              Connection lost. Reconnecting...
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="mt-8 flex items-center gap-6">
          {/* Mute */}
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-16 w-16 rounded-full transition-all",
                isMuted
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-700 text-white hover:bg-gray-600",
              )}
              onClick={onToggleMute}
            >
              {isMuted ? (
                <MicOff className="h-7 w-7" />
              ) : (
                <Mic className="h-7 w-7" />
              )}
            </Button>
            <span className="text-sm text-gray-400">
              {isMuted ? "Muted" : "Mute"}
            </span>
          </div>

          {/* End Call */}
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-20 w-20 rounded-full bg-red-600 text-white shadow-lg shadow-red-600/50 transition-all hover:scale-105 hover:bg-red-700"
              onClick={onEndCall}
            >
              <PhoneOff className="h-8 w-8" />
            </Button>
            <span className="text-sm text-gray-400">End Call</span>
          </div>

          {/* Settings */}
          {onSettings && (
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-16 w-16 rounded-full bg-gray-700 text-white transition-all hover:bg-gray-600"
                onClick={onSettings}
              >
                <Settings className="h-7 w-7" />
              </Button>
              <span className="text-sm text-gray-400">Settings</span>
            </div>
          )}
        </div>
      </div>

      {/* Connection quality footer */}
      <div className="absolute bottom-8 flex items-center gap-2 rounded-full bg-gray-800/80 px-4 py-2 backdrop-blur-sm">
        {getQualityIcon()}
        <span className="text-xs capitalize text-gray-400">
          {connectionQuality} connection
        </span>
      </div>
    </div>
  );
}

// Add mirror class for local video
const styles = `
  .mirror {
    transform: scaleX(-1);
  }
`;

if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
