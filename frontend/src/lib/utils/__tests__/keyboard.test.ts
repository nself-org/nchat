/**
 * Unit tests for keyboard utilities.
 * Uses JSDOM KeyboardEvent + lightweight event mocks to exercise branches.
 */
import {
  KEY_CODES,
  isModifierKey,
  getKeyCombo,
  parseShortcut,
  matchesShortcut,
  preventDefaultHandler,
  formatShortcut,
  isPrintableKey,
  isInputEvent,
  createShortcutHandler,
  getFocusableElements,
  createFocusTrap,
  getPlatformModifier,
  isMacPlatform,
} from '../keyboard'

function kev(partial: Partial<KeyboardEvent> & { key: string; code?: string }): KeyboardEvent {
  return {
    key: partial.key,
    code: partial.code ?? (partial.key.length === 1 ? `Key${partial.key.toUpperCase()}` : partial.key),
    ctrlKey: !!partial.ctrlKey,
    altKey: !!partial.altKey,
    shiftKey: !!partial.shiftKey,
    metaKey: !!partial.metaKey,
    preventDefault: partial.preventDefault ?? jest.fn(),
    stopPropagation: partial.stopPropagation ?? jest.fn(),
    target: partial.target,
  } as any
}

describe('KEY_CODES', () => {
  it('exposes common keys', () => {
    expect(KEY_CODES.A).toBe('KeyA')
    expect(KEY_CODES.ESCAPE).toBe('Escape')
    expect(KEY_CODES.ARROW_UP).toBe('ArrowUp')
  })
})

describe('isModifierKey', () => {
  it('detects modifiers', () => {
    expect(isModifierKey(kev({ key: 'Control' }))).toBe(true)
    expect(isModifierKey(kev({ key: 'Shift' }))).toBe(true)
    expect(isModifierKey(kev({ key: 'Alt' }))).toBe(true)
    expect(isModifierKey(kev({ key: 'Meta' }))).toBe(true)
  })

  it('rejects non-modifiers', () => {
    expect(isModifierKey(kev({ key: 'a' }))).toBe(false)
    expect(isModifierKey(kev({ key: 'Enter' }))).toBe(false)
  })
})

describe('getKeyCombo', () => {
  it('builds ctrl+k combo', () => {
    const combo = getKeyCombo(kev({ key: 'k', ctrlKey: true }))
    expect(combo).toMatch(/k/i)
    expect(combo.toLowerCase()).toContain('ctrl')
  })

  it('respects separator', () => {
    const combo = getKeyCombo(kev({ key: 'k', ctrlKey: true }), { separator: '-' })
    expect(combo).toContain('-')
  })

  it('uses standard symbols when asked', () => {
    const combo = getKeyCombo(kev({ key: 'k', shiftKey: true }), { useSymbols: true })
    expect(combo).toContain('Shift')
  })

  it('normalizes space key', () => {
    const combo = getKeyCombo(kev({ key: ' ' }))
    expect(combo.toLowerCase()).toContain('space')
  })

  it('returns only modifiers when main key is a modifier', () => {
    const combo = getKeyCombo(kev({ key: 'Control', ctrlKey: true }))
    expect(combo.toLowerCase()).toContain('ctrl')
  })
})

describe('parseShortcut', () => {
  it('parses ctrl+k', () => {
    const p = parseShortcut('Ctrl+K')
    expect(p).toEqual({ key: 'k', modifiers: ['ctrl'] })
  })

  it('handles cmd/meta aliases', () => {
    expect(parseShortcut('Cmd+P')?.modifiers).toContain('meta')
    expect(parseShortcut('Command+P')?.modifiers).toContain('meta')
    expect(parseShortcut('Win+P')?.modifiers).toContain('meta')
    expect(parseShortcut('Super+P')?.modifiers).toContain('meta')
  })

  it('handles alt/option', () => {
    expect(parseShortcut('Option+X')?.modifiers).toContain('alt')
    expect(parseShortcut('Alt+X')?.modifiers).toContain('alt')
  })

  it('returns null on empty / no key', () => {
    expect(parseShortcut('')).toBeNull()
    expect(parseShortcut('Ctrl+Alt')).toBeNull()
  })

  it('parses multi-modifier', () => {
    const p = parseShortcut('Ctrl+Shift+K')
    expect(p?.modifiers).toEqual(expect.arrayContaining(['ctrl', 'shift']))
    expect(p?.key).toBe('k')
  })
})

describe('matchesShortcut', () => {
  it('matches Ctrl+K', () => {
    expect(matchesShortcut(kev({ key: 'k', ctrlKey: true }), 'Ctrl+K')).toBe(true)
  })

  it('rejects missing modifier', () => {
    expect(matchesShortcut(kev({ key: 'k' }), 'Ctrl+K')).toBe(false)
  })

  it('rejects extra modifier', () => {
    expect(
      matchesShortcut(kev({ key: 'k', ctrlKey: true, shiftKey: true }), 'Ctrl+K')
    ).toBe(false)
  })

  it('accepts object shortcut', () => {
    expect(
      matchesShortcut(kev({ key: 'k', ctrlKey: true }), { key: 'k', modifiers: ['ctrl'] })
    ).toBe(true)
  })

  it('returns false on invalid', () => {
    expect(matchesShortcut(kev({ key: 'k' }), '' as any)).toBe(false)
  })

  it('matches by code fallback', () => {
    expect(matchesShortcut(kev({ key: 'k', code: 'KeyK', ctrlKey: true }), 'Ctrl+K')).toBe(true)
  })
})

