/**
 * Tests for SearchQueryBuilder.
 */

import {
  SearchQueryBuilder,
  parseSearchString,
  buildSearchString,
  createSearchQuery,
  parseAndBuildQuery,
} from '../query-builder'

describe('SearchQueryBuilder basic filters', () => {
  it('builds with empty filters', () => {
    const opts = new SearchQueryBuilder('hello').build()
    expect(opts.q).toBe('hello')
    expect(opts.filter).toBeUndefined()
  })

  it('fromUser (single)', () => {
    const b = new SearchQueryBuilder('x').fromUser('u1')
    expect(b.getFilterString()).toContain('author_id = "u1"')
  })

  it('fromUser (array) wraps OR', () => {
    const b = new SearchQueryBuilder('x').fromUser(['u1', 'u2'])
    const s = b.getFilterString()
    expect(s).toContain('author_id = "u1"')
    expect(s).toContain('OR')
    expect(s).toContain('author_id = "u2"')
  })

  it('inChannel with empty array adds nothing', () => {
    const b = new SearchQueryBuilder('x').inChannel([])
    expect(b.getFilterString()).toBe('')
  })

  it('dateRange after only', () => {
    const b = new SearchQueryBuilder('x').dateRange({ after: new Date('2024-01-01') })
    expect(b.getFilterString()).toMatch(/created_at >= \d+/)
  })

  it('dateRange before only', () => {
    const b = new SearchQueryBuilder('x').dateRange({ before: new Date('2024-01-01') })
    expect(b.getFilterString()).toMatch(/created_at <= \d+/)
  })
})

describe('attachment and message flags', () => {
  it('hasAttachment no type', () => {
    const b = new SearchQueryBuilder('x').hasAttachment()
    expect(b.getFilterString()).toContain('has_attachment = true')
  })
  it('hasAttachment image+video', () => {
    const b = new SearchQueryBuilder('x').hasAttachment(['image', 'video'])
    const s = b.getFilterString()
    expect(s).toContain('has_image = true')
    expect(s).toContain('has_video = true')
  })
  it('hasLink adds filter', () => {
    expect(new SearchQueryBuilder('x').hasLink().getFilterString()).toContain('has_link = true')
  })
  it('isPinned toggle', () => {
    expect(new SearchQueryBuilder('x').isPinned(false).getFilterString()).toContain('is_pinned = false')
  })
  it('isEdited', () => {
    expect(new SearchQueryBuilder('x').isEdited().getFilterString()).toContain('is_edited = true')
  })
  it('inThread with id', () => {
    expect(new SearchQueryBuilder('x').inThread('t1').getFilterString()).toContain('parent_thread_id = "t1"')
  })
  it('inThread without id', () => {
    expect(new SearchQueryBuilder('x').inThread().getFilterString()).toContain('parent_thread_id EXISTS')
  })
  it('rootMessagesOnly', () => {
    expect(new SearchQueryBuilder('x').rootMessagesOnly().getFilterString()).toContain('NOT EXISTS')
  })
  it('hasThread', () => {
    expect(new SearchQueryBuilder('x').hasThread().getFilterString()).toContain('thread_id EXISTS')
  })
  it('mentioning single', () => {
    expect(new SearchQueryBuilder('x').mentioning('u1').getFilterString()).toContain(
      'mentioned_users = "u1"'
    )
  })
  it('mentionsEveryone/Here', () => {
    expect(new SearchQueryBuilder('x').mentionsEveryone().getFilterString()).toContain(
      'mentions_everyone = true'
    )
    expect(new SearchQueryBuilder('x').mentionsHere().getFilterString()).toContain('mentions_here = true')
  })
  it('ofType string and array', () => {
    expect(new SearchQueryBuilder('x').ofType('text').getFilterString()).toContain('message_type = "text"')
    const s = new SearchQueryBuilder('x').ofType(['text', 'file']).getFilterString()
    expect(s).toContain('OR')
  })
  it('excludeDeleted', () => {
    expect(new SearchQueryBuilder('x').excludeDeleted().getFilterString()).toContain('is_deleted = false')
  })
  it('addFilter custom', () => {
    expect(new SearchQueryBuilder('x').addFilter('foo = true').getFilterString()).toContain('foo = true')
  })
})

