"use client";

import { cn } from "@/lib/utils";
import { Skeleton, CircleSkeleton, LineSkeleton } from "./skeleton";

interface UserSkeletonProps {
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show status indicator */
  showStatus?: boolean;
  /** Show role badge */
  showRole?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeConfig = {
  sm: { avatar: 24, name: 12, role: 10 },
  md: { avatar: 32, name: 14, role: 12 },
  lg: { avatar: 40, name: 16, role: 14 },
};

/**
 * Loading skeleton for user display
 * Matches user avatar and name layout
 */
export function UserSkeleton({
  size = "md",
  showStatus = true,
  showRole = false,
  className,
}: UserSkeletonProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Avatar with optional status */}
      <div className="relative shrink-0">
        <CircleSkeleton size={config.avatar} />
        {showStatus && (
          <Skeleton
            className={cn(
              "absolute rounded-full border-2 border-background",
              size === "sm"
                ? "-bottom-0.5 -right-0.5 h-2 w-2"
                : "-bottom-0.5 -right-0.5 h-3 w-3",
            )}
          />
        )}
      </div>

      {/* Name and role */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <LineSkeleton width={80} height={config.name} />
        {showRole && <LineSkeleton width={50} height={config.role} />}
      </div>
    </div>
  );
}

interface UserListSkeletonProps {
  /** Number of users to render */
  count?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show status indicators */
  showStatus?: boolean;
  /** Show role badges */
  showRole?: boolean;
  /** Gap between items */
  gap?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading skeleton for user list
 */
export function UserListSkeleton({
  count = 5,
  size = "md",
  showStatus = true,
  showRole = false,
  gap = 12,
  className,
}: UserListSkeletonProps) {
  return (
    <div className={cn("flex flex-col", className)} style={{ gap: `${gap}px` }}>
      {Array.from({ length: count }).map((_, i) => (
        <UserSkeleton
          key={i}
          size={size}
          showStatus={showStatus}
          showRole={showRole}
        />
      ))}
    </div>
  );
}

/**
 * User row skeleton with additional info (for member lists)
 */
export function UserRowSkeleton({
  showEmail = false,
  showActions = false,
  className,
}: {
  showEmail?: boolean;
  showActions?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-border px-4 py-3 last:border-0",
        className,
      )}
    >
      {/* Avatar */}
      <CircleSkeleton size={40} />

      {/* User info */}
      <div className="min-w-0 flex-1">
        <LineSkeleton width={120} height={14} className="mb-1" />
        {showEmail && <LineSkeleton width={160} height={12} />}
      </div>

      {/* Role badge */}
      <Skeleton className="h-5 w-16 rounded-full" />

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      )}
    </div>
  );
}

/**
 * Member list skeleton with section header
 */
export function MemberListSkeleton({
  count = 8,
  showHeader = true,
  className,
}: {
  count?: number;
  showHeader?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Section header */}
      {showHeader && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <LineSkeleton width={100} height={14} />
          <LineSkeleton width={30} height={12} />
        </div>
      )}

      {/* Member rows */}
      {Array.from({ length: count }).map((_, i) => (
        <UserRowSkeleton key={i} showEmail={i % 2 === 0} />
      ))}
    </div>
  );
}

/**
 * User mention skeleton (inline)
 */
export function UserMentionSkeleton({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <CircleSkeleton size={16} />
      <LineSkeleton width={60} height={12} />
    </span>
  );
}

/**
 * User presence list skeleton (for online/offline sections)
 */
export function UserPresenceListSkeleton({
  onlineCount = 3,
  offlineCount = 5,
  className,
}: {
  onlineCount?: number;
  offlineCount?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Online section */}
      <div>
        <div className="mb-2 flex items-center gap-2 px-2 py-1">
          <Skeleton className="h-2 w-2 rounded-full bg-green-500/30" />
          <LineSkeleton width={70} height={10} />
        </div>
        <UserListSkeleton count={onlineCount} size="sm" />
      </div>

      {/* Offline section */}
      <div>
        <div className="mb-2 flex items-center gap-2 px-2 py-1">
          <Skeleton className="h-2 w-2 rounded-full" />
          <LineSkeleton width={70} height={10} />
        </div>
        <UserListSkeleton count={offlineCount} size="sm" showStatus={false} />
      </div>
    </div>
  );
}
