/**
 * Purpose:    Centered single-card layout shared by every public auth screen
 *             (sign in/up, password reset, magic link, verification, 2FA). Replaces the
 *             legacy per-page "min-h-screen flex center + Card" boilerplate with one
 *             accessible, RTL-aware wrapper. Presentational only.
 * Inputs:     icon (optional lucide node), title, description, children (form/body),
 *             footer (optional links/actions).
 * Outputs:    A full-height centered card.
 * Constraints:No data fetching. WCAG: heading is an <h1>; description is associated copy.
 * SOT:        F-NCHAT-VITE-AUTH-SHELL-01
 */
import type { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
}

export function AuthShell({ icon, title, description, children, footer }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 text-center">
          {icon && <div className="mb-4 flex justify-center">{icon}</div>}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>

        {children}

        {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
      </div>
    </div>
  )
}
