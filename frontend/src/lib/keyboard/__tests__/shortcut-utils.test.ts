/**
 * Unit tests for keyboard shortcut utilities.
 */
import {
  isMacOS,
  isWindows,
  isLinux,
  getPlatform,
  parseShortcut,
  matchesShortcut,
  formatShortcut,
  formatKeyArray,
  formatKey,
  splitShortcutForDisplay,
  isValidShortcut,
  shortcutsConflict,
  getModifierKeyText,
  getModifierKeySymbol,
  createShortcut,
  eventToShortcut,
  isInputElement,
  shouldIgnoreShortcut,
} from '../shortcut-utils'

function kev(partial: any): KeyboardEvent {
  return {
    key: partial.key ?? '',
    code: partial.code ?? (partial.key?.length === 1 ? `Key${partial.key.toUpperCase()}` : partial.key),
    ctrlKey: !!partial.ctrlKey,
    altKey: !!partial.altKey,
    shiftKey: !!partial.shiftKey,
    metaKey: !!partial.metaKey,
    target: partial.target,
  } as any
}

describe('platform detection', () => {
  it('returns booleans', () => {
    expect(typeof isMacOS()).toBe('boolean')
    expect(typeof isWindows()).toBe('boolean')
    expect(typeof isLinux()).toBe('boolean')
  })

  it('getPlatform returns one of four values', () => {
    expect(['mac', 'windows', 'linux', 'unknown']).toContain(getPlatform())
  })
})

describe('parseShortcut', () => {
  it('parses mod+shift+k', () => {
    const p = parseShortcut('mod+shift+k')
    expect(p.modifiers).toEqual(expect.arrayContaining(['mod', 'shift']))
    expect(p.key).toBe('k')
    expect(p.original).toBe('mod+shift+k')
  })

  it('normalizes command/meta modifiers', () => {
    expect(parseShortcut('command+p').modifiers).toContain('mod')
    expect(parseShortcut('meta+p').modifiers).toContain('meta')
  })

  it('normalizes control to ctrl', () => {
    expect(parseShortcut('control+p').modifiers).toContain('ctrl')
  })

  it('normalizes option to alt', () => {
    expect(parseShortcut('option+x').modifiers).toContain('alt')
  })

  it('dedupes modifiers', () => {
    const p = parseShortcut('shift+shift+k')
    expect(p.modifiers.filter((m) => m === 'shift').length).toBe(1)
  })

  it('sorts modifiers consistently', () => {
    const a = parseShortcut('shift+mod+k')
    const b = parseShortcut('mod+shift+k')
    expect(a.modifiers).toEqual(b.modifiers)
  })

  it('handles key-only shortcut', () => {
    const p = parseShortcut('k')
    expect(p.key).toBe('k')
    expect(p.modifiers).toEqual([])
  })
})

describe('matchesShortcut', () => {
  it('returns a boolean', () => {
    expect(typeof matchesShortcut(kev({ key: 'k' }), 'k')).toBe('boolean')
  })

  it('matches plain key', () => {
    expect(matchesShortcut(kev({ key: 'k' }), 'k')).toBe(true)
  })

  it('rejects when key differs', () => {
    expect(matchesShortcut(kev({ key: 'x' }), 'k')).toBe(false)
  })

  it('requires alt when shortcut has alt', () => {
    expect(matchesShortcut(kev({ key: 'k' }), 'alt+k')).toBe(false)
    expect(matchesShortcut(kev({ key: 'k', altKey: true }), 'alt+k')).toBe(true)
  })

  it('requires shift when shortcut has shift', () => {
    expect(matchesShortcut(kev({ key: 'k' }), 'shift+k')).toBe(false)
    expect(matchesShortcut(kev({ key: 'k', shiftKey: true }), 'shift+k')).toBe(true)
  })

  it('rejects when extra shift pressed', () => {
    expect(matchesShortcut(kev({ key: 'k', shiftKey: true }), 'k')).toBe(false)
  })

  it('matches via code', () => {
    expect(matchesShortcut(kev({ key: 'k', code: 'KeyK' }), 'k')).toBe(true)
  })
})

describe('formatShortcut', () => {
  it('produces a non-empty string', () => {
    expect(formatShortcut('mod+k').length).toBeGreaterThan(0)
  })

  it('uses + separator for non-Mac', () => {
    const out = formatShortcut('mod+k', { useMacSymbols: false })
    expect(out).toContain('+')
    expect(out).toContain('K')
  })

  it('omits separator on Mac symbols', () => {
    const out = formatShortcut('mod+k', { useMacSymbols: true })
    expect(out.length).toBeGreaterThan(1)
  })

  it('respects custom separator', () => {
    expect(formatShortcut('mod+k', { useMacSymbols: false, separator: '-' })).toContain('-')
  })

  it('handles non-uppercase', () => {
    expect(formatShortcut('mod+k', { useMacSymbols: false, uppercase: false })).toContain('k')
  })
})

