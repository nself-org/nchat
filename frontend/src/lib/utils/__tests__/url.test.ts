/**
 * Unit tests for URL utilities.
 */
import {
  parseUrl,
  buildUrl,
  getQueryParams,
  getQueryParam,
  setQueryParams,
  removeQueryParams,
  isExternalUrl,
  isAbsoluteUrl,
  isValidUrl,
  getUrlDomain,
  getUrlExtension,
  joinPath,
  normalizePath,
  encodeUrlComponent,
  decodeUrlComponent,
  toUrlSlug,
  setUrlHash,
  getUrlHash,
  isSameUrl,
  addUtmParams,
  matchUrlPattern,
} from '../url'

describe('parseUrl', () => {
  it('parses a full URL', () => {
    const p = parseUrl('https://example.com/path?foo=bar#section')
    expect(p?.hostname).toBe('example.com')
    expect(p?.params).toEqual({ foo: 'bar' })
    expect(p?.hash).toBe('#section')
  })

  it('returns null for invalid', () => {
    expect(parseUrl('not a url')).toBeNull()
  })

  it('supports base URL', () => {
    expect(parseUrl('/path', 'https://example.com')?.href).toContain('example.com')
  })
})

describe('buildUrl', () => {
  it('combines path, params, hash', () => {
    const u = buildUrl({
      base: 'https://api.example.com',
      path: ['users', '123'],
      params: { include: 'profile', active: true },
    })
    expect(u).toContain('users/123')
    expect(u).toContain('include=profile')
    expect(u).toContain('active=true')
  })

  it('skips null/undefined params', () => {
    const u = buildUrl({
      base: 'https://api.example.com',
      params: { a: 'x', b: null, c: undefined },
    })
    expect(u).toContain('a=x')
    expect(u).not.toContain('b=')
    expect(u).not.toContain('c=')
  })

  it('accepts hash', () => {
    const u = buildUrl({ base: 'https://a.com', hash: 'top' })
    expect(u).toContain('#top')
  })

  it('strips leading # from hash', () => {
    const u = buildUrl({ base: 'https://a.com', hash: '#top' })
    expect(u).toContain('#top')
  })

  it('handles string path', () => {
    const u = buildUrl({ base: 'https://a.com', path: '/users' })
    expect(u).toMatch(/users/)
  })
})

describe('getQueryParams / getQueryParam', () => {
  it('parses search string', () => {
    expect(getQueryParams('https://a.com?foo=bar&baz=qux')).toEqual({ foo: 'bar', baz: 'qux' })
  })

  it('returns {} for url without params', () => {
    expect(getQueryParams('https://a.com')).toEqual({})
  })

  it('getQueryParam returns value or null', () => {
    expect(getQueryParam('foo', 'https://a.com?foo=bar')).toBe('bar')
    expect(getQueryParam('missing', 'https://a.com?foo=bar')).toBeNull()
  })
})

describe('setQueryParams / removeQueryParams', () => {
  it('setQueryParams merges by default', () => {
    const u = setQueryParams('https://a.com?x=1', { y: 2 })
    expect(u).toContain('x=1')
    expect(u).toContain('y=2')
  })

  it('setQueryParams with replace=true clears existing', () => {
    const u = setQueryParams('https://a.com?x=1', { y: 2 }, true)
    expect(u).not.toContain('x=1')
    expect(u).toContain('y=2')
  })

  it('setQueryParams null removes key', () => {
    const u = setQueryParams('https://a.com?x=1&y=2', { x: null })
    expect(u).not.toContain('x=1')
  })

  it('setQueryParams returns url on invalid', () => {
    expect(setQueryParams('not a url', { x: 1 })).toBe('not a url')
  })

  it('removeQueryParams removes specific keys', () => {
    const u = removeQueryParams('https://a.com?x=1&y=2', ['x'])
    expect(u).not.toContain('x=1')
    expect(u).toContain('y=2')
  })

  it('removeQueryParams removes all without keys', () => {
    const u = removeQueryParams('https://a.com?x=1&y=2')
    expect(u).not.toContain('?')
  })
})

describe('isExternalUrl', () => {
  it('recognizes relative as internal', () => {
    expect(isExternalUrl('/path')).toBe(false)
    expect(isExternalUrl('#frag')).toBe(false)
    expect(isExternalUrl('./foo')).toBe(false)
  })

  it('recognizes external domain', () => {
    expect(isExternalUrl('https://google.com', 'https://example.com')).toBe(true)
  })

  it('same origin is not external', () => {
    expect(isExternalUrl('https://example.com', 'https://example.com')).toBe(false)
  })

  it('empty returns false', () => {
    expect(isExternalUrl('')).toBe(false)
  })
})

