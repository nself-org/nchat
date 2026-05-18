/**
 * Loading skeleton components for the channel/sidebar layout.
 *
 * @module layout/channel-skeleton
 */

import * as React from 'react'
import { cn } from '../lib/utils'

// ============================================================================
// Skeleton primitives
// ============================================================================

function SkeletonLine({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-muted/60',
        className
      )}
      style={style}
    />
  )
}

// ============================================================================
// Channel item skeleton
// ============================================================================

export interface ChannelItemSkeletonProps {
  /** Number of skeleton items to render */
  count?: number
  /** Left indent for nested items */
  depth?: number
  className?: string
}

export function ChannelItemSkeleton({
  count = 5,
  depth = 0,
  className,
}: ChannelItemSkeletonProps) {
  const paddingLeft = 8 + depth * 12

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex h-8 items-center gap-2 rounded-md px-2"
          style={{ paddingLeft }}
        >
          <SkeletonLine className="h-4 w-4 shrink-0 rounded" />
          <SkeletonLine
            className="h-3 flex-1"
            style={{
              // Vary widths for a more natural look
              maxWidth: `${60 + ((i * 37) % 30)}%`,
            } as React.CSSProperties}
          />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Category skeleton
// ============================================================================

export interface ChannelCategorySkeletonProps {
  /** Number of categories */
  categoryCount?: number
  /** Items per category */
  itemsPerCategory?: number
  className?: string
}

export function ChannelCategorySkeleton({
  categoryCount = 3,
  itemsPerCategory = 4,
  className,
}: ChannelCategorySkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-4 p-2', className)}>
      {Array.from({ length: categoryCount }).map((_, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {/* Category header */}
          <div className="flex h-7 items-center gap-2 px-2">
            <SkeletonLine className="h-3 w-3 rounded" />
            <SkeletonLine className="h-2.5 w-20 rounded" />
          </div>
          {/* Channel items */}
          <ChannelItemSkeleton count={itemsPerCategory} depth={0} />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Sidebar skeleton (full)
// ============================================================================

export interface SidebarSkeletonProps {
  className?: string
}

export function SidebarSkeleton({ className }: SidebarSkeletonProps) {
  return (
    <div
      className={cn(
        'flex h-full w-60 flex-col border-r bg-muted/20',
        className
      )}
    >
      {/* Workspace header */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SkeletonLine className="h-8 w-8 rounded-full shrink-0" />
        <SkeletonLine className="h-4 flex-1 rounded" />
      </div>

      {/* Category + channels */}
      <div className="flex-1 overflow-hidden px-2 py-3">
        <ChannelCategorySkeleton categoryCount={3} itemsPerCategory={3} />
      </div>

      {/* User footer */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-t px-3">
        <SkeletonLine className="h-9 w-9 rounded-full shrink-0" />
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <SkeletonLine className="h-3 w-24 rounded" />
          <SkeletonLine className="h-2.5 w-16 rounded" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Channel header skeleton
// ============================================================================

export function ChannelHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-14 shrink-0 items-center gap-3 border-b px-4',
        className
      )}
    >
      <SkeletonLine className="h-4 w-4 rounded shrink-0" />
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <SkeletonLine className="h-3.5 w-32 rounded" />
        <SkeletonLine className="h-2.5 w-48 rounded" />
      </div>
      <div className="flex gap-1 shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLine key={i} className="h-8 w-8 rounded-md" />
        ))}
      </div>
    </div>
  )
}
