/**
 * Purpose:    Inline success / error feedback banners for auth forms, ported from the
 *             legacy Alert (variant=destructive / green success) usage across the auth pages.
 *             Accessible: error uses role="alert", success uses role="status".
 * Inputs:     message string + optional leading icon node.
 * Outputs:    A coloured banner, or null when message is empty.
 * Constraints:Presentational only. RTL-safe (logical gap, no left/right offsets).
 * SOT:        F-NCHAT-VITE-AUTH-FEEDBACK-01
 */
import type { ReactNode } from 'react'

interface FeedbackProps {
  message?: string
  icon?: ReactNode
}

export function AuthError({ message, icon }: FeedbackProps) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
    >
      {icon}
      <span>{message}</span>
    </div>
  )
}

export function AuthSuccess({ message, icon }: FeedbackProps) {
  if (!message) return null
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300"
    >
      {icon}
      <span>{message}</span>
    </div>
  )
}
