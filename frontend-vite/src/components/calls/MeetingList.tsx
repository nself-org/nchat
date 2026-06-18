/**
 * Purpose:    Meeting list rows ported from the legacy MeetingList. Each row shows title,
 *             schedule, room-type icon, status badge, participant count, and join / edit /
 *             delete affordances. Selecting a row surfaces the detail panel in the page.
 * Inputs:     meetings (readonly Meeting[]) + row callbacks.
 * Outputs:    A vertical list of meeting cards.
 * Constraints:Presentational only. Empty state is handled by AsyncScreen in the page.
 * SOT:        F-NCHAT-VITE-MEETINGS-LIST-01
 */
import { Video, Phone, Monitor, Calendar, Users, Trash2, LogIn } from 'lucide-react'
import { pluralizeParticipants } from './format'
import type { Meeting, MeetingStatus, RoomType } from './types'

const ROOM_ICON: Record<RoomType, typeof Video> = {
  video: Video,
  audio: Phone,
  screenshare: Monitor,
}

const STATUS_TONE: Record<MeetingStatus, string> = {
  scheduled: 'bg-sky-500/15 text-sky-300',
  live: 'bg-green-500/15 text-green-300',
  ended: 'bg-slate-500/15 text-slate-300',
  cancelled: 'bg-red-500/15 text-red-300',
}

interface Props {
  meetings: readonly Meeting[]
  onSelect: (m: Meeting) => void
  onJoin: (m: Meeting) => void
  onDelete: (m: Meeting) => void
}

export function MeetingList({ meetings, onSelect, onJoin, onDelete }: Props) {
  return (
    <ul className="flex flex-col gap-3">
      {meetings.map((m) => {
        const Icon = ROOM_ICON[m.room_type]
        return (
          <li
            key={m.id}
            className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-slate-700"
          >
            <button
              type="button"
              onClick={() => onSelect(m)}
              className="flex min-w-0 flex-1 items-center gap-4 text-start"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-100">{m.title}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${STATUS_TONE[m.status]}`}>
                    {m.status}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(m.scheduled_start_at).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {pluralizeParticipants(m.participant_count)}
                  </span>
                </span>
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-2">
              {m.status !== 'ended' && m.status !== 'cancelled' && (
                <button
                  type="button"
                  aria-label="join meeting"
                  onClick={() => onJoin(m)}
                  className="inline-flex items-center gap-1 rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700"
                >
                  <LogIn className="h-4 w-4" />
                  Join
                </button>
              )}
              <button
                type="button"
                aria-label="delete meeting"
                onClick={() => onDelete(m)}
                className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
