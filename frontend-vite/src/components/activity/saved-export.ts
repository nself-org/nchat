/**
 * Purpose:    Client-side export of saved messages, ported from legacy lib/saved/saved-export.ts.
 *             Serializes saved messages (+ collections) to JSON/Markdown/CSV and triggers a
 *             browser download. Pure logic + one DOM side-effect (anchor click) isolated here.
 * Inputs:     saved messages, collections, format.
 * Outputs:    a Blob download via downloadExport(); buildExport() returns the string payload.
 * Constraints:Browser-only (uses URL.createObjectURL). Returns Result for the build step so the
 *             caller can surface failures without a throw (canonical §5).
 * SOT:        F-NCHAT-VITE-SAVED-EXPORT-01
 */
import { err, ok, type Result } from '@nself/errors'
import type { ExportFormat, SavedCollection, SavedMessage } from './saved-types'

interface BuiltExport {
  data: string
  filename: string
  mimeType: string
}

function toJson(messages: SavedMessage[], collections: SavedCollection[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      collections,
      messages,
    },
    null,
    2,
  )
}

function toMarkdown(messages: SavedMessage[]): string {
  const lines = ['# Saved messages', '']
  for (const m of messages) {
    lines.push(`## ${m.author.displayName} in #${m.channelName}`)
    lines.push(`*${m.savedAt.toISOString()}*${m.isStarred ? ' ⭐' : ''}`)
    lines.push('')
    lines.push(m.content)
    if (m.note) lines.push(`> Note: ${m.note}`)
    if (m.tags.length) lines.push(`Tags: ${m.tags.map((t) => `\`${t}\``).join(' ')}`)
    lines.push('')
  }
  return lines.join('\n')
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function toCsv(messages: SavedMessage[]): string {
  const header = ['savedAt', 'channel', 'author', 'starred', 'tags', 'content'].join(',')
  const rows = messages.map((m) =>
    [
      m.savedAt.toISOString(),
      escapeCsv(m.channelName),
      escapeCsv(m.author.displayName),
      String(m.isStarred),
      escapeCsv(m.tags.join('; ')),
      escapeCsv(m.content),
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

/** Build the export payload for a given format. */
export function buildExport(
  messages: SavedMessage[],
  collections: SavedCollection[],
  format: ExportFormat,
): Result<BuiltExport> {
  const stamp = new Date().toISOString().slice(0, 10)
  switch (format) {
    case 'json':
      return ok({ data: toJson(messages, collections), filename: `saved-${stamp}.json`, mimeType: 'application/json' })
    case 'markdown':
      return ok({ data: toMarkdown(messages), filename: `saved-${stamp}.md`, mimeType: 'text/markdown' })
    case 'csv':
      return ok({ data: toCsv(messages), filename: `saved-${stamp}.csv`, mimeType: 'text/csv' })
    default:
      return err({ code: 'validation_error', status: 422, message: `Unsupported export format: ${String(format)}` })
  }
}

/** Build + trigger a browser download. No-op outside the browser. */
export function downloadExport(
  messages: SavedMessage[],
  collections: SavedCollection[],
  format: ExportFormat = 'json',
): Result<true> {
  const built = buildExport(messages, collections, format)
  if (built._tag === 'Err') return built
  if (typeof document === 'undefined') return ok(true)

  const blob = new Blob([built.value.data], { type: built.value.mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = built.value.filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  return ok(true)
}
