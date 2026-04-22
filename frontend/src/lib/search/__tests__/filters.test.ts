/**
 * Tests for search filters.
 */

import {
  SearchFilterBuilder,
  FilterValidator,
  createFilterBuilder,
  validateFilters,
} from '../filters'

describe('SearchFilterBuilder setters', () => {
  it('query/dateRange/after/before', () => {
    const b = new SearchFilterBuilder()
      .query('hi')
      .dateRange(new Date('2024-01-01'), new Date('2024-01-02'))
      .after(new Date('2024-01-01'))
      .before(new Date('2024-02-01'))
    const f = b.getFilters()
    expect(f.query).toBe('hi')
    expect(f.dateRange?.from).toBeInstanceOf(Date)
    expect(f.createdAfter).toBeInstanceOf(Date)
    expect(f.createdBefore).toBeInstanceOf(Date)
  })

  it('fromUsers and inChannels', () => {
    const b = new SearchFilterBuilder()
      .fromUsers(['u1', 'u2'], true)
      .inChannels(['c1'], ['public'], false)
    const f = b.getFilters()
    expect(f.fromUsers?.userIds).toEqual(['u1', 'u2'])
    expect(f.fromUsers?.exclude).toBe(true)
    expect(f.inChannels?.channelIds).toEqual(['c1'])
    expect(f.inChannels?.types).toEqual(['public'])
  })

  it('messageTypes', () => {
    const b = new SearchFilterBuilder().messageTypes(['text', 'file'])
    expect(b.getFilters().messageTypes?.types).toEqual(['text', 'file'])
  })

  it('attachment helpers', () => {
    const b = new SearchFilterBuilder()
      .hasAttachments()
      .hasImages()
      .hasLinks()
      .hasCode()
      .fileTypes(['pdf'])
    const a = b.getFilters().attachments!
    expect(a.hasAttachments).toBe(true)
    expect(a.hasImages).toBe(true)
    expect(a.hasLinks).toBe(true)
    expect(a.hasCode).toBe(true)
    expect(a.fileTypes).toEqual(['pdf'])
  })

  it('content helpers', () => {
    const b = new SearchFilterBuilder()
      .hasMentions()
      .hasReactions()
      .isPinned()
      .isStarred()
      .isThread()
      .isEdited()
      .includeDeleted()
    const c = b.getFilters().content!
    expect(c.hasMentions).toBe(true)
    expect(c.hasReactions).toBe(true)
    expect(c.isPinned).toBe(true)
    expect(c.isStarred).toBe(true)
    expect(c.isThread).toBe(true)
    expect(c.isEdited).toBe(true)
    expect(c.isDeleted).toBe(true)
  })

  it('semantic + sort + pagination', () => {
    const b = new SearchFilterBuilder().semantic(0.8).sort('hybrid').limit(10).offset(20)
    const f = b.getFilters()
    expect(f.semanticSearch).toBe(true)
    expect(f.similarityThreshold).toBe(0.8)
    expect(f.sortBy).toBe('hybrid')
    expect(f.limit).toBe(10)
    expect(f.offset).toBe(20)
  })

  it('reset clears', () => {
    const b = new SearchFilterBuilder().query('x').reset()
    expect(b.getFilters()).toEqual({})
  })
})

describe('buildWhereClause', () => {
  it('returns empty where when no filters', () => {
    const r = new SearchFilterBuilder().buildWhereClause()
    expect(r.sql).toContain("m.is_deleted = FALSE")
  })

  it('builds conditions for date range', () => {
    const r = new SearchFilterBuilder().after(new Date('2024-01-01')).before(new Date('2024-02-01')).buildWhereClause()
    expect(r.sql).toContain('m.created_at >=')
    expect(r.sql).toContain('m.created_at <=')
    expect(r.params.length).toBeGreaterThanOrEqual(2)
  })

  it('user filter IN operator', () => {
    const r = new SearchFilterBuilder().fromUsers(['u1']).buildWhereClause()
    expect(r.sql).toContain('m.user_id IN')
  })

  it('user filter NOT IN when exclude', () => {
    const r = new SearchFilterBuilder().fromUsers(['u1'], true).buildWhereClause()
    expect(r.sql).toContain('NOT IN')
  })

  it('isThread true adds IS NOT NULL', () => {
    const r = new SearchFilterBuilder().isThread().buildWhereClause()
    expect(r.sql).toContain('m.parent_id IS NOT NULL')
  })

  it('isThread false adds IS NULL', () => {
    const r = new SearchFilterBuilder().isThread(false).buildWhereClause()
    expect(r.sql).toContain('m.parent_id IS NULL')
  })
})

