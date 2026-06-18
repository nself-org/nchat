/**
 * Purpose:    Props reference table for the dev component gallery — faithful port of the legacy
 *             `@/components/dev/props-table` (PropsTable + PropDefinition).
 * Inputs:     props: PropDefinition[] (name, type, required?, default?, description).
 * Outputs:    An accessible table listing each prop with type, required flag, default, description.
 * Constraints:Presentational, client-only. Slate theme to match the ɳChat SPA shell.
 * SOT:        F-NCHAT-VITE-DEVTOOLS-PROPSTABLE-01
 */

export interface PropDefinition {
  name: string
  type: string
  required?: boolean
  default?: string
  description?: string
}

export function PropsTable({ props }: { props: PropDefinition[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-start text-sm">
        <thead className="bg-slate-900/60">
          <tr className="border-b border-slate-800 text-slate-400">
            <th className="px-4 py-2 text-start font-medium">Prop</th>
            <th className="px-4 py-2 text-start font-medium">Type</th>
            <th className="px-4 py-2 text-start font-medium">Default</th>
            <th className="px-4 py-2 text-start font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.name} className="border-b border-slate-800/60 last:border-0">
              <td className="px-4 py-2 align-top">
                <code className="font-mono text-xs text-sky-300">{p.name}</code>
                {p.required && (
                  <span className="ms-1.5 rounded bg-rose-500/15 px-1 py-0.5 text-[10px] font-medium text-rose-300">
                    required
                  </span>
                )}
              </td>
              <td className="px-4 py-2 align-top">
                <code className="font-mono text-xs text-emerald-300">{p.type}</code>
              </td>
              <td className="px-4 py-2 align-top text-slate-400">
                {p.default ? <code className="font-mono text-xs">{p.default}</code> : '—'}
              </td>
              <td className="px-4 py-2 align-top text-slate-300">{p.description ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