describe('isAbsoluteUrl / isValidUrl', () => {
  it('isAbsoluteUrl', () => {
    expect(isAbsoluteUrl('https://a.com')).toBe(true)
    expect(isAbsoluteUrl('/path')).toBe(false)
    expect(isAbsoluteUrl('')).toBe(false)
  })

  it('isValidUrl', () => {
    expect(isValidUrl('https://a.com')).toBe(true)
    expect(isValidUrl('nope')).toBe(false)
  })
})

describe('getUrlDomain', () => {
  it('full hostname by default', () => {
    expect(getUrlDomain('https://www.example.com')).toBe('www.example.com')
  })

  it('root domain without subdomain', () => {
    expect(getUrlDomain('https://www.example.com', false)).toBe('example.com')
  })

  it('handles .co.uk', () => {
    expect(getUrlDomain('https://www.example.co.uk', false)).toBe('example.co.uk')
  })

  it('returns null on invalid', () => {
    expect(getUrlDomain('not a url')).toBeNull()
  })
})

describe('getUrlExtension', () => {
  it('extracts extension', () => {
    expect(getUrlExtension('https://a.com/file.pdf')).toBe('pdf')
  })

  it('returns null if no extension', () => {
    expect(getUrlExtension('https://a.com/path')).toBeNull()
  })

  it('returns null on invalid url', () => {
    expect(getUrlExtension('not a url')).toBeNull()
  })
})

describe('joinPath / normalizePath', () => {
  it('joinPath combines segments', () => {
    expect(joinPath('api', 'users', '123')).toBe('api/users/123')
    expect(joinPath('/api/', '/users/', '/123')).toBe('/api/users/123')
  })

  it('normalizePath handles empty', () => {
    expect(normalizePath('')).toBe('/')
  })

  it('normalizePath ensures leading slash', () => {
    expect(normalizePath('path')).toBe('/path')
  })

  it('normalizePath dedupes slashes', () => {
    expect(normalizePath('/a//b///c')).toBe('/a/b/c')
  })

  it('normalizePath strips trailing slash but keeps root', () => {
    expect(normalizePath('/a/b/')).toBe('/a/b')
    expect(normalizePath('/')).toBe('/')
  })
})

describe('encode/decodeUrlComponent', () => {
  it('encodes special chars', () => {
    expect(encodeUrlComponent("a'b")).toContain('%27')
  })

  it('decodes safely', () => {
    expect(decodeUrlComponent('hello%20world')).toBe('hello world')
    expect(decodeUrlComponent('%ZZ')).toBe('%ZZ') // Invalid falls through
  })
})

describe('toUrlSlug', () => {
  it('slugifies text', () => {
    expect(toUrlSlug('Hello, World!')).toBe('hello-world')
  })

  it('handles diacritics', () => {
    expect(toUrlSlug('Café Latté')).toBe('cafe-latte')
  })

  it('collapses repeated hyphens', () => {
    expect(toUrlSlug('a - - b')).toBe('a-b')
  })
})

describe('setUrlHash / getUrlHash', () => {
  it('sets hash', () => {
    expect(setUrlHash('https://a.com', 'top')).toBe('https://a.com#top')
  })

  it('strips leading #', () => {
    expect(setUrlHash('https://a.com', '#top')).toBe('https://a.com#top')
  })

  it('empty hash removes hash', () => {
    expect(setUrlHash('https://a.com#old', '')).toBe('https://a.com')
  })

  it('gets hash', () => {
    expect(getUrlHash('https://a.com#top')).toBe('top')
    expect(getUrlHash('https://a.com')).toBe('')
  })
})

describe('isSameUrl', () => {
  it('ignores hash', () => {
    expect(isSameUrl('https://a.com/x#a', 'https://a.com/x#b')).toBe(true)
  })

  it('ignores trailing slash', () => {
    expect(isSameUrl('https://a.com/x/', 'https://a.com/x')).toBe(true)
  })

  it('query order doesn\'t matter', () => {
    expect(isSameUrl('https://a.com?a=1&b=2', 'https://a.com?b=2&a=1')).toBe(true)
  })

  it('distinct urls', () => {
    expect(isSameUrl('https://a.com/x', 'https://a.com/y')).toBe(false)
  })
})

describe('addUtmParams', () => {
  it('adds provided utm params', () => {
    const u = addUtmParams('https://a.com', { source: 'newsletter', medium: 'email' })
    expect(u).toContain('utm_source=newsletter')
    expect(u).toContain('utm_medium=email')
  })

  it('skips undefined', () => {
    const u = addUtmParams('https://a.com', { source: 'x' })
    expect(u).toContain('utm_source=x')
    expect(u).not.toContain('utm_medium')
  })
})

describe('matchUrlPattern', () => {
  it('matches simple wildcard', () => {
    expect(matchUrlPattern('/users/123', '/users/*')).toBe(true)
  })

  it('does not match multi-segment with single *', () => {
    expect(matchUrlPattern('/users/a/b', '/users/*')).toBe(false)
  })

  it('exact match', () => {
    expect(matchUrlPattern('/x', '/x')).toBe(true)
  })
})
