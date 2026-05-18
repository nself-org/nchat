/**
 * Tests for primitives/confirm-dialog — ConfirmDialog
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ConfirmDialog } from './confirm-dialog'

function baseProps(overrides = {}) {
  return {
    open: true,
    title: 'Delete channel?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
}

describe('ConfirmDialog', () => {
  it('renders when open=true', () => {
    render(<ConfirmDialog {...baseProps()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete channel?')).toBeInTheDocument()
  })

  it('does not render when open=false', () => {
    render(<ConfirmDialog {...baseProps({ open: false })} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders description when provided', () => {
    render(<ConfirmDialog {...baseProps({ description: 'This cannot be undone.' })} />)
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('does not render description when omitted', () => {
    render(<ConfirmDialog {...baseProps()} />)
    expect(screen.queryByText('This cannot be undone.')).toBeNull()
  })

  it('renders default confirm label', () => {
    render(<ConfirmDialog {...baseProps()} />)
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('renders custom confirm label', () => {
    render(<ConfirmDialog {...baseProps({ confirmLabel: 'Delete' })} />)
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('renders default cancel label', () => {
    render(<ConfirmDialog {...baseProps()} />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('renders custom cancel label', () => {
    render(<ConfirmDialog {...baseProps({ cancelLabel: 'Go back' })} />)
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...baseProps({ onConfirm })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...baseProps({ onCancel })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(<ConfirmDialog {...baseProps({ onCancel })} />)
    // The backdrop is the first fixed div after the outer wrapper
    const backdrop = container.querySelector('.fixed.inset-0.bg-background\\/80')
    if (backdrop) fireEvent.click(backdrop)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel on Escape keydown', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...baseProps({ onCancel })} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('does not call onCancel on Escape when closed', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...baseProps({ open: false, onCancel })} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('applies destructive styles when destructive=true', () => {
    render(<ConfirmDialog {...baseProps({ destructive: true, confirmLabel: 'Delete' })} />)
    const btn = screen.getByRole('button', { name: 'Delete' })
    expect(btn.className).toContain('bg-destructive')
  })

  it('applies primary styles when destructive=false (default)', () => {
    render(<ConfirmDialog {...baseProps({ confirmLabel: 'Save' })} />)
    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn.className).toContain('bg-primary')
  })

  it('has aria-modal=true', () => {
    render(<ConfirmDialog {...baseProps()} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('has aria-labelledby pointing to title', () => {
    render(<ConfirmDialog {...baseProps()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-title')
  })
})
