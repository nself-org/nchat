/**
 * Tests for primitives/badge — Badge + UnreadBadge
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Badge, UnreadBadge } from './badge'

// ============================================================================
// Badge
// ============================================================================

describe('Badge', () => {
  it('renders label text', () => {
    render(<Badge label="Active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies default variant classes', () => {
    const { container } = render(<Badge label="Default" />)
    expect(container.firstChild).toHaveClass('bg-muted')
  })

  it('applies blue variant classes', () => {
    const { container } = render(<Badge label="Info" variant="blue" />)
    expect(container.firstChild).toHaveClass('bg-blue-100')
  })

  it('applies green variant classes', () => {
    const { container } = render(<Badge label="OK" variant="green" />)
    expect(container.firstChild).toHaveClass('bg-green-100')
  })

  it('applies red variant classes', () => {
    const { container } = render(<Badge label="Error" variant="red" />)
    expect(container.firstChild).toHaveClass('bg-red-100')
  })

  it('applies yellow variant classes', () => {
    const { container } = render(<Badge label="Warn" variant="yellow" />)
    expect(container.firstChild).toHaveClass('bg-yellow-100')
  })

  it('applies purple variant classes', () => {
    const { container } = render(<Badge label="Pro" variant="purple" />)
    expect(container.firstChild).toHaveClass('bg-purple-100')
  })

  it('applies pink variant classes', () => {
    const { container } = render(<Badge label="New" variant="pink" />)
    expect(container.firstChild).toHaveClass('bg-pink-100')
  })

  it('applies orange variant classes', () => {
    const { container } = render(<Badge label="Beta" variant="orange" />)
    expect(container.firstChild).toHaveClass('bg-orange-100')
  })

  it('falls back to default for unknown variant', () => {
    // @ts-expect-error intentional invalid variant
    const { container } = render(<Badge label="X" variant="unknown" />)
    expect(container.firstChild).toHaveClass('bg-muted')
  })

  it('renders dot indicator when dot=true', () => {
    const { container } = render(<Badge label="Online" dot />)
    // The dot is a <span> sibling to the label text
    const spans = container.querySelectorAll('span > span')
    expect(spans).toHaveLength(1)
    expect(spans[0]).toHaveClass('rounded-full')
  })

  it('does not render dot when dot=false', () => {
    const { container } = render(<Badge label="Offline" dot={false} />)
    const spans = container.querySelectorAll('span > span')
    expect(spans).toHaveLength(0)
  })

  it('applies sm size class', () => {
    const { container } = render(<Badge label="sm" size="sm" />)
    expect(container.firstChild).toHaveClass('px-1.5')
  })

  it('applies md size class (default)', () => {
    const { container } = render(<Badge label="md" />)
    expect(container.firstChild).toHaveClass('px-2')
  })

  it('applies extra className', () => {
    const { container } = render(<Badge label="X" className="extra" />)
    expect(container.firstChild).toHaveClass('extra')
  })
})

// ============================================================================
// UnreadBadge
// ============================================================================

describe('UnreadBadge', () => {
  it('renders count when > 0', () => {
    render(<UnreadBadge count={5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders 99+ when count > 99', () => {
    render(<UnreadBadge count={100} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('renders 99 exactly when count = 99', () => {
    render(<UnreadBadge count={99} />)
    expect(screen.getByText('99')).toBeInTheDocument()
  })

  it('returns null when count is 0', () => {
    const { container } = render(<UnreadBadge count={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when count is negative', () => {
    const { container } = render(<UnreadBadge count={-1} />)
    expect(container.firstChild).toBeNull()
  })

  it('applies custom className', () => {
    const { container } = render(<UnreadBadge count={3} className="my-cls" />)
    expect(container.firstChild).toHaveClass('my-cls')
  })
})
