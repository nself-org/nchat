/**
 * Purpose:    Meeting detail side-panel ported from the legacy MeetingDetail. Shows full meeting
 *             metadata (title, description, schedule, room type, privacy, participant count) and
 *             the join / delete affordances. Surfaced when a row or calendar chip is selected.
 * Inputs:     meeting (Meeting) + onClose / onJoin / onDelete.
 * Outputs:    A vertical detail panel.
 * Constraints:Presentational only. Actions are wired in the page (canonical §4).
 * SOT:        F-NCHAT-VITE-MEETINGS-DETAIL-01
 */
import { X, Video, Phone, Monitor, Lock, Users, LogIn, Trash2 } from 'lucide-react'
import { pluralizeParticipants } from './format'
import type { Meeting, RoomType } from './types'

const ROOM_ICON: Record<RoomType, typeof Video> = {
  video: Video,
  audio: Phone,
  screenshare: Monitor,
}

interface Props {
  meeting: Meeting
  onClose: () => void
  onJoin: () => void
  onDelete: () => void
}

export function MeetingDetailPanel({ meeting, onClose, onJoin, onDelete }: Props) {
  const Icon = ROOM_ICON[meeting.room_type]
  const joinable = meeting.status !== 'ended' && meeting.status !== 'cancelled'
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 pb-4">
        <h2 className="text-lg font-semibold text-slate-100">{meeting.title}</h2>
        <button
          type="button"
          aria-label="close detail"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <dl className="space-y-3 text-sm">
        <Row label="When" value={new Date(meeting.scheduled_start_at).toLocaleString()} />
        <div className="flex items-center gap-2 text-slate-300">
          <Icon className="h-4 w-4 text-sky-400" />
          <span className="capitalize">{meeting.room_type} meeting</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Users className="h-4 w-4 text-slate-400" />
          {pluralizeParticipants(meeting.participant_count)}
        </div>
        {meeting.is_private && (
          <div className="flex items-center gap-2 text-slate-300">
            <Lock className="h-4 w-4 text-slate-400" />
            Private{meeting.has_password ? ' · password protected' : ''}
          </div>
        )}
        {meeting.description && (
          <div className="pt-2 text-slate-400">{meeting.description}</div>
        )}
      </dl>

      <div className="mt-auto flex gap-2 pt-6">
        {joinable && (
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700"
          >
            <LogIn className="h-4 w-4" /> Join
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center justify-center gap-1 rounded border border-slate-700 px-3 py-2 text-sm text-red-400 hover:bg-slate-800"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-300">{value}</dd>
    </div>
  )
}
