/**
 * Voice Message Module
 *
 * Exports all voice recording and playback utilities for the nself-chat application.
 */

// Audio Recorder
export {
  AudioRecorder,
  isRecordingSupported,
  getSupportedMimeType,
  getExtensionFromMimeType,
  checkMicrophonePermission,
  requestMicrophonePermission,
  compressAudioBlob,
  convertAudioFormat,
  createAudioFile,
  type RecordingState,
  type AudioFormat,
  type RecorderOptions,
  type RecorderCallbacks,
  type AudioRecorderError,
  type MicrophonePermissionState,
} from "./audio-recorder";

// Waveform Analyzer
export {
  RealtimeWaveformAnalyzer,
  generateWaveform,
  generateDetailedWaveform,
  getAudioDuration,
  normalizeWaveform,
  smoothWaveform,
  resampleWaveform,
  type WaveformData,
  type WaveformAnalyzerOptions,
  type RealtimeWaveformData,
  type WaveformUpdateCallback,
} from "./waveform-analyzer";

// Voice Recorder Hook
export {
  useVoiceRecorder,
  formatDuration,
  type MicrophonePermission,
  type VoiceRecorderState,
  type VoiceRecorderActions,
  type UseVoiceRecorderReturn,
  type UseVoiceRecorderOptions,
} from "./use-voice-recorder";

// Voice Player Hook
export {
  useVoicePlayer,
  formatTime,
  formatTimeWithHours,
  PLAYBACK_SPEEDS,
  type PlaybackState,
  type PlaybackSpeed,
  type VoicePlayerState,
  type VoicePlayerActions,
  type UseVoicePlayerReturn,
  type UseVoicePlayerOptions,
} from "./use-voice-player";
