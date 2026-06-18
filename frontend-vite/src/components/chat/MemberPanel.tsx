/**
 * Purpose:    Slide-in member-list side panel for the channel view. Ported from the legacy
 *             MemberList layout component (the legacy version grouped members by presence;
 *             this SPA port lists members derived from the message authors until the
 *             dedicated channel-members read lands in N-2-S2f).
 * Inputs:     members (deduped author summaries), onClose.
 * Outputs:    A labelled aside listing members with a presence dot placeholder.
 * Constraints:Presentational only. Member presence write is an Action (N-2-S3l) — not wired
 *             here; the dot is a neutral indicator.
 * SOT:        F-NCHAT-VITE-CHAT-MEMBERPANEL-01
 */
import { X } from 'lucide-react'
import { Button } from '@nself/ui'

export interface MemberSummary {
  readonly id: string
  readonly name: string
  readonly avatarUrl: string | null
  readonly role: string | null
}

interface Props {
  members: ReadonlyArray<MemberSummary>
  onClose: () => void
}

export function MemberPanel({ members, onClose }: Props) {
  return (
    <aside
      className="flex w-64 shrink-0 flex-col border-s border-slate-800 bg-slate-900"
      aria-label="Channel members"
    >
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Members ({members.length})</h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close member list">
          <X className="h-4 w-4" />
        </Button>
      </header>
      <ul className="flex-1 overflow-y-auto p-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-800/40">
            <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-700">
              {m.avatarUrl ? (
                <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-200">
                  {m.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{m.name}</span>
            {m.role && m.role !== 'member' && (
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
                {m.role}
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  )
}
