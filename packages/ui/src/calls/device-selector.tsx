/**
 * Device selector — pick audio/video input/output device.
 * Injectable, no lucide/Radix deps.
 *
 * @module calls/device-selector
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { MediaDeviceInfo, MediaDeviceKind } from './types'

// ============================================================================
// Props
// ============================================================================

export interface DeviceSelectorProps {
  kind: MediaDeviceKind
  devices: MediaDeviceInfo[]
  selectedDeviceId?: string
  onSelect: (deviceId: string) => void
  disabled?: boolean
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function getKindLabel(kind: MediaDeviceKind): string {
  switch (kind) {
    case 'audioinput': return 'Microphone'
    case 'audiooutput': return 'Speaker'
    case 'videoinput': return 'Camera'
  }
}

function KindIcon({ kind, className }: { kind: MediaDeviceKind; className?: string }) {
  switch (kind) {
    case 'audioinput': return <MicIcon className={className} />
    case 'audiooutput': return <SpeakerIcon className={className} />
    case 'videoinput': return <VideoIcon className={className} />
  }
}

// ============================================================================
// DeviceSelector
// ============================================================================

export function DeviceSelector({ kind, devices, selectedDeviceId, onSelect, disabled, className }: DeviceSelectorProps) {
  const id = React.useId()
  const labelId = `${id}-label`

  return (
    <div className={cn('space-y-1.5', className)}>
      <label id={labelId} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <KindIcon kind={kind} />
        {getKindLabel(kind)}
      </label>
      <div className="relative">
        <select
          aria-labelledby={labelId}
          value={selectedDeviceId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled || devices.length === 0}
          className={cn(
            'w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            (disabled || devices.length === 0) && 'opacity-60 cursor-not-allowed'
          )}
        >
          {devices.length === 0 ? (
            <option value="">No devices found</option>
          ) : (
            devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `${getKindLabel(kind)} ${d.deviceId.slice(0, 6)}`}
              </option>
            ))
          )}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
          <ChevronDownIcon />
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// DeviceSettingsPanel — groups all three selectors
// ============================================================================

export interface DeviceSettingsPanelProps {
  audioInputDevices: MediaDeviceInfo[]
  audioOutputDevices: MediaDeviceInfo[]
  videoDevices: MediaDeviceInfo[]
  selectedAudioInput?: string
  selectedAudioOutput?: string
  selectedVideo?: string
  onSelectAudioInput: (id: string) => void
  onSelectAudioOutput: (id: string) => void
  onSelectVideo: (id: string) => void
  disabled?: boolean
  className?: string
}

export function DeviceSettingsPanel({
  audioInputDevices,
  audioOutputDevices,
  videoDevices,
  selectedAudioInput,
  selectedAudioOutput,
  selectedVideo,
  onSelectAudioInput,
  onSelectAudioOutput,
  onSelectVideo,
  disabled,
  className,
}: DeviceSettingsPanelProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <DeviceSelector
        kind="audioinput"
        devices={audioInputDevices}
        selectedDeviceId={selectedAudioInput}
        onSelect={onSelectAudioInput}
        disabled={disabled}
      />
      <DeviceSelector
        kind="audiooutput"
        devices={audioOutputDevices}
        selectedDeviceId={selectedAudioOutput}
        onSelect={onSelectAudioOutput}
        disabled={disabled}
      />
      <DeviceSelector
        kind="videoinput"
        devices={videoDevices}
        selectedDeviceId={selectedVideo}
        onSelect={onSelectVideo}
        disabled={disabled}
      />
    </div>
  )
}
