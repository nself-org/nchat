"use client";

/**
 * Voice Recorder Hook
 *
 * React hook for voice message recording with state management,
 * real-time waveform visualization, and duration tracking.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  AudioRecorder,
  type RecordingState,
  type AudioRecorderError,
  type RecorderOptions,
  checkMicrophonePermission,
  requestMicrophonePermission,
  isRecordingSupported,
  createAudioFile,
} from "./audio-recorder";
import {
  RealtimeWaveformAnalyzer,
  type RealtimeWaveformData,
  type WaveformAnalyzerOptions,
} from "./waveform-analyzer";

// ============================================================================
// TYPES
// ============================================================================

export type MicrophonePermission =
  | "granted"
  | "denied"
  | "prompt"
  | "unavailable";

export interface VoiceRecorderState {
  /** Current recording state */
  recordingState: RecordingState;
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether recording is paused */
  isPaused: boolean;
  /** Current recording duration in seconds */
  duration: number;
  /** Formatted duration string (MM:SS) */
  formattedDuration: string;
  /** Real-time waveform data for visualization */
  waveformData: RealtimeWaveformData | null;
  /** The recorded audio blob (available after stopping) */
  audioBlob: Blob | null;
  /** URL for audio preview (available after stopping) */
  audioUrl: string | null;
  /** Audio file ready for upload */
  audioFile: File | null;
  /** Current error (if any) */
  error: AudioRecorderError | null;
  /** Microphone permission state */
  permission: MicrophonePermission;
  /** Whether browser supports audio recording */
  isSupported: boolean;
}

export interface VoiceRecorderActions {
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording and get the audio blob */
  stopRecording: () => Promise<Blob | null>;
  /** Pause recording */
  pauseRecording: () => void;
  /** Resume recording */
  resumeRecording: () => void;
  /** Cancel recording and discard data */
  cancelRecording: () => void;
  /** Clear the recorded audio and reset state */
  clearRecording: () => void;
  /** Request microphone permission */
  requestPermission: () => Promise<boolean>;
  /** Clear the current error */
  clearError: () => void;
}

export type UseVoiceRecorderReturn = VoiceRecorderState & VoiceRecorderActions;

