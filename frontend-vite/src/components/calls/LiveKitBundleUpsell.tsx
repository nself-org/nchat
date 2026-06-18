/**
 * Purpose:    Bundle upsell shown when the livekit plugin is not installed. Ported 1:1 from
 *             the legacy calls/[id] LiveKitBundleUpsell so the call/meeting/stream pages keep
 *             their graceful "Voice & video requires the nChat bundle" CTA instead of failing.
 * Inputs:     headline / body / feature (so calls, meetings and streams can label it).
 * Outputs:    Full-screen centered upsell card with a "Get nChat Bundle" link.
 * Constraints:Presentational only. External link opens nself.org/pricing in a new tab.
 * SOT:        F-NCHAT-VITE-CALLS-UPSELL-01
 */
import { Video, ExternalLink } from 'lucide-react'

interface Props {
  headline?: string
  body?: string
}

export function LiveKitBundleUpsell({
  headline = 'Voice & video calls',
  body = 'This feature requires the nChat bundle (livekit plugin). Install it with a Basic license ($0.99/mo) to unlock calls, meetings, live streams, screen sharing, and recording.',
}: Props) {
  return (
    <div className="flex h-full min-h-[60vh] w-full items-center justify-center bg-slate-900">
      <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center">
        <div className="rounded-full bg-white/10 p-4">
          <Video className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-white">{headline}</h2>
        <p className="text-sm text-slate-400">{body}</p>
        <a
          href="https://nself.org/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Get nChat Bundle
          <ExternalLink className="h-4 w-4" />
        </a>
        <p className="text-xs text-slate-500">
          Already have a key?{' '}
          <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs">
            nself license set nself_pro_...
          </code>
        </p>
      </div>
    </div>
  )
}
