/**
 * Purpose:    Step 1 of the meeting scheduler (basic info) ported from the legacy schedule page:
 *             title, description, meeting-type picker, date/time/duration/timezone, and the
 *             recurring toggle + pattern select.
 * Inputs:     form (MeetingFormState), update (typed setter), errors.
 * Outputs:    The step-1 form fields.
 * Constraints:Presentational + delegated state. Uses native date/time/select inputs (no
 *             @nself/ui Select primitive yet). All legacy fields preserved.
 * SOT:        F-NCHAT-VITE-MEETINGS-FORM-BASIC-01
 */
import { Video, Phone, Monitor } from 'lucide-react'
import type { MeetingFormState } from './useMeetingForm'
import type { RecurrencePattern, RoomType } from './types'

const ROOM_TYPES: ReadonlyArray<{ value: RoomType; label: string; desc: string; Icon: typeof Video }> = [
  { value: 'video', label: 'Video call', desc: 'Face-to-face with video and audio', Icon: Video },
  { value: 'audio', label: 'Audio call', desc: 'Voice-only conference call', Icon: Phone },
  { value: 'screenshare', label: 'Screen share', desc: 'Present and share your screen', Icon: Monitor },
]

const RECURRENCE: ReadonlyArray<{ value: RecurrencePattern; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
]

interface Props {
  form: MeetingFormState
  update: <K extends keyof MeetingFormState>(key: K, value: MeetingFormState[K]) => void
  errors: Record<string, string>
}

const field = 'w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white'

export function MeetingFormBasic({ form, update, errors }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="m-title" className="text-sm text-slate-300">
          Meeting title *
        </label>
        <input
          id="m-title"
          className={`${field} ${errors.title ? 'border-red-500' : ''}`}
          placeholder="Weekly team sync"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
        />
        {errors.title && <p className="text-sm text-red-400">{errors.title}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="m-desc" className="text-sm text-slate-300">
          Description
        </label>
        <textarea
          id="m-desc"
          rows={3}
          className={field}
          placeholder="Add a description or agenda…"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm text-slate-300">Meeting type</span>
        <div className="grid gap-3 sm:grid-cols-3">
          {ROOM_TYPES.map(({ value, label, desc, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => update('roomType', value)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center ${
                form.roomType === value ? 'border-sky-500 bg-sky-600/10' : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <Icon className="h-6 w-6 text-slate-200" />
              <span className="font-medium text-slate-100">{label}</span>
              <span className="text-xs text-slate-400">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="m-date" className="text-sm text-slate-300">
            Date
          </label>
          <input id="m-date" type="date" className={field} value={form.date} onChange={(e) => update('date', e.target.value)} />
        </div>
        <div className="space-y-2">
          <label htmlFor="m-time" className="text-sm text-slate-300">
            Start time
          </label>
          <input
            id="m-time"
            type="time"
            className={`${field} ${errors.startTime ? 'border-red-500' : ''}`}
            value={form.startTime}
            onChange={(e) => update('startTime', e.target.value)}
          />
          {errors.startTime && <p className="text-sm text-red-400">{errors.startTime}</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="m-dur" className="text-sm text-slate-300">
            Duration (minutes)
          </label>
          <input
            id="m-dur"
            type="number"
            min={5}
            step={5}
            className={field}
            value={form.duration}
            onChange={(e) => update('duration', Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="m-tz" className="text-sm text-slate-300">
            Timezone
          </label>
          <input id="m-tz" className={field} value={form.timezone} onChange={(e) => update('timezone', e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <span className="text-sm text-slate-200">Recurring meeting</span>
          <p className="text-sm text-slate-400">Schedule this meeting to repeat</p>
        </div>
        <input
          type="checkbox"
          aria-label="recurring meeting"
          checked={form.isRecurring}
          onChange={(e) => update('isRecurring', e.target.checked)}
          className="h-5 w-5 accent-sky-600"
        />
      </div>

      {form.isRecurring && (
        <div className="border-s-2 border-slate-700 ps-4">
          <label htmlFor="m-rec" className="text-sm text-slate-300">
            Repeat
          </label>
          <select
            id="m-rec"
            className={`${field} mt-1`}
            value={form.recurrencePattern}
            onChange={(e) => update('recurrencePattern', e.target.value as RecurrencePattern)}
          >
            {RECURRENCE.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
