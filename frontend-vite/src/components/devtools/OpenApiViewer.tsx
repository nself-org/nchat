/**
 * Purpose:    Self-contained OpenAPI spec viewer for "/api-docs". Replaces the legacy
 *             swagger-ui-react dependency (not present in frontend-vite) with a lightweight,
 *             dependency-free renderer that fetches the static OpenAPI spec asset and lists
 *             operations grouped by tag/path. Preserves the legacy loading + error states.
 * Inputs:     specUrl (path to the static OpenAPI JSON/YAML asset, default /openapi.json).
 * Outputs:    Info header + per-operation cards (method, path, summary, params, responses).
 * Constraints:Fetches a STATIC asset (not Hasura data) so plain fetch is allowed (canonical §2
 *             governs Hasura data access). Parses JSON; YAML specs need a build-time JSON copy
 *             (noted in backend_pending). Slate theme.
 * SOT:        F-NCHAT-VITE-DEVTOOLS-OPENAPI-01
 */
import { useEffect, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

interface OpenApiOperation {
  summary?: string
  description?: string
  tags?: string[]
  parameters?: Array<{ name: string; in: string; required?: boolean; description?: string }>
  responses?: Record<string, { description?: string }>
}
type PathItem = Partial<Record<'get' | 'post' | 'put' | 'patch' | 'delete', OpenApiOperation>>
interface OpenApiSpec {
  info?: { title?: string; version?: string; description?: string }
  paths?: Record<string, PathItem>
}

const METHOD_COLORS: Record<string, string> = {
  get: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  post: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  put: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  patch: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  delete: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; spec: OpenApiSpec }

export function OpenApiViewer({ specUrl = '/openapi.json' }: { specUrl?: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    fetch(specUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch OpenAPI spec')
        return res.json() as Promise<OpenApiSpec>
      })
      .then((spec) => alive && setState({ status: 'ready', spec }))
      .catch((e: unknown) =>
        alive &&
        setState({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' }),
      )
    return () => {
      alive = false
    }
  }, [specUrl])

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-sky-500" />
          <p className="text-slate-400">Loading API documentation...</p>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="alert">
        <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15">
            <AlertCircle className="h-6 w-6 text-rose-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Failed to Load API Documentation</h2>
          <p className="text-slate-400">{state.message}</p>
        </div>
      </div>
    )
  }

  const { info, paths = {} } = state.spec
  const entries = Object.entries(paths)

  return (
    <div className="space-y-6">
      {info && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold">{info.title ?? 'API'}</h1>
            {info.version && (
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                v{info.version}
              </span>
            )}
          </div>
          {info.description && <p className="mt-2 text-slate-400">{info.description}</p>}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="py-12 text-center text-slate-400">No operations defined in this spec.</p>
      ) : (
        entries.map(([path, item]) =>
          (Object.entries(item) as Array<[string, OpenApiOperation]>).map(([method, op]) => (
            <div
              key={`${method}-${path}`}
              className={`rounded-lg border ${METHOD_COLORS[method] ?? 'border-slate-800'} bg-slate-900/40`}
            >
              <div className="flex items-center gap-3 border-b border-slate-800/60 px-4 py-3">
                <span className="rounded px-2 py-0.5 text-xs font-bold uppercase">{method}</span>
                <code className="font-mono text-sm text-slate-100">{path}</code>
                {op.summary && <span className="text-sm text-slate-400">— {op.summary}</span>}
              </div>
              <div className="space-y-3 p-4 text-sm">
                {op.description && <p className="text-slate-400">{op.description}</p>}
                {op.parameters && op.parameters.length > 0 && (
                  <div>
                    <h4 className="mb-1 font-medium text-slate-300">Parameters</h4>
                    <ul className="space-y-1">
                      {op.parameters.map((p) => (
                        <li key={p.name} className="text-slate-400">
                          <code className="text-sky-300">{p.name}</code>
                          <span className="text-slate-500"> ({p.in})</span>
                          {p.required && <span className="text-rose-300"> required</span>}
                          {p.description ? ` — ${p.description}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {op.responses && (
                  <div>
                    <h4 className="mb-1 font-medium text-slate-300">Responses</h4>
                    <ul className="space-y-1">
                      {Object.entries(op.responses).map(([code, r]) => (
                        <li key={code} className="text-slate-400">
                          <code className="text-emerald-300">{code}</code>
                          {r.description ? ` — ${r.description}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )),
        )
      )}
    </div>
  )
}
