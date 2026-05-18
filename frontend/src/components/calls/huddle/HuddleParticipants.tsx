/**
 * HuddleParticipants Component
 *
 * Displays participant bubbles with speaking indicators and status.
 */

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { type HuddleParticipant } from "@/hooks/use-huddle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Headphones,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export interface HuddleParticipantsProps {
  participants: HuddleParticipant[];
  activeSpeakerId?: string | null;
  screenSharerId?: string | null;
  className?: string;
  compact?: boolean;
  maxVisible?: number;
  onParticipantClick?: (participant: HuddleParticipant) => void;
}

// =============================================================================
// Component
// =============================================================================

export function HuddleParticipants({
  participants,
  activeSpeakerId,
  screenSharerId,
  className,
  compact = false,
  maxVisible = 8,
  onParticipantClick,
}: HuddleParticipantsProps) {
  const visibleParticipants = participants.slice(0, maxVisible);
  const hiddenCount = Math.max(0, participants.length - maxVisible);

  const avatarSize = compact ? "w-8 h-8" : "w-10 h-10";
  const iconSize = compact ? "h-2.5 w-2.5" : "h-3 w-3";
  const badgeSize = compact ? "w-4 h-4" : "w-5 h-5";

  return (
    <TooltipProvider>
      <div
        className={cn("flex flex-wrap gap-2", compact && "gap-1", className)}
      >
        <AnimatePresence mode="popLayout">
          {visibleParticipants.map((participant) => {
            const isActiveSpeaker = participant.id === activeSpeakerId;
            const isScreenSharing = participant.id === screenSharerId;
            const isSpeaking = participant.isSpeaking && !participant.isMuted;

            return (
              <motion.div
                key={participant.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
                      onClick={() => onParticipantClick?.(participant)}
                    >
                      <Avatar
                        className={cn(
                          avatarSize,
                          "transition-all duration-200",
                          isActiveSpeaker &&
                            "ring-2 ring-primary ring-offset-2",
                          isSpeaking &&
                            !isActiveSpeaker &&
                            "ring-2 ring-green-500 ring-offset-1",
                        )}
                      >
                        <AvatarImage
                          src={participant.avatarUrl}
                          alt={participant.name}
                        />
                        <AvatarFallback
                          className={cn(
                            "text-xs font-medium",
                            compact && "text-[10px]",
                          )}
                        >
                          {participant.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Speaking animation */}
                      {isSpeaking && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-green-500"
                          initial={{ scale: 1, opacity: 1 }}
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.5, 1],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}

                      {/* Audio level indicator */}
                      {isSpeaking && participant.audioLevel > 0 && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                          {[0.3, 0.5, 0.3].map((threshold, i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-0.5 rounded-full transition-all duration-100",
                                participant.audioLevel > threshold
                                  ? "bg-green-500"
                                  : "bg-muted",
                                participant.audioLevel > threshold
                                  ? i === 1
                                    ? "h-2"
                                    : "h-1"
                                  : "h-0.5",
                              )}
                            />
                          ))}
                        </div>
                      )}

                      {/* Status badges */}
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-background border",
                          badgeSize,
                        )}
                      >
                        {isScreenSharing ? (
                          <Monitor className={cn(iconSize, "text-primary")} />
                        ) : participant.isVideoEnabled ? (
                          <Video
                            className={cn(iconSize, "text-muted-foreground")}
                          />
                        ) : participant.isMuted ? (
                          <MicOff
                            className={cn(iconSize, "text-destructive")}
                          />
                        ) : (
                          <Mic className={cn(iconSize, "text-green-500")} />
                        )}
                      </div>

                      {/* Connection state indicator */}
                      {participant.connectionState === "connecting" && (
                        <div className="absolute inset-0 rounded-full bg-background/50 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {participant.connectionState === "reconnecting" && (
                        <div className="absolute inset-0 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {participant.connectionState === "disconnected" && (
                        <div className="absolute inset-0 rounded-full bg-destructive/20 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-destructive" />
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <div className="font-medium">{participant.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        {participant.isMuted ? (
                          <>
                            <MicOff className="h-3 w-3" />
                            Muted
                          </>
                        ) : (
                          <>
                            <Mic className="h-3 w-3" />
                            Unmuted
                          </>
                        )}
                        {participant.isVideoEnabled && (
                          <>
                            <span className="mx-1">|</span>
                            <Video className="h-3 w-3" />
                            Video on
                          </>
                        )}
                        {isScreenSharing && (
                          <>
                            <span className="mx-1">|</span>
                            <Monitor className="h-3 w-3" />
                            Sharing
                          </>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            );
          })}

          {/* Hidden count */}
          {hiddenCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium",
                      avatarSize,
                      compact ? "text-xs" : "text-sm",
                    )}
                  >
                    +{hiddenCount}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <div className="font-medium">
                      {hiddenCount} more participants
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {participants
                        .slice(maxVisible)
                        .map((p) => p.name)
                        .join(", ")}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

// =============================================================================
// Participant List View (Alternative display)
// =============================================================================

export interface HuddleParticipantListProps {
  participants: HuddleParticipant[];
  activeSpeakerId?: string | null;
  screenSharerId?: string | null;
  className?: string;
  onMuteParticipant?: (participantId: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
  canManage?: boolean;
}

export function HuddleParticipantList({
  participants,
  activeSpeakerId,
  screenSharerId,
  className,
  onMuteParticipant,
  onRemoveParticipant,
  canManage = false,
}: HuddleParticipantListProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {participants.map((participant) => {
        const isActiveSpeaker = participant.id === activeSpeakerId;
        const isScreenSharing = participant.id === screenSharerId;
        const isSpeaking = participant.isSpeaking && !participant.isMuted;

        return (
          <div
            key={participant.id}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg",
              isActiveSpeaker && "bg-primary/10",
              isSpeaking && !isActiveSpeaker && "bg-green-500/10",
            )}
          >
            <Avatar className="w-7 h-7">
              <AvatarImage src={participant.avatarUrl} alt={participant.name} />
              <AvatarFallback className="text-xs">
                {participant.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {participant.name}
              </div>
            </div>

            {/* Status icons */}
            <div className="flex items-center gap-1">
              {isScreenSharing && (
                <Monitor className="h-3.5 w-3.5 text-primary" />
              )}
              {participant.isVideoEnabled && (
                <Video className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {participant.isMuted ? (
                <MicOff className="h-3.5 w-3.5 text-destructive" />
              ) : isSpeaking ? (
                <div className="flex items-center gap-0.5">
                  <Mic className="h-3.5 w-3.5 text-green-500" />
                  <div className="flex gap-0.5">
                    {[0.3, 0.5, 0.3].map((threshold, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-0.5 rounded-full transition-all duration-100",
                          participant.audioLevel > threshold
                            ? "bg-green-500"
                            : "bg-muted",
                          participant.audioLevel > threshold
                            ? i === 1
                              ? "h-3"
                              : "h-2"
                            : "h-1",
                        )}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <Mic className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default HuddleParticipants;
