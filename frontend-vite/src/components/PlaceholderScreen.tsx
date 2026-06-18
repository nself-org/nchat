/**
 * Purpose:    Routing-skeleton placeholder. Renders the @nself/ui AsyncScreen in its
 *             empty state so every migrated route resolves to a real, accessible screen
 *             before its legacy page is ported. The goal is a complete routing skeleton,
 *             not a ported page (P3 migration plan, Wave N-3..N).
 * Inputs:     title (route label) + optional path (raw URL pattern, for dev clarity).
 * Outputs:    AsyncScreen empty-state with a "not yet ported" message.
 * Constraints:Presentational only. Replace per-route as each legacy page is ported.
 * SOT:        F-NCHAT-VITE-PLACEHOLDER-01
 */
import { AsyncScreen } from '@nself/ui'
import { ok } from '@nself/errors'

interface Props {
  title: string
  path?: string
}

export function PlaceholderScreen({ title, path }: Props) {
  return (
    <AsyncScreen<readonly never[]>
      result={ok([])}
      emptyCheck={() => true}
      renderData={() => null}
      slots={{
        empty: (
          <div role="status" className="flex flex-col items-center gap-2 py-16 text-center">
            <h1 className="text-lg font-semibold text-slate-200">{title}</h1>
            <p className="text-sm text-slate-400">This screen is not yet ported to the Vite SPA.</p>
            {path && <code className="text-xs text-slate-500">{path}</code>}
          </div>
        ),
      }}
    />
  )
}
