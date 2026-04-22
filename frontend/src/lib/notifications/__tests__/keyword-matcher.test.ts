/**
 * Tests for keyword-matcher.
 */

import {
  escapeRegex,
  createKeywordPattern,
  matchKeyword,
  matchKeywords,
  hasKeywordMatch,
  highlightMatches,
  getHighlightedResult,
  createKeyword,
  validateKeyword,
  isDuplicateKeyword,
  getKeywordsForChannel,
  sortKeywords,
  searchKeywords,
  getKeywordStats,
} from '../keyword-matcher'
import type { KeywordNotification } from '../notification-types'

const kw = (overrides: Partial<KeywordNotification> = {}): KeywordNotification => ({
  id: 'k1',
  keyword: 'alert',
  caseSensitive: false,
  wholeWord: false,
  enabled: true,
  channelIds: [],
  createdAt: new Date('2024-01-01').toISOString(),
  ...overrides,
})

describe('escapeRegex', () => {
  it('escapes special characters', () => {
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c')
    expect(escapeRegex('(x)[y]')).toBe('\\(x\\)\\[y\\]')
  })
  it('returns plain text unchanged', () => {
    expect(escapeRegex('hello world')).toBe('hello world')
  })
})

describe('createKeywordPattern', () => {
  it('case-insensitive by default', () => {
    const p = createKeywordPattern('foo', {})
    expect(p.flags).toContain('i')
  })
  it('case-sensitive when requested', () => {
    const p = createKeywordPattern('foo', { caseSensitive: true })
    expect(p.flags).not.toContain('i')
  })
  it('wholeWord adds word boundaries', () => {
    const p = createKeywordPattern('cat', { wholeWord: true })
    expect(p.source).toContain('\\b')
    expect(p.test('scatter')).toBe(false)
    expect(p.test('the cat')).toBe(true)
  })
})

describe('matchKeyword', () => {
  it('finds basic matches', () => {
    const r = matchKeyword('hello alert world alert', kw())
    expect(r).toHaveLength(2)
    expect(r[0].position).toBe(6)
    expect(r[0].matchedText.toLowerCase()).toBe('alert')
  })
  it('returns [] when keyword disabled', () => {
    expect(matchKeyword('alert', kw({ enabled: false }))).toEqual([])
  })
  it('returns [] when keyword empty', () => {
    expect(matchKeyword('alert', kw({ keyword: '   ' }))).toEqual([])
  })
  it('respects wholeWord', () => {
    const r = matchKeyword('alerting scatter alert', kw({ keyword: 'alert', wholeWord: true }))
    expect(r).toHaveLength(1)
  })
  it('respects maxMatches', () => {
    const r = matchKeyword('a a a a a', kw({ keyword: 'a', wholeWord: true }), { maxMatches: 2 })
    expect(r).toHaveLength(2)
  })
})

describe('matchKeywords and hasKeywordMatch', () => {
  it('sorts matches by position', () => {
    const text = 'bug report alert ping'
    const r = matchKeywords(text, [kw({ id: 'a', keyword: 'alert' }), kw({ id: 'b', keyword: 'bug' })])
    expect(r.length).toBeGreaterThanOrEqual(2)
    expect(r[0].position).toBeLessThan(r[r.length - 1].position)
  })
  it('hasKeywordMatch true when found', () => {
    expect(hasKeywordMatch('alert!', [kw()])).toBe(true)
  })
  it('hasKeywordMatch false when none', () => {
    expect(hasKeywordMatch('nothing here', [kw()])).toBe(false)
  })
  it('hasKeywordMatch skips disabled', () => {
    expect(hasKeywordMatch('alert', [kw({ enabled: false })])).toBe(false)
  })
})

describe('highlightMatches and getHighlightedResult', () => {
  it('wraps matches with mark tag by default', () => {
    const matches = matchKeyword('foo alert bar', kw())
    const h = highlightMatches('foo alert bar', matches)
    expect(h).toContain('<mark')
    expect(h).toContain('</mark>')
  })
  it('uses custom tag and class', () => {
    const matches = matchKeyword('alert', kw())
    const h = highlightMatches('alert', matches, { highlightTag: 'span', highlightClass: 'hi' })
    expect(h).toContain('<span class="hi">')
  })
  it('returns original text when no matches', () => {
    expect(highlightMatches('no match', [])).toBe('no match')
  })
  it('getHighlightedResult includes matches and text', () => {
    const r = getHighlightedResult('alert me', [kw()], { highlight: true })
    expect(r.matches.length).toBe(1)
    expect(r.text).toContain('<mark')
  })
  it('getHighlightedResult leaves text untouched when highlight=false', () => {
    const r = getHighlightedResult('alert me', [kw()])
    expect(r.text).toBe('alert me')
  })
})

