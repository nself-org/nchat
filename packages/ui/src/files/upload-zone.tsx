/**
 * Upload zone — drag-and-drop + file picker, injectable, no external deps.
 *
 * @module files/upload-zone
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { UploadItem } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface UploadZoneAdapter {
  items: UploadItem[]
  /** Max file size in bytes (default 100 MB) */
  maxSizeBytes?: number
  /** Accepted MIME types (e.g. ['image/*', 'application/pdf']) */
  accept?: string[]
  multiple?: boolean
  onFilesAdded: (files: File[]) => void
  onItemRemove: (id: string) => void
  onItemCancel?: (id: string) => void
}

export interface UploadZoneProps {
  adapter: UploadZoneAdapter
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function UploadIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-8 w-8', className)} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
}

function XIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}

function CheckIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
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
// UploadPreviewItem
// ============================================================================

interface UploadPreviewItemProps {
  item: UploadItem
  onRemove: () => void
  onCancel?: () => void
}

function UploadPreviewItem({ item, onRemove, onCancel }: UploadPreviewItemProps) {
  const statusColor = {
    pending: 'text-muted-foreground',
    uploading: 'text-primary',
    complete: 'text-green-600',
    error: 'text-destructive',
  }[item.status]

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      {/* Preview */}
      <div className="shrink-0">
        {item.previewUrl ? (
          <img src={item.previewUrl} alt={item.name} className="h-10 w-10 rounded object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground text-xs font-mono">
            {item.name.split('.').pop()?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{item.name}</div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{formatBytes(item.sizeBytes)}</span>
          {item.status === 'uploading' && (
            <span className={statusColor}>{item.progress}%</span>
          )}
          {item.status === 'error' && (
            <span className="text-destructive">{item.error ?? 'Upload failed'}</span>
          )}
        </div>
        {/* Progress bar */}
        {item.status === 'uploading' && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Status icon / remove */}
      <div className="shrink-0">
        {item.status === 'complete' ? (
          <CheckIcon className="text-green-600" />
        ) : item.status === 'uploading' ? (
          <button type="button" onClick={onCancel ?? onRemove} className="rounded p-0.5 hover:bg-muted text-muted-foreground" aria-label="Cancel upload">
            <XIcon />
          </button>
        ) : (
          <button type="button" onClick={onRemove} className="rounded p-0.5 hover:bg-muted text-muted-foreground" aria-label="Remove file">
            <XIcon />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// UploadZone
// ============================================================================

export function UploadZone({ adapter, className }: UploadZoneProps) {
  const { items, maxSizeBytes = 100 * 1024 * 1024, accept, multiple = true, onFilesAdded, onItemRemove, onItemCancel } = adapter
  const [isDragging, setIsDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.size <= maxSizeBytes)
    if (files.length > 0) onFilesAdded(files)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.size <= maxSizeBytes)
    if (files.length > 0) onFilesAdded(files)
    e.target.value = ''
  }

  const acceptStr = accept?.join(',')

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/40 hover:bg-muted/30'
        )}
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <UploadIcon className={cn('mb-3', isDragging ? 'text-primary' : 'text-muted-foreground')} />
        <p className="text-sm font-medium">
          {isDragging ? 'Drop files here' : 'Drag & drop files or click to upload'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Max {formatBytes(maxSizeBytes)}{accept ? ` · ${accept.join(', ')}` : ''}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={acceptStr}
          onChange={handleInputChange}
          className="sr-only"
        />
      </div>

      {/* Preview list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <UploadPreviewItem
              key={item.id}
              item={item}
              onRemove={() => onItemRemove(item.id)}
              onCancel={onItemCancel ? () => onItemCancel(item.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
