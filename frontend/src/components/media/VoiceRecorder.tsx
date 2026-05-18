"use client";

/**
 * VoiceRecorder Component
 * Voice note recording with waveform visualization
 */

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, Play, Pause, Trash2, Send, Download } from "lucide-react";
import { logger } from "@/lib/logger";
import {
  voiceRecorder,
  drawWaveform,
  createAnimatedWaveform,
  formatDuration,
  type VoiceRecording,
} from "@/lib/capacitor/voice-recording";

// ============================================================================
// Types
// ============================================================================

export interface VoiceRecorderProps {
  maxDuration?: number; // in seconds
  onRecordingComplete?: (recording: VoiceRecording) => void;
  onCancel?: () => void;
  showPreview?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function VoiceRecorder({
  maxDuration = 300, // 5 minutes
  onRecordingComplete,
  onCancel,
  showPreview = true,
  className,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState<VoiceRecording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Check and request microphone permission
   */
  useEffect(() => {
    (async () => {
      const permission = await voiceRecorder.checkMicrophonePermission();
      setHasPermission(permission);
    })();
  }, []);

  /**
   * Update duration during recording
   */
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const interval = setInterval(() => {
      const currentDuration = voiceRecorder.getCurrentDuration();
      setDuration(currentDuration);

      // Auto-stop at max duration
      if (currentDuration >= maxDuration) {
        handleStopRecording();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording, isPaused, maxDuration]);

  /**
   * Draw waveform during recording
   */
  useEffect(() => {
    if (!isRecording || !canvasRef.current) return;

    const drawFrame = () => {
      if (!canvasRef.current || !isRecording) return;

      const waveformData = voiceRecorder.getCurrentWaveform();
      drawWaveform(canvasRef.current, waveformData, {
        width: canvasRef.current.width,
        height: canvasRef.current.height,
        barWidth: 3,
        barGap: 1,
        barCount: 50,
        color: "#3b82f6",
      });

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording]);

  /**
   * Update playback waveform
   */
  useEffect(() => {
    if (!isPlaying || !canvasRef.current || !recording) return;

    const audio = audioRef.current;
    if (!audio) return;

    const updateWaveform = () => {
      if (!canvasRef.current || !recording) return;

      createAnimatedWaveform(
        canvasRef.current,
        recording.waveformData || [],
        audio?.currentTime || 0,
        recording.duration,
        {
          width: canvasRef.current.width,
          height: canvasRef.current.height,
          barWidth: 3,
          barGap: 1,
          barCount: 50,
          color: "#3b82f6",
        },
      );

      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    };

    updateWaveform();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, recording]);

  /**
   * Start recording
   */
  const handleStartRecording = async () => {
    try {
      if (!hasPermission) {
        const granted = await voiceRecorder.requestMicrophonePermission();
        if (!granted) {
          alert("Microphone permission is required to record voice notes");
          return;
        }
        setHasPermission(true);
      }

      await voiceRecorder.startRecording({ maxDuration });
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setRecording(null);
    } catch (error) {
      logger.error("Failed to start recording:", error);
      alert("Failed to start recording");
    }
  };

  /**
   * Stop recording
   */
  const handleStopRecording = async () => {
    try {
      const result = await voiceRecorder.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setRecording(result);

      if (!showPreview) {
        onRecordingComplete?.(result);
      }
    } catch (error) {
      logger.error("Failed to stop recording:", error);
      alert("Failed to stop recording");
    }
  };

  /**
   * Pause/Resume recording
   */
  const handlePauseResume = () => {
    if (isPaused) {
      voiceRecorder.resumeRecording();
      setIsPaused(false);
    } else {
      voiceRecorder.pauseRecording();
      setIsPaused(true);
    }
  };

  /**
   * Cancel recording
   */
  const handleCancelRecording = async () => {
    await voiceRecorder.cancelRecording();
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setRecording(null);
    onCancel?.();
  };

  /**
   * Play/Pause playback
   */
  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  /**
   * Send recording
   */
  const handleSend = () => {
    if (recording) {
      onRecordingComplete?.(recording);
    }
  };

  /**
   * Delete recording
   */
  const handleDelete = () => {
    if (recording) {
      URL.revokeObjectURL(recording.uri);
    }
    setRecording(null);
  };

  /**
   * Handle audio time update
   */
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  };

  /**
   * Handle audio ended
   */
  const handleEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Waveform Canvas */}
      <div className="relative h-24 rounded-lg bg-muted">
        <canvas
          ref={canvasRef}
          width={600}
          height={96}
          className="h-full w-full"
        />

        {/* Duration overlay */}
        {(isRecording || recording) && (
          <div className="absolute right-4 top-4 rounded bg-black/50 px-2 py-1 font-mono text-sm text-white">
            {formatDuration(isRecording ? duration : playbackTime)} /{" "}
            {formatDuration(
              isRecording ? maxDuration : recording?.duration || 0,
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isRecording && <Progress value={(duration / maxDuration) * 100} />}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {!isRecording && !recording && (
          <Button
            size="lg"
            onClick={handleStartRecording}
            className="rounded-full"
          >
            <Mic className="mr-2 h-5 w-5" />
            Start Recording
          </Button>
        )}

        {isRecording && (
          <>
            <Button size="lg" variant="outline" onClick={handlePauseResume}>
              {isPaused ? (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </>
              )}
            </Button>

            <Button
              size="lg"
              onClick={handleStopRecording}
              className="rounded-full"
            >
              <Square className="mr-2 h-5 w-5" />
              Stop
            </Button>

            <Button
              size="lg"
              variant="destructive"
              onClick={handleCancelRecording}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </>
        )}

        {recording && showPreview && (
          <>
            <Button size="lg" variant="outline" onClick={handlePlayPause}>
              {isPlaying ? (
                <>
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Play
                </>
              )}
            </Button>

            <Button size="lg" onClick={handleSend} className="rounded-full">
              <Send className="mr-2 h-5 w-5" />
              Send
            </Button>

            <Button size="lg" variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Recording info */}
      {recording && (
        <div className="rounded-lg bg-muted p-4 text-sm">
          <div className="flex items-center justify-between">
            <span>Duration: {formatDuration(recording.duration)}</span>
            <span>Size: {(recording.size / 1024).toFixed(1)} KB</span>
          </div>
        </div>
      )}

      {/* Hidden audio element for playback */}
      {recording && (
        <audio
          ref={audioRef}
          src={recording.uri}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="hidden"
        >
          <track kind="captions" src="" label="Captions" default />
        </audio>
      )}
    </div>
  );
}

export default VoiceRecorder;
