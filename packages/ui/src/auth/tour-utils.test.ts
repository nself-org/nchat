/**
 * Tests for auth/tour-utils — pure DOM helper functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getElementPosition, calculateTooltipPosition, scrollToElement } from './tour-utils'

// ============================================================================
// getElementPosition
// ============================================================================

describe('getElementPosition()', () => {
  it('returns null for a selector that matches nothing', () => {
    expect(getElementPosition('#does-not-exist')).toBeNull()
  })

  it('returns a position object for an existing element', () => {
    const el = document.createElement('div')
    el.id = 'test-el'
    document.body.appendChild(el)
    // jsdom always returns 0-rect from getBoundingClientRect
    const pos = getElementPosition('#test-el')
    expect(pos).not.toBeNull()
    expect(pos).toHaveProperty('top')
    expect(pos).toHaveProperty('left')
    expect(pos).toHaveProperty('width')
    expect(pos).toHaveProperty('height')
    expect(pos).toHaveProperty('bottom')
    expect(pos).toHaveProperty('right')
    document.body.removeChild(el)
  })

  it('returns null for empty selector string', () => {
    // document.querySelector('') throws — function should return null
    expect(getElementPosition('')).toBeNull()
  })
})

// ============================================================================
// calculateTooltipPosition
// ============================================================================

const mockElement = { top: 100, left: 200, width: 80, height: 40, bottom: 140, right: 280 }

describe('calculateTooltipPosition()', () => {
  it('returns center position for placement=center', () => {
    const pos = calculateTooltipPosition(mockElement, 'center')
    expect(pos.top).toBe('50%')
    expect(pos.left).toBe('50%')
    expect(pos.transform).toBe('translate(-50%, -50%)')
  })

  it('returns center position for unknown placement (default)', () => {
    // @ts-expect-error intentional invalid placement
    const pos = calculateTooltipPosition(mockElement, 'diagonal')
    expect(pos.top).toBe('50%')
    expect(pos.left).toBe('50%')
  })

  it('returns top position object for placement=top', () => {
    const pos = calculateTooltipPosition(mockElement, 'top')
    expect(pos).toHaveProperty('bottom')
    expect(pos).toHaveProperty('left')
    expect(pos.top).toBeUndefined()
  })

  it('returns bottom position object for placement=bottom', () => {
    const pos = calculateTooltipPosition(mockElement, 'bottom')
    expect(pos).toHaveProperty('top')
    expect(pos).toHaveProperty('left')
    expect(pos.bottom).toBeUndefined()
  })

  it('returns left position object for placement=left', () => {
    const pos = calculateTooltipPosition(mockElement, 'left')
    expect(pos).toHaveProperty('top')
    expect(pos).toHaveProperty('right')
    expect(pos.left).toBeUndefined()
  })

  it('returns right position object for placement=right', () => {
    const pos = calculateTooltipPosition(mockElement, 'right')
    expect(pos).toHaveProperty('top')
    expect(pos).toHaveProperty('left')
    // left = elementPos.left + elementPos.width + 16 = 200 + 80 + 16 = 296
    expect(pos.left).toBe(296)
  })

  it('clamps left position to minimum padding for top placement', () => {
    // element far left — computed left would be negative
    const edgeEl = { top: 100, left: 0, width: 10, height: 40, bottom: 140, right: 10 }
    const pos = calculateTooltipPosition(edgeEl, 'top', 300)
    // max(16, ...) clamps to 16
    expect(pos.left as number).toBeGreaterThanOrEqual(16)
  })

  it('clamps top position to minimum padding for left placement', () => {
    const edgeEl = { top: 0, left: 200, width: 80, height: 10, bottom: 10, right: 280 }
    const pos = calculateTooltipPosition(edgeEl, 'left', 300, 400)
    expect(pos.top as number).toBeGreaterThanOrEqual(16)
  })
})

// ============================================================================
// scrollToElement
// ============================================================================

describe('scrollToElement()', () => {
  it('does not throw for an element that does not exist', () => {
    expect(() => scrollToElement('#no-such-element')).not.toThrow()
  })

  it('calls scrollIntoView when element exists', () => {
    const el = document.createElement('div')
    el.id = 'scroll-target'
    const scrollIntoView = vi.fn()
    el.scrollIntoView = scrollIntoView
    document.body.appendChild(el)
    scrollToElement('#scroll-target')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    document.body.removeChild(el)
  })
})
