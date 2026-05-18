/**
 * Voice Message Components
 *
 * Complete UI components for voice message recording and playback
 * in the nself-chat application.
 */

// Waveform Visualizer
export {
  WaveformVisualizer,
  CanvasWaveform,
  type WaveformVisualizerProps,
  type WaveformStyle,
  type CanvasWaveformProps,
} from "./waveform-visualizer";

// Recording Indicator
export {
  RecordingIndicator,
  CompactRecordingIndicator,
  FloatingRecordingIndicator,
  type RecordingIndicatorProps,
  type CompactRecordingIndicatorProps,
  type FloatingRecordingIndicatorProps,
} from "./recording-indicator";

// Voice Recorder
export { VoiceRecorder, type VoiceRecorderProps } from "./voice-recorder";

// Voice Recorder Button
export {
  VoiceRecorderButton,
  AnimatedVoiceRecorderButton,
  FloatingVoiceButton,
  type VoiceRecorderButtonProps,
  type RecorderButtonState,
  type AnimatedVoiceRecorderButtonProps,
  type FloatingVoiceButtonProps,
} from "./voice-recorder-button";

// Voice Message
export { VoiceMessage, type VoiceMessageProps } from "./voice-message";

// Voice Message Preview
export {
  VoiceMessagePreview,
  type VoiceMessagePreviewProps,
} from "./voice-message-preview";
