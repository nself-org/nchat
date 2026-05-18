/**
 * Tests for components/Button
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('applies custom className', () => {
    render(<Button className="my-btn">Save</Button>)
    expect(screen.getByRole('button')).toHaveClass('my-btn')
  })

  it('renders without onClick without error', () => {
    render(<Button>No handler</Button>)
    fireEvent.click(screen.getByRole('button'))
    // No error = pass
  })

  it('renders without children', () => {
    const { container } = render(<Button />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
