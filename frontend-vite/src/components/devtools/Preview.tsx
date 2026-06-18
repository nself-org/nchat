/**
 * Purpose:    Preview primitives for the dev component gallery — faithful port of the legacy
 *             `@/components/dev/component-preview` exports: ComponentPreview, PreviewCard,
 *             PreviewGrid. Render a live demo with an optional collapsible code snippet.
 * Inputs:     ComponentPreview: title, description?, code?, children (the live demo).
 *             PreviewCard: title, children. PreviewGrid: cols (1|2|3), children.
 * Outputs:    Sectioned preview UI with show/hide code toggle.
 * Constraints:Presentational, client-only. Slate theme to match the ɳChat SPA shell.
 * SOT:        F-NCHAT-VITE-DEVTOOLS-PREVIEW-01
 */
import { useState, type ReactNode } from 'react'
import { Code2 } from 'lucide-react'
import { CodeBlock } from '@/components/devtools/CodeBlock'

const GRID_COLS: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
}

export function PreviewGrid({ cols = 2, children }: { cols?: 1 | 2 | 3; children: ReactNode }) {
  return <div className={`grid gap-4 ${GRID_COLS[cols]}`}>{children}</div>
}

export function PreviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-200">{title}</h4>
      {children}
    </div>
  )
}

interface ComponentPreviewProps {
  title: string
  description?: string
  code?: string
  children: ReactNode
}

export function ComponentPreview({ title, description, code, children }: ComponentPreviewProps) {
  const [showCode, setShowCode] = useState(false)

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
        </div>
        {code && (
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Code2 className="h-3.5 w-3.5" />
            {showCode ? 'Hide code' : 'Show code'}
          </button>
        )}
      </div>
      <div className="bg-slate-950/40 p-4">{children}</div>
      {code && showCode && (
        <div className="border-t border-slate-800 p-4">
          <CodeBlock code={code} language="tsx" />
        </div>
      )}
    </div>
  )
}
