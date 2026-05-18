"use client";

import { cn } from "@/lib/utils";

interface SkeletonBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to animate the skeleton */
  animate?: boolean;
}

/**
 * Base skeleton component with pulse animation
 */
export function Skeleton({
  className,
  animate = true,
  ...props
}: SkeletonBaseProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        animate && "animate-pulse",
        className,
      )}
      {...props}
    />
  );
}

interface RectangleSkeletonProps extends SkeletonBaseProps {
  /** Width of the rectangle */
  width?: string | number;
  /** Height of the rectangle */
  height?: string | number;
  /** Border radius variant */
  rounded?: "none" | "sm" | "md" | "lg" | "full";
}

/**
 * Rectangle skeleton for blocks and cards
 */
export function RectangleSkeleton({
  width,
  height,
  rounded = "md",
  className,
  style,
  ...props
}: RectangleSkeletonProps) {
  const roundedClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  return (
    <Skeleton
      className={cn(roundedClasses[rounded], className)}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
}

interface CircleSkeletonProps extends SkeletonBaseProps {
  /** Size of the circle */
  size?: string | number;
}

/**
 * Circle skeleton for avatars and icons
 */
export function CircleSkeleton({
  size = 40,
  className,
  style,
  ...props
}: CircleSkeletonProps) {
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <Skeleton
      className={cn("shrink-0 rounded-full", className)}
      style={{
        width: dimension,
        height: dimension,
        ...style,
      }}
      {...props}
    />
  );
}

interface LineSkeletonProps extends SkeletonBaseProps {
  /** Width of the line (can be percentage) */
  width?: string | number;
  /** Height of the line (defaults to 16px for text-like appearance) */
  height?: number;
}

/**
 * Line skeleton for text content
 */
export function LineSkeleton({
  width = "100%",
  height = 16,
  className,
  style,
  ...props
}: LineSkeletonProps) {
  return (
    <Skeleton
      className={cn("rounded", className)}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: `${height}px`,
        ...style,
      }}
      {...props}
    />
  );
}

interface TextBlockSkeletonProps extends SkeletonBaseProps {
  /** Number of lines to render */
  lines?: number;
  /** Width of the last line (percentage or fixed) */
  lastLineWidth?: string | number;
  /** Gap between lines */
  gap?: number;
  /** Height of each line */
  lineHeight?: number;
}

/**
 * Multiple line skeleton for paragraphs
 */
export function TextBlockSkeleton({
  lines = 3,
  lastLineWidth = "60%",
  gap = 8,
  lineHeight = 16,
  className,
  animate = true,
  ...props
}: TextBlockSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col", className)}
      style={{ gap: `${gap}px` }}
      {...props}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <LineSkeleton
          key={i}
          width={i === lines - 1 ? lastLineWidth : "100%"}
          height={lineHeight}
          animate={animate}
        />
      ))}
    </div>
  );
}

interface SkeletonGroupProps extends Omit<SkeletonBaseProps, "children"> {
  /** Number of items to render */
  count?: number;
  /** Gap between items */
  gap?: number;
  /** Direction of the group */
  direction?: "horizontal" | "vertical";
  children: (index: number) => React.ReactNode;
}

/**
 * Helper component for rendering multiple skeleton items
 */
export function SkeletonGroup({
  count = 3,
  gap = 16,
  direction = "vertical",
  children,
  className,
  ...props
}: SkeletonGroupProps) {
  return (
    <div
      className={cn(
        "flex",
        direction === "vertical" ? "flex-col" : "flex-row",
        className,
      )}
      style={{ gap: `${gap}px` }}
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{children(i)}</div>
      ))}
    </div>
  );
}

/**
 * Shimmer animation variant for skeleton
 * Uses a gradient animation instead of pulse
 */
export function ShimmerSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0",
        "before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
