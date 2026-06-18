/**
 * Purpose:    Pure formatting helpers shared by the calls / meetings / streams pages
 *             (call duration MM:SS, participant pluralization, user initials, next slot).
 *             Extracted so each page stays under the size cap and the logic is unit-testable.
 * Inputs:     primitives (seconds, count, name).
 * Outputs:    formatted strings / Date.
 * Constraints:Pure. No side effects, no Date.now in formatDuration.
 * SOT:        F-NCHAT-VITE-CALLS-FORMAT-01
 */

/** Format a duration in seconds as H:MM:SS or MM:SS. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

/** "1 participant" / "3 participants". */
export function pluralizeParticipants(count: number): string {
  return `${count} participant${count === 1 ? '' : 's'}`
}

/** "1 viewer" / "1.2K viewers" — compact viewer count for live streams. */
export function pluralizeViewers(count: number): string {
  const label =
    count >= 1000 ? `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1)}K` : String(count)
  return `${label} viewer${count === 1 ? '' : 's'}`
}

/** Up-to-two-letter uppercase initials from a display name. */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Next available 30-minute slot from now, rounded up. Mirrors legacy getNextAvailableSlot. */
export function getNextAvailableSlot(from: Date = new Date()): Date {
  const d = new Date(from)
  d.setSeconds(0, 0)
  const minutes = d.getMinutes()
  d.setMinutes(minutes <= 30 ? 30 : 60)
  return d
}

/** "HH:MM" string for a Date. */
export function toTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
