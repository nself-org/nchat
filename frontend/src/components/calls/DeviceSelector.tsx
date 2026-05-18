/**
 * Device Selector Component
 *
 * Dropdown component for selecting audio/video devices
 * during voice and video calls.
 */

"use client";

import * as React from "react";
import { Mic, Speaker, Video, ChevronDown, Check, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
}

export interface DeviceSelectorProps {
  type: "audioinput" | "audiooutput" | "videoinput";
  devices: MediaDevice[];
  selectedDeviceId?: string;
  onDeviceSelect: (deviceId: string) => void;
  disabled?: boolean;
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

// =============================================================================
// Icon Component
// =============================================================================

function DeviceIcon({
  type,
  className,
}: {
  type: DeviceSelectorProps["type"];
  className?: string;
}) {
  switch (type) {
    case "audioinput":
      return <Mic className={className} />;
    case "audiooutput":
      return <Speaker className={className} />;
    case "videoinput":
      return <Video className={className} />;
  }
}

function getDeviceLabel(type: DeviceSelectorProps["type"]): string {
  switch (type) {
    case "audioinput":
      return "Microphone";
    case "audiooutput":
      return "Speaker";
    case "videoinput":
      return "Camera";
  }
}

// =============================================================================
// Component
// =============================================================================

export function DeviceSelector({
  type,
  devices,
  selectedDeviceId,
  onDeviceSelect,
  disabled = false,
  compact = false,
  showLabel = true,
  className,
}: DeviceSelectorProps) {
  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);
  const label = getDeviceLabel(type);

  // Use first device as default if none selected
  const effectiveDeviceId = selectedDeviceId || devices[0]?.deviceId;