describe('formatKeyArray / splitShortcutForDisplay', () => {
  it('formatKeyArray joins correctly', () => {
    expect(formatKeyArray(['mod', 'k'], { useMacSymbols: false })).toContain('K')
  })

  it('splitShortcutForDisplay returns array', () => {
    const parts = splitShortcutForDisplay('mod+shift+k', false)
    expect(parts.length).toBeGreaterThanOrEqual(3)
  })
})

describe('formatKey', () => {
  it('uppercases single letters', () => {
    expect(formatKey('k', false)).toBe('K')
  })

  it('uppercases function keys', () => {
    expect(formatKey('f1', false)).toBe('F1')
  })

  it('maps known special keys', () => {
    expect(formatKey('enter', false)).toBe('Enter')
  })

  it('passes through unknown multi-char keys', () => {
    expect(formatKey('xyz', false)).toBe('xyz')
  })
})

describe('isValidShortcut', () => {
  it('accepts valid forms', () => {
    expect(isValidShortcut('k')).toBe(true)
    expect(isValidShortcut('mod+k')).toBe(true)
  })

  it('rejects invalid forms', () => {
    expect(isValidShortcut('')).toBe(false)
    expect(isValidShortcut('mod+shift')).toBe(false)
    expect(isValidShortcut(null as any)).toBe(false)
  })
})

describe('shortcutsConflict', () => {
  it('detects identical', () => {
    expect(shortcutsConflict('mod+k', 'mod+k')).toBe(true)
  })

  it('is order-insensitive for modifiers', () => {
    expect(shortcutsConflict('mod+shift+k', 'shift+mod+k')).toBe(true)
  })

  it('rejects when modifier count differs', () => {
    expect(shortcutsConflict('mod+k', 'k')).toBe(false)
  })

  it('rejects when a modifier differs', () => {
    expect(shortcutsConflict('mod+k', 'alt+k')).toBe(false)
  })

  it('rejects when key differs', () => {
    expect(shortcutsConflict('mod+k', 'mod+j')).toBe(false)
  })
})

describe('getModifierKeyText / Symbol', () => {
  it('returns strings', () => {
    expect(typeof getModifierKeyText()).toBe('string')
    expect(typeof getModifierKeySymbol()).toBe('string')
  })
})

describe('createShortcut', () => {
  it('joins modifiers and key', () => {
    expect(createShortcut(['mod', 'shift'], 'k')).toBe('mod+shift+k')
  })
})

describe('eventToShortcut', () => {
  it('includes modifiers', () => {
    const out = eventToShortcut(kev({ key: 'k', ctrlKey: !isMacOS(), metaKey: isMacOS() }))
    expect(out).toContain('mod')
    expect(out).toContain('k')
  })

  it('returns empty on modifier-only press', () => {
    expect(eventToShortcut(kev({ key: 'Control' }))).toBe('')
    expect(eventToShortcut(kev({ key: 'Shift' }))).toBe('')
  })

  it('maps space', () => {
    expect(eventToShortcut(kev({ key: ' ' }))).toContain('space')
  })

  it('includes alt/shift', () => {
    const out = eventToShortcut(kev({ key: 'k', altKey: true, shiftKey: true }))
    expect(out).toContain('alt')
    expect(out).toContain('shift')
  })
})

describe('isInputElement', () => {
  it('detects input / textarea / select', () => {
    expect(isInputElement(document.createElement('input'))).toBe(true)
    expect(isInputElement(document.createElement('textarea'))).toBe(true)
    expect(isInputElement(document.createElement('select'))).toBe(true)
  })

  it('rejects non-input', () => {
    expect(isInputElement(document.createElement('div'))).toBe(false)
  })

  it('handles null', () => {
    expect(isInputElement(null)).toBe(false)
  })
})

describe('shouldIgnoreShortcut', () => {
  it('ignores when in input', () => {
    const input = document.createElement('input')
    expect(shouldIgnoreShortcut(kev({ key: 'k', target: input }) as any)).toBe(true)
  })

  it('allows Escape in inputs', () => {
    const input = document.createElement('input')
    expect(shouldIgnoreShortcut(kev({ key: 'Escape', target: input }) as any)).toBe(false)
  })

  it('does not ignore when enableOnInputs', () => {
    const input = document.createElement('input')
    expect(
      shouldIgnoreShortcut(kev({ key: 'k', target: input }) as any, { enableOnInputs: true })
    ).toBe(false)
  })

  it('ignores on div with no contenteditable', () => {
    const div = document.createElement('div')
    expect(shouldIgnoreShortcut(kev({ key: 'k', target: div }) as any)).toBe(false)
  })
})
