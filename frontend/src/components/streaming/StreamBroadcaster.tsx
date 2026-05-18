/**
 * Stream Broadcaster Component
 *
 * Full broadcaster interface for going live with camera/microphone selection,
 * quality settings, viewer count, and stream controls.
 *
 * @module components/streaming/StreamBroadcaster
 */

"use client";

import { useState } from "react";
import { useLiveStream } from "@/hooks/use-live-stream";
import type { StreamQuality, CreateStreamInput } from "@/lib/streaming";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Radio,
  Square,
  Users,
  Clock,
  Settings,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface StreamBroadcasterProps {
  channelId: string;
  onStreamEnded?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function StreamBroadcaster({
  channelId,
  onStreamEnded,
}: StreamBroadcasterProps) {
  // Stream hook
  const {
    stream,
    isCreating,
    isStarting,
    isBroadcasting,
    isEnding,
    localStream,
    connectionState,
    viewerCount,
    duration,
    error,
    createStream,
    startBroadcast,
    stopBroadcast,
    endStream,
    switchCamera,
    switchMicrophone,
    changeQuality,
    toggleVideo,
    toggleAudio,
    availableCameras,
    availableMicrophones,
  } = useLiveStream({
    onStreamEnded,
  });

  // Local state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quality, setQuality] = useState<StreamQuality>("720p");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleCreateStream = async () => {
    if (!title.trim()) {
      alert("Please enter a stream title");
      return;
    }

    const input: CreateStreamInput = {
      channelId,
      title: title.trim(),
      description: description.trim() || undefined,
      maxResolution: quality,
      enableChat: true,
      enableReactions: true,
    };

    await createStream(input);
  };

  const handleGoLive = async () => {
    if (!stream) {
      await handleCreateStream();
    }

    if (stream) {
      await startBroadcast(quality);
    }
  };

  const handleEndStream = async () => {
    if (confirm("Are you sure you want to end this stream?")) {
      await endStream();
    }
  };

  const handleToggleVideo = () => {
    const newState = !isVideoEnabled;
    toggleVideo(newState);
    setIsVideoEnabled(newState);
  };

  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    toggleAudio(newState);
    setIsAudioEnabled(newState);
  };

  const handleCameraChange = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (isBroadcasting) {
      await switchCamera(deviceId);
    }
  };

  const handleMicrophoneChange = async (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    if (isBroadcasting) {
      await switchMicrophone(deviceId);
    }
  };

  const handleQualityChange = async (newQuality: StreamQuality) => {
    setQuality(newQuality);
    if (isBroadcasting) {
      await changeQuality(newQuality);
    }
  };

  // ==========================================================================
  // Format Duration
  // ==========================================================================

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="space-y-4">
      {/* Video Preview/Live */}
      <Card className="relative aspect-video overflow-hidden bg-black">
        {localStream ? (
          <video
            ref={(el) => {
              if (el && localStream) {
                el.srcObject = localStream;
              }
            }}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-contain"
          >
            <track kind="captions" src="" label="Captions" default />
          </video>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Video className="h-16 w-16" />
          </div>
        )}

        {/* Status Overlay */}
        {isBroadcasting && (
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 font-semibold text-white">
              <Radio className="h-4 w-4 animate-pulse" />
              LIVE
            </div>
          </div>
        )}

        {/* Stats Overlay */}
        {isBroadcasting && (
          <div className="absolute right-4 top-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-full bg-black/75 px-3 py-1 text-white">
              <Users className="h-4 w-4" />
              <span>{viewerCount}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-black/75 px-3 py-1 text-white">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        {localStream && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
            <Button
              size="icon"
              variant={isVideoEnabled ? "default" : "destructive"}
              onClick={handleToggleVideo}
              disabled={!isBroadcasting}
            >
              {isVideoEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </Button>
            <Button
              size="icon"
              variant={isAudioEnabled ? "default" : "destructive"}
              onClick={handleToggleAudio}
              disabled={!isBroadcasting}
            >
              {isAudioEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-destructive/10 border-destructive p-4">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {/* Stream Setup (Before Going Live) */}
      {!isBroadcasting && !stream && (
        <Card className="space-y-4 p-4">
          <div>
            <Label htmlFor="title">Stream Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you streaming?"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers what this stream is about..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="camera">Camera</Label>
              <Select value={selectedCamera} onValueChange={handleCameraChange}>
                <SelectTrigger id="camera">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {availableCameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="microphone">Microphone</Label>
              <Select
                value={selectedMicrophone}
                onValueChange={handleMicrophoneChange}
              >
                <SelectTrigger id="microphone">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {availableMicrophones.map((mic) => (
                    <SelectItem key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="quality">Stream Quality</Label>
            <Select
              value={quality}
              onValueChange={(v) => handleQualityChange(v as StreamQuality)}
            >
              <SelectTrigger id="quality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                <SelectItem value="720p">720p (HD)</SelectItem>
                <SelectItem value="480p">480p (SD)</SelectItem>
                <SelectItem value="360p">360p (Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {/* Connection Status */}
      {isBroadcasting && connectionState && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Connection Status:
            </span>
            <span
              className={`text-sm font-semibold ${
                connectionState === "connected"
                  ? "text-green-600"
                  : connectionState === "connecting"
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {connectionState}
            </span>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isBroadcasting ? (
          <Button
            onClick={handleGoLive}
            disabled={isCreating || isStarting || !title.trim()}
            className="flex-1"
            size="lg"
          >
            {isCreating || isStarting ? (
              <>Starting...</>
            ) : (
              <>
                <Radio className="mr-2 h-5 w-5" />
                Go Live
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleEndStream}
            disabled={isEnding}
            variant="destructive"
            className="flex-1"
            size="lg"
          >
            {isEnding ? (
              <>Ending...</>
            ) : (
              <>
                <Square className="mr-2 h-5 w-5" />
                End Stream
              </>
            )}
          </Button>
        )}

        <Button
          variant="outline"
          size="lg"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Advanced Settings (Toggle) */}
      {showSettings && (
        <Card className="space-y-4 p-4">
          <h3 className="font-semibold">Advanced Settings</h3>
          {/* Add more advanced settings here */}
          <div className="text-sm text-muted-foreground">
            Quality: {quality} | Bitrate: 3000 kbps | FPS: 30
          </div>
        </Card>
      )}
    </div>
  );
}
