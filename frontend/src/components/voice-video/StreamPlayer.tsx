/**
 * StreamPlayer Component
 *
 * Live streaming video player with chat and reactions.
 * Supports HLS/DASH streaming with LiveKit.
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Users,
  Heart,
  ThumbsUp,
  Smile,
  MessageSquare,
  Share2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface StreamMetadata {
  streamId: string;
  title: string;
  description?: string;
  streamer: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  viewerCount: number;
  startedAt: Date;
  isLive: boolean;
  thumbnailUrl?: string;
  category?: string;
  tags?: string[];
}

export interface StreamMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  message: string;
  timestamp: Date;
  isHighlighted?: boolean;
}

export interface StreamReaction {
  type: "heart" | "thumbsup" | "smile" | "fire" | "clap";
  count: number;
}

export interface StreamPlayerProps {
  metadata: StreamMetadata;
  streamUrl?: string;
  messages?: StreamMessage[];
  reactions?: StreamReaction[];
  onSendMessage?: (message: string) => void;
  onReaction?: (type: StreamReaction["type"]) => void;
  onFollow?: () => void;
  onShare?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function StreamPlayer({
  metadata,
  streamUrl,
  messages = [],
  reactions = [],
  onSendMessage,
  onReaction,
  onFollow,
  onShare,
  className,
}: StreamPlayerProps) {
  // ==========================================================================
  // State
  // ==========================================================================

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showControls, setShowControls] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [quality, setQuality] = useState<
    "auto" | "1080p" | "720p" | "480p" | "360p"
  >("auto");

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    containerRef.current?.addEventListener("mousemove", handleMouseMove);

    return () => {
      containerRef.current?.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize video
  useEffect(() => {
    if (videoRef.current && streamUrl) {
      videoRef.current.src = streamUrl;
    }
  }, [streamUrl]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim() && onSendMessage) {
      onSendMessage(chatMessage.trim());
      setChatMessage("");
    }
  };

  const handleReaction = (type: StreamReaction["type"]) => {
    onReaction?.(type);
    toast.success("Reaction sent!");
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatViewerCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const streamDuration = Math.floor(
    (Date.now() - metadata.startedAt.getTime()) / 1000,
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div
      ref={containerRef}
      className={cn("relative flex h-full flex-col bg-black", className)}
    >
      {/* Video Container */}
      <div className="relative flex-1">
        {/* Video Element */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          className="h-full w-full"
          onClick={handlePlayPause}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        />

        {/* Live Indicator Overlay */}
        {metadata.isLive && (
          <div className="absolute left-4 top-4">
            <Badge className="animate-pulse bg-red-500 text-white">
              <span className="mr-2 h-2 w-2 rounded-full bg-white" />
              LIVE
            </Badge>
          </div>
        )}

        {/* Viewer Count */}
        <div className="absolute right-4 top-4">
          <div className="rounded-lg bg-black/60 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-2 text-white">
              <Users className="h-4 w-4" />
              <span className="font-semibold">
                {formatViewerCount(metadata.viewerCount)}
              </span>
            </div>
          </div>
        </div>

        {/* Reactions Overlay */}
        <div className="absolute bottom-24 right-4 flex flex-col gap-2">
          {[
            {
              type: "heart" as const,
              icon: Heart,
              count: reactions.find((r) => r.type === "heart")?.count || 0,
            },
            {
              type: "thumbsup" as const,
              icon: ThumbsUp,
              count: reactions.find((r) => r.type === "thumbsup")?.count || 0,
            },
            {
              type: "smile" as const,
              icon: Smile,
              count: reactions.find((r) => r.type === "smile")?.count || 0,
            },
          ].map(({ type, icon: Icon, count }) => (
            <Button
              key={type}
              size="lg"
              variant="secondary"
              onClick={() => handleReaction(type)}
              className="flex-col gap-1 rounded-full bg-black/60 p-3 backdrop-blur hover:bg-black/80"
            >
              <Icon className="h-6 w-6 text-white" />
              {count > 0 && (
                <span className="text-xs text-white">
                  {formatViewerCount(count)}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Controls Overlay */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300",
            !showControls && "opacity-0",
          )}
        >
          {/* Progress Bar */}
          {!metadata.isLive && (
            <div className="mb-4">
              <Slider
                value={[currentTime]}
                max={videoRef.current?.duration || 100}
                step={1}
                className="w-full"
                onValueChange={(value) => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = value[0];
                  }
                }}
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={handlePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleMuteToggle}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  className="w-24"
                  onValueChange={handleVolumeChange}
                />
              </div>

              {metadata.isLive ? (
                <Badge variant="outline" className="border-white text-white">
                  {formatDuration(streamDuration)}
                </Badge>
              ) : (
                <span className="text-sm text-white">
                  {formatDuration(currentTime)} /{" "}
                  {formatDuration(videoRef.current?.duration || 0)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {quality}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(["auto", "1080p", "720p", "480p", "360p"] as const).map(
                    (q) => (
                      <DropdownMenuItem key={q} onClick={() => setQuality(q)}>
                        {q}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowChat(!showChat)}
                className="text-white hover:bg-white/20"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={handleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <Card className="w-96 border-l border-gray-700 bg-gray-900">
          {/* Stream Info */}
          <div className="border-b border-gray-700 p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={metadata.streamer.avatarUrl}
                  alt={metadata.streamer.name}
                />
                <AvatarFallback>{metadata.streamer.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-white">{metadata.title}</h3>
                <p className="text-sm text-gray-400">
                  {metadata.streamer.name}
                </p>
                {metadata.category && (
                  <Badge variant="secondary" className="mt-1">
                    {metadata.category}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                {onFollow && (
                  <Button size="sm" variant="secondary" onClick={onFollow}>
                    Follow
                  </Button>
                )}
                {onShare && (
                  <Button size="icon" variant="ghost" onClick={onShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <ScrollArea ref={chatScrollRef} className="h-96 p-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-lg p-2",
                    msg.isHighlighted &&
                      "border border-yellow-500/50 bg-yellow-500/20",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={msg.userAvatarUrl} />
                      <AvatarFallback className="text-xs">
                        {msg.userName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-white">
                          {msg.userName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{msg.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          {onSendMessage && (
            <form
              onSubmit={handleSendMessage}
              className="border-t border-gray-700 p-4"
            >
              <div className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Send a message..."
                  className="flex-1 border-gray-700 bg-gray-800 text-white"
                />
                <Button type="submit" disabled={!chatMessage.trim()}>
                  Send
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}

export default StreamPlayer;
