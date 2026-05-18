/**
 * Capacitor Library Exports
 *
 * Central export point for Capacitor-related utilities and plugins.
 */

// =============================================================================
// Video Service
// =============================================================================

export { video, trimVideoWeb } from "./video";
export type {
  VideoFile,
  VideoRecordingOptions,
  VideoTrimOptions,
  VideoTrimResult,
} from "./video";

// =============================================================================
// Voice Recording Service
// =============================================================================

export {
  voiceRecorder,
  drawWaveform,
  createAnimatedWaveform,
  formatDuration,
} from "./voice-recording";
export type {
  VoiceRecording,
  RecordingOptions,
  WaveformVisualizerOptions,
} from "./voice-recording";

// =============================================================================
// Permissions Manager
// =============================================================================

export {
  permissions,
  areAllPermissionsGranted,
  requestMissingPermissions,
  requestPermissionWithRationale,
} from "./permissions";
export type {
  PermissionType,
  PermissionStatus,
  PermissionResult,
} from "./permissions";

// =============================================================================
// Re-export Native Plugins (from platforms/capacitor)
// =============================================================================

// Note: Native plugins are in platforms/capacitor/src/native/
// Import them directly from that path or configure path aliases