export interface UseVoiceRecorderOptions {
  /** Recorder options */
  recorderOptions?: RecorderOptions;
  /** Waveform analyzer options */
  waveformOptions?: WaveformAnalyzerOptions;
  /** Maximum recording duration in seconds (0 for unlimited) */
  maxDuration?: number;
  /** Callback when recording starts */
  onStart?: () => void;
  /** Callback when recording stops */
  onStop?: (blob: Blob, duration: number) => void;
  /** Callback when an error occurs */
  onError?: (error: AudioRecorderError) => void;
  /** Callback for real-time waveform updates */
  onWaveformUpdate?: (data: RealtimeWaveformData) => void;
  /** Callback when max duration is reached */
  onMaxDurationReached?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format duration in seconds to MM:SS string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for voice message recording
 *
 * @example
 * ```tsx
 * function VoiceRecorder() {
 *   const {
 *     isRecording,
 *     duration,
 *     formattedDuration,
 *     waveformData,
 *     audioUrl,
 *     startRecording,
 *     stopRecording,
 *     cancelRecording,
 *   } = useVoiceRecorder({
 *     maxDuration: 60, // 1 minute max
 *     onStop: (blob, duration) => {
 *       // console.log('Recording complete:', blob, duration)
 *     },
 *   })
 *
 *   return (
 *     <div>
 *       <button onClick={isRecording ? stopRecording : startRecording}>
 *         {isRecording ? 'Stop' : 'Record'}
 *       </button>
 *       {isRecording && <span>{formattedDuration}</span>}
 *       {audioUrl && <audio src={audioUrl} controls />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {},
): UseVoiceRecorderReturn {
  const {
    recorderOptions,
    waveformOptions,
    maxDuration = 0,
    onStart,
    onStop,
    onError,
    onWaveformUpdate,
    onMaxDurationReached,
  } = options;

  // State
  const [recordingState, setRecordingState] =
    useState<RecordingState>("inactive");
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<RealtimeWaveformData | null>(
    null,
  );
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [error, setError] = useState<AudioRecorderError | null>(null);
  const [permission, setPermission] = useState<MicrophonePermission>("prompt");
  const [isSupported, setIsSupported] = useState(true);

  // Refs
  const recorderRef = useRef<AudioRecorder | null>(null);
  const analyzerRef = useRef<RealtimeWaveformAnalyzer | null>(null);
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Check support and permission on mount
  useEffect(() => {
    setIsSupported(isRecordingSupported());

    checkMicrophonePermission().then((result) => {
      setPermission(result.state);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  // Handle max duration
  useEffect(() => {
    if (maxDuration > 0 && recordingState === "recording") {
      // Clear existing timeout
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
      }

      // Calculate remaining time
      const remainingTime = (maxDuration - duration) * 1000;

      if (remainingTime > 0) {
        maxDurationTimeoutRef.current = setTimeout(() => {
          onMaxDurationReached?.();
          stopRecording();
        }, remainingTime);
      }
    }

    return () => {
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
      }
    };
  }, [maxDuration, recordingState, duration]);

  const cleanupRecording = useCallback(() => {
    // Stop analyzer
    if (analyzerRef.current) {
      analyzerRef.current.stop();
      analyzerRef.current = null;
    }

    // Cancel recorder
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }

    // Clear max duration timeout
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }

    // Revoke audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  const handleError = useCallback(
    (err: AudioRecorderError) => {
      setError(err);
      setRecordingState("inactive");
      cleanupRecording();
      onError?.(err);
    },
    [cleanupRecording, onError],
  );

  // ============================================================================
  // Actions
  // ============================================================================

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestMicrophonePermission();
    setPermission(granted ? "granted" : "denied");
    return granted;
  }, []);

  const startRecording = useCallback(async () => {
    // Clear any previous state
    setError(null);
    setAudioBlob(null);
    setAudioFile(null);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    // Create recorder
    const recorder = new AudioRecorder(
      {
        onStart: () => {
          setRecordingState("recording");
          onStart?.();
        },
        onStop: (blob, dur) => {
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
          setAudioFile(createAudioFile(blob));
          setRecordingState("stopped");

          // Stop analyzer
          if (analyzerRef.current) {
            analyzerRef.current.stop();
            analyzerRef.current = null;
          }

          onStop?.(blob, dur);
        },
        onPause: () => {
          setRecordingState("paused");
        },
        onResume: () => {
          setRecordingState("recording");
        },
        onError: handleError,
        onDurationUpdate: (dur) => {
          setDuration(dur);
        },
      },
      recorderOptions,
    );

    recorderRef.current = recorder;

    // Start recording
    await recorder.start();

    // Set up waveform analyzer if recording started successfully
    const stream = recorder.getAudioStream();
    if (stream && recorder.isRecording) {
      const analyzer = new RealtimeWaveformAnalyzer(stream, waveformOptions);

      analyzer.onUpdate((data) => {
        setWaveformData(data);
        onWaveformUpdate?.(data);
      });

      await analyzer.start();
      analyzerRef.current = analyzer;
    }
  }, [
    audioUrl,
    recorderOptions,
    waveformOptions,
    handleError,
    onStart,
    onStop,
    onWaveformUpdate,
  ]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!recorderRef.current) {
      return null;
    }

    // Stop analyzer first
    if (analyzerRef.current) {
      analyzerRef.current.stop();
      analyzerRef.current = null;
    }

    // Stop recorder
    const blob = await recorderRef.current.stop();
    recorderRef.current = null;

    return blob;
  }, []);

  const pauseRecording = useCallback(() => {
    recorderRef.current?.pause();
  }, []);

  const resumeRecording = useCallback(() => {
    recorderRef.current?.resume();
  }, []);

  const cancelRecording = useCallback(() => {
    cleanupRecording();
    setRecordingState("inactive");
    setDuration(0);
    setWaveformData(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioFile(null);
  }, [cleanupRecording]);

  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setAudioFile(null);
    setRecordingState("inactive");
    setDuration(0);
    setWaveformData(null);
  }, [audioUrl]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    recordingState,
    isRecording: recordingState === "recording",
    isPaused: recordingState === "paused",
    duration,
    formattedDuration: formatDuration(duration),
    waveformData,
    audioBlob,
    audioUrl,
    audioFile,
    error,
    permission,
    isSupported,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    clearRecording,
    requestPermission,
    clearError,
  };
}

export default useVoiceRecorder;
