/**
 * Tests for query-parser.
 */

import {
  parseQuery,
  buildMeiliSearchFilter,
  isValidDate,
  getOperatorSuggestions,
  formatQueryForDisplay,
  buildQueryFromFilters,
} from '../query-parser'

describe('parseQuery', () => {
  it('returns empty parsed for empty string', () => {
    const r = parseQuery('')
    expect(r.text).toBe('')
    expect(r.operators).toEqual([])
  })

  it('extracts from operator', () => {
    const r = parseQuery('hello from:alice')
    expect(r.filters.from).toBe('alice')
    expect(r.text).toBe('hello')
  })

  it('extracts in operator', () => {
    const r = parseQuery('in:general hello')
    expect(r.filters.in).toBe('general')
    expect(r.text).toBe('hello')
  })

  it('extracts has operators and maps attachment->file', () => {
    const r = parseQuery('has:attachment has:link')
    expect(r.filters.has).toContain('file')
    expect(r.filters.has).toContain('link')
  })

  it('extracts before/after', () => {
    const r = parseQuery('before:2024-01-01 after:2023-06-01 hi')
    expect(r.filters.before).toBe('2024-01-01')
    expect(r.filters.after).toBe('2023-06-01')
    expect(r.text).toBe('hi')
  })

  it('extracts is operators', () => {
    const r = parseQuery('is:pinned is:starred')
    expect(r.filters.is).toEqual(expect.arrayContaining(['pinned', 'starred']))
  })

  it('deduplicates has filters', () => {
    const r = parseQuery('has:link has:link')
    expect(r.filters.has!.filter((v) => v === 'link')).toHaveLength(1)
  })

  it('records all operators', () => {
    const r = parseQuery('from:bob has:image')
    expect(r.operators.length).toBe(2)
  })
})

describe('isValidDate', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(isValidDate('2024-01-01')).toBe(true)
  })
  it('rejects wrong format', () => {
    expect(isValidDate('01/01/2024')).toBe(false)
    expect(isValidDate('2024-1-1')).toBe(false)
  })
  it('rejects invalid date', () => {
    expect(isValidDate('2024-13-45')).toBe(false)
  })
})

describe('buildMeiliSearchFilter', () => {
  it('empty when no filters', () => {
    expect(buildMeiliSearchFilter({ text: '', filters: { has: [], is: [] }, operators: [] })).toBe('')
  })

  it('includes author and channel', () => {
    const f = buildMeiliSearchFilter({
      text: '',
      filters: { from: 'alice', in: 'general', has: [], is: [] },
      operators: [],
    })
    expect(f).toContain('author_name = "alice"')
    expect(f).toContain('channel_name = "general"')
    expect(f).toContain('AND')
  })

  it('includes has filters', () => {
    const f = buildMeiliSearchFilter({
      text: '',
      filters: { has: ['link', 'file', 'image'], is: [] },
      operators: [],
    })
    expect(f).toContain('has_link = true')
    expect(f).toContain('has_file = true')
    expect(f).toContain('has_image = true')
  })

  it('includes is filters', () => {
    const f = buildMeiliSearchFilter({
      text: '',
      filters: { has: [], is: ['pinned', 'starred'] },
      operators: [],
    })
    expect(f).toContain('is_pinned = true')
    expect(f).toContain('is_starred = true')
  })

  it('includes before/after timestamps', () => {
    const f = buildMeiliSearchFilter({
      text: '',
      filters: { has: [], is: [], before: '2024-01-01', after: '2023-01-01' },
      operators: [],
    })
    expect(f).toMatch(/created_at < \d+/)
    expect(f).toMatch(/created_at > \d+/)
  })

  it('includes additional string, number, array filters', () => {
    const f = buildMeiliSearchFilter(
      { text: '', filters: { has: [], is: [] }, operators: [] },
      { name: 'x', count: 5, tags: ['a', 'b'] }
    )
    expect(f).toContain('name = "x"')
    expect(f).toContain('count = 5')
    expect(f).toContain('tags IN ["a", "b"]')
  })
})

describe('getOperatorSuggestions', () => {
  it('returns all operators for empty input', () => {
    const s = getOperatorSuggestions('')
    expect(s).toContain('from:')
    expect(s.length).toBeGreaterThanOrEqual(8)
  })
  it('filters by last word prefix', () => {
    const s = getOperatorSuggestions('hello fr')
    expect(s).toContain('from:')
    expect(s).not.toContain('is:pinned')
  })
})

describe('formatQueryForDisplay', () => {
  it('returns empty array for empty query', () => {
    expect(formatQueryForDisplay('')).toEqual([])
  })
  it('marks operator parts', () => {
    const parts = formatQueryForDisplay('hello from:alice world')
    const operatorPart = parts.find((p) => p.isOperator)
    expect(operatorPart?.text).toBe('from:alice')
  })
  it('returns plain parts for no operators', () => {
    const parts = formatQueryForDisplay('just text')
    expect(parts).toHaveLength(1)
    expect(parts[0].isOperator).toBe(false)
  })
})

describe('buildQueryFromFilters', () => {
  it('builds simple query', () => {
    const q = buildQueryFromFilters({ from: 'bob', has: ['link'] }, 'hi')
    expect(q).toContain('hi')
    expect(q).toContain('from:bob')
    expect(q).toContain('has:link')
  })
  it('empty for empty filters and no text', () => {
    expect(buildQueryFromFilters({ has: [], is: [] })).toBe('')
  })
  it('includes is and dates', () => {
    const q = buildQueryFromFilters({ is: ['pinned'], before: '2024-01-01', after: '2023-01-01' })
    expect(q).toContain('is:pinned')
    expect(q).toContain('before:2024-01-01')
    expect(q).toContain('after:2023-01-01')
  })
})