describe('buildOrderByClause', () => {
  it('default relevance', () => {
    expect(new SearchFilterBuilder().buildOrderByClause()).toContain('similarity_score DESC')
  })
  it('date_desc', () => {
    const s = new SearchFilterBuilder().sort('date_desc').buildOrderByClause()
    expect(s).toBe('ORDER BY m.created_at DESC')
  })
  it('date_asc', () => {
    const s = new SearchFilterBuilder().sort('date_asc').buildOrderByClause()
    expect(s).toBe('ORDER BY m.created_at ASC')
  })
  it('hybrid uses decay', () => {
    const s = new SearchFilterBuilder().sort('hybrid').buildOrderByClause()
    expect(s).toContain('similarity_score * 0.7')
  })
})

describe('buildQuery full', () => {
  it('includes select from schema and limit/offset', () => {
    const r = new SearchFilterBuilder().query('hi').limit(5).offset(10).buildQuery('myschema')
    expect(r.sql).toContain('FROM myschema.nchat_messages')
    expect(r.sql).toContain('LIMIT')
    expect(r.sql).toContain('OFFSET')
    expect(r.params).toContain(5)
    expect(r.params).toContain(10)
  })
})

describe('FilterValidator', () => {
  it('valid for empty', () => {
    const r = FilterValidator.validate({})
    expect(r.valid).toBe(true)
  })
  it('invalid date range', () => {
    const r = FilterValidator.validate({
      dateRange: { from: new Date('2024-02-01'), to: new Date('2024-01-01') },
    })
    expect(r.valid).toBe(false)
  })
  it('empty user ids', () => {
    const r = FilterValidator.validate({ fromUsers: { userIds: [] } })
    expect(r.valid).toBe(false)
  })
  it('empty channel ids', () => {
    const r = FilterValidator.validate({ inChannels: { channelIds: [] } })
    expect(r.valid).toBe(false)
  })
  it('bad limit', () => {
    expect(FilterValidator.validate({ limit: 0 }).valid).toBe(false)
    expect(FilterValidator.validate({ limit: 2000 }).valid).toBe(false)
  })
  it('bad offset', () => {
    expect(FilterValidator.validate({ offset: -1 }).valid).toBe(false)
  })
  it('similarity threshold out of range', () => {
    expect(FilterValidator.validate({ similarityThreshold: 1.5 }).valid).toBe(false)
    expect(FilterValidator.validate({ similarityThreshold: -0.1 }).valid).toBe(false)
  })
  it('valid non-empty-array helpers', () => {
    expect(FilterValidator.isNonEmptyArray(['a'])).toBe(true)
    expect(FilterValidator.isNonEmptyArray([])).toBe(false)
    expect(FilterValidator.isNonEmptyArray(undefined)).toBe(false)
  })
  it('isValidDateRange returns true when either end missing', () => {
    expect(FilterValidator.isValidDateRange(new Date(), undefined)).toBe(true)
    expect(FilterValidator.isValidDateRange(undefined, new Date())).toBe(true)
  })
})

describe('factory functions', () => {
  it('createFilterBuilder returns builder', () => {
    expect(createFilterBuilder()).toBeInstanceOf(SearchFilterBuilder)
  })
  it('validateFilters passes through', () => {
    expect(validateFilters({}).valid).toBe(true)
  })
})
