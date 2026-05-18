"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPresenceDot } from "./user-presence-dot";
import {
  type PresenceStatus,
  type UserProfile,
  getInitials,
} from "@/stores/user-store";

// ============================================================================
// Variants
// ============================================================================

const userAvatarVariants = cva("relative inline-block", {
  variants: {
    size: {
      xs: "h-6 w-6",
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-12 w-12",
      xl: "h-16 w-16",
      "2xl": "h-20 w-20",
      "3xl": "h-24 w-24",
    },
    shape: {
      circle: "rounded-full",
      rounded: "rounded-lg",
      square: "rounded-none",
    },
  },
  defaultVariants: {
    size: "md",
    shape: "circle",
  },
});

const avatarFallbackVariants = cva(
  "flex items-center justify-center bg-muted text-muted-foreground font-medium",
  {
    variants: {
      size: {
        xs: "text-[10px]",
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
        xl: "text-lg",
        "2xl": "text-xl",
        "3xl": "text-2xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

// ============================================================================
// Types
// ============================================================================

export interface UserAvatarProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "onClick">,
    VariantProps<typeof userAvatarVariants> {
  user?: Pick<UserProfile, "avatarUrl" | "displayName">;
  src?: string;
  name?: string;
  presence?: PresenceStatus;
  showPresence?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  interactive?: boolean;
  fallbackColor?: string;
}

// ============================================================================
// Helper: Get presence dot size based on avatar size
// ============================================================================

const getPresenceDotSize = (
  avatarSize: UserAvatarProps["size"],
): "xs" | "sm" | "md" | "lg" | "xl" => {
  switch (avatarSize) {
    case "xs":
      return "xs";
    case "sm":
      return "sm";
    case "md":
      return "sm";
    case "lg":
      return "md";
    case "xl":
      return "lg";
    case "2xl":
    case "3xl":
      return "xl";
    default:
      return "sm";
  }
};

// ============================================================================
// Component
// ============================================================================

const UserAvatar = React.forwardRef<HTMLDivElement, UserAvatarProps>(
  (
    {
      className,
      user,
      src,
      name,
      size,
      shape,
      presence,
      showPresence = true,
      loading = false,
      onClick,
      interactive = false,
      fallbackColor,
      ...props
    },
    ref,
  ) => {
    const avatarSrc = src ?? user?.avatarUrl;
    const displayName = name ?? user?.displayName ?? "Unknown";
    const initials = getInitials(displayName);

    // Loading skeleton
    if (loading) {
      return (
        <Skeleton
          className={cn(userAvatarVariants({ size, shape }), className)}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          userAvatarVariants({ size, shape }),
          interactive && "cursor-pointer transition-opacity hover:opacity-80",
          className,
        )}
        onClick={onClick}
        role={onClick || interactive ? "button" : undefined}
        tabIndex={onClick || interactive ? 0 : undefined}
        onKeyDown={
          onClick || interactive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              }
            : undefined
        }
        {...props}
      >
        <Avatar
          className={cn(
            "h-full w-full",
            shape === "circle" && "rounded-full",
            shape === "rounded" && "rounded-lg",
            shape === "square" && "rounded-none",
          )}
        >
          {avatarSrc && (
            <AvatarImage
              src={avatarSrc}
              alt={`${displayName}'s avatar`}
              className="object-cover"
            />
          )}
          <AvatarFallback
            className={cn(
              avatarFallbackVariants({ size }),
              shape === "circle" && "rounded-full",
              shape === "rounded" && "rounded-lg",
              shape === "square" && "rounded-none",
            )}
            style={
              fallbackColor ? { backgroundColor: fallbackColor } : undefined
            }
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Presence indicator */}
        {showPresence && presence && (
          <UserPresenceDot
            status={presence}
            size={getPresenceDotSize(size)}
            position="bottom-right"
          />
        )}
      </div>
    );
  },
);
UserAvatar.displayName = "UserAvatar";

// ============================================================================
// UserAvatarGroup - Display multiple avatars stacked
// ============================================================================

export interface UserAvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  users: Array<Pick<UserProfile, "id" | "avatarUrl" | "displayName">>;
  max?: number;
  size?: UserAvatarProps["size"];
  shape?: UserAvatarProps["shape"];
  onOverflowClick?: () => void;
}

const UserAvatarGroup = React.forwardRef<HTMLDivElement, UserAvatarGroupProps>(
  (
    {
      className,
      users,
      max = 4,
      size = "sm",
      shape = "circle",
      onOverflowClick,
      ...props
    },
    ref,
  ) => {
    const visibleUsers = users.slice(0, max);
    const overflowCount = users.length - max;

    const overlapClass =
      size === "xs"
        ? "-ml-1.5"
        : size === "sm"
          ? "-ml-2"
          : size === "md"
            ? "-ml-2.5"
            : size === "lg"
              ? "-ml-3"
              : "-ml-4";

    return (
      <div ref={ref} className={cn("flex items-center", className)} {...props}>
        {visibleUsers.map((user, index) => (
          <UserAvatar
            key={user.id}
            user={user}
            size={size}
            shape={shape}
            showPresence={false}
            className={cn("ring-2 ring-background", index > 0 && overlapClass)}
          />
        ))}
        {overflowCount > 0 && (
          <div
            className={cn(
              "flex items-center justify-center bg-muted font-medium text-muted-foreground ring-2 ring-background",
              userAvatarVariants({ size, shape }),
              overlapClass,
              onOverflowClick &&
                "hover:bg-muted/80 cursor-pointer transition-colors",
            )}
            {...(onOverflowClick
              ? {
                  onClick: onOverflowClick,
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOverflowClick();
                    }
                  },
                  role: "button" as const,
                  tabIndex: 0,
                }
              : {})}
          >
            <span className={avatarFallbackVariants({ size })}>
              +{overflowCount}
            </span>
          </div>
        )}
      </div>
    );
  },
);
UserAvatarGroup.displayName = "UserAvatarGroup";

export { UserAvatar, UserAvatarGroup, userAvatarVariants };
