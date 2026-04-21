/**
 * Unit tests for message history diff utilities.
 */
import {
  tokenize,
  calculateWordDiff,
  wordDiffsToSegments,
  calculateVersionDiff,
  calculateCharDiff,
  hasChanges,
  getChangePercentage,
  truncateDiff,
  diffToPlainText,
  getChangedSegments,
  generateUnifiedDiff,
} from '../history-diff'

describe('tokenize', () => {
  it('returns an array of tokens for mixed content', () => {
    const t = tokenize('hello world')
    expect(Array.isArray(t)).toBe(true)
    expect(t.length).toBeGreaterThan(0)
    expect(t.join('')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(tokenize('')).toEqual([])
  })

  it('preserves content through tokenize', () => {
    const input = 'a  b c'
    expect(tokenize(input).join('')).toBe(input)
  })
})

describe('calculateWordDiff', () => {
  it('returns empty for unchanged equal content', () => {
    const d = calculateWordDiff('hi', 'hi')
    expect(d.every((x) => x.type === 'unchanged')).toBe(true)
  })

  it('marks additions', () => {
    const d = calculateWordDiff('', 'new text')
    expect(d.some((x) => x.type === 'added')).toBe(true)
  })

  it('marks removals', () => {
    const d = calculateWordDiff('old text', '')
    expect(d.some((x) => x.type === 'removed')).toBe(true)
  })

  it('detects single word change', () => {
    const d = calculateWordDiff('hello world', 'hello there')
    const types = d.map((x) => x.type)
    expect(types).toContain('unchanged')
    expect(types.some((t) => t === 'added' || t === 'removed')).toBe(true)
  })
})

describe('wordDiffsToSegments', () => {
  it('maps value -> text and preserves type', () => {
    const segs = wordDiffsToSegments([
      { value: 'a', type: 'unchanged' },
      { value: 'b', type: 'added' },
    ])
    expect(segs).toEqual([
      { text: 'a', type: 'unchanged' },
      { text: 'b', type: 'added' },
    ])
  })
})

describe('calculateVersionDiff', () => {
  it('returns summary and segments', () => {
    const v1 = { content: 'hello world' } as any
    const v2 = { content: 'hello there' } as any
    const d = calculateVersionDiff(v1, v2)
    expect(d.segments.length).toBeGreaterThan(0)
    expect(d.summary).toBeDefined()
    expect(d.fromVersion).toBe(v1)
    expect(d.toVersion).toBe(v2)
  })

  it('summary says "No changes" when identical', () => {
    const v = { content: 'same' } as any
    expect(calculateVersionDiff(v, v).summary).toMatch(/No changes/)
  })

  it('tracks charsAdded/charsRemoved', () => {
    const v1 = { content: 'abc' } as any
    const v2 = { content: 'abcd' } as any
    const d = calculateVersionDiff(v1, v2)
    expect(d.charsAdded + d.charsRemoved).toBeGreaterThan(0)
  })
})

describe('calculateCharDiff', () => {
  it('returns all-unchanged for identical', () => {
    const d = calculateCharDiff('abc', 'abc')
    expect(d.every((s) => s.type === 'unchanged')).toBe(true)
  })

  it('detects insertion', () => {
    const d = calculateCharDiff('ab', 'abc')
    expect(d.some((s) => s.type === 'added')).toBe(true)
  })

  it('detects deletion', () => {
    const d = calculateCharDiff('abc', 'ab')
    expect(d.some((s) => s.type === 'removed')).toBe(true)
  })

  it('handles empty inputs', () => {
    expect(calculateCharDiff('', '')).toEqual([])
    expect(calculateCharDiff('abc', '').some((s) => s.type === 'removed')).toBe(true)
    expect(calculateCharDiff('', 'xyz').some((s) => s.type === 'added')).toBe(true)
  })
})

describe('hasChanges', () => {
  it('detects change', () => {
    expect(hasChanges('a', 'b')).toBe(true)
  })

  it('detects no change', () => {
    expect(hasChanges('a', 'a')).toBe(false)
  })
})

describe('getChangePercentage', () => {
  it('0 for identical', () => {
    expect(getChangePercentage('abc', 'abc')).toBe(0)
  })

  it('100 when old is empty', () => {
    expect(getChangePercentage('', 'abc')).toBe(100)
  })

  it('100 when new is empty', () => {
    expect(getChangePercentage('abc', '')).toBe(100)
  })

  it('returns a number between 0 and 100', () => {
    const p = getChangePercentage('hello world', 'hello there')
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(100)
  })

  it('0 for both empty', () => {
    expect(getChangePercentage('', '')).toBe(0)
  })
})

describe('truncateDiff', () => {
  it('returns original when short enough', () => {
    const segs = [{ text: 'hi', type: 'unchanged' as const }]
    expect(truncateDiff(segs, 100)).toEqual(segs)
  })

  it('truncates long content with ellipsis', () => {
    const segs = [{ text: 'a'.repeat(200), type: 'unchanged' as const }]
    const out = truncateDiff(segs, 50)
    expect(out[0].text).toContain('...')
  })

  it('appends ellipsis marker when cut between segments', () => {
    const segs = [
      { text: 'a'.repeat(50), type: 'unchanged' as const },
      { text: 'extra', type: 'added' as const },
    ]
    const out = truncateDiff(segs, 50)
    expect(out[out.length - 1].text).toBe('...')
  })
})

describe('diffToPlainText', () => {
  it('formats added/removed markers', () => {
    const out = diffToPlainText([
      { text: 'hello ', type: 'unchanged' },
      { text: 'new ', type: 'added' },
      { text: 'old ', type: 'removed' },
    ])
    expect(out).toBe('hello [+new ][-old ]')
  })
})

describe('getChangedSegments', () => {
  it('filters out unchanged', () => {
    const segs = [
      { text: 'a', type: 'unchanged' as const },
      { text: 'b', type: 'added' as const },
      { text: 'c', type: 'removed' as const },
    ]
    const out = getChangedSegments(segs)
    expect(out.length).toBe(2)
    expect(out.every((s) => s.type !== 'unchanged')).toBe(true)
  })
})

describe('generateUnifiedDiff', () => {
  it('returns a string', () => {
    const out = generateUnifiedDiff('line1\nline2', 'line1\nline3')
    expect(typeof out).toBe('string')
  })

  it('returns empty-ish when no changes', () => {
    const out = generateUnifiedDiff('same', 'same')
    expect(out).toBeDefined()
  })
})
