/**
 * Primitives domain types — shared low-level UI primitives.
 *
 * @module primitives/types
 */

// ============================================================================
// Size / variant enums
// ============================================================================

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type Variant = 'default' | 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline' | 'link'
export type ColorScheme = 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'orange'

// ============================================================================
// Badge
// ============================================================================

export interface BadgeProps {
  label: string | number
  variant?: ColorScheme
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

// ============================================================================
// Tooltip
// ============================================================================

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delayMs?: number
  className?: string
}

// ============================================================================
// Loading states
// ============================================================================

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'
export type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card'

// ============================================================================
// Empty state
// ============================================================================

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: { label: string; onClick: () => void }
  className?: string
}

// ============================================================================
// Confirm dialog
// ============================================================================

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// ============================================================================
// Kbd
// ============================================================================

export interface KbdProps {
  keys: string[]
  className?: string
}
