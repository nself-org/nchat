"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { type UserProfile, useUserStore } from "@/stores/user-store";
import { UserProfileCardTrigger } from "./user-profile-card";

// ============================================================================
// Variants
// ============================================================================

const userMentionVariants = cva(
  "inline-flex items-center rounded px-1 py-0.5 font-medium cursor-pointer transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary hover:bg-primary/20",
        highlight:
          "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30",
        subtle: "text-primary hover:bg-primary/10 hover:underline",
        muted: "text-muted-foreground hover:text-foreground hover:underline",
      },
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

// ============================================================================
// Types
// ============================================================================

export interface UserMentionProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, "onClick">,
    VariantProps<typeof userMentionVariants> {
  userId?: string;
  user?: UserProfile;
  username?: string;
  showProfileCard?: boolean;
  isCurrentUser?: boolean;
  onClick?: (user: UserProfile) => void;
  onMessage?: (user: UserProfile) => void;
  onViewProfile?: (user: UserProfile) => void;
}

// ============================================================================
// Component
// ============================================================================

const UserMention = React.forwardRef<HTMLSpanElement, UserMentionProps>(
  (
    {
      className,
      userId,
      user: userProp,
      username,
      variant,
      size,
      showProfileCard = true,
      isCurrentUser,
      onClick,
      onMessage,
      onViewProfile,
      ...props
    },
    ref,
  ) => {
    const getUser = useUserStore((state) => state.getUser);
    const currentUser = useUserStore((state) => state.currentUser);

    // Resolve user from props or store
    const user = React.useMemo(() => {
      if (userProp) return userProp;
      if (userId) return getUser(userId);
      return undefined;
    }, [userProp, userId, getUser]);

    // Check if this is the current user
    const isSelf =
      isCurrentUser ?? (user && currentUser && user.id === currentUser.id);

    // Use highlight variant for self-mentions
    const effectiveVariant = isSelf ? "highlight" : variant;

    // Display name or username fallback
    const displayName = user?.displayName ?? username ?? "Unknown User";

    const mentionContent = (
      <span
        ref={ref}
        className={cn(
          userMentionVariants({ variant: effectiveVariant, size }),
          className,
        )}
        onClick={user && onClick ? () => onClick(user) : undefined}
        role={onClick || onViewProfile ? "button" : undefined}
        tabIndex={onClick || onViewProfile ? 0 : undefined}
        onKeyDown={
          onClick || onViewProfile
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (onClick && user) onClick(user);
                  else if (onViewProfile && user) onViewProfile(user);
                }
              }
            : undefined
        }
        {...props}
      >
        @{displayName}
      </span>
    );

    // Wrap with profile card if we have user data and showProfileCard is enabled
    if (showProfileCard && user) {
      return (
        <UserProfileCardTrigger
          user={user}
          onMessage={onMessage ? () => onMessage(user) : undefined}
          onViewProfile={onViewProfile ? () => onViewProfile(user) : undefined}
          side="top"
        >
          {mentionContent}
        </UserProfileCardTrigger>
      );
    }

    return mentionContent;
  },
);
UserMention.displayName = "UserMention";

// ============================================================================
// EveryoneMention - Special @everyone mention
// ============================================================================

export interface EveryoneMentionProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, "onClick">,
    VariantProps<typeof userMentionVariants> {
  onClick?: () => void;
}

const EveryoneMention = React.forwardRef<HTMLSpanElement, EveryoneMentionProps>(
  ({ className, variant = "highlight", size, onClick, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(userMentionVariants({ variant, size }), className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      {...props}
    >
      @everyone
    </span>
  ),
);
EveryoneMention.displayName = "EveryoneMention";

// ============================================================================
// HereMention - Special @here mention
// ============================================================================

export interface HereMentionProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, "onClick">,
    VariantProps<typeof userMentionVariants> {
  onClick?: () => void;
}

const HereMention = React.forwardRef<HTMLSpanElement, HereMentionProps>(
  ({ className, variant = "highlight", size, onClick, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(userMentionVariants({ variant, size }), className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      {...props}
    >
      @here
    </span>
  ),
);
HereMention.displayName = "HereMention";

// ============================================================================
// ChannelMention - Channel mention display
// ============================================================================

export interface ChannelMentionProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  "onClick"
> {
  channelName: string;
  channelId?: string;
  onClick?: (channelId?: string) => void;
}

const channelMentionVariants = cva(
  "inline-flex items-center rounded px-1 py-0.5 font-medium cursor-pointer transition-colors bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const ChannelMention = React.forwardRef<
  HTMLSpanElement,
  ChannelMentionProps & VariantProps<typeof channelMentionVariants>
>(({ className, channelName, channelId, size, onClick, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(channelMentionVariants({ size }), className)}
    onClick={() => onClick?.(channelId)}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick(channelId);
            }
          }
        : undefined
    }
    {...props}
  >
    #{channelName}
  </span>
));
ChannelMention.displayName = "ChannelMention";

// ============================================================================
// Utility: Parse mentions in text
// ============================================================================

export interface ParsedMention {
  type: "user" | "everyone" | "here" | "channel";
  id?: string;
  name: string;
  start: number;
  end: number;
}

/**
 * Parse mention patterns from text
 * Patterns: @username, @everyone, @here, #channel
 */
export function parseMentions(text: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];

  // User mentions: @username or @<userId>
  const userMentionRegex = /@(\w+)/g;
  let match;

  while ((match = userMentionRegex.exec(text)) !== null) {
    const name = match[1];

    if (name === "everyone") {
      mentions.push({
        type: "everyone",
        name: "everyone",
        start: match.index,
        end: match.index + match[0].length,
      });
    } else if (name === "here") {
      mentions.push({
        type: "here",
        name: "here",
        start: match.index,
        end: match.index + match[0].length,
      });
    } else {
      mentions.push({
        type: "user",
        name,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Channel mentions: #channel
  const channelMentionRegex = /#(\w+)/g;
  while ((match = channelMentionRegex.exec(text)) !== null) {
    mentions.push({
      type: "channel",
      name: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Sort by position
  return mentions.sort((a, b) => a.start - b.start);
}

export {
  UserMention,
  EveryoneMention,
  HereMention,
  ChannelMention,
  userMentionVariants,
};
