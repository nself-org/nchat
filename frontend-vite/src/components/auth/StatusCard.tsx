/**
 * Purpose:    Loading / success / error status card used by token-verification screens
 *             (verify-email, verify-magic-link, OAuth callback-complete). Ports the legacy
 *             three-state Card header (spinner / check / alert icon + title + description)
 *             and optional action buttons.
 * Inputs:     status ('loading'|'success'|'error'), title, description, actions (nodes).
 * Outputs:    A centered status card.
 * Constraints:Presentational only. aria-live region announces the title to screen readers.
 * SOT:        F-NCHAT-VITE-AUTH-STATUS-CARD-01
 */
import type { ReactNode } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { AuthShell } from './AuthShell'

export type VerifyStatus = 'loading' | 'success' | 'error'

interface Props {
  status: VerifyStatus
  title: string
  description?: ReactNode
  actions?: ReactNode
}

const ICONS: Record<VerifyStatus, ReactNode> = {
  loading: <Loader2 className="h-12 w-12 animate-spin text-indigo-600" aria-hidden="true" />,
  success: <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden="true" />,
  error: <AlertCircle className="h-12 w-12 text-red-600" aria-hidden="true" />,
}

export function StatusCard({ status, title, description, actions }: Props) {
  return (
    <div aria-live="polite">
      <AuthShell icon={ICONS[status]} title={title} description={description}>
        {actions && <div className="space-y-3">{actions}</div>}
      </AuthShell>
    </div>
  )
}
