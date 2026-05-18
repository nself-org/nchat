/**
 * VoiceChatIndicator Component
 *
 * Shows voice chat status in a group/channel, allowing quick join.
 */

"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Radio, Users, Mic, Circle } from "lucide-react";
import type { VoiceChat } from "@/types/voice-chat";

// =============================================================================
// Types
// =============================================================================

interface VoiceChatIndicatorProps {
  voiceChat: VoiceChat | null;
  isInVoiceChat: boolean;
  onJoin: () => void;
  onOpen: () => void;
  className?: string;
  variant?: "compact" | "full";
}

// =============================================================================
// Component
// =============================================================================

export function VoiceChatIndicator({
  voiceChat,
  isInVoiceChat,
  onJoin,
  onOpen,
  className,
  variant = "full",
}: VoiceChatIndicatorProps) {
  if (!voiceChat || voiceChat.status !== "live") {
    return null;
  }

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-100",
                className,
              )}
              onClick={isInVoiceChat ? onOpen : onJoin}
            >
              <div className="relative">
                <Radio className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
              </div>
              <span className="text-xs font-medium">
                {voiceChat.participantCount}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{voiceChat.title}</p>
            <p className="text-xs text-muted-foreground">
              {voiceChat.participantCount} listening
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
            <Radio className="h-5 w-5 text-white" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white" />
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm text-green-900 truncate">
              {voiceChat.title}
            </h4>
            <span className="flex items-center gap-0.5 text-xs text-green-700">
              <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-700">
            <Users className="h-3 w-3" />
            <span>{voiceChat.participantCount} listening</span>
            {voiceChat.speakerCount > 0 && (
              <>
                <span>.</span>
                <Mic className="h-3 w-3" />
                <span>{voiceChat.speakerCount} speaking</span>
              </>
            )}
          </div>
        </div>
      </div>

      <Button
        variant={isInVoiceChat ? "secondary" : "default"}
        size="sm"
        className={cn(!isInVoiceChat && "bg-green-600 hover:bg-green-700")}
        onClick={isInVoiceChat ? onOpen : onJoin}
      >
        {isInVoiceChat ? "Open" : "Join"}
      </Button>
    </div>
  );
}

export default VoiceChatIndicator;