describe('sort + paging + build', () => {
  it('sortByDate desc', () => {
    const b = new SearchQueryBuilder('x').sortByDate('desc')
    const opts = b.build()
    expect(opts.sort).toEqual(['created_at:desc'])
  })
  it('sortByRelevance clears sort', () => {
    const b = new SearchQueryBuilder('x').sortByDate('asc').sortByRelevance()
    expect(b.build().sort).toBeUndefined()
  })
  it('sortBy custom', () => {
    const b = new SearchQueryBuilder('x').sortBy('name', 'asc')
    expect(b.build().sort).toEqual(['name:asc'])
  })
  it('limit caps to [1,100]', () => {
    expect(new SearchQueryBuilder('x').limit(999).build().limit).toBe(100)
    expect(new SearchQueryBuilder('x').limit(0).build().limit).toBe(1)
  })
  it('offset floor 0', () => {
    expect(new SearchQueryBuilder('x').offset(-5).build().offset).toBe(0)
  })
  it('page() computes offset', () => {
    const opts = new SearchQueryBuilder('x').limit(10).page(3).build()
    expect(opts.offset).toBe(20)
  })
  it('highlight and crop overrides', () => {
    const opts = new SearchQueryBuilder('x').highlight(['content']).crop(['content'], 50).build()
    expect(opts.attributesToHighlight).toEqual(['content'])
    expect(opts.cropLength).toBe(50)
  })
  it('matchingStrategy sets strategy', () => {
    const opts = new SearchQueryBuilder('x').matchingStrategy('all').build()
    expect(opts.matchingStrategy).toBe('all')
  })
  it('build joins filters with AND', () => {
    const opts = new SearchQueryBuilder('x').hasLink().isPinned().build()
    expect(opts.filter).toContain('AND')
  })
})

describe('clone', () => {
  it('produces independent builder', () => {
    const b = new SearchQueryBuilder('x').hasLink()
    const c = b.clone()
    c.isPinned()
    expect(b.getFilterString()).not.toContain('is_pinned')
    expect(c.getFilterString()).toContain('is_pinned')
  })
})

describe('parseSearchString', () => {
  it('parses from/in/has/is/before/after', () => {
    const r = parseSearchString('hello from:alice in:#general has:file is:pinned before:2024-01-01 after:2023-01-01')
    expect(r.query).toBe('hello')
    expect(r.fromUser).toEqual(['alice'])
    expect(r.inChannel).toEqual(['general'])
    expect(r.hasAttachment).toContain('file')
    expect(r.isPinned).toBe(true)
    expect(r.before).toBeInstanceOf(Date)
    expect(r.after).toBeInstanceOf(Date)
  })
  it('maps has:attachment to all three', () => {
    const r = parseSearchString('has:attachment')
    expect(r.hasAttachment).toEqual(expect.arrayContaining(['file', 'image', 'video']))
  })
  it('has:link sets hasLink', () => {
    const r = parseSearchString('has:link')
    expect(r.hasLink).toBe(true)
  })
  it('is:edited', () => {
    const r = parseSearchString('is:edited')
    expect(r.isEdited).toBe(true)
  })
})

describe('buildSearchString', () => {
  it('builds full string', () => {
    const s = buildSearchString({
      query: 'hi',
      fromUser: ['alice'],
      inChannel: ['general'],
      hasLink: true,
      isPinned: true,
    })
    expect(s).toContain('hi')
    expect(s).toContain('from:alice')
    expect(s).toContain('in:#general')
    expect(s).toContain('has:link')
    expect(s).toContain('is:pinned')
  })
  it('returns empty for empty parsed', () => {
    expect(buildSearchString({ query: '' })).toBe('')
  })
})

describe('factories and SearchQueryBuilder.parse', () => {
  it('createSearchQuery returns builder', () => {
    expect(createSearchQuery('x')).toBeInstanceOf(SearchQueryBuilder)
  })
  it('parseAndBuildQuery applies filters', () => {
    const b = parseAndBuildQuery('hello from:bob has:link is:pinned')
    const s = b.getFilterString()
    expect(s).toContain('author_id = "bob"')
    expect(s).toContain('has_link = true')
    expect(s).toContain('is_pinned = true')
  })
  it('SearchQueryBuilder.parse applies dates', () => {
    const b = SearchQueryBuilder.parse('hi before:2024-01-01 after:2023-01-01')
    expect(b.getFilterString()).toMatch(/created_at >= \d+/)
    expect(b.getFilterString()).toMatch(/created_at <= \d+/)
  })
})
