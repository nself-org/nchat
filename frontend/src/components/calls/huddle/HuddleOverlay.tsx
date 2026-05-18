/**
 * HuddleOverlay Component
 *
 * Minimal overlay for active huddles that doesn't block chat.
 * Displays participant bubbles, controls, and huddle state.
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { HuddleBar } from "./HuddleBar";
import { HuddleParticipants } from "./HuddleParticipants";
import { HuddleControls } from "./HuddleControls";
import {
  useHuddle,
  type HuddleParticipant,
  type HuddleReaction,
} from "@/hooks/use-huddle";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

// =============================================================================
// Types
// =============================================================================

export interface HuddleOverlayProps {
  className?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  onOpenThread?: (threadId: string) => void;
}

// =============================================================================
// Reaction Emojis
// =============================================================================

const REACTION_EMOJIS = ["👍", "👎", "❤️", "😂", "🎉", "👏", "🔥", "💯"];

// =============================================================================
// Component
// =============================================================================

export function HuddleOverlay({
  className,
  position = "bottom-right",
  onOpenThread,
}: HuddleOverlayProps) {
  const {
    isInHuddle,
    huddleInfo,
    participants,
    participantCount,
    formattedDuration,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    activeSpeakerId,
    activeSpeaker,
    screenSharer,
    recentReactions,
    messageThreadId,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    leaveHuddle,
    sendReaction,
    createMessageThread,
  } = useHuddle();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  if (!isInHuddle || !huddleInfo) {
    return null;
  }

  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  };

  const handleOpenThread = () => {
    if (!messageThreadId) {
      createMessageThread();
    }
    if (messageThreadId && onOpenThread) {
      onOpenThread(messageThreadId);
    }
  };

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn("fixed z-50", positionClasses[position], className)}
      >
        <div
          className={cn(
            "bg-background/95 backdrop-blur-md rounded-xl shadow-2xl border border-border",
            "transition-all duration-200",
            isExpanded ? "w-80" : "w-64",
          )}
        >
          {/* Header - Always visible */}
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              {/* Active speaker indicator */}
              <div className="relative">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    activeSpeakerId
                      ? "bg-green-500 animate-pulse"
                      : "bg-yellow-500",
                  )}
                />
              </div>
              <span className="text-sm font-medium truncate max-w-[120px]">
                {huddleInfo.channelName || "Huddle"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formattedDuration}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex items-center text-xs text-muted-foreground">
                <Users className="w-3 h-3 mr-1" />
                {participantCount}
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {/* Participant bubbles */}
                <div className="px-3 py-2 border-t border-border">
                  <HuddleParticipants
                    participants={participants}
                    activeSpeakerId={activeSpeakerId}
                    screenSharerId={screenSharer?.id}
                    compact
                  />
                </div>

                {/* Screen share indicator */}
                {screenSharer && (
                  <div className="px-3 py-1 text-xs text-muted-foreground flex items-center gap-1 border-t border-border">
                    <Monitor className="w-3 h-3" />
                    <span>{screenSharer.name} is sharing</span>
                  </div>
                )}

                {/* Reactions display */}
                <AnimatePresence>
                  {recentReactions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="px-3 py-2 flex flex-wrap gap-1 border-t border-border"
                    >
                      {recentReactions.map((reaction, index) => (
                        <motion.span
                          key={`${reaction.participantId}-${index}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="text-lg"
                        >
                          {reaction.emoji}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Reaction picker */}
                <AnimatePresence>
                  {showReactions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-3 py-2 border-t border-border"
                    >
                      <div className="flex flex-wrap gap-1">
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              sendReaction(emoji);
                              setShowReactions(false);
                            }}
                            className="p-1 hover:bg-muted rounded transition-colors text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls - Always visible */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border">
            <div className="flex items-center gap-1">
              {/* Mute */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMuted ? "destructive" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleMute}
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

              {/* Video */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isVideoEnabled ? "ghost" : "secondary"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <VideoOff className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                </TooltipContent>
              </Tooltip>

              {/* Screen share */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isScreenSharing ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleScreenShare}
                  >
                    {isScreenSharing ? (
                      <MonitorOff className="h-4 w-4" />
                    ) : (
                      <Monitor className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isScreenSharing ? "Stop sharing" : "Share screen"}
                </TooltipContent>
              </Tooltip>

              {/* Reactions */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowReactions(!showReactions)}
                  >
                    <span className="text-sm">😀</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reactions</TooltipContent>
              </Tooltip>

              {/* Message thread */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleOpenThread}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Huddle thread</TooltipContent>
              </Tooltip>
            </div>

            {/* Leave */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => leaveHuddle()}
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Leave huddle</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}

export default HuddleOverlay;
