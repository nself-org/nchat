"use client";

/**
 * Screen Share Controls Component
 *
 * Provides controls for starting, stopping, and configuring screen shares.
 * Supports screen/window/tab selection, quality settings, and system audio.
 */

import * as React from "react";
import { useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  MonitorOff,
  MonitorStop,
  Settings,
  Volume2,
  VolumeX,
  Maximize,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { ScreenCaptureOptions } from "@/lib/webrtc/screen-capture";

// =============================================================================
// Types
// =============================================================================

export interface ScreenShareControlsProps extends VariantProps<
  typeof controlsVariants
> {
  /** Whether screen sharing is active */
  isSharing: boolean;
  /** Whether system audio is supported */
  supportsSystemAudio: boolean;
  /** Whether system audio is enabled */
  hasAudio?: boolean;
  /** Current quality setting */
  quality?: "auto" | "720p" | "1080p" | "4k";
  /** Current frame rate */
  frameRate?: number;
  /** Share type */
  shareType?: "screen" | "window" | "tab";
  /** Callback when share is started */
  onStartShare: (options: ScreenCaptureOptions) => void;
  /** Callback when share is stopped */
  onStopShare: () => void;
  /** Callback when quality is changed */
  onQualityChange?: (quality: "auto" | "720p" | "1080p" | "4k") => void;
  /** Callback when frame rate is changed */
  onFrameRateChange?: (frameRate: number) => void;
  /** Callback when settings is clicked */
  onOpenSettings?: () => void;
  /** Additional class name */
  className?: string;
  /** Whether controls are disabled */
  disabled?: boolean;
}

// =============================================================================
// Variants
// =============================================================================

const controlsVariants = cva("flex items-center gap-2", {
  variants: {
    variant: {
      default: "",
      compact: "gap-1",
      inline: "flex-wrap",
    },
    size: {
      sm: "text-sm",
      default: "text-base",
      lg: "text-lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

// =============================================================================
// Component
// =============================================================================

export function ScreenShareControls({
  isSharing,
  supportsSystemAudio,
  hasAudio = false,
  quality = "auto",
  frameRate = 30,
  shareType,
  onStartShare,
  onStopShare,
  onQualityChange,
  onFrameRateChange,
  onOpenSettings,
  variant,
  size,
  className,
  disabled = false,
}: ScreenShareControlsProps) {
  const [captureOptions, setCaptureOptions] = useState<ScreenCaptureOptions>({
    quality: "auto",
    frameRate: 30,
    captureSystemAudio: false,
    captureCursor: true,
    allowSurfaceSwitching: true,
  });

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleStartShare = () => {
    onStartShare(captureOptions);
  };

  const handleQualityChange = (value: string) => {
    const newQuality = value as "auto" | "720p" | "1080p" | "4k";
    setCaptureOptions((prev) => ({ ...prev, quality: newQuality }));
    onQualityChange?.(newQuality);
  };

  const handleFrameRateChange = (value: string) => {
    const newFrameRate = parseInt(value, 10);
    setCaptureOptions((prev) => ({ ...prev, frameRate: newFrameRate }));
    onFrameRateChange?.(newFrameRate);
  };

  const handleToggleAudio = () => {
    setCaptureOptions((prev) => ({
      ...prev,
      captureSystemAudio: !prev.captureSystemAudio,
    }));
  };

  const handleToggleCursor = () => {
    setCaptureOptions((prev) => ({
      ...prev,
      captureCursor: !prev.captureCursor,
    }));
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className={cn(controlsVariants({ variant, size }), className)}>
      {/* Share/Stop Button */}
      {!isSharing ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
              disabled={disabled}
            >
              <Monitor className="mr-2 h-4 w-4" />
              Share Screen
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Share Options</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Quality */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Quality
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={captureOptions.quality}
              onValueChange={handleQualityChange}
            >
              <DropdownMenuRadioItem value="auto">Auto</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="720p">720p</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="1080p">1080p</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="4k">4K</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />

            {/* Frame Rate */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Frame Rate
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(captureOptions.frameRate)}
              onValueChange={handleFrameRateChange}
            >
              <DropdownMenuRadioItem value="15">15 fps</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="30">30 fps</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="60">60 fps</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />

            {/* Options */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Options
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={handleToggleAudio}
              disabled={!supportsSystemAudio}
            >
              <div className="flex w-full items-center justify-between">
                <span>System Audio</span>
                {captureOptions.captureSystemAudio ? (
                  <Volume2 className="h-4 w-4 text-green-500" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {!supportsSystemAudio && (
                <Badge variant="outline" className="ml-2">
                  Not Supported
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleCursor}>
              <div className="flex w-full items-center justify-between">
                <span>Show Cursor</span>
                {captureOptions.captureCursor && (
                  <span className="text-green-500">✓</span>
                )}
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Start Button */}
            <DropdownMenuItem
              onClick={handleStartShare}
              className="text-primary-foreground hover:bg-primary/90 bg-primary"
            >
              <Monitor className="mr-2 h-4 w-4" />
              Start Sharing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          {/* Stop Button */}
          <Button
            variant="destructive"
            size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
            onClick={onStopShare}
            disabled={disabled}
          >
            <MonitorStop className="mr-2 h-4 w-4" />
            Stop Sharing
          </Button>

          {/* Info Badges */}
          <div className="flex items-center gap-2">
            {shareType && (
              <Badge variant="outline">
                <Maximize className="mr-1 h-3 w-3" />
                {shareType}
              </Badge>
            )}
            <Badge variant="outline">{quality}</Badge>
            <Badge variant="outline">{frameRate} fps</Badge>
            {hasAudio && (
              <Badge variant="outline">
                <Volume2 className="mr-1 h-3 w-3" />
                Audio
              </Badge>
            )}
          </div>

          {/* Settings Button */}
          {onOpenSettings && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              disabled={disabled}
              title="Screen share settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Compact Version
// =============================================================================

export function ScreenShareButton({
  isSharing,
  onStartShare,
  onStopShare,
  disabled = false,
  className,
}: {
  isSharing: boolean;
  onStartShare: () => void;
  onStopShare: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      variant={isSharing ? "destructive" : "default"}
      size="icon"
      onClick={isSharing ? onStopShare : onStartShare}
      disabled={disabled}
      className={className}
      title={isSharing ? "Stop screen sharing" : "Share screen"}
    >
      {isSharing ? (
        <MonitorOff className="h-4 w-4" />
      ) : (
        <Monitor className="h-4 w-4" />
      )}
    </Button>
  );
}
