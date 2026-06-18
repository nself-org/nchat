/**
 * Purpose:    Meeting preview lobby + in-meeting room, ported from the legacy meetings/[id]
 *             page. The lobby shows a local preview with mute/video toggles, meeting metadata,
 *             a password gate (when required), and Join / Cancel. Once joined it renders the
 *             active room chrome (audio or video) with a Leave / End control.
 * Inputs:     meeting (Meeting), selfName, joining, joined, error, onJoin/onLeave/onEnd,
 *             password state, isHost.
 * Outputs:    The lobby or active-room surface.
 * Constraints:Presentational + local preview state. Join/end side-effects run in the page via
 *             the meeting lifecycle Actions. Media transport attaches when LiveKit lands.
 * SOT:        F-NCHAT-VITE-MEETINGS-ROOM-01
 */
import { Mic, MicOff, Video, VideoOff, Phone, Monitor, Loader2 } from 'lucide-react'
import { getInitials, pluralizeParticipants } from './format'
import type { Meeting, RoomType } from './types'

const ROOM_ICON: Record<RoomType, typeof Video> = {
  video: Video,
  audio: Phone,
  screenshare: Monitor,
}

interface LobbyProps {
  meeting: Meeting
  selfName: string
  joining: boolean
  error: string | null
  password: string
  onPasswordChange: (v: string) => void
  previewMuted: boolean
  previewVideoOn: boolean
  onTogglePreviewMute: () => void
  onTogglePreviewVideo: () => void
  onJoin: () => void
  onCancel: () => void
}

export function MeetingLobby({
  meeting,
  selfName,
  joining,
  error,
  password,
  onPasswordChange,
  previewMuted,
  previewVideoOn,
  onTogglePreviewMute,
  onTogglePreviewVideo,
  onJoin,
  onCancel,
}: LobbyProps) {
  const Icon = ROOM_ICON[meeting.room_type]
  return (
    <div className="flex min-h-[70vh] flex-col gap-6 bg-slate-950 p-6 text-white lg:flex-row">
      {/* Preview */}
      <div className="flex flex-1 items-center justify-center">
        <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-2xl bg-slate-800">
          {previewVideoOn ? (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-indigo-500/10" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-slate-600 bg-slate-700 text-4xl font-semibold">
                {getInitials(selfName || 'User')}
              </div>
            </div>
          )}
          <div className="absolute bottom-4 start-1/2 flex -translate-x-1/2 items-center gap-3">
            <button
              type="button"
              aria-label="toggle microphone"
              onClick={onTogglePreviewMute}
              className={`flex h-12 w-12 items-center justify-center rounded-full ${previewMuted ? 'bg-red-600' : 'bg-white/15'}`}
            >
              {previewMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {meeting.room_type !== 'audio' && (
              <button
                type="button"
                aria-label="toggle camera"
                onClick={onTogglePreviewVideo}
                className={`flex h-12 w-12 items-center justify-center rounded-full ${!previewVideoOn ? 'bg-red-600' : 'bg-white/15'}`}
              >
                {previewVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Join panel */}
      <div className="flex w-full flex-col border-slate-700 lg:w-96 lg:border-s lg:ps-8">
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold">{meeting.title}</h1>
          <p className="mb-6 text-sm text-slate-400">
            {new Date(meeting.scheduled_start_at).toLocaleString()}
          </p>
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-sky-400" />
              <span className="capitalize">{meeting.room_type} meeting</span>
            </div>
            <div className="text-sm text-slate-400">{pluralizeParticipants(meeting.participant_count)}</div>
          </div>
          {meeting.has_password && (
            <div className="mb-6 space-y-2">
              <label htmlFor="meeting-password" className="text-sm text-slate-300">
                Meeting password
              </label>
              <input
                id="meeting-password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </div>
          )}
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={onJoin}
            disabled={joining}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 font-medium text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
            Join meeting
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-slate-700 px-4 py-3 text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

interface ActiveProps {
  meeting: Meeting
  selfName: string
  connected: boolean
  isHost: boolean
  onLeave: () => void
  onEnd: () => void
}

export function MeetingActiveRoom({ meeting, selfName, connected, isHost, onLeave, onEnd }: ActiveProps) {
  return (
    <div className="flex min-h-[70vh] flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-lg font-semibold">{meeting.title}</h1>
        <span className="text-sm text-slate-400">{pluralizeParticipants(meeting.participant_count)}</span>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-800">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-slate-600 bg-slate-700 text-4xl font-semibold">
              {getInitials(selfName || 'You')}
            </div>
          </div>
          {!connected && (
            <div className="absolute bottom-3 start-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-slate-300">
              Media not yet connected
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 pb-8">
        <button
          type="button"
          onClick={onLeave}
          className="rounded-lg border border-slate-700 px-5 py-2.5 text-slate-200 hover:bg-slate-800"
        >
          Leave
        </button>
        {isHost && (
          <button
            type="button"
            onClick={onEnd}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-white hover:bg-red-700"
          >
            End meeting
          </button>
        )}
      </div>
    </div>
  )
}
