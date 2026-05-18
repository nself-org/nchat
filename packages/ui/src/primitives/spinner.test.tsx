/**
 * Tests for primitives/spinner — Spinner + Skeleton
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Spinner, Skeleton } from './spinner'

// ============================================================================
// Spinner
// ============================================================================

describe('Spinner', () => {
  it('renders with default label', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading…')).toBeInTheDocument()
  })

  it('renders with custom label', () => {
    render(<Spinner label="Please wait…" />)
    expect(screen.getByLabelText('Please wait…')).toBeInTheDocument()
  })

  it('applies size class xs', () => {
    const { container } = render(<Spinner size="xs" />)
    const svg = container.querySelector('svg')
    const cls = svg?.getAttribute('class') ?? ''
    expect(cls).toContain('h-3')
    expect(cls).toContain('w-3')
  })

  it('applies size class sm', () => {
    const { container } = render(<Spinner size="sm" />)
    const cls = container.querySelector('svg')?.getAttribute('class') ?? ''
    expect(cls).toContain('h-4')
  })

  it('applies size class md (default)', () => {
    const { container } = render(<Spinner />)
    const cls = container.querySelector('svg')?.getAttribute('class') ?? ''
    expect(cls).toContain('h-5')
  })

  it('applies size class lg', () => {
    const { container } = render(<Spinner size="lg" />)
    const cls = container.querySelector('svg')?.getAttribute('class') ?? ''
    expect(cls).toContain('h-7')
  })

  it('applies extra className', () => {
    const { container } = render(<Spinner className="my-custom" />)
    expect(container.firstChild).toHaveClass('my-custom')
  })

  it('has animate-spin on svg', () => {
    const { container } = render(<Spinner />)
    const cls = container.querySelector('svg')?.getAttribute('class') ?? ''
    expect(cls).toContain('animate-spin')
  })
})

// ============================================================================
// Skeleton
// ============================================================================

describe('Skeleton', () => {
  it('renders a single skeleton block by default', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('animate-pulse')
  })

  it('renders circle variant with rounded-full', () => {
    const { container } = render(<Skeleton circle />)
    expect(container.firstChild).toHaveClass('rounded-full')
  })

  it('renders non-circle with rounded (not full)', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('rounded')
    expect(el.className).not.toContain('rounded-full')
  })

  it('renders multiple lines when lines > 1', () => {
    const { container } = render(<Skeleton lines={3} />)
    // The wrapper is div.space-y-2; its direct children are the line divs.
    const wrapper = container.querySelector('.space-y-2')
    expect(wrapper?.children).toHaveLength(3)
  })

  it('last line in multi-line is 3/4 width', () => {
    const { container } = render(<Skeleton lines={2} />)
    const wrapper = container.querySelector('.space-y-2')
    const lastLine = wrapper?.children[1] as HTMLElement | undefined
    expect(lastLine?.getAttribute('class')).toContain('w-3/4')
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
