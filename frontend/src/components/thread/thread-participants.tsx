"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ThreadParticipant } from "@/hooks/use-thread";

// ============================================================================
// TYPES
// ============================================================================

export interface ThreadParticipantsProps {
  /** Array of thread participants */
  participants: ThreadParticipant[];
  /** Maximum number of avatars to show before overflow indicator */
  maxVisible?: number;
  /** Size variant for avatars */
  size?: "sm" | "md" | "lg";
  /** Whether to show the total count */
  showCount?: boolean;
  /** Additional class name */
  className?: string;
  /** Click handler for the participants group */
  onClick?: () => void;
}

// ============================================================================
// SIZE CONFIGURATIONS
// ============================================================================

const sizeConfig = {
  sm: {
    avatar: "h-5 w-5",
    text: "text-[10px]",
    overlap: "-ml-1.5",
    container: "h-5",
  },
  md: {
    avatar: "h-6 w-6",
    text: "text-xs",
    overlap: "-ml-2",
    container: "h-6",
  },
  lg: {
    avatar: "h-8 w-8",
    text: "text-sm",
    overlap: "-ml-2.5",
    container: "h-8",
  },
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function ThreadParticipants({
  participants,
  maxVisible = 4,
  size = "md",
  showCount = false,
  className,
  onClick,
}: ThreadParticipantsProps) {
  const config = sizeConfig[size];

  // Get visible and overflow participants
  const visibleParticipants = participants.slice(0, maxVisible);
  const overflowCount = Math.max(0, participants.length - maxVisible);
  const overflowParticipants = participants.slice(maxVisible);

  // Generate initials from name
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Generate tooltip content for overflow
  const overflowTooltip = overflowParticipants
    .map((p) => p.user.display_name || p.user.username)
    .join(", ");

  if (participants.length === 0) {
    return null;
  }

  const Container = onClick ? "button" : "div";

  return (
    <TooltipProvider>
      <Container
        className={cn(
          "flex items-center",
          config.container,
          onClick && "cursor-pointer transition-opacity hover:opacity-80",
          className,
        )}
        onClick={onClick}
        type={onClick ? "button" : undefined}
      >
        {/* Stacked avatars */}
        <div className="flex items-center">
          {visibleParticipants.map((participant, index) => (
            <Tooltip key={participant.id}>
              <TooltipTrigger asChild>
                <Avatar
                  className={cn(
                    config.avatar,
                    "border-2 border-background ring-0",
                    index > 0 && config.overlap,
                  )}
                >
                  <AvatarImage
                    src={participant.user.avatar_url}
                    alt={
                      participant.user.display_name || participant.user.username
                    }
                  />
                  <AvatarFallback className={cn(config.text, "font-medium")}>
                    {getInitials(
                      participant.user.display_name ||
                        participant.user.username,
                    )}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">
                  {participant.user.display_name || participant.user.username}
                </p>
                {participant.user.status && (
                  <p className="text-muted-foreground">
                    {participant.user.status}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Overflow indicator */}
          {overflowCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    config.avatar,
                    config.overlap,
                    "flex items-center justify-center",
                    "rounded-full border-2 border-background",
                    "bg-muted text-muted-foreground",
                    config.text,
                    "font-medium",
                  )}
                >
                  +{overflowCount}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                <p>{overflowTooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Optional count display */}
        {showCount && (
          <span className={cn("ml-2 text-muted-foreground", config.text)}>
            {participants.length}{" "}
            {participants.length === 1 ? "participant" : "participants"}
          </span>
        )}
      </Container>
    </TooltipProvider>
  );
}

// ============================================================================
// PARTICIPANT LIST (Expanded view)
// ============================================================================

export interface ThreadParticipantListProps {
  participants: ThreadParticipant[];
  className?: string;
}

export function ThreadParticipantList({
  participants,
  className,
}: ThreadParticipantListProps) {
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="hover:bg-muted/50 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={participant.user.avatar_url}
              alt={participant.user.display_name || participant.user.username}
            />
            <AvatarFallback className="text-xs">
              {getInitials(
                participant.user.display_name || participant.user.username,
              )}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {participant.user.display_name || participant.user.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              @{participant.user.username}
            </p>
          </div>
          {participant.user.status && (
            <span className="text-xs text-muted-foreground">
              {participant.user.status}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default ThreadParticipants;
