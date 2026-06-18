/**
 * Purpose:    "/calls/:id" — full-screen voice/video call surface, ported from the legacy
 *             calls/[id] page. Runtime-detects the livekit plugin (renders the bundle upsell
 *             when absent), reads the call record via Hasura (AsyncScreen 7-state), mints a
 *             LiveKit join token via the backend Action (BFF, pending), and renders the CallRoom
 *             with mute/video/screen-share/end controls. End returns to /chat.
 * Inputs:     route param :id; useAuth() for the local participant label.
 * Outputs:    Upsell | AsyncScreen states | CallRoom.
 * Constraints:Feature-detection is always runtime (PRI). No socket/livekit-client import — the
 *             token mint is the only backend touchpoint and degrades gracefully until live.
 * SOT:        F-NCHAT-VITE-ROUTE — /calls/:id
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AsyncScreen } from '@nself/ui'
import { useAuth } from '@nself/auth-core'
import { hasLiveKit } from '@/components/calls/livekit-feature'
import { LiveKitBundleUpsell } from '@/components/calls/LiveKitBundleUpsell'
import { CallRoom } from '@/components/calls/CallRoom'
import { useCall, useMintCallToken, type CallToken } from '@/components/calls/useCalls'

export default function CallsIdPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const selfName = auth.status === 'authenticated' ? auth.user.displayName || auth.user.email : 'You'

  const { result, reexecute } = useCall(id)
  const { mint } = useMintCallToken(id)
  const [token, setToken] = useState<CallToken | null>(null)

  // Attempt to mint a join token once the call record resolves (BFF Action; pending backend
  // returns an error which we swallow — the room still renders in disconnected chrome).
  useEffect(() => {
    if (result === 'loading' || result._tag !== 'Ok') return
    let cancelled = false
    void mint().then((r) => {
      if (!cancelled && r._tag === 'Ok') setToken(r.value)
    })
    return () => {
      cancelled = true
    }
  }, [result, mint])

  // Feature gate runs after hooks (parity with legacy hook-order guard).
  if (!hasLiveKit) {
    return <LiveKitBundleUpsell headline="Voice & video calls" />
  }

  return (
    <AsyncScreen
      result={result}
      onRetry={reexecute}
      renderData={(call) => (
        <CallRoom
          call={call}
          selfName={selfName}
          connected={token != null}
          onEnd={() => navigate('/chat')}
        />
      )}
    />
  )
}
