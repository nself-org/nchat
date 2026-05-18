/**
 * Search input — injectable, no store/lucide deps.
 *
 * @module search/search-input
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

// ============================================================================
// Icons
// ============================================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-3 w-3', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4 animate-spin', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

// ============================================================================
// SearchInput
// ============================================================================

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  isLoading?: boolean
  shortcutHint?: string
  showClear?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onSubmit, isLoading = false, shortcutHint, showClear = true, size = 'md', className, placeholder = 'Search…', autoFocus, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    React.useEffect(() => {
      if (autoFocus && inputRef.current) inputRef.current.focus()
    }, [autoFocus])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') { e.preventDefault(); onSubmit?.() }
      if (e.key === 'Escape') { e.preventDefault(); onChange(''); inputRef.current?.blur() }
    }

    const sizeH = size === 'sm' ? 'h-8 text-sm' : size === 'lg' ? 'h-12 text-base' : 'h-10 text-sm'
    const pl = size === 'lg' ? 'pl-12' : 'pl-10'
    const pr = 'pr-10'

    return (
      <div className={cn('relative w-full', className)}>
        <span className={cn('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground', size === 'lg' && 'left-4')}>
          {isLoading ? <LoaderIcon /> : <SearchIcon />}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'w-full rounded-md border bg-muted/50 outline-none transition-colors',
            'focus:border-input focus:bg-background focus:ring-2 focus:ring-ring',
            sizeH, pl, pr, props.disabled && 'cursor-not-allowed opacity-60'
          )}
          {...props}
        />

        <div className={cn('absolute right-2 top-1/2 -translate-y-1/2 flex items-center')}>
          {value && showClear ? (
            <button
              type="button"
              onClick={() => { onChange(''); inputRef.current?.focus() }}
              className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted"
              aria-label="Clear search"
            >
              <XIcon />
            </button>
          ) : shortcutHint && !value ? (
            <kbd className="pointer-events-none rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              {shortcutHint}
            </kbd>
          ) : null}
        </div>
      </div>
    )
  }
)
SearchInput.displayName = 'SearchInput'
