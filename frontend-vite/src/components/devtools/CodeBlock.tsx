/**
 * Purpose:    Copy-to-clipboard code block for the dev/api-docs screens. Faithful port of the
 *             legacy `@/components/dev/code-block` + the inline CodeBlock in api-docs/bots.
 * Inputs:     code (source string), language (label only), optional filename, optional id.
 * Outputs:    A <pre> block with a copy button that flips to a check for 2s after copying.
 * Constraints:Presentational, client-only. Uses navigator.clipboard (graceful no-op off-secure-context).
 *             Slate theme to match the ɳChat SPA shell (not shadcn semantic tokens).
 * SOT:        F-NCHAT-VITE-DEVTOOLS-CODEBLOCK-01
 */
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface Props {
  code: string
  language?: string
  filename?: string
}

export function CodeBlock({ code, language, filename }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      {(filename || language) && (
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
          <span className="font-mono text-xs text-slate-400">{filename ?? language}</span>
          {filename && language && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {language}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-slate-100">
          <code>{code}</code>
        </pre>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="absolute end-2 top-2 rounded-md border border-slate-700 bg-slate-900/80 p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
