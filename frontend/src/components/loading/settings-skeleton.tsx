"use client";

import { cn } from "@/lib/utils";
import { Skeleton, CircleSkeleton, LineSkeleton } from "./skeleton";

interface SettingsSkeletonProps {
  /** Show navigation sidebar */
  showNav?: boolean;
  /** Number of sections */
  sectionCount?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Full settings page skeleton
 * Includes navigation and content
 */
export function SettingsSkeleton({
  showNav = true,
  sectionCount = 3,
  className,
}: SettingsSkeletonProps) {
  return (
    <div className={cn("flex h-full", className)}>
      {/* Navigation */}
      {showNav && <SettingsNavSkeleton />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl p-6">
          {/* Page header */}
          <div className="mb-6">
            <LineSkeleton width={150} height={24} className="mb-2" />
            <LineSkeleton width={280} height={14} />
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {Array.from({ length: sectionCount }).map((_, i) => (
              <SettingsSectionSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Settings navigation skeleton
 */
export function SettingsNavSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-56 border-r bg-zinc-50 p-4 dark:bg-zinc-900/50",
        className,
      )}
    >
      {/* Header */}
      <LineSkeleton width={80} height={18} className="mb-4" />

      {/* Nav groups */}
      <div className="space-y-6">
        {/* Account group */}
        <div className="space-y-1">
          <LineSkeleton width={60} height={10} className="mb-2 px-2" />
          <SettingsNavItemSkeleton active />
          <SettingsNavItemSkeleton />
          <SettingsNavItemSkeleton />
        </div>

        {/* Preferences group */}
        <div className="space-y-1">
          <LineSkeleton width={80} height={10} className="mb-2 px-2" />
          <SettingsNavItemSkeleton />
          <SettingsNavItemSkeleton />
          <SettingsNavItemSkeleton />
          <SettingsNavItemSkeleton />
        </div>

        {/* Advanced group */}
        <div className="space-y-1">
          <LineSkeleton width={70} height={10} className="mb-2 px-2" />
          <SettingsNavItemSkeleton />
          <SettingsNavItemSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * Settings nav item skeleton
 */
function SettingsNavItemSkeleton({ active = false }: { active?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2",
        active && "bg-muted",
      )}
    >
      <Skeleton className="h-4 w-4 rounded" />
      <LineSkeleton width={80} height={14} />
    </div>
  );
}

/**
 * Settings section skeleton
 */
export function SettingsSectionSkeleton({
  rowCount = 4,
  className,
}: {
  rowCount?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Section header */}
      <div className="border-b pb-2">
        <LineSkeleton width={120} height={18} className="mb-1" />
        <LineSkeleton width={200} height={12} />
      </div>

      {/* Settings rows */}
      <div className="space-y-4">
        {Array.from({ length: rowCount }).map((_, i) => (
          <SettingsRowSkeleton
            key={i}
            type={i % 3 === 0 ? "toggle" : "input"}
          />
        ))}
      </div>
    </div>
  );
}

interface SettingsRowSkeletonProps {
  /** Row type */
  type?: "toggle" | "input" | "select" | "button";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Settings row skeleton
 */
export function SettingsRowSkeleton({
  type = "toggle",
  className,
}: SettingsRowSkeletonProps) {
  return (
    <div className={cn("flex items-center justify-between py-2", className)}>
      {/* Label and description */}
      <div className="mr-4 flex-1">
        <LineSkeleton width={120} height={14} className="mb-1" />
        <LineSkeleton width={200} height={12} />
      </div>

      {/* Control */}
      {type === "toggle" && (
        <Skeleton className="h-6 w-10 shrink-0 rounded-full" />
      )}
      {type === "input" && (
        <Skeleton className="h-9 w-48 shrink-0 rounded-md" />
      )}
      {type === "select" && (
        <Skeleton className="h-9 w-40 shrink-0 rounded-md" />
      )}
      {type === "button" && (
        <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
      )}
    </div>
  );
}

/**
 * Profile settings skeleton
 */
export function ProfileSettingsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Avatar section */}
      <div className="flex items-start gap-4 border-b pb-6">
        <CircleSkeleton size={80} />
        <div className="space-y-2">
          <LineSkeleton width={100} height={16} />
          <LineSkeleton width={180} height={12} />
          <Skeleton className="mt-2 h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <SettingsInputSkeleton label="Display Name" />
        <SettingsInputSkeleton label="Username" />
        <SettingsInputSkeleton label="Email" />
        <SettingsTextareaSkeleton label="Bio" />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Settings input field skeleton
 */
function SettingsInputSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <LineSkeleton width={80} height={14} />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

/**
 * Settings textarea skeleton
 */
function SettingsTextareaSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <LineSkeleton width={60} height={14} />
      <Skeleton className="h-24 w-full rounded-md" />
    </div>
  );
}

/**
 * Notification settings skeleton
 */
export function NotificationSettingsSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Email notifications */}
      <SettingsSectionSkeleton rowCount={4} />

      {/* Push notifications */}
      <SettingsSectionSkeleton rowCount={3} />

      {/* Sound settings */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <LineSkeleton width={80} height={18} />
        </div>
        <SettingsRowSkeleton type="select" />
        <SettingsRowSkeleton type="toggle" />
      </div>
    </div>
  );
}

/**
 * Appearance settings skeleton
 */
export function AppearanceSettingsSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Theme */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <LineSkeleton width={60} height={18} />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-20 w-28 rounded-lg" />
          <Skeleton className="h-20 w-28 rounded-lg" />
          <Skeleton className="h-20 w-28 rounded-lg" />
        </div>
      </div>

      {/* Accent color */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <LineSkeleton width={100} height={18} />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </div>
      </div>

      {/* Display settings */}
      <SettingsSectionSkeleton rowCount={3} />
    </div>
  );
}

/**
 * Security settings skeleton
 */
export function SecuritySettingsSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Password section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <LineSkeleton width={80} height={18} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <LineSkeleton width={100} height={14} className="mb-1" />
            <LineSkeleton width={160} height={12} />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* Two-factor */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <LineSkeleton width={140} height={18} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <LineSkeleton width={120} height={14} className="mb-1" />
            <LineSkeleton width={200} height={12} />
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
      </div>

      {/* Sessions */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <LineSkeleton width={100} height={18} />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div>
                <LineSkeleton width={100} height={14} className="mb-1" />
                <LineSkeleton width={140} height={12} />
              </div>
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
