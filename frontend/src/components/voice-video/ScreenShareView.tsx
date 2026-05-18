/**
 * ScreenShareView Component
 *
 * Optimized layout for screen sharing scenarios.
 * Features:
 * - Large screen share area
 * - Small participant thumbnails sidebar/bottom
 * - Screen share controls overlay
 * - Quality indicator
 * - Presenter name
 * - Picture-in-picture support
 */

"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  MonitorUp,
  MonitorStop,
  Pin,
  Maximize,
  Minimize,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { VideoTile } from "./VideoTile";
import type { CallParticipant } from "@/types/calls";

// =============================================================================
// Types
// =============================================================================

export interface ScreenShareViewProps {
  /** Participant who is sharing screen */
  participant: CallParticipant;
  /** Screen share stream */
  stream: MediaStream | null;
  /** All other participants */
  participants: CallParticipant[];
  /** Local stream (for PiP) */
  localStream?: MediaStream | null;
  /** Local user info */
  localUser?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  /** Callbacks */
  onStopSharing?: () => void;
  onPinParticipant?: (participantId: string) => void;
  /** Additional class name */
  className?: string;
}

type ThumbnailPosition = "right" | "bottom";

// =============================================================================
// Component
// =============================================================================

export function ScreenShareView({
  participant,
  stream,
  participants,
  localStream,
  localUser,
  onStopSharing,
  onPinParticipant,
  className,
}: ScreenShareViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [thumbnailPosition, setThumbnailPosition] =
    useState<ThumbnailPosition>("right");
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Attach screen share stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Auto-adjust thumbnail position based on screen aspect ratio
  useEffect(() => {
    const handleResize = () => {
      const aspectRatio = window.innerWidth / window.innerHeight;
      setThumbnailPosition(aspectRatio > 1.5 ? "right" : "bottom");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fullscreen handlers
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        console.error("Failed to enter fullscreen:", error);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (error) {
        console.error("Failed to exit fullscreen:", error);
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Filter out the presenter from participants list
  const otherParticipants = participants.filter((p) => p.id !== participant.id);

  return (
    <div ref={containerRef} className={cn("flex h-full w-full", className)}>
      {thumbnailPosition === "right" ? (
        <>
          {/* Main screen share area */}
          <div className="relative flex-1">
            <div className="flex h-full items-center justify-center bg-black">
              {stream ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-gray-400">
                  <MonitorUp className="h-16 w-16" />
                  <p>Waiting for screen share...</p>
                </div>
              )}
            </div>

            {/* Screen share info overlay */}
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <Badge className="bg-blue-600 text-white">
                <MonitorUp className="mr-1 h-3 w-3" />
                {(participant.user as any)?.name ||
                  participant.user?.displayName ||
                  "Unknown"}{" "}
                is presenting
              </Badge>
            </div>

            {/* Screen share controls */}
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setShowThumbnails(!showThumbnails)}
                className="h-9 w-9 bg-black/60 backdrop-blur-sm hover:bg-black/80"
              >
                <Users className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleFullscreen}
                className="h-9 w-9 bg-black/60 backdrop-blur-sm hover:bg-black/80"
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
              {onStopSharing && participant.isLocal && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onStopSharing}
                  className="h-9"
                >
                  <MonitorStop className="mr-2 h-4 w-4" />
                  Stop Sharing
                </Button>
              )}
            </div>
          </div>

          {/* Right sidebar with participant thumbnails */}
          {showThumbnails && otherParticipants.length > 0 && (
            <div className="w-64 border-l border-gray-700 bg-gray-900">
              <div className="border-b border-gray-700 p-3">
                <h3 className="text-sm font-medium text-white">
                  Participants ({otherParticipants.length})
                </h3>
              </div>
              <ScrollArea className="h-[calc(100%-60px)]">
                <div className="space-y-2 p-2">
                  {otherParticipants.map((p) => (
                    <VideoTile
                      key={p.id}
                      participantId={p.id}
                      name={
                        (p.user as any)?.name ||
                        p.user?.displayName ||
                        "Unknown"
                      }
                      avatarUrl={p.user?.avatarUrl}
                      stream={null}
                      isMuted={p.isMuted}
                      isVideoOff={p.isVideoOff}
                      isScreenSharing={false}
                      isSpeaking={p.isSpeaking || false}
                      isLocal={p.isLocal}
                      connectionQuality={
                        p.connectionQuality
                          ? p.connectionQuality > 80
                            ? "excellent"
                            : p.connectionQuality > 60
                              ? "good"
                              : p.connectionQuality > 40
                                ? "fair"
                                : "poor"
                          : undefined
                      }
                      onPin={onPinParticipant}
                      className="h-36"
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Main screen share area */}
          <div className="relative flex flex-1 flex-col">
            <div className="relative flex-1 bg-black">
              {stream ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
                  <MonitorUp className="h-16 w-16" />
                  <p>Waiting for screen share...</p>
                </div>
              )}

              {/* Screen share info overlay */}
              <div className="absolute left-4 top-4 flex items-center gap-2">
                <Badge className="bg-blue-600 text-white">
                  <MonitorUp className="mr-1 h-3 w-3" />
                  {(participant.user as any)?.name ||
                    participant.user?.displayName ||
                    "Unknown"}{" "}
                  is presenting
                </Badge>
              </div>

              {/* Screen share controls */}
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setShowThumbnails(!showThumbnails)}
                  className="h-9 w-9 bg-black/60 backdrop-blur-sm hover:bg-black/80"
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="h-9 w-9 bg-black/60 backdrop-blur-sm hover:bg-black/80"
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </Button>
                {onStopSharing && participant.isLocal && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onStopSharing}
                    className="h-9"
                  >
                    <MonitorStop className="mr-2 h-4 w-4" />
                    Stop Sharing
                  </Button>
                )}
              </div>
            </div>

            {/* Bottom bar with participant thumbnails */}
            {showThumbnails && otherParticipants.length > 0 && (
              <div className="border-t border-gray-700 bg-gray-900">
                <ScrollArea className="w-full">
                  <div className="flex gap-2 p-2">
                    {otherParticipants.map((p) => (
                      <VideoTile
                        key={p.id}
                        participantId={p.id}
                        name={
                          (p.user as any)?.name ||
                          p.user?.displayName ||
                          "Unknown"
                        }
                        avatarUrl={p.user?.avatarUrl}
                        stream={null}
                        isMuted={p.isMuted}
                        isVideoOff={p.isVideoOff}
                        isScreenSharing={false}
                        isSpeaking={p.isSpeaking || false}
                        isLocal={p.isLocal}
                        connectionQuality={
                          p.connectionQuality
                            ? p.connectionQuality > 80
                              ? "excellent"
                              : p.connectionQuality > 60
                                ? "good"
                                : p.connectionQuality > 40
                                  ? "fair"
                                  : "poor"
                            : undefined
                        }
                        onPin={onPinParticipant}
                        className="h-24 w-32 flex-shrink-0"
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