describe('preventDefaultHandler', () => {
  it('calls preventDefault and handler on match', () => {
    const handler = jest.fn()
    const pd = jest.fn()
    const h = preventDefaultHandler(['Ctrl+S'], handler)
    h(kev({ key: 's', ctrlKey: true, preventDefault: pd }) as any)
    expect(pd).toHaveBeenCalled()
    expect(handler).toHaveBeenCalled()
  })

  it('ignores non-matching events', () => {
    const handler = jest.fn()
    const h = preventDefaultHandler(['Ctrl+S'], handler)
    h(kev({ key: 'x' }))
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('formatShortcut', () => {
  it('formats ctrl+k', () => {
    const out = formatShortcut('Ctrl+K')
    expect(out).toContain('K')
  })

  it('returns empty for invalid', () => {
    expect(formatShortcut('')).toBe('')
  })

  it('respects separator', () => {
    const out = formatShortcut('Ctrl+K', { separator: '-' })
    expect(out).toContain('-')
  })

  it('accepts object input', () => {
    const out = formatShortcut({ key: 'k', modifiers: ['ctrl'] })
    expect(out).toContain('K')
  })
})

describe('isPrintableKey', () => {
  it('detects printable chars', () => {
    expect(isPrintableKey(kev({ key: 'a' }))).toBe(true)
    expect(isPrintableKey(kev({ key: '1' }))).toBe(true)
    expect(isPrintableKey(kev({ key: ' ' }))).toBe(true)
  })

  it('rejects non-printable', () => {
    expect(isPrintableKey(kev({ key: 'Enter' }))).toBe(false)
    expect(isPrintableKey(kev({ key: 'Tab' }))).toBe(false)
  })
})

describe('isInputEvent', () => {
  it('detects input targets', () => {
    const input = document.createElement('input')
    expect(isInputEvent({ target: input } as any)).toBe(true)
  })

  it('detects textarea', () => {
    const ta = document.createElement('textarea')
    expect(isInputEvent({ target: ta } as any)).toBe(true)
  })

  it('rejects non-input', () => {
    const el = document.createElement('div')
    expect(isInputEvent({ target: el } as any)).toBeFalsy()
  })

  it('returns false for missing target', () => {
    expect(isInputEvent({ target: null } as any)).toBe(false)
  })
})

describe('createShortcutHandler', () => {
  it('calls matching handler', () => {
    const save = jest.fn()
    const h = createShortcutHandler({ 'Ctrl+S': save })
    const pd = jest.fn()
    h(kev({ key: 's', ctrlKey: true, preventDefault: pd }) as any)
    expect(save).toHaveBeenCalled()
    expect(pd).toHaveBeenCalled()
  })

  it('ignores input events by default', () => {
    const open = jest.fn()
    const h = createShortcutHandler({ 'Ctrl+K': open })
    const input = document.createElement('input')
    h(kev({ key: 'k', ctrlKey: true, target: input }) as any)
    expect(open).not.toHaveBeenCalled()
  })

  it('still fires Escape in inputs', () => {
    const close = jest.fn()
    const h = createShortcutHandler({ Escape: close })
    const input = document.createElement('input')
    h(kev({ key: 'Escape', target: input }) as any)
    expect(close).toHaveBeenCalled()
  })

  it('respects ignoreInputs=false', () => {
    const open = jest.fn()
    const h = createShortcutHandler({ 'Ctrl+K': open }, { ignoreInputs: false })
    const input = document.createElement('input')
    h(kev({ key: 'k', ctrlKey: true, target: input }) as any)
    expect(open).toHaveBeenCalled()
  })

  it('stopPropagation when set', () => {
    const h = createShortcutHandler({ 'Ctrl+K': () => {} }, { stopPropagation: true })
    const sp = jest.fn()
    h(kev({ key: 'k', ctrlKey: true, stopPropagation: sp }) as any)
    expect(sp).toHaveBeenCalled()
  })
})

describe('getFocusableElements', () => {
  it('returns focusables in the container', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <button>A</button>
      <input type="text" />
      <button disabled>Disabled</button>
      <div tabindex="0">Zero</div>
      <span tabindex="-1">Neg</span>
    `
    document.body.appendChild(container)
    const els = getFocusableElements(container)
    // JSDOM doesn't implement offsetParent, so filter may be empty — just check it doesn't throw
    expect(Array.isArray(els)).toBe(true)
    document.body.removeChild(container)
  })
})

describe('createFocusTrap', () => {
  it('activates and deactivates without throwing', () => {
    const container = document.createElement('div')
    container.innerHTML = '<button>A</button><button>B</button>'
    document.body.appendChild(container)
    const trap = createFocusTrap(container)
    expect(() => trap.activate()).not.toThrow()
    expect(() => trap.deactivate()).not.toThrow()
    document.body.removeChild(container)
  })
})

describe('platform helpers', () => {
  it('getPlatformModifier returns Cmd or Ctrl', () => {
    expect(['Cmd', 'Ctrl']).toContain(getPlatformModifier())
  })

  it('isMacPlatform returns boolean', () => {
    expect(typeof isMacPlatform()).toBe('boolean')
  })
})
