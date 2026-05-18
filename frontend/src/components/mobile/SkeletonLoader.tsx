"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface SkeletonProps {
  className?: string;
  animate?: boolean;
  variant?: "default" | "pulse" | "wave";
}

export interface SkeletonLoaderProps {
  type:
    | "message"
    | "channel"
    | "user"
    | "image"
    | "video"
    | "list"
    | "card"
    | "text"
    | "avatar"
    | "custom";
  count?: number;
  className?: string;
  animate?: boolean;
}

// ============================================================================
// Base Skeleton Component
// ============================================================================

/**
 * Base skeleton loading component with animation variants
 */
export const Skeleton = memo(function Skeleton({
  className,
  animate = true,
  variant = "pulse",
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        animate && variant === "pulse" && "animate-pulse",
        animate &&
          variant === "wave" &&
          "via-muted-foreground/10 animate-shimmer bg-gradient-to-r from-muted to-muted bg-[length:200%_100%]",
        className,
      )}
      aria-hidden="true"
    />
  );
});

// ============================================================================
// Specialized Skeleton Loaders
// ============================================================================

/**
 * Message skeleton loader
 */
export const MessageSkeleton = memo(function MessageSkeleton({
  count = 1,
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type">) {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex gap-3">
          {/* Avatar */}
          <Skeleton
            className="h-9 w-9 shrink-0 rounded-full"
            animate={animate}
          />

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" animate={animate} />
              <Skeleton className="h-3 w-16" animate={animate} />
            </div>

            {/* Message content */}
            <Skeleton
              className={cn(
                "h-4",
                index % 3 === 0
                  ? "w-3/4"
                  : index % 3 === 1
                    ? "w-full"
                    : "w-1/2",
              )}
              animate={animate}
            />

            {/* Additional line for some messages */}
            {index % 2 === 0 && (
              <Skeleton className="h-4 w-2/3" animate={animate} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Channel skeleton loader
 */
export const ChannelSkeleton = memo(function ChannelSkeleton({
  count = 5,
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type">) {
  return (
    <div className={cn("space-y-1 p-2", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg p-3">
          {/* Icon/Avatar */}
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" animate={animate} />

          {/* Content */}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" animate={animate} />
            <Skeleton className="h-3 w-24" animate={animate} />
          </div>

          {/* Badge */}
          {index % 3 === 0 && (
            <Skeleton className="h-5 w-5 rounded-full" animate={animate} />
          )}
        </div>
      ))}
    </div>
  );
});

/**
 * User list skeleton loader
 */
export const UserSkeleton = memo(function UserSkeleton({
  count = 5,
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type">) {
  return (
    <div className={cn("space-y-2 p-2", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-2">
          {/* Avatar */}
          <Skeleton
            className="h-10 w-10 shrink-0 rounded-full"
            animate={animate}
          />

          {/* Content */}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" animate={animate} />
            <Skeleton className="h-3 w-20" animate={animate} />
          </div>

          {/* Status indicator */}
          <Skeleton className="h-2 w-2 rounded-full" animate={animate} />
        </div>
      ))}
    </div>
  );
});

/**
 * Image skeleton loader
 */
export const ImageSkeleton = memo(function ImageSkeleton({
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type" | "count">) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Skeleton className="aspect-video w-full" animate={animate} />

      {/* Loading indicator overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-background/80 rounded-full p-3 backdrop-blur-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    </div>
  );
});

/**
 * Video skeleton loader
 */
export const VideoSkeleton = memo(function VideoSkeleton({
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type" | "count">) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Skeleton className="aspect-video w-full" animate={animate} />

      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Skeleton className="h-16 w-16 rounded-full" animate={animate} />
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 p-2">
        <Skeleton className="h-8 w-8 rounded-md" animate={animate} />
        <Skeleton className="h-1 flex-1 rounded-full" animate={animate} />
        <Skeleton className="h-8 w-8 rounded-md" animate={animate} />
      </div>
    </div>
  );
});

/**
 * List item skeleton loader
 */
export const ListSkeleton = memo(function ListSkeleton({
  count = 5,
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type">) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3">
          <Skeleton
            className="h-12 w-12 shrink-0 rounded-md"
            animate={animate}
          />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" animate={animate} />
            <Skeleton className="h-3 w-1/2" animate={animate} />
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Card skeleton loader
 */
export const CardSkeleton = memo(function CardSkeleton({
  count = 1,
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type">) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-lg border bg-card p-4"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" animate={animate} />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" animate={animate} />
                <Skeleton className="h-3 w-24" animate={animate} />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-md" animate={animate} />
          </div>

          {/* Image */}
          <Skeleton
            className="mb-4 aspect-video w-full rounded-md"
            animate={animate}
          />

          {/* Content */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" animate={animate} />
            <Skeleton className="h-4 w-5/6" animate={animate} />
            <Skeleton className="h-4 w-4/6" animate={animate} />
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-md" animate={animate} />
            <Skeleton className="h-9 w-20 rounded-md" animate={animate} />
            <Skeleton className="h-9 w-20 rounded-md" animate={animate} />
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Text skeleton loader
 */
export const TextSkeleton = memo(function TextSkeleton({
  count = 3,
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type">) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", index === count - 1 ? "w-3/4" : "w-full")}
          animate={animate}
        />
      ))}
    </div>
  );
});

/**
 * Avatar skeleton loader
 */
export const AvatarSkeleton = memo(function AvatarSkeleton({
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type" | "count">) {
  return (
    <Skeleton
      className={cn("h-10 w-10 rounded-full", className)}
      animate={animate}
    />
  );
});

// ============================================================================
// Universal Skeleton Loader
// ============================================================================

/**
 * Universal skeleton loader component
 * Automatically renders the appropriate skeleton based on type
 *
 * @example
 * ```tsx
 * <SkeletonLoader type="message" count={5} />
 * <SkeletonLoader type="channel" count={3} />
 * <SkeletonLoader type="image" />
 * ```
 */
export const SkeletonLoader = memo(function SkeletonLoader({
  type,
  count = 1,
  className,
  animate = true,
}: SkeletonLoaderProps) {
  const props = { count, className, animate };

  switch (type) {
    case "message":
      return <MessageSkeleton {...props} />;
    case "channel":
      return <ChannelSkeleton {...props} />;
    case "user":
      return <UserSkeleton {...props} />;
    case "image":
      return <ImageSkeleton className={className} animate={animate} />;
    case "video":
      return <VideoSkeleton className={className} animate={animate} />;
    case "list":
      return <ListSkeleton {...props} />;
    case "card":
      return <CardSkeleton {...props} />;
    case "text":
      return <TextSkeleton {...props} />;
    case "avatar":
      return <AvatarSkeleton className={className} animate={animate} />;
    default:
      return <Skeleton className={className} animate={animate} />;
  }
});

// ============================================================================
// Inline Skeletons
// ============================================================================

/**
 * Inline skeleton for button
 */
export const ButtonSkeleton = memo(function ButtonSkeleton({
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type" | "count">) {
  return (
    <Skeleton
      className={cn("h-10 w-24 rounded-md", className)}
      animate={animate}
    />
  );
});

/**
 * Inline skeleton for input
 */
export const InputSkeleton = memo(function InputSkeleton({
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type" | "count">) {
  return (
    <Skeleton
      className={cn("h-10 w-full rounded-md", className)}
      animate={animate}
    />
  );
});

/**
 * Inline skeleton for badge
 */
export const BadgeSkeleton = memo(function BadgeSkeleton({
  className,
  animate = true,
}: Omit<SkeletonLoaderProps, "type" | "count">) {
  return (
    <Skeleton
      className={cn("h-5 w-16 rounded-full", className)}
      animate={animate}
    />
  );
});

export default SkeletonLoader;
