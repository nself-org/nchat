/**
 * FileIcon — category-based icon, no external deps.
 *
 * @module files/file-icon
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { FileCategory } from './types'

// ============================================================================
// Props
// ============================================================================

export interface FileIconProps {
  category: FileCategory
  mimeType?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

// ============================================================================
// SVG icons per category
// ============================================================================

function ImgIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
}

function VideoIconSvg({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
}

function AudioIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
}

function DocIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
}

function ArchiveIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
}

function CodeIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
}

function FileIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
}

const CATEGORY_META: Record<FileCategory, { icon: React.FC<{ className?: string }>; bg: string; text: string }> = {
  image:    { icon: ImgIcon,       bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-600 dark:text-blue-400' },
  video:    { icon: VideoIconSvg,  bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  audio:    { icon: AudioIcon,     bg: 'bg-pink-100 dark:bg-pink-900/30',    text: 'text-pink-600 dark:text-pink-400' },
  document: { icon: DocIcon,       bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  archive:  { icon: ArchiveIcon,   bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
  code:     { icon: CodeIcon,      bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-600 dark:text-green-400' },
  other:    { icon: FileIcon,      bg: 'bg-muted',                            text: 'text-muted-foreground' },
}

const SIZE_CLASSES = {
  sm: { wrapper: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { wrapper: 'h-10 w-10', icon: 'h-5 w-5' },
  lg: { wrapper: 'h-12 w-12', icon: 'h-6 w-6' },
}

export function FileIcon2({ category, className, size = 'md' }: FileIconProps) {
  const meta = CATEGORY_META[category]
  const Icon = meta.icon
  const s = SIZE_CLASSES[size]
  return (
    <span className={cn('inline-flex items-center justify-center rounded-lg', meta.bg, meta.text, s.wrapper, className)}>
      <Icon className={s.icon} />
    </span>
  )
}
