"use client";

/**
 * Screen Share Example Component
 *
 * Complete example showing screen sharing with annotations and recording.
 * This serves as a reference implementation for integrating all features.
 */

import * as React from "react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Monitor,
  Square,
  Circle,
  Download,
  Trash2,
  Play,
  Pause,
  StopCircle,
} from "lucide-react";
import { ScreenShareControls } from "./ScreenShareControls";
import { ScreenShareOverlay } from "./ScreenShareOverlay";
import { useScreenShare } from "@/hooks/use-screen-share";
import { useScreenRecording } from "@/hooks/use-screen-recording";

import { logger } from "@/lib/logger";

// =============================================================================
// Component
// =============================================================================

export function ScreenShareExample() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [userId] = useState("demo-user-123");
  const [userName] = useState("Demo User");
  const [annotationsEnabled, setAnnotationsEnabled] = useState(false);

  // Screen share hook
  const screenShare = useScreenShare({
    userId,
    userName,
    useAdvancedCapture: true,
    onScreenShareStarted: (stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    },
    onScreenShareStopped: () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setAnnotationsEnabled(false);
    },
    onError: (error) => {
      logger.error("Screen share error:", error);
      alert(`Screen share error: ${error.message}`);
    },
  });

  // Recording hook
  const recording = useScreenRecording({
    onStart: () => {},
    onStop: () => {},
    onError: (error) => logger.error("Recording error:", error),
  });

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleStartRecording = async () => {
    if (screenShare.screenStream) {
      await recording.startRecording(screenShare.screenStream, {
        format: "webm",
        quality: "medium",
        includeWebcam: false,
      });
    }
  };

  const handleStopRecording = async () => {
    const rec = await recording.stopRecording();
    if (rec) {
      // Auto-download
      recording.downloadRecording(rec);
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="container mx-auto space-y-4 p-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            Screen Sharing Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Screen Share Controls */}
          <div className="flex items-center justify-between">
            <ScreenShareControls
              isSharing={screenShare.isScreenSharing}
              supportsSystemAudio={screenShare.supportsSystemAudio}
              hasAudio={screenShare.activeShares[0]?.hasAudio}
              quality="1080p"
              frameRate={30}
              shareType={screenShare.activeShares[0]?.type}
              onStartShare={screenShare.startScreenShare}
              onStopShare={screenShare.stopScreenShare}
              onQualityChange={(quality) => screenShare.updateQuality(quality)}
              onFrameRateChange={(frameRate) =>
                screenShare.updateFrameRate(frameRate)
              }
            />

            {screenShare.isScreenSharing && (
              <Button
                variant={annotationsEnabled ? "default" : "outline"}
                onClick={() => setAnnotationsEnabled(!annotationsEnabled)}
              >
                <Circle className="mr-2 h-4 w-4" />
                {annotationsEnabled ? "Hide" : "Show"} Annotations
              </Button>
            )}
          </div>

          {/* Status Badges */}
          {screenShare.isScreenSharing && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  Sharing
                </div>
              </Badge>
              {screenShare.activeShares.length > 0 && (
                <>
                  <Badge variant="outline">
                    {screenShare.activeShares[0].type}
                  </Badge>
                  {screenShare.activeShares[0].hasAudio && (
                    <Badge variant="outline">System Audio</Badge>
                  )}
                </>
              )}
              {recording.isRecording && (
                <Badge variant="destructive">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    Recording {recording.formatDuration(recording.duration)}
                  </div>
                </Badge>
              )}
            </div>
          )}

          {/* Recording Controls */}
          {screenShare.isScreenSharing && (
            <div className="flex items-center gap-2">
              {!recording.isRecording ? (
                <Button onClick={handleStartRecording} variant="outline">
                  <Square className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
              ) : (
                <>
                  <Button onClick={handleStopRecording} variant="destructive">
                    <StopCircle className="mr-2 h-4 w-4" />
                    Stop Recording
                  </Button>
                  {recording.isPaused ? (
                    <Button
                      onClick={recording.resumeRecording}
                      variant="outline"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      onClick={recording.pauseRecording}
                      variant="outline"
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                  )}
                  <Badge variant="outline">
                    {recording.formatFileSize(recording.size)}
                  </Badge>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Display */}
      {screenShare.isScreenSharing && (
        <Card>
          <CardContent className="p-4">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-contain"
              />

              {/* Annotation Overlay */}
              {annotationsEnabled && (
                <ScreenShareOverlay
                  videoElement={videoRef.current}
                  userId={userId}
                  userName={userName}
                  enabled={annotationsEnabled}
                  onAnnotationAdded={(annotation) => {
                    // Broadcast to other users via signaling
                  }}
                  onClose={() => setAnnotationsEnabled(false)}
                />
              )}

              {/* No video indicator */}
              {!screenShare.screenStream && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Monitor className="mx-auto mb-2 h-16 w-16 opacity-50" />
                    <p>Screen share will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recordings List */}
      {recording.recordings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recordings</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={recording.clearRecordings}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recording.recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      Recording #{rec.id.split("-").pop()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {recording.formatDuration(rec.duration)} •{" "}
                      {recording.formatFileSize(rec.size)} •{" "}
                      {rec.format.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => recording.downloadRecording(rec)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => recording.deleteRecording(rec.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <strong>Features:</strong> Screen/window/tab sharing, system audio
              (Chrome/Edge), quality control, annotations, recording
            </p>
            <p>
              <strong>Browser Support:</strong> Chrome 72+, Edge 79+, Firefox
              66+, Safari 13+
            </p>
            <p>
              <strong>Shortcuts:</strong> Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+D
              (pen), Ctrl+E (eraser)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ScreenShareExample;
