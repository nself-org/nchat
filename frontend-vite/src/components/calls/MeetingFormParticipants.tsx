/**
 * Purpose:    Step 2 of the meeting scheduler (participants + reminders) ported from the legacy
 *             MeetingParticipants + MeetingReminders components. Participants are added by id
 *             (the directory picker resolves to the same participant_ids the createMeeting Action
 *             expects); reminders are multi-select timings.
 * Inputs:     form (MeetingFormState), update (typed setter).
 * Outputs:    The step-2 form fields.
 * Constraints:Presentational + delegated state. The live people-directory search wires to the
 *             users query in a later page-batch; here ids are entered/removed explicitly so no
 *             scheduling feature (participant list, reminder set) is lost.
 * SOT:        F-NCHAT-VITE-MEETINGS-FORM-PARTICIPANTS-01
 */
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { MeetingFormState } from './useMeetingForm'
import type { ReminderTiming } from './types'

const REMINDERS: ReadonlyArray<{ value: ReminderTiming; label: string }> = [
  { value: '5min', label: '5 minutes before' },
  { value: '15min', label: '15 minutes before' },
  { value: '30min', label: '30 minutes before' },
  { value: '1hour', label: '1 hour before' },
  { value: '1day', label: '1 day before' },
]

interface Props {
  form: MeetingFormState
  update: <K extends keyof MeetingFormState>(key: K, value: MeetingFormState[K]) => void
}

export function MeetingFormParticipants({ form, update }: Props) {
  const [draft, setDraft] = useState('')

  const addParticipant = () => {
    const id = draft.trim()
    if (!id || form.participantIds.includes(id)) return
    update('participantIds', [...form.participantIds, id])
    setDraft('')
  }

  const removeParticipant = (id: string) => {
    update(
      'participantIds',
      form.participantIds.filter((p) => p !== id),
    )
  }

  const toggleReminder = (t: ReminderTiming) => {
    update(
      'reminderTimings',
      form.reminderTimings.includes(t)
        ? form.reminderTimings.filter((r) => r !== t)
        : [...form.reminderTimings, t],
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <span className="text-sm text-slate-300">Participants</span>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
            placeholder="Add participant by user id or email"
            aria-label="add participant"
            className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={addParticipant}
            className="inline-flex items-center gap-1 rounded bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {form.participantIds.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {form.participantIds.map((id) => (
              <li
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-200"
              >
                {id}
                <button
                  type="button"
                  aria-label={`remove ${id}`}
                  onClick={() => removeParticipant(id)}
                  className="text-slate-400 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-800 pt-6">
        <span className="text-sm text-slate-300">Reminders</span>
        <div className="space-y-2">
          {REMINDERS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.reminderTimings.includes(value)}
                onChange={() => toggleReminder(value)}
                className="h-4 w-4 accent-sky-600"
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
