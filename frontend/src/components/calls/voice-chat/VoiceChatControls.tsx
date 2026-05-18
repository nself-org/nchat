/**
 * VoiceChatControls Component
 *
 * Controls for voice chat including push-to-talk, mute, and volume.
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Hand,
  Radio,
  Circle,
  Keyboard,
  Settings,
} from "lucide-react";
import type { PushToTalkMode } from "@/types/voice-chat";

// =============================================================================
// Types
// =============================================================================

interface VoiceChatControlsProps {
  isMuted: boolean;
  isHandRaised: boolean;
  isSpeaker: boolean;
  talkMode: PushToTalkMode;
  isPushToTalkActive: boolean;
  outputVolume: number;
  isRecording: boolean;
  onToggleMute: () => void;
  onRaiseHand: () => void;
  onLowerHand: () => void;
  onSetTalkMode: (mode: PushToTalkMode) => void;
  onSetOutputVolume: (volume: number) => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function VoiceChatControls({
  isMuted,
  isHandRaised,
  isSpeaker,
  talkMode,
  isPushToTalkActive,
  outputVolume,
  isRecording,
  onToggleMute,
  onRaiseHand,
  onLowerHand,
  onSetTalkMode,
  onSetOutputVolume,
  className,
}: VoiceChatControlsProps) {
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  const talkModes: {
    value: PushToTalkMode;
    label: string;
    description: string;
  }[] = [
    {
      value: "voice_activity",
      label: "Voice Activity",
      description: "Automatically transmit when you speak",
    },
    {
      value: "push_to_talk",
      label: "Push to Talk",
      description: "Hold Space to transmit",
    },
    {
      value: "always_on",
      label: "Always On",
      description: "Always transmit audio",
    },
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
          <Circle className="h-2 w-2 fill-red-500 animate-pulse" />
          Recording
        </div>
      )}

      {/* Push-to-talk indicator */}
      {talkMode === "push_to_talk" && isSpeaker && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors",
            isPushToTalkActive
              ? "bg-green-100 text-green-700"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Keyboard className="h-3 w-3" />
          {isPushToTalkActive ? "Speaking..." : "Hold Space"}
        </div>
      )}

      {/* Talk mode selector (for speakers) */}
      {isSpeaker && (
        <Popover open={modeOpen} onOpenChange={setModeOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Radio className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">
                {talkModes.find((m) => m.value === talkMode)?.label}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                Talk Mode
              </p>
              {talkModes.map((mode) => (
                <button
                  key={mode.value}
                  className={cn(
                    "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                    talkMode === mode.value && "bg-primary/10 text-primary",
                  )}
                  onClick={() => {
                    onSetTalkMode(mode.value);
                    setModeOpen(false);
                  }}
                >
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {mode.description}
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Volume control */}
      <Popover open={volumeOpen} onOpenChange={setVolumeOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  {outputVolume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Volume</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent className="w-56 p-4" align="center">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Output Volume</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(outputVolume * 100)}%
              </span>
            </div>
            <Slider
              value={[outputVolume * 100]}
              min={0}
              max={200}
              step={5}
              onValueChange={([value]) => onSetOutputVolume(value / 100)}
            />
            <p className="text-xs text-muted-foreground">
              Values above 100% may cause distortion
            </p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Mute button (for speakers) */}
      {isSpeaker && talkMode !== "push_to_talk" && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMuted ? "secondary" : "default"}
                size="icon"
                className={cn(!isMuted && "bg-green-600 hover:bg-green-700")}
                onClick={onToggleMute}
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Raise hand button (for listeners) */}
      {!isSpeaker && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isHandRaised ? "default" : "secondary"}
                size="icon"
                className={cn(
                  isHandRaised && "bg-amber-500 hover:bg-amber-600",
                )}
                onClick={isHandRaised ? onLowerHand : onRaiseHand}
              >
                <Hand className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isHandRaised ? "Lower hand" : "Raise hand"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export default VoiceChatControls;
