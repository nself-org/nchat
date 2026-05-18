"use client";

/**
 * Call Controls Component
 *
 * Provides UI controls for voice and video calls including
 * mute, video toggle, screen share, and end call buttons.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  MoreVertical,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Minimize2,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export interface CallControlsProps extends VariantProps<
  typeof callControlsVariants
> {
  /** Whether the microphone is muted */
  isMuted: boolean;
  /** Whether video is enabled */
  isVideoEnabled?: boolean;
  /** Whether screen sharing is active */
  isScreenSharing?: boolean;
  /** Whether speaker is muted */
  isSpeakerMuted?: boolean;
  /** Whether controls are minimized */
  isMinimized?: boolean;
  /** Current call duration in seconds */
  callDuration?: number;
  /** Show video controls (for video calls) */
  showVideoControls?: boolean;
  /** Show screen share controls */
  showScreenShareControls?: boolean;
  /** Show speaker controls */
  showSpeakerControls?: boolean;
  /** Callback when mute is toggled */
  onToggleMute: () => void;
  /** Callback when video is toggled */
  onToggleVideo?: () => void;
  /** Callback when screen share is toggled */
  onToggleScreenShare?: () => void;
  /** Callback when speaker is toggled */
  onToggleSpeaker?: () => void;
  /** Callback when call is ended */
  onEndCall: () => void;
  /** Callback when settings is clicked */
  onOpenSettings?: () => void;
  /** Callback when more options is clicked */
  onOpenMore?: () => void;
  /** Callback when minimize is toggled */
  onToggleMinimize?: () => void;
  /** Additional class name */
  className?: string;
  /** Whether controls are disabled */
  disabled?: boolean;
}

// =============================================================================
// Variants
// =============================================================================

const callControlsVariants = cva(
  "flex items-center justify-center gap-2 rounded-xl p-2 transition-all",
  {
    variants: {
      variant: {
        default: "bg-background/80 backdrop-blur-sm border shadow-lg",
        dark: "bg-gray-900/90 backdrop-blur-sm",
        floating: "bg-black/70 backdrop-blur-md",
        minimal: "bg-transparent",
      },
      size: {
        sm: "gap-1 p-1",
        default: "gap-2 p-2",
        lg: "gap-3 p-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const controlButtonVariants = cva(
  "rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        active: "bg-primary text-primary-foreground hover:bg-primary/90",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        muted: "bg-red-500/20 text-red-500 hover:bg-red-500/30",
        enabled: "bg-green-500/20 text-green-500 hover:bg-green-500/30",
      },
      size: {
        sm: "h-8 w-8",
        default: "h-10 w-10",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// =============================================================================
// Helper Functions
// =============================================================================

export function formatCallDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// =============================================================================
// Control Button Component
// =============================================================================

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "active" | "danger" | "muted" | "enabled";
  size?: "sm" | "default" | "lg";
  disabled?: boolean;
  className?: string;
}

function ControlButton({
  icon,
  label,
  onClick,
  variant = "default",
  size = "default",
  disabled = false,
  className,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        controlButtonVariants({ variant, size }),
        "flex items-center justify-center",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {icon}
    </button>
  );
}

// =============================================================================
// Call Controls Component
// =============================================================================

export function CallControls({
  isMuted,
  isVideoEnabled = false,
  isScreenSharing = false,
  isSpeakerMuted = false,
  isMinimized = false,
  callDuration,
  showVideoControls = false,
  showScreenShareControls = false,
  showSpeakerControls = false,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleSpeaker,
  onEndCall,
  onOpenSettings,
  onOpenMore,
  onToggleMinimize,
  variant,
  size,
  className,
  disabled = false,
}: CallControlsProps) {
  const iconSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  const buttonSize = size ?? "default";

  return (
    <div
      className={cn(callControlsVariants({ variant, size }), className)}
      role="toolbar"
      aria-label="Call controls"
    >
      {/* Call Duration */}
      {callDuration !== undefined && (
        <div
          className="px-3 py-1 font-mono text-sm tabular-nums"
          aria-live="polite"
          aria-label={`Call duration: ${formatCallDuration(callDuration)}`}
        >
          {formatCallDuration(callDuration)}
        </div>
      )}

      {/* Minimize Toggle */}
      {onToggleMinimize && (
        <ControlButton
          icon={
            isMinimized ? (
              <Maximize2 size={iconSize} />
            ) : (
              <Minimize2 size={iconSize} />
            )
          }
          label={isMinimized ? "Expand controls" : "Minimize controls"}
          onClick={onToggleMinimize}
          size={buttonSize}
          disabled={disabled}
        />
      )}

      {/* Speaker Toggle */}
      {showSpeakerControls && onToggleSpeaker && (
        <ControlButton
          icon={
            isSpeakerMuted ? (
              <VolumeX size={iconSize} />
            ) : (
              <Volume2 size={iconSize} />
            )
          }
          label={isSpeakerMuted ? "Unmute speaker" : "Mute speaker"}
          onClick={onToggleSpeaker}
          variant={isSpeakerMuted ? "muted" : "default"}
          size={buttonSize}
          disabled={disabled}
        />
      )}

      {/* Mute Toggle */}
      <ControlButton
        icon={isMuted ? <MicOff size={iconSize} /> : <Mic size={iconSize} />}
        label={isMuted ? "Unmute microphone" : "Mute microphone"}
        onClick={onToggleMute}
        variant={isMuted ? "muted" : "default"}
        size={buttonSize}
        disabled={disabled}
      />

      {/* Video Toggle */}
      {showVideoControls && onToggleVideo && (
        <ControlButton
          icon={
            isVideoEnabled ? (
              <Video size={iconSize} />
            ) : (
              <VideoOff size={iconSize} />
            )
          }
          label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
          onClick={onToggleVideo}
          variant={isVideoEnabled ? "enabled" : "muted"}
          size={buttonSize}
          disabled={disabled}
        />
      )}

      {/* Screen Share Toggle */}
      {showScreenShareControls && onToggleScreenShare && (
        <ControlButton
          icon={
            isScreenSharing ? (
              <MonitorOff size={iconSize} />
            ) : (
              <Monitor size={iconSize} />
            )
          }
          label={isScreenSharing ? "Stop screen sharing" : "Share screen"}
          onClick={onToggleScreenShare}
          variant={isScreenSharing ? "active" : "default"}
          size={buttonSize}
          disabled={disabled}
        />
      )}

      {/* End Call */}
      <ControlButton
        icon={<PhoneOff size={iconSize} />}
        label="End call"
        onClick={onEndCall}
        variant="danger"
        size={buttonSize}
        disabled={disabled}
      />

      {/* Settings */}
      {onOpenSettings && (
        <ControlButton
          icon={<Settings size={iconSize} />}
          label="Call settings"
          onClick={onOpenSettings}
          size={buttonSize}
          disabled={disabled}
        />
      )}

      {/* More Options */}
      {onOpenMore && (
        <ControlButton
          icon={<MoreVertical size={iconSize} />}
          label="More options"
          onClick={onOpenMore}
          size={buttonSize}
          disabled={disabled}
        />
      )}
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export { callControlsVariants, controlButtonVariants, ControlButton };
