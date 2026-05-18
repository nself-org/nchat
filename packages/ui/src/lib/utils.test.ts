/**
 * Tests for lib/utils — cn() and debounce()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cn, debounce } from './utils'

// ============================================================================
// cn()
// ============================================================================

describe('cn()', () => {
  it('returns a single class string as-is', () => {
    expect(cn('px-4')).toBe('px-4')
  })

  it('merges multiple class strings', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('filters falsy values', () => {
    expect(cn('px-4', false, null, undefined, 'text-sm')).toBe('px-4 text-sm')
  })

  it('handles conditional classes', () => {
    const active = true
    expect(cn('btn', active && 'btn-active')).toBe('btn btn-active')
  })

  it('handles conditional classes — false branch', () => {
    const active = false
    expect(cn('btn', active && 'btn-active')).toBe('btn')
  })

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    // tailwind-merge resolves px conflicts — last px wins
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('')
  })

  it('handles array inputs from clsx', () => {
    expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2')
  })

  it('handles object syntax', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })
})

// ============================================================================
// debounce()
// ============================================================================

describe('debounce()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not call the function immediately', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('arg1')
    expect(fn).not.toHaveBeenCalled()
  })

  it('calls the function after the delay', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('arg1')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('arg1')
  })

  it('resets the timer on each call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('first')
    vi.advanceTimersByTime(50)
    debounced('second')
    vi.advanceTimersByTime(50)
    // Only 50ms since last call — not fired yet
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(50)
    // Now 100ms since last call — fires with last arg
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('second')
  })

  it('calls with multiple arguments', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 50)
    debounced('a', 'b', 'c')
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledWith('a', 'b', 'c')
  })

  it('can be called multiple times in sequence', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 50)
    debounced('first')
    vi.advanceTimersByTime(50)
    debounced('second')
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