  if (devices.length === 0) {
    return (
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        disabled
        className={cn("text-muted-foreground", className)}
      >
        <DeviceIcon type={type} className="h-4 w-4 mr-2" />
        No {label.toLowerCase()} found
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          disabled={disabled || devices.length <= 1}
          className={cn("justify-between", className)}
        >
          <span className="flex items-center gap-2">
            <DeviceIcon type={type} className="h-4 w-4" />
            {showLabel && (
              <span className="truncate max-w-[150px]">
                {selectedDevice?.label || `Select ${label}`}
              </span>
            )}
          </span>
          {devices.length > 1 && (
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel className="flex items-center gap-2">
          <DeviceIcon type={type} className="h-4 w-4" />
          Select {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {devices.map((device) => (
          <DropdownMenuItem
            key={device.deviceId}
            onClick={() => onDeviceSelect(device.deviceId)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="truncate">{device.label}</span>
            {device.deviceId === effectiveDeviceId && (
              <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// Combined Device Selector
// =============================================================================

export interface CombinedDeviceSelectorProps {
  audioInputDevices: MediaDevice[];
  audioOutputDevices: MediaDevice[];
  videoInputDevices?: MediaDevice[];
  selectedAudioInput?: string;
  selectedAudioOutput?: string;
  selectedVideoInput?: string;
  onAudioInputSelect: (deviceId: string) => void;
  onAudioOutputSelect: (deviceId: string) => void;
  onVideoInputSelect?: (deviceId: string) => void;
  showVideo?: boolean;
  disabled?: boolean;
  layout?: "horizontal" | "vertical";
  className?: string;
}

export function CombinedDeviceSelector({
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices = [],
  selectedAudioInput,
  selectedAudioOutput,
  selectedVideoInput,
  onAudioInputSelect,
  onAudioOutputSelect,
  onVideoInputSelect,
  showVideo = false,
  disabled = false,
  layout = "horizontal",
  className,
}: CombinedDeviceSelectorProps) {
  return (
    <div
      className={cn(
        "flex gap-2",
        layout === "vertical" ? "flex-col" : "flex-row flex-wrap",
        className,
      )}
    >
      <DeviceSelector
        type="audioinput"
        devices={audioInputDevices}
        selectedDeviceId={selectedAudioInput}
        onDeviceSelect={onAudioInputSelect}
        disabled={disabled}
      />

      <DeviceSelector
        type="audiooutput"
        devices={audioOutputDevices}
        selectedDeviceId={selectedAudioOutput}
        onDeviceSelect={onAudioOutputSelect}
        disabled={disabled}
      />

      {showVideo && videoInputDevices.length > 0 && onVideoInputSelect && (
        <DeviceSelector
          type="videoinput"
          devices={videoInputDevices}
          selectedDeviceId={selectedVideoInput}
          onDeviceSelect={onVideoInputSelect}
          disabled={disabled}
        />
      )}
    </div>
  );
}

// =============================================================================
// Audio Level Indicator
// =============================================================================

export interface AudioLevelIndicatorProps {
  level: number; // 0-1
  className?: string;
  variant?: "bar" | "dots" | "meter";
  size?: "sm" | "md" | "lg";
}

export function AudioLevelIndicator({
  level,
  className,
  variant = "bar",
  size = "md",
}: AudioLevelIndicatorProps) {
  const normalizedLevel = Math.max(0, Math.min(1, level));

  const sizeClasses = {
    sm: { bar: "h-1", dot: "h-1 w-1", meter: "h-4 w-16" },
    md: { bar: "h-2", dot: "h-2 w-2", meter: "h-6 w-24" },
    lg: { bar: "h-3", dot: "h-3 w-3", meter: "h-8 w-32" },
  };

  if (variant === "dots") {
    const dotCount = 5;
    const activeDots = Math.ceil(normalizedLevel * dotCount);

    return (
      <div className={cn("flex items-center gap-1", className)}>
        {Array.from({ length: dotCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-colors",
              sizeClasses[size].dot,
              i < activeDots ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600",
            )}
          />
        ))}
      </div>
    );
  }

  if (variant === "meter") {
    return (
      <div
        className={cn(
          "flex items-center gap-1 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden",
          sizeClasses[size].meter,
          className,
        )}
      >
        <div
          className="h-full bg-green-500 transition-all duration-75"
          style={{ width: `${normalizedLevel * 100}%` }}
        />
      </div>
    );
  }

  // Default: bar variant
  return (
    <div
      className={cn(
        "w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden",
        sizeClasses[size].bar,
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-75",
          normalizedLevel > 0.8
            ? "bg-red-500"
            : normalizedLevel > 0.5
              ? "bg-yellow-500"
              : "bg-green-500",
        )}
        style={{ width: `${normalizedLevel * 100}%` }}
      />
    </div>
  );
}

// =============================================================================
// Audio Test Component
// =============================================================================

export interface AudioTestProps {
  audioLevel: number;
  onTestMicrophone?: () => void;
  onTestSpeaker?: () => void;
  isTesting?: boolean;
  className?: string;
}

export function AudioTest({
  audioLevel,
  onTestMicrophone,
  onTestSpeaker,
  isTesting = false,
  className,
}: AudioTestProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Microphone Test */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Microphone
          </span>
          {onTestMicrophone && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTestMicrophone}
              disabled={isTesting}
            >
              {isTesting ? "Testing..." : "Test"}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AudioLevelIndicator level={audioLevel} variant="meter" />
          <span className="text-xs text-muted-foreground">
            {audioLevel > 0 ? "Detecting audio" : "No audio detected"}
          </span>
        </div>
      </div>

      {/* Speaker Test */}
      {onTestSpeaker && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Speakers
            </span>
            <Button variant="outline" size="sm" onClick={onTestSpeaker}>
              Play Test Sound
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Device Settings Modal Content
// =============================================================================

export interface DeviceSettingsProps {
  audioInputDevices: MediaDevice[];
  audioOutputDevices: MediaDevice[];
  videoInputDevices: MediaDevice[];
  selectedAudioInput?: string;
  selectedAudioOutput?: string;
  selectedVideoInput?: string;
  onAudioInputSelect: (deviceId: string) => void;
  onAudioOutputSelect: (deviceId: string) => void;
  onVideoInputSelect: (deviceId: string) => void;
  audioLevel: number;
  onTestSpeaker?: () => void;
  className?: string;
}

export function DeviceSettings({
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  selectedAudioInput,
  selectedAudioOutput,
  selectedVideoInput,
  onAudioInputSelect,
  onAudioOutputSelect,
  onVideoInputSelect,
  audioLevel,
  onTestSpeaker,
  className,
}: DeviceSettingsProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Audio Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Mic className="h-4 w-4" />
          Microphone
        </label>
        <DeviceSelector
          type="audioinput"
          devices={audioInputDevices}
          selectedDeviceId={selectedAudioInput}
          onDeviceSelect={onAudioInputSelect}
          className="w-full"
        />
        <AudioLevelIndicator level={audioLevel} variant="meter" size="sm" />
      </div>

      {/* Audio Output */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Speaker className="h-4 w-4" />
          Speakers
        </label>
        <DeviceSelector
          type="audiooutput"
          devices={audioOutputDevices}
          selectedDeviceId={selectedAudioOutput}
          onDeviceSelect={onAudioOutputSelect}
          className="w-full"
        />
        {onTestSpeaker && (
          <Button variant="outline" size="sm" onClick={onTestSpeaker}>
            Play Test Sound
          </Button>
        )}
      </div>

      {/* Video Input */}
      {videoInputDevices.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Video className="h-4 w-4" />
            Camera
          </label>
          <DeviceSelector
            type="videoinput"
            devices={videoInputDevices}
            selectedDeviceId={selectedVideoInput}
            onDeviceSelect={onVideoInputSelect}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
