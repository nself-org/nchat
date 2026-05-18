"use client";

import { cn } from "@/lib/utils";
import {
  Skeleton,
  CircleSkeleton,
  LineSkeleton,
  TextBlockSkeleton,
} from "./skeleton";

interface ProfileSkeletonProps {
  /** Show cover image */
  showCover?: boolean;
  /** Show bio section */
  showBio?: boolean;
  /** Show stats */
  showStats?: boolean;
  /** Show action buttons */
  showActions?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading skeleton for user profile
 * Matches profile card/page layout
 */
export function ProfileSkeleton({
  showCover = true,
  showBio = true,
  showStats = true,
  showActions = true,
  className,
}: ProfileSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Cover image */}
      {showCover && <Skeleton className="h-32 w-full rounded-t-lg" />}

      {/* Profile content */}
      <div className={cn("px-4 pb-4", showCover && "-mt-12")}>
        {/* Avatar */}
        <div className="relative inline-block">
          <CircleSkeleton size={96} className="border-4 border-background" />
          {/* Status badge */}
          <Skeleton className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-background" />
        </div>

        {/* Name and username */}
        <div className="mt-3 space-y-1">
          <LineSkeleton width={160} height={24} />
          <LineSkeleton width={100} height={14} />
        </div>

        {/* Role badge */}
        <Skeleton className="mt-2 h-5 w-20 rounded-full" />

        {/* Bio */}
        {showBio && (
          <div className="mt-4">
            <TextBlockSkeleton lines={2} lineHeight={14} />
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div className="mt-4 flex gap-6">
            <ProfileStatSkeleton />
            <ProfileStatSkeleton />
            <ProfileStatSkeleton />
          </div>
        )}

        {/* Action buttons */}
        {showActions && (
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Profile stat skeleton
 */
function ProfileStatSkeleton() {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <LineSkeleton width={30} height={18} />
      <LineSkeleton width={50} height={12} />
    </div>
  );
}

/**
 * Compact profile card skeleton
 * For hover cards and small displays
 */
export function CompactProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-3 p-4", className)}>
      {/* Avatar */}
      <CircleSkeleton size={48} />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <LineSkeleton width={100} height={16} className="mb-1" />
        <LineSkeleton width={80} height={12} className="mb-2" />
        <LineSkeleton width="90%" height={12} />
      </div>
    </div>
  );
}

/**
 * Profile header skeleton for profile page
 */
export function ProfileHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* Banner */}
      <Skeleton className="h-48 w-full" />

      {/* Profile info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent p-6">
        <div className="flex items-end gap-4">
          <CircleSkeleton size={120} className="border-4 border-background" />
          <div className="flex-1 pb-2">
            <LineSkeleton width={200} height={28} className="mb-2" />
            <LineSkeleton width={120} height={16} />
          </div>
          <div className="flex gap-2 pb-2">
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Profile settings form skeleton
 */
export function ProfileFormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Avatar upload */}
      <div className="flex items-center gap-4">
        <CircleSkeleton size={80} />
        <div className="space-y-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <LineSkeleton width={150} height={12} />
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <ProfileFormFieldSkeleton label="Display Name" />
        <ProfileFormFieldSkeleton label="Username" />
        <ProfileFormFieldSkeleton label="Email" />
        <ProfileFormFieldSkeleton label="Bio" isTextarea />
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Profile form field skeleton
 */
function ProfileFormFieldSkeleton({
  label,
  isTextarea = false,
}: {
  label: string;
  isTextarea?: boolean;
}) {
  return (
    <div className="space-y-2">
      <LineSkeleton width={80} height={14} />
      <Skeleton
        className={cn("w-full rounded-md", isTextarea ? "h-24" : "h-10")}
      />
    </div>
  );
}

/**
 * Profile tab content skeleton
 */
export function ProfileTabsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Tab navigation */}
      <div className="flex gap-1 border-b pb-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>

      {/* Tab content */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1">
              <LineSkeleton width="60%" height={14} className="mb-2" />
              <LineSkeleton width="80%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
