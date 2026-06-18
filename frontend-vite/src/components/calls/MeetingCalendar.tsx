/**
 * Purpose:    Month calendar view for the meetings dashboard, ported from the legacy
 *             MeetingCalendar. Renders the current month grid and dots/labels for days that
 *             have scheduled meetings; clicking a meeting chip opens the detail panel.
 * Inputs:     meetings (readonly Meeting[]) + onSelect.
 * Outputs:    A 7-column month grid.
 * Constraints:Presentational only. Pure date math (no external date lib) keeps the bundle lean.
 * SOT:        F-NCHAT-VITE-MEETINGS-CALENDAR-01
 */
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Meeting } from './types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  meetings: readonly Meeting[]
  onSelect: (m: Meeting) => void
}

export function MeetingCalendar({ meetings, onSelect }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const byDay = new Map<number, Meeting[]>()
  for (const m of meetings) {
    const d = new Date(m.scheduled_start_at)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const list = byDay.get(d.getDate()) ?? []
      list.push(m)
      byDay.set(d.getDate(), list)
    }
  }

  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="previous month"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="rounded p-1 text-slate-400 hover:bg-slate-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium text-slate-200">
          {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          aria-label="next month"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="rounded p-1 text-slate-400 hover:bg-slate-800"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 text-sm">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-slate-900 px-2 py-2 text-center text-xs text-slate-500">
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className="min-h-[88px] bg-slate-950 p-1.5">
            {day != null && (
              <>
                <div className="mb-1 text-xs text-slate-500">{day}</div>
                <div className="space-y-1">
                  {(byDay.get(day) ?? []).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelect(m)}
                      className="block w-full truncate rounded bg-sky-600/20 px-1.5 py-0.5 text-start text-xs text-sky-300 hover:bg-sky-600/30"
                    >
                      {m.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
