"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { type UserProfile } from "@/stores/user-store";
import { UserAvatar } from "./user-avatar";
import { UserStatus } from "./user-status";
import { RoleBadge } from "./role-badge";
import { UserProfileCardTrigger } from "./user-profile-card";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// ============================================================================
// Variants
// ============================================================================

const memberListItemVariants = cva(
  "flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors cursor-pointer group",
  {
    variants: {
      variant: {
        default: "hover:bg-muted",
        selected: "bg-muted",
        active: "bg-primary/10 text-primary",
      },
      size: {
        sm: "px-1.5 py-1",
        md: "px-2 py-1.5",
        lg: "px-3 py-2",
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

export interface MemberListItemProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "onClick">,
    VariantProps<typeof memberListItemVariants> {
  user: UserProfile;
  showRole?: boolean;
  showStatus?: boolean;
  showProfileCard?: boolean;
  showContextMenu?: boolean;
  loading?: boolean;
  onClick?: (user: UserProfile) => void;
  onMessage?: (user: UserProfile) => void;
  onViewProfile?: (user: UserProfile) => void;
  onRemove?: (user: UserProfile) => void;
  onChangeRole?: (user: UserProfile) => void;
}

// ============================================================================
// Component
// ============================================================================

const MemberListItem = React.forwardRef<HTMLDivElement, MemberListItemProps>(
  (
    {
      className,
      user,
      variant,
      size,
      showRole = true,
      showStatus = true,
      showProfileCard = true,
      showContextMenu = false,
      loading = false,
      onClick,
      onMessage,
      onViewProfile,
      onRemove,
      onChangeRole,
      ...props
    },
    ref,
  ) => {
    // Loading state
    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(memberListItemVariants({ variant, size }), className)}
          {...props}
        >
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      );
    }

    const content = (
      <div
        ref={ref}
        className={cn(memberListItemVariants({ variant, size }), className)}
        onClick={() => onClick?.(user)}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick(user);
                }
              }
            : undefined
        }
        {...props}
      >
        {/* Avatar */}
        <UserAvatar
          user={user}
          size={size === "sm" ? "xs" : size === "lg" ? "md" : "sm"}
          presence={user.presence}
        />

        {/* User info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "truncate font-medium",
                size === "sm" ? "text-sm" : "text-sm",
              )}
            >
              {user.displayName}
            </span>
            {showRole && (
              <RoleBadge
                role={user.role}
                size="xs"
                variant="ghost"
                showIcon={false}
              />
            )}
          </div>

          {/* Status or username */}
          {showStatus && user.customStatus ? (
            <UserStatus
              status={user.customStatus}
              variant="compact"
              showClearTime={false}
              className="truncate"
            />
          ) : (
            <span className="block truncate text-xs text-muted-foreground">
              @{user.username}
            </span>
          )}
        </div>

        {/* Context menu */}
        {showContextMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewProfile && (
                <DropdownMenuItem onClick={() => onViewProfile(user)}>
                  View Profile
                </DropdownMenuItem>
              )}
              {onMessage && (
                <DropdownMenuItem onClick={() => onMessage(user)}>
                  Send Message
                </DropdownMenuItem>
              )}
              {(onChangeRole || onRemove) && <DropdownMenuSeparator />}
              {onChangeRole && (
                <DropdownMenuItem onClick={() => onChangeRole(user)}>
                  Change Role
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem
                  onClick={() => onRemove(user)}
                  className="text-destructive"
                >
                  Remove from Channel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );

    // Wrap with profile card trigger if enabled
    if (showProfileCard) {
      return (
        <UserProfileCardTrigger
          user={user}
          onMessage={onMessage ? () => onMessage(user) : undefined}
          onViewProfile={onViewProfile ? () => onViewProfile(user) : undefined}
        >
          {content}
        </UserProfileCardTrigger>
      );
    }

    return content;
  },
);
MemberListItem.displayName = "MemberListItem";

// ============================================================================
// MemberListSection - Group header for member list
// ============================================================================

export interface MemberListSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  count?: number;
  collapsed?: boolean;
  onToggle?: () => void;
}

const MemberListSection = React.forwardRef<
  HTMLDivElement,
  MemberListSectionProps
>(({ className, title, count, collapsed, onToggle, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
      onToggle && "cursor-pointer transition-colors hover:text-foreground",
      className,
    )}
    {...(onToggle
      ? {
          onClick: onToggle,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          },
          role: "button" as const,
          tabIndex: 0,
        }
      : {})}
    {...props}
  >
    {onToggle && (
      <span className={cn("transition-transform", collapsed && "-rotate-90")}>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
    )}
    <span>{title}</span>
    {count !== undefined && (
      <span className="text-muted-foreground/60">({count})</span>
    )}
  </div>
));
MemberListSection.displayName = "MemberListSection";

export { MemberListItem, MemberListSection, memberListItemVariants };
