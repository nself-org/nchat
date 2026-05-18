/**
 * Tests for primitives/empty-state — EmptyState
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No messages yet" />)
    expect(screen.getByText('No messages yet')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Start the conversation." />)
    expect(screen.getByText('Start the conversation.')).toBeInTheDocument()
  })

  it('does not render description when omitted', () => {
    render(<EmptyState title="Empty" />)
    // Only one <p> element — the title
    const paras = screen.getAllByRole('paragraph')
    expect(paras).toHaveLength(1)
  })

  it('renders default icon when icon is not provided', () => {
    const { container } = render(<EmptyState title="Empty" />)
    // Default icon is an SVG
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders custom icon', () => {
    const CustomIcon = () => <span data-testid="custom-icon">icon</span>
    render(<EmptyState title="Empty" icon={<CustomIcon />} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('renders action button when action is provided', () => {
    const onClick = vi.fn()
    render(<EmptyState title="Empty" action={{ label: 'Start', onClick }} />)
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('calls action.onClick when button is clicked', () => {
    const onClick = vi.fn()
    render(<EmptyState title="Empty" action={{ label: 'Go', onClick }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not render action button when action is not provided', () => {
    render(<EmptyState title="Empty" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('applies custom className', () => {
    const { container } = render(<EmptyState title="Empty" className="my-empty" />)
    expect(container.firstChild).toHaveClass('my-empty')
  })
})
