/**
 * CallWindow Component
 *
 * Voice and video call UI with LiveKit integration.
 * Supports 1-on-1 and group calls with screen sharing.
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Monitor,
  MonitorOff,
  Settings,
  Users,
  MessageSquare,
  MoreVertical,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface CallParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
}

export interface CallWindowProps {
  callId: string;
  channelId?: string;
  channelName?: string;
  participants: CallParticipant[];
  currentUserId: string;
  isAudioCall?: boolean; // If true, starts as audio-only
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onInviteParticipants?: () => void;
  onOpenSettings?: () => void;
  onOpenChat?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CallWindow({
  callId,
  channelId,
  channelName,
  participants,
  currentUserId,
  isAudioCall = false,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onInviteParticipants,
  onOpenSettings,
  onOpenChat,
  className,
}: CallWindowProps) {
  // ==========================================================================
  // State
  // ==========================================================================

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(isAudioCall);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [layout, setLayout] = useState<"grid" | "speaker" | "sidebar">("grid");
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // ==========================================================================
  // Call Duration Timer
  // ==========================================================================

  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ==========================================================================
  // Auto-hide Controls
  // ==========================================================================

  const handleMouseMove = useCallback(() => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    onToggleMute();
    toast.success(isMuted ? "Microphone on" : "Microphone muted");
  };

  const handleToggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    onToggleVideo();
    toast.success(isVideoOff ? "Camera on" : "Camera off");
  };

  const handleToggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    onToggleScreenShare();
    toast.success(isScreenSharing ? "Stopped sharing" : "Sharing screen");
  };

  const handleEndCall = () => {
    if (window.confirm("Are you sure you want to end the call?")) {
      onEndCall();
    }
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ==========================================================================
  // Get Current User
  // ==========================================================================

  const currentUser = participants.find((p) => p.id === currentUserId);
  const otherParticipants = participants.filter((p) => p.id !== currentUserId);

  // ==========================================================================
  // Render Participant Video
  // ==========================================================================

  const renderParticipant = (participant: CallParticipant, isSelf = false) => {
    const initials = participant.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        key={participant.id}
        className={cn(
          "relative overflow-hidden rounded-lg bg-gray-900",
          participant.isSpeaking && "ring-2 ring-green-500",
          isSelf && "border-2 border-blue-500",
        )}
      >
        {/* Video or Avatar */}
        {participant.isVideoOff || !participant.stream ? (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <Avatar className="h-24 w-24">
              <AvatarImage src={participant.avatarUrl} alt={participant.name} />
              <AvatarFallback className="bg-gray-700 text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            muted={isSelf}
            ref={(video) => {
              if (video && participant.stream) {
                video.srcObject = participant.stream;
              }
            }}
          />
        )}

        {/* Participant Info Overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded bg-black/60 px-2 py-1 text-sm font-medium text-white backdrop-blur">
              {participant.name}
              {isSelf && " (You)"}
            </span>
            {participant.isSpeaking && (
              <Badge className="bg-green-500 text-white">Speaking</Badge>
            )}
          </div>
          <div className="flex gap-1">
            {participant.isMuted && (
              <div className="rounded bg-red-500 p-1">
                <MicOff className="h-4 w-4 text-white" />
              </div>
            )}
            {participant.isScreenSharing && (
              <div className="rounded bg-blue-500 p-1">
                <Monitor className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // Render Layout
  // ==========================================================================

  const renderGridLayout = () => {
    const allParticipants = [currentUser!, ...otherParticipants];
    const gridCols =
      allParticipants.length === 1
        ? 1
        : allParticipants.length === 2
          ? 2
          : allParticipants.length <= 4
            ? 2
            : 3;

    return (
      <div
        className={cn(
          "grid gap-2 p-4",
          gridCols === 1 && "grid-cols-1",
          gridCols === 2 && "grid-cols-2",
          gridCols === 3 && "grid-cols-3",
        )}
        style={{ height: "calc(100% - 100px)" }}
      >
        {allParticipants.map((p) =>
          renderParticipant(p, p.id === currentUserId),
        )}
      </div>
    );
  };

  const renderSpeakerLayout = () => {
    const speaker = activeSpeakerId
      ? participants.find((p) => p.id === activeSpeakerId)
      : otherParticipants[0] || currentUser;

    return (
      <div className="flex h-full flex-col gap-2 p-4">
        {/* Main Speaker */}
        <div className="flex-1">
          {speaker && renderParticipant(speaker, speaker.id === currentUserId)}
        </div>

        {/* Thumbnails */}
        <div className="flex gap-2" style={{ height: "120px" }}>
          {participants
            .filter((p) => p.id !== speaker?.id)
            .map((p) => (
              <div
                key={p.id}
                className="w-32 cursor-pointer"
                onClick={() => setActiveSpeakerId(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveSpeakerId(p.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {renderParticipant(p, p.id === currentUserId)}
              </div>
            ))}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  if (isMinimized) {
    return (
      <Card
        className={cn(
          "fixed bottom-4 right-4 z-50 w-80 border-2 border-gray-700 bg-gray-900 shadow-2xl",
          className,
        )}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 animate-pulse rounded-full bg-green-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Phone className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-white">
                {channelName || `Call with ${otherParticipants[0]?.name}`}
              </p>
              <p className="text-sm text-gray-400">
                {formatDuration(callDuration)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsMinimized(false)}
              className="text-white hover:bg-gray-800"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleEndCall}
              className="text-red-500 hover:bg-red-500/10"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      ref={containerRef}
      className={cn(
        "fixed inset-4 z-50 flex flex-col border-2 border-gray-700 bg-gray-900 shadow-2xl",
        className,
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between border-b border-gray-700 bg-gray-800 p-4 transition-opacity duration-300",
          !showControls && "opacity-0",
        )}
      >
        <div>
          <h2 className="font-semibold text-white">
            {channelName ||
              `Call with ${otherParticipants.map((p) => p.name).join(", ")}`}
          </h2>
          <p className="text-sm text-gray-400">
            {formatDuration(callDuration)} • {participants.length}{" "}
            {participants.length === 1 ? "participant" : "participants"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onOpenSettings}
            className="text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleEndCall}
            className="text-gray-400 hover:bg-red-500 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 overflow-hidden">
        {layout === "grid" && renderGridLayout()}
        {layout === "speaker" && renderSpeakerLayout()}
      </div>

      {/* Controls */}
      <div
        className={cn(
          "border-t border-gray-700 bg-gray-800 p-4 transition-opacity duration-300",
          !showControls && "opacity-0",
        )}
      >
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-gray-400 hover:bg-gray-700 hover:text-white"
                >
                  <Users className="mr-2 h-4 w-4" />
                  {participants.length}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {participants.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={p.avatarUrl} />
                      <AvatarFallback>{p.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1">{p.name}</span>
                    {p.isMuted && <MicOff className="h-4 w-4 text-red-500" />}
                  </DropdownMenuItem>
                ))}
                {onInviteParticipants && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onInviteParticipants}>
                      Invite People
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {onOpenChat && (
              <Button
                variant="ghost"
                onClick={onOpenChat}
                className="text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
              </Button>
            )}
          </div>

          {/* Center Controls */}
          <div className="flex gap-3">
            <Button
              size="lg"
              variant={isMuted ? "destructive" : "secondary"}
              onClick={handleToggleMute}
              className="rounded-full"
            >
              {isMuted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
            <Button
              size="lg"
              variant={isVideoOff ? "destructive" : "secondary"}
              onClick={handleToggleVideo}
              className="rounded-full"
            >
              {isVideoOff ? (
                <VideoOff className="h-5 w-5" />
              ) : (
                <Video className="h-5 w-5" />
              )}
            </Button>
            <Button
              size="lg"
              variant={isScreenSharing ? "default" : "secondary"}
              onClick={handleToggleScreenShare}
              className="rounded-full"
            >
              {isScreenSharing ? (
                <MonitorOff className="h-5 w-5" />
              ) : (
                <Monitor className="h-5 w-5" />
              )}
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={handleEndCall}
              className="rounded-full"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>

          {/* Right Controls */}
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-gray-400 hover:bg-gray-700 hover:text-white"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLayout("grid")}>
                  Grid View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLayout("speaker")}>
                  Speaker View
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenSettings}>
                  Audio/Video Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default CallWindow;
