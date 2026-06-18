/**
 * Purpose:    Format an ISO timestamp as a short relative label ("2m ago", "1h ago").
 *             Replaces the legacy lastMessageTime strings that were hardcoded in the
 *             Next.js chat dashboard mock data.
 * Inputs:     iso (ISO-8601 string | null | undefined) + optional now (Date, for tests).
 * Outputs:    Human-readable relative string, or '' when no input.
 * Constraints:Pure. No locale-specific libs (Intl.RelativeTimeFormat keeps it tiny).
 * SOT:        F-NCHAT-VITE-CHAT-RELTIME-01
 */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffSec = Math.round((then - now.getTime()) / 1000)
  const abs = Math.abs(diffSec)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })
  if (abs < 60) return rtf.format(Math.round(diffSec), 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  return rtf.format(Math.round(diffSec / 86400), 'day')
}

/** Format an ISO timestamp as a local HH:MM clock label for message rows. */
export function clockTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
