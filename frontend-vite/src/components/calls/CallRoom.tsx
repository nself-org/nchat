/**
 * Purpose:    In-call room UI ported from the legacy CallWindow. Renders the participant grid,
 *             a running duration timer, and the call control bar (mute / video / screen-share /
 *             end). The actual WebRTC media transport (LiveKit) attaches once the backend
 *             token-mint Action lands (BFF N-2-S5); until then the room shows the connected
 *             chrome over the local preview and the controls drive local UI state.
 * Inputs:     call (Call), token (CallToken | null), onEnd, onToggleMute/Video/ScreenShare.
 * Outputs:    Full-screen dark call surface.
 * Constraints:Presentational + local control state only. No data fetching (canonical §4).
 * SOT:        F-NCHAT-VITE-CALLS-ROOM-01
 */
import { useEffect, useState } from 'react'
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff } from 'lucide-react'
import { formatDuration, getInitials, pluralizeParticipants } from './format'
import type { Call } from './types'

interface Props {
  call: Call
  selfName: string
  /** True once a LiveKit join token has been minted (BFF backend pending). */
  connected: boolean
  onEnd: () => void
}

export function CallRoom({ call, selfName, connected, onEnd }: Props) {
  const [muted, setMuted] = useState(false)
  const [videoOn, setVideoOn] = useState(call.call_type === 'video')
  const [sharing, setSharing] = useState(false)
  const [seconds, setSeconds] = useState(call.duration_seconds ?? 0)

  // Duration timer — only ticks while the call is connected (ported from legacy timer).
  useEffect(() => {
    if (!connected) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [connected])

  const isVideo = call.call_type === 'video'

  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{call.host_name ?? 'Call'}</h1>
          <p className="text-sm text-slate-400">{pluralizeParticipants(call.participant_count)}</p>
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 font-mono text-sm tabular-nums">
          {formatDuration(seconds)}
        </div>
      </div>

      {/* Participant stage */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-800">
          {videoOn && isVideo ? (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-indigo-500/10" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-slate-600 bg-slate-700 text-4xl font-semibold">
                {getInitials(selfName || 'You')}
              </div>
            </div>
          )}
          {!connected && (
            <div className="absolute bottom-3 start-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-slate-300">
              Media not yet connected
            </div>
          )}
        </div>
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-3 pb-8">
        <CtrlButton active={!muted} danger={muted} onClick={() => setMuted((m) => !m)} label="mute">
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </CtrlButton>
        {isVideo && (
          <CtrlButton active={videoOn} danger={!videoOn} onClick={() => setVideoOn((v) => !v)} label="video">
            {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </CtrlButton>
        )}
        <CtrlButton active={sharing} onClick={() => setSharing((s) => !s)} label="screen share">
          {sharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </CtrlButton>
        <button
          type="button"
          aria-label="end call"
          onClick={onEnd}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

function CtrlButton({
  active,
  danger,
  onClick,
  label,
  children,
}: {
  active?: boolean
  danger?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  const tone = danger
    ? 'bg-red-600 hover:bg-red-700'
    : active
      ? 'bg-white/15 hover:bg-white/25'
      : 'bg-white/10 hover:bg-white/20'
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${tone}`}
    >
      {children}
    </button>
  )
}
