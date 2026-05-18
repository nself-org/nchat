"use client";

/**
 * Screen Recording Hook
 *
 * Provides screen recording functionality with webcam overlay.
 * Supports WebM and MP4 formats with quality controls.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScreenRecorder,
  createScreenRecorder,
  type RecordingOptions,
  type Recording,
  type RecordingState,
  downloadRecording,
  formatFileSize,
  formatDuration,
} from "@/lib/webrtc/screen-recorder";

// =============================================================================
// Types
// =============================================================================

export interface UseScreenRecordingOptions {
  onStart?: () => void;
  onStop?: (recording: Recording) => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: Error) => void;
}

export interface UseScreenRecordingReturn {
  // State
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  size: number;
  recordings: Recording[];

  // Actions
  startRecording: (
    stream: MediaStream,
    options?: RecordingOptions,
  ) => Promise<void>;
  stopRecording: () => Promise<Recording | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;

  // Recording Management
  downloadRecording: (recording: Recording, filename?: string) => void;
  deleteRecording: (recordingId: string) => void;
  clearRecordings: () => void;

  // Utilities
  formatFileSize: (bytes: number) => string;
  formatDuration: (seconds: number) => string;

  // Helper
  isSupported: boolean;
  supportedMimeTypes: string[];
}

// =============================================================================
// Hook
// =============================================================================

export function useScreenRecording(
  options: UseScreenRecordingOptions = {},
): UseScreenRecordingReturn {
  const { onStart, onStop, onPause, onResume, onError } = options;

  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [size, setSize] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);

  // Refs
  const recorderRef = useRef<ScreenRecorder | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  // Check if recording is supported
  const isSupported = ScreenRecorder.isSupported();
  const supportedMimeTypes = isSupported
    ? ScreenRecorder.getSupportedMimeTypes()
    : [];

  // ==========================================================================
  // Initialize Recorder
  // ==========================================================================

  useEffect(() => {
    recorderRef.current = createScreenRecorder({
      onStart: () => {
        setIsRecording(true);
        setIsPaused(false);
        startDurationTimer();
        onStart?.();
      },
      onStop: (recording) => {
        setIsRecording(false);
        setIsPaused(false);
        setDuration(0);
        setSize(0);
        stopDurationTimer();
        setRecordings((prev) => [...prev, recording]);
        onStop?.(recording);
      },
      onPause: () => {
        setIsPaused(true);
        stopDurationTimer();
        onPause?.();
      },
      onResume: () => {
        setIsPaused(false);
        startDurationTimer();
        onResume?.();
      },
      onDataAvailable: (data, currentSize) => {
        setSize(currentSize);
      },
      onError: (error) => {
        setIsRecording(false);
        setIsPaused(false);
        stopDurationTimer();
        onError?.(error);
      },
    });

    return () => {
      stopDurationTimer();
      recorderRef.current?.destroy();
      recorderRef.current = null;
    };
  }, [onStart, onStop, onPause, onResume, onError]);

  // ==========================================================================
  // Duration Timer
  // ==========================================================================

  const startDurationTimer = useCallback((): void => {
    stopDurationTimer();

    durationIntervalRef.current = window.setInterval(() => {
      if (recorderRef.current) {
        const state = recorderRef.current.getState();
        setDuration(state.duration);
      }
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback((): void => {
    if (durationIntervalRef.current !== null) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // ==========================================================================
  // Start Recording
  // ==========================================================================

  const startRecording = useCallback(
    async (
      stream: MediaStream,
      recordingOptions: RecordingOptions = {},
    ): Promise<void> => {
      if (!isSupported) {
        const error = new Error(
          "Screen recording is not supported in this browser",
        );
        onError?.(error);
        throw error;
      }

      if (!recorderRef.current) {
        const error = new Error("Recorder not initialized");
        onError?.(error);
        throw error;
      }

      try {
        await recorderRef.current.startRecording(stream, recordingOptions);
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error("Failed to start recording");
        onError?.(err);
        throw err;
      }
    },
    [isSupported, onError],
  );

  // ==========================================================================
  // Stop Recording
  // ==========================================================================

  const stopRecording = useCallback(async (): Promise<Recording | null> => {
    if (!recorderRef.current || !isRecording) {
      return null;
    }

    try {
      const recording = await recorderRef.current.stopRecording();
      return recording;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Failed to stop recording");
      onError?.(err);
      return null;
    }
  }, [isRecording, onError]);

  // ==========================================================================
  // Pause Recording
  // ==========================================================================

  const pauseRecording = useCallback((): void => {
    if (!recorderRef.current || !isRecording || isPaused) {
      return;
    }

    try {
      recorderRef.current.pauseRecording();
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Failed to pause recording");
      onError?.(err);
    }
  }, [isRecording, isPaused, onError]);

  // ==========================================================================
  // Resume Recording
  // ==========================================================================

  const resumeRecording = useCallback((): void => {
    if (!recorderRef.current || !isRecording || !isPaused) {
      return;
    }

    try {
      recorderRef.current.resumeRecording();
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error("Failed to resume recording");
      onError?.(err);
    }
  }, [isRecording, isPaused, onError]);

  // ==========================================================================
  // Download Recording
  // ==========================================================================

  const handleDownloadRecording = useCallback(
    (recording: Recording, filename?: string): void => {
      downloadRecording(recording, filename);
    },
    [],
  );

  // ==========================================================================
  // Delete Recording
  // ==========================================================================

  const deleteRecording = useCallback((recordingId: string): void => {
    setRecordings((prev) => {
      const recording = prev.find((r) => r.id === recordingId);
      if (recording) {
        // Revoke object URL to free memory
        URL.revokeObjectURL(recording.url);
      }
      return prev.filter((r) => r.id !== recordingId);
    });
  }, []);

  // ==========================================================================
  // Clear Recordings
  // ==========================================================================

  const clearRecordings = useCallback((): void => {
    // Revoke all object URLs
    recordings.forEach((recording) => {
      URL.revokeObjectURL(recording.url);
    });
    setRecordings([]);
  }, [recordings]);

  // ==========================================================================
  // Cleanup on unmount
  // ==========================================================================

  useEffect(() => {
    return () => {
      // Revoke all object URLs on unmount
      recordings.forEach((recording) => {
        URL.revokeObjectURL(recording.url);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    isRecording,
    isPaused,
    duration,
    size,
    recordings,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,

    // Recording Management
    downloadRecording: handleDownloadRecording,
    deleteRecording,
    clearRecordings,

    // Utilities
    formatFileSize,
    formatDuration,

    // Helper
    isSupported,
    supportedMimeTypes,
  };
}
