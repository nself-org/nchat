"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DirectMessage, DMParticipant } from "@/lib/dm/dm-types";
import {
  getOtherParticipants,
  generateGroupAvatarUrls,
  getGroupInitials,
} from "@/lib/dm";

// ============================================================================
// Types
// ============================================================================

interface GroupDMAvatarProps {
  dm: DirectMessage;
  currentUserId: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

// ============================================================================
// Size Configurations
// ============================================================================

const sizeConfig = {
  sm: {
    container: "h-8 w-8",
    single: "h-8 w-8",
    grid: "h-4 w-4",
    text: "text-xs",
    gridText: "text-[8px]",
  },
  md: {
    container: "h-10 w-10",
    single: "h-10 w-10",
    grid: "h-5 w-5",
    text: "text-sm",
    gridText: "text-[10px]",
  },
  lg: {
    container: "h-12 w-12",
    single: "h-12 w-12",
    grid: "h-6 w-6",
    text: "text-base",
    gridText: "text-xs",
  },
  xl: {
    container: "h-20 w-20",
    single: "h-20 w-20",
    grid: "h-10 w-10",
    text: "text-2xl",
    gridText: "text-sm",
  },
};

// ============================================================================
// Component
// ============================================================================

export function GroupDMAvatar({
  dm,
  currentUserId,
  size = "md",
  className,
}: GroupDMAvatarProps) {
  const config = sizeConfig[size];

  // If the group has a custom avatar, use it
  if (dm.avatarUrl) {
    return (
      <Avatar className={cn(config.single, className)}>
        <AvatarImage src={dm.avatarUrl} alt={dm.name || "Group"} />
        <AvatarFallback className={config.text}>
          {getGroupInitials(dm.name || "Group")}
        </AvatarFallback>
      </Avatar>
    );
  }

  // For 1:1 DMs, show the other person's avatar
  if (dm.type === "direct") {
    const others = getOtherParticipants(dm, currentUserId);
    const other = others[0];
    if (other) {
      return (
        <Avatar className={cn(config.single, className)}>
          <AvatarImage
            src={other.user.avatarUrl || undefined}
            alt={other.user.displayName}
          />
          <AvatarFallback className={config.text}>
            {other.user.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      );
    }
  }

  // For group DMs, show combined avatars
  const avatarUrls = generateGroupAvatarUrls(dm.participants, currentUserId, 4);
  const initials = getGroupInitials(dm.name || "Group");

  // No avatars available
  if (avatarUrls.length === 0) {
    return (
      <Avatar className={cn(config.single, className)}>
        <AvatarFallback className={config.text}>{initials}</AvatarFallback>
      </Avatar>
    );
  }

  // Single avatar
  if (avatarUrls.length === 1) {
    return (
      <Avatar className={cn(config.single, className)}>
        <AvatarImage src={avatarUrls[0]} />
        <AvatarFallback className={config.text}>{initials}</AvatarFallback>
      </Avatar>
    );
  }

  // Grid layout for multiple avatars
  return (
    <div className={cn("relative", config.container, className)}>
      {avatarUrls.slice(0, 4).map((url, index) => (
        <Avatar
          key={index}
          className={cn(
            "absolute border border-background",
            config.grid,
            index === 0 && "left-0 top-0",
            index === 1 && "right-0 top-0",
            index === 2 && "bottom-0 left-0",
            index === 3 && "bottom-0 right-0",
            avatarUrls.length === 2 &&
              index === 1 &&
              "top-1/2 -translate-y-1/2",
            avatarUrls.length === 3 &&
              index === 2 &&
              "left-1/2 -translate-x-1/2",
          )}
        >
          <AvatarImage src={url} />
          <AvatarFallback className={config.gridText}>
            {initials.charAt(index) || "?"}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

// ============================================================================
// Alternative: Stacked Avatars
// ============================================================================

interface StackedAvatarsProps {
  participants: DMParticipant[];
  currentUserId: string;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StackedAvatars({
  participants,
  currentUserId,
  max = 3,
  size = "md",
  className,
}: StackedAvatarsProps) {
  const others = participants.filter((p) => p.userId !== currentUserId);
  const displayed = others.slice(0, max);
  const remaining = others.length - max;

  const sizeClasses = {
    sm: { avatar: "h-6 w-6", text: "text-[10px]", overlap: "-ml-2" },
    md: { avatar: "h-8 w-8", text: "text-xs", overlap: "-ml-3" },
    lg: { avatar: "h-10 w-10", text: "text-sm", overlap: "-ml-4" },
  };

  const config = sizeClasses[size];

  return (
    <div className={cn("flex items-center", className)}>
      {displayed.map((participant, index) => (
        <Avatar
          key={participant.userId}
          className={cn(
            config.avatar,
            "border-2 border-background",
            index > 0 && config.overlap,
          )}
        >
          <AvatarImage src={participant.user.avatarUrl || undefined} />
          <AvatarFallback className={config.text}>
            {participant.user.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            config.avatar,
            config.overlap,
            "flex items-center justify-center rounded-full border-2 border-background bg-muted",
            config.text,
            "font-medium",
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

GroupDMAvatar.displayName = "GroupDMAvatar";
StackedAvatars.displayName = "StackedAvatars";
