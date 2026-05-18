"use client";

/**
 * VideoRoom - Video meeting room placeholder
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Meeting, LocalUserState } from "@/lib/meetings/meeting-types";
import { MeetingControls } from "./MeetingControls";
import { ParticipantGrid } from "./ParticipantGrid";
import {
  useMeetingStore,
  selectRoomState,
  selectLocalUser,
  selectRemoteParticipants,
} from "@/stores/meeting-store";
import {
  Video,
  VideoOff,
  Maximize,
  Minimize,
  MessageSquare,
  Users,
  LayoutGrid,
  Presentation,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface VideoRoomProps {
  meeting: Meeting;
  onLeave?: () => void;
  onEnd?: () => void;
}

type LayoutMode = "grid" | "speaker" | "sidebar";

// ============================================================================
// Component
// ============================================================================

export function VideoRoom({ meeting, onLeave, onEnd }: VideoRoomProps) {
  const roomState = useMeetingStore(selectRoomState);
  const localUser = useMeetingStore(selectLocalUser);
  const remoteParticipants = useMeetingStore(selectRemoteParticipants);
  const { setConnected, setConnectionError } = useMeetingStore();

  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showChat, setShowChat] = React.useState(false);
  const [showParticipants, setShowParticipants] = React.useState(false);
  const [layoutMode, setLayoutMode] = React.useState<LayoutMode>("grid");

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Simulate connection
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setConnected(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [setConnected]);

  // Handle fullscreen
  const toggleFullscreen = React.useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Connection states
  if (roomState?.isConnecting) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-900 text-white">
        <Video className="mb-4 h-16 w-16" />
        <Loader2 className="mb-4 h-8 w-8 animate-spin" />
        <h2 className="mb-2 text-xl font-semibold">Starting video...</h2>
        <p className="text-gray-400">{meeting.title}</p>
      </div>
    );
  }

  if (roomState?.connectionError) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-900 text-white">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h2 className="mb-2 text-xl font-semibold">Connection Error</h2>
        <p className="mb-4 text-gray-400">{roomState.connectionError}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onLeave}>
            Leave
          </Button>
          <Button onClick={() => setConnectionError(null)}>Retry</Button>
        </div>
      </div>
    );
  }

  const hasScreenShare = roomState?.screenShareUserId !== null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full flex-col bg-gray-900 text-white",
        isFullscreen && "fixed inset-0 z-50",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800/80 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5" />
          <h2 className="max-w-xs truncate font-semibold">{meeting.title}</h2>
          {meeting.status === "live" && (
            <Badge className="animate-pulse bg-red-500 text-white">LIVE</Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Layout Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={() =>
              setLayoutMode(layoutMode === "grid" ? "speaker" : "grid")
            }
          >
            {layoutMode === "grid" ? (
              <Presentation className="h-5 w-5" />
            ) : (
              <LayoutGrid className="h-5 w-5" />
            )}
          </Button>

          {/* Chat Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-gray-400 hover:text-white"
            onClick={() => {
              setShowChat(!showChat);
              setShowParticipants(false);
            }}
          >
            <MessageSquare
              className={cn("h-5 w-5", showChat && "text-primary")}
            />
            {(roomState?.unreadChatCount ?? 0) > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs">
                {roomState?.unreadChatCount}
              </span>
            )}
          </Button>

          {/* Participants Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={() => {
              setShowParticipants(!showParticipants);
              setShowChat(false);
            }}
          >
            <Users
              className={cn("h-5 w-5", showParticipants && "text-primary")}
            />
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          {hasScreenShare ? (
            <div className="flex h-full flex-col gap-4">
              {/* Screen share main view */}
              <div className="flex flex-1 items-center justify-center rounded-lg bg-gray-800">
                <div className="text-center">
                  <Presentation className="mx-auto mb-4 h-16 w-16 text-gray-500" />
                  <p className="text-gray-400">Screen share active</p>
                </div>
              </div>
              {/* Participants strip */}
              <div className="flex h-24 gap-2 overflow-x-auto">
                <LocalVideoTile localUser={localUser} />
                {remoteParticipants.map((p) => (
                  <RemoteVideoTile key={p.peerId} participant={p} />
                ))}
              </div>
            </div>
          ) : layoutMode === "speaker" && remoteParticipants.length > 0 ? (
            <div className="flex h-full flex-col gap-4">
              {/* Speaker view */}
              <div className="flex-1">
                <RemoteVideoTile
                  participant={
                    remoteParticipants.find(
                      (p) => p.peerId === roomState?.activeSpeakerId,
                    ) || remoteParticipants[0]
                  }
                  isLarge
                />
              </div>
              {/* Other participants strip */}
              <div className="flex h-24 gap-2 overflow-x-auto">
                <LocalVideoTile localUser={localUser} />
                {remoteParticipants
                  .filter((p) => p.peerId !== roomState?.activeSpeakerId)
                  .map((p) => (
                    <RemoteVideoTile key={p.peerId} participant={p} />
                  ))}
              </div>
            </div>
          ) : (
            // Grid layout
            <ParticipantGrid
              participants={remoteParticipants}
              localUser={localUser}
              activeSpeakerId={roomState?.activeSpeakerId || null}
              screenShareUserId={roomState?.screenShareUserId || null}
            />
          )}
        </div>

        {/* Side Panel */}
        {(showChat || showParticipants) && (
          <div className="flex w-80 flex-col border-l border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
              <h3 className="font-medium">
                {showChat
                  ? "Chat"
                  : `Participants (${remoteParticipants.length + 1})`}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setShowChat(false);
                  setShowParticipants(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {showParticipants && (
                <ParticipantsList
                  localUser={localUser}
                  remoteParticipants={remoteParticipants}
                />
              )}
              {showChat && <ChatPanel />}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <MeetingControls meeting={meeting} onLeave={onLeave} onEnd={onEnd} />
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function LocalVideoTile({
  localUser,
  isLarge = false,
}: {
  localUser: LocalUserState | undefined;
  isLarge?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg bg-gray-800",
        isLarge ? "h-full" : "h-24 w-32 flex-shrink-0",
      )}
    >
      {localUser?.isVideoOn ? (
        <div className="from-primary/20 to-primary/5 absolute inset-0 bg-gradient-to-br" />
      ) : (
        <VideoOff className="h-8 w-8 text-gray-500" />
      )}
      <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs">
        You
      </div>
    </div>
  );
}

function RemoteVideoTile({
  participant,
  isLarge = false,
}: {
  participant: {
    peerId: string;
    displayName: string;
    isVideoOn: boolean;
    isMuted: boolean;
    isSpeaking: boolean;
  };
  isLarge?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg bg-gray-800",
        isLarge ? "h-full" : "h-24 w-32 flex-shrink-0",
        participant.isSpeaking && "ring-2 ring-green-500",
      )}
    >
      {participant.isVideoOn ? (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-500/5" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-lg">
          {participant.displayName?.charAt(0) || "?"}
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/50 px-2 py-0.5 text-xs">
        {participant.displayName}
        {participant.isMuted && <span className="text-red-400">(muted)</span>}
      </div>
    </div>
  );
}

function ParticipantsList({
  localUser,
  remoteParticipants,
}: {
  localUser: LocalUserState | undefined;
  remoteParticipants: {
    peerId: string;
    displayName: string;
    isMuted: boolean;
  }[];
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-gray-800 p-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">You (Host)</span>
          <span className="text-xs text-gray-400">
            {localUser?.isMuted ? "Muted" : "Unmuted"}
          </span>
        </div>
      </div>
      {remoteParticipants.map((p) => (
        <div key={p.peerId} className="rounded-lg bg-gray-800/50 p-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">{p.displayName}</span>
            <span className="text-xs text-gray-400">
              {p.isMuted ? "Muted" : "Unmuted"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 py-8 text-center text-sm text-gray-400">
        Chat messages will appear here
      </div>
      <div className="border-t border-gray-700 pt-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
