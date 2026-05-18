"use client";

/**
 * MeetingRoom - Meeting room placeholder component
 *
 * Container for video/audio meeting room (actual WebRTC implementation would go here)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Meeting, RoomState } from "@/lib/meetings/meeting-types";
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
  Maximize,
  Minimize,
  MessageSquare,
  Users,
  Settings,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface MeetingRoomProps {
  meeting: Meeting;
  onLeave?: () => void;
  onEnd?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function MeetingRoom({ meeting, onLeave, onEnd }: MeetingRoomProps) {
  const roomState = useMeetingStore(selectRoomState);
  const localUser = useMeetingStore(selectLocalUser);
  const remoteParticipants = useMeetingStore(selectRemoteParticipants);
  const { setConnected, setConnectionError } = useMeetingStore();

  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showChat, setShowChat] = React.useState(false);
  const [showParticipants, setShowParticipants] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Simulate connection (in real implementation, this would be WebRTC setup)
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

  // Listen for fullscreen changes
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
        <Loader2 className="mb-4 h-12 w-12 animate-spin" />
        <h2 className="mb-2 text-xl font-semibold">Joining meeting...</h2>
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

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full flex-col bg-gray-900 text-white",
        isFullscreen && "fixed inset-0 z-50",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5" />
          <h2 className="max-w-xs truncate font-semibold">{meeting.title}</h2>
          {meeting.status === "live" && (
            <Badge className="animate-pulse bg-red-500 text-white">LIVE</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Timer */}
          <div className="text-sm text-gray-400">
            <MeetingTimer
              startTime={meeting.actualStartAt || meeting.scheduledStartAt}
            />
          </div>

          {/* Toggle buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare
              className={cn("h-5 w-5", showChat && "text-primary")}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={() => setShowParticipants(!showParticipants)}
          >
            <Users
              className={cn("h-5 w-5", showParticipants && "text-primary")}
            />
          </Button>
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
          <ParticipantGrid
            participants={remoteParticipants}
            localUser={localUser}
            activeSpeakerId={roomState?.activeSpeakerId || null}
            screenShareUserId={roomState?.screenShareUserId || null}
          />
        </div>

        {/* Side Panel (Chat/Participants) */}
        {(showChat || showParticipants) && (
          <div className="flex w-80 flex-col border-l border-gray-700">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
              <h3 className="font-medium">
                {showChat ? "Chat" : "Participants"}
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

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {showParticipants && (
                <div className="space-y-2">
                  {/* Host */}
                  <div className="rounded-lg bg-gray-800 p-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm">
                        You
                      </div>
                      <div>
                        <p className="text-sm font-medium">You (Host)</p>
                        <p className="text-xs text-gray-400">
                          {localUser?.isMuted ? "Muted" : "Unmuted"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Remote participants */}
                  {remoteParticipants.map((p) => (
                    <div
                      key={p.peerId}
                      className="rounded-lg bg-gray-800/50 p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-sm">
                          {p.displayName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{p.displayName}</p>
                          <p className="text-xs text-gray-400">
                            {p.isMuted ? "Muted" : "Unmuted"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showChat && (
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
              )}
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
// Meeting Timer Sub-component
// ============================================================================

function MeetingTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = React.useState("00:00:00");

  React.useEffect(() => {
    const start = new Date(startTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = now - start;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsed(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="font-mono">{elapsed}</span>;
}
