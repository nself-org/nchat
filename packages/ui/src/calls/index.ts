/**
 * Calls domain — voice/video calls, voice messages, waveform, device selector.
 *
 * @module calls
 */

export * from './types'

export { CallInterface } from './call-interface'
export type { CallInterfaceAdapter, CallInterfaceProps } from './call-interface'

export { WaveformVisualizer } from './waveform-visualizer'
export type { WaveformVisualizerProps, WaveformStyle } from './waveform-visualizer'

export { VoiceRecorder, VoiceRecorderButton } from './voice-recorder'
export type {
  VoiceRecorderAdapter,
  VoiceRecorderProps,
  VoiceRecorderButtonProps,
} from './voice-recorder'

export { VoiceMessage } from './voice-message'
export type { VoiceMessageAdapter, VoiceMessageProps } from './voice-message'

export { DeviceSelector, DeviceSettingsPanel } from './device-selector'
export type { DeviceSelectorProps, DeviceSettingsPanelProps } from './device-selector'
