/**
 * FileAttachment — message attachment display card, injectable, no external deps.
 *
 * @module files/file-attachment
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { AttachedFile } from './types'
import { FileIcon2 } from './file-icon'

// ============================================================================
// Adapter
// ============================================================================

export interface FileAttachmentAdapter {
  file: AttachedFile
  onDownload?: (file: AttachedFile) => void
  onPreview?: (file: AttachedFile) => void
  onForward?: (file: AttachedFile) => void
  onDelete?: (file: AttachedFile) => void
}

export interface FileAttachmentProps {
  adapter: FileAttachmentAdapter
  /** Compact single-line layout vs full card layout */
  compact?: boolean
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function DownloadIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
}

function EyeIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
}

function ForwardIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>
}

function TrashIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
}

// ============================================================================
// Helpers
// ============================================================================

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

// ============================================================================
// FileAttachment
// ============================================================================

export function FileAttachment({ adapter, compact = false, className }: FileAttachmentProps) {
  const { file, onDownload, onPreview, onForward, onDelete } = adapter
  const isImage = file.category === 'image'
  const isVideo = file.category === 'video'
  const canPreview = (isImage || isVideo) && (onPreview != null)
  const [isHovered, setIsHovered] = React.useState(false)

  // ── Compact row ──────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div
        className={cn('group flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors', className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <FileIcon2 category={file.category} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium">{file.name}</div>
          <div className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</div>
        </div>
        {isHovered && (
          <div className="flex items-center gap-1">
            {canPreview && (
              <button type="button" onClick={() => onPreview(file)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Preview">
                <EyeIcon />
              </button>
            )}
            {onDownload && (
              <button type="button" onClick={() => onDownload(file)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Download">
                <DownloadIcon />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Image / video card ────────────────────────────────────────────────────
  if (isImage && file.url) {
    return (
      <div
        className={cn('group relative overflow-hidden rounded-xl border', className)}
        style={{ maxWidth: '320px' }}
      >
        <img
          src={file.url}
          alt={file.name}
          className="w-full object-cover"
          style={{ maxHeight: '240px', objectFit: 'cover' }}
        />
        {/* Overlay actions */}
        <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-white text-xs truncate max-w-[60%]">{file.name} · {formatBytes(file.sizeBytes)}</div>
          <div className="flex items-center gap-1">
            {canPreview && (
              <button type="button" onClick={() => onPreview(file)} className="rounded p-1 bg-black/30 hover:bg-black/50 text-white" aria-label="Preview">
                <EyeIcon />
              </button>
            )}
            {onDownload && (
              <button type="button" onClick={() => onDownload(file)} className="rounded p-1 bg-black/30 hover:bg-black/50 text-white" aria-label="Download">
                <DownloadIcon />
              </button>
            )}
            {onForward && (
              <button type="button" onClick={() => onForward(file)} className="rounded p-1 bg-black/30 hover:bg-black/50 text-white" aria-label="Forward">
                <ForwardIcon />
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={() => onDelete(file)} className="rounded p-1 bg-black/30 hover:bg-black/50 text-white" aria-label="Delete">
                <TrashIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Generic file card ─────────────────────────────────────────────────────
  return (
    <div
      className={cn('group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted/30 transition-colors', className)}
      style={{ maxWidth: '320px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <FileIcon2 category={file.category} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{file.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{formatBytes(file.sizeBytes)}</div>
      </div>
      {isHovered && (
        <div className="flex items-center gap-0.5 shrink-0">
          {canPreview && (
            <button type="button" onClick={() => onPreview(file)} className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Preview">
              <EyeIcon />
            </button>
          )}
          {onDownload && (
            <button type="button" onClick={() => onDownload(file)} className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Download">
              <DownloadIcon />
            </button>
          )}
          {onForward && (
            <button type="button" onClick={() => onForward(file)} className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Forward">
              <ForwardIcon />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={() => onDelete(file)} className="rounded p-1.5 hover:bg-muted text-destructive hover:text-destructive" aria-label="Delete">
              <TrashIcon />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
