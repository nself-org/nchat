/**
 * Purpose:    Live GraphQL query runner for the /graphql-playground screen. Lets a developer
 *             paste a query and execute it against the live Hasura endpoint via the canonical
 *             urql client (@nself/graphql-client, provided in main.tsx). Renders the response
 *             (or error) using @nself/ui AsyncScreen states (canonical §4).
 * Inputs:     initialQuery (seed text). variables are entered as JSON.
 * Outputs:    Editable query + variables, a Run button, and a Result<JSON,AppError> via AsyncScreen.
 * Constraints:Queries only (no mutations from the playground UI, mirrors a read-only explorer).
 *             Uses urql useClient().query — never raw fetch (canonical §2). Result mapped to
 *             @nself/errors Result so AsyncScreen can render loading/error/empty/populated.
 * SOT:        F-NCHAT-VITE-DEVTOOLS-GQLRUNNER-01
 */
import { useState } from 'react'
import { useClient } from 'urql'
import { AsyncScreen } from '@nself/ui'
import { ok, err, type Result, type AppError } from '@nself/errors'
import { Play } from 'lucide-react'

type RunState = Result<unknown, AppError> | 'loading' | 'idle'

export function GraphqlRunner({ initialQuery }: { initialQuery: string }) {
  const client = useClient()
  const [queryText, setQueryText] = useState(initialQuery)
  const [varsText, setVarsText] = useState('{}')
  const [state, setState] = useState<RunState>('idle')

  const run = async () => {
    setState('loading')
    let variables: Record<string, unknown> = {}
    try {
      variables = varsText.trim() ? (JSON.parse(varsText) as Record<string, unknown>) : {}
    } catch {
      setState(
        err({ code: 'VALIDATION', message: 'Variables must be valid JSON.' } as unknown as AppError),
      )
      return
    }
    const result = await client.query(queryText, variables).toPromise()
    if (result.error) {
      setState(
        err({
          code: 'INTERNAL',
          message: result.error.message,
        } as unknown as AppError),
      )
      return
    }
    setState(ok(result.data ?? {}))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Query</span>
          <textarea
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            spellCheck={false}
            rows={10}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Variables (JSON)</span>
          <textarea
            value={varsText}
            onChange={(e) => setVarsText(e.target.value)}
            spellCheck={false}
            rows={10}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void run()}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
      >
        <Play className="h-4 w-4" />
        Run query
      </button>

      {state !== 'idle' && (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
          <AsyncScreen<unknown>
            result={state}
            emptyCheck={(d) => d == null || (typeof d === 'object' && Object.keys(d as object).length === 0)}
            onRetry={() => void run()}
            renderData={(data) => (
              <pre className="overflow-x-auto text-sm text-emerald-200">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          />
        </div>
      )}
    </div>
  )
}
