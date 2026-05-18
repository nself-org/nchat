/**
 * Tests for components/Avatar
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders an img element', () => {
    render(<Avatar src="https://example.com/img.png" alt="Alice" />)
    const img = screen.getByRole('img', { name: 'Alice' })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/img.png')
  })

  it('uses default size 32 when size not provided', () => {
    render(<Avatar src="https://example.com/img.png" alt="Bob" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('width', '32')
    expect(img).toHaveAttribute('height', '32')
  })

  it('applies custom size', () => {
    render(<Avatar src="https://example.com/img.png" alt="Carol" size={64} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('width', '64')
    expect(img).toHaveAttribute('height', '64')
  })

  it('sets empty alt text when alt is not provided', () => {
    // An img with alt="" has role="presentation" (decorative) — not queryable by role.
    // Use querySelector to find the actual DOM element.
    const { container } = render(<Avatar src="https://example.com/img.png" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('alt', '')
  })
})