describe('createKeyword and validateKeyword', () => {
  it('creates with defaults', () => {
    const k = createKeyword('release')
    expect(k.keyword).toBe('release')
    expect(k.enabled).toBe(true)
    expect(k.wholeWord).toBe(true)
    expect(k.channelIds).toEqual([])
    expect(k.id).toMatch(/^kw_/)
  })
  it('validate rejects empty', () => {
    expect(validateKeyword('')).toEqual({ valid: false, error: 'Keyword cannot be empty' })
  })
  it('validate rejects too short', () => {
    expect(validateKeyword('a').valid).toBe(false)
  })
  it('validate rejects too long', () => {
    const long = 'a'.repeat(101)
    expect(validateKeyword(long).valid).toBe(false)
  })
  it('validate rejects punctuation-only', () => {
    expect(validateKeyword('!!!').valid).toBe(false)
  })
  it('validate accepts normal word', () => {
    expect(validateKeyword('release').valid).toBe(true)
  })
})

describe('isDuplicateKeyword', () => {
  it('detects duplicate case-insensitively by default', () => {
    expect(isDuplicateKeyword('ALERT', [kw({ keyword: 'alert' })])).toBe(true)
  })
  it('respects caseSensitive option', () => {
    expect(isDuplicateKeyword('ALERT', [kw({ keyword: 'alert' })], { caseSensitive: true })).toBe(false)
  })
})

describe('getKeywordsForChannel', () => {
  it('returns keywords without channel restriction', () => {
    const list = [kw({ id: '1' }), kw({ id: '2', channelIds: ['c1'] })]
    const r = getKeywordsForChannel(list, 'c2')
    expect(r.map((k) => k.id)).toContain('1')
    expect(r.map((k) => k.id)).not.toContain('2')
  })
  it('returns channel-restricted when match', () => {
    const r = getKeywordsForChannel([kw({ channelIds: ['c1'] })], 'c1')
    expect(r).toHaveLength(1)
  })
  it('excludes disabled keywords', () => {
    const r = getKeywordsForChannel([kw({ enabled: false })], 'c1')
    expect(r).toHaveLength(0)
  })
})

describe('sortKeywords and searchKeywords', () => {
  it('sorts alphabetically ascending', () => {
    const r = sortKeywords([kw({ id: 'b', keyword: 'bravo' }), kw({ id: 'a', keyword: 'alpha' })])
    expect(r[0].keyword).toBe('alpha')
  })
  it('sorts by createdAt', () => {
    const r = sortKeywords(
      [
        kw({ keyword: 'x', createdAt: new Date('2024-02-01').toISOString() }),
        kw({ keyword: 'y', createdAt: new Date('2024-01-01').toISOString() }),
      ],
      'createdAt',
      'asc'
    )
    expect(r[0].keyword).toBe('y')
  })
  it('sorts descending', () => {
    const r = sortKeywords([kw({ keyword: 'a' }), kw({ keyword: 'z' })], 'keyword', 'desc')
    expect(r[0].keyword).toBe('z')
  })
  it('searchKeywords filters by term', () => {
    const r = searchKeywords([kw({ keyword: 'alert' }), kw({ keyword: 'bug' })], 'al')
    expect(r).toHaveLength(1)
    expect(r[0].keyword).toBe('alert')
  })
  it('searchKeywords returns all for empty term', () => {
    expect(searchKeywords([kw()], '   ')).toHaveLength(1)
  })
})

describe('getKeywordStats', () => {
  it('computes stats', () => {
    const s = getKeywordStats([
      kw({ enabled: true, caseSensitive: true, wholeWord: true }),
      kw({ enabled: false, channelIds: ['c1'], soundId: 's1' }),
    ])
    expect(s.total).toBe(2)
    expect(s.enabled).toBe(1)
    expect(s.disabled).toBe(1)
    expect(s.withChannelRestriction).toBe(1)
    expect(s.withCustomSound).toBe(1)
    expect(s.caseSensitive).toBe(1)
    expect(s.wholeWord).toBe(1)
  })
})
