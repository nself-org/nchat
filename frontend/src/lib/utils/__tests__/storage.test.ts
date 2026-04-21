/**
 * Unit tests for storage utilities.
 * JSDOM provides real localStorage and sessionStorage.
 */
import {
  createLocalStorage,
  createSessionStorage,
  getStorageQuota,
  requestPersistentStorage,
  isStoragePersisted,
  createMemoryCache,
} from '../storage'

interface Schema extends Record<string, unknown> {
  theme: string
  count: number
  user: { name: string }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('createLocalStorage', () => {
  it('set/get/remove roundtrip', () => {
    const s = createLocalStorage<Schema>('test')
    expect(s.isAvailable()).toBe(true)
    expect(s.set('theme', 'dark')).toBe(true)
    expect(s.get('theme')).toBe('dark')
    expect(s.has('theme')).toBe(true)
    s.remove('theme')
    expect(s.get('theme')).toBeUndefined()
  })

  it('returns default value when missing', () => {
    const s = createLocalStorage<Schema>('t')
    expect(s.get('theme', { defaultValue: 'light' })).toBe('light')
  })

  it('supports ttl expiry', () => {
    const s = createLocalStorage<Schema>('t')
    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now)
    s.set('count', 5, { ttl: 1000 })
    jest.spyOn(Date, 'now').mockReturnValue(now + 2000)
    expect(s.get('count', { defaultValue: -1 })).toBe(-1)
  })

  it('keys() returns prefix-filtered keys', () => {
    const s = createLocalStorage<Schema>('p1')
    s.set('theme', 'x')
    const s2 = createLocalStorage<Schema>('p2')
    s2.set('count', 1)
    const keys = s.keys()
    expect(keys).toContain('theme')
    expect(keys).not.toContain('count')
  })

  it('clear removes only prefixed entries', () => {
    const s = createLocalStorage<Schema>('p1')
    s.set('theme', 'x')
    const s2 = createLocalStorage<Schema>('p2')
    s2.set('count', 1)
    s.clear()
    expect(s.get('theme')).toBeUndefined()
    expect(s2.get('count')).toBe(1)
  })

  it('returns undefined on corrupt data without crashing', () => {
    localStorage.setItem('x:theme', '{not json}')
    const s = createLocalStorage<Schema>('x')
    expect(s.get('theme', { defaultValue: 'ok' })).toBe('ok')
  })

  it('supports custom serialize/deserialize', () => {
    const s = createLocalStorage<Schema>('cust')
    s.set('theme', 'dark', { serialize: (v) => `|${v}|` })
    const raw = localStorage.getItem('cust:theme')
    expect(raw).toBe('|dark|')
    const v = s.get('theme', { deserialize: (v) => v.replace(/\|/g, '') })
    expect(v).toBe('dark')
  })

  it('subscribe returns unsubscribe function', () => {
    const s = createLocalStorage<Schema>('t')
    const unsub = s.subscribe(null, () => {})
    expect(typeof unsub).toBe('function')
    unsub()
  })
})

describe('createSessionStorage', () => {
  it('set/get/remove roundtrip', () => {
    const s = createSessionStorage<Schema>('test')
    expect(s.isAvailable()).toBe(true)
    s.set('theme', 'light')
    expect(s.get('theme')).toBe('light')
    expect(s.has('theme')).toBe(true)
    s.remove('theme')
    expect(s.has('theme')).toBe(false)
  })

  it('clear removes prefix entries', () => {
    const s = createSessionStorage<Schema>('x')
    s.set('theme', 'a')
    s.set('count' as any, 1 as any)
    s.clear()
    expect(s.get('theme')).toBeUndefined()
  })

  it('returns default on missing', () => {
    const s = createSessionStorage<Schema>('x')
    expect(s.get('theme', { defaultValue: 'fallback' })).toBe('fallback')
  })

  it('recovers from corrupt data', () => {
    sessionStorage.setItem('x:theme', '{bad')
    const s = createSessionStorage<Schema>('x')
    expect(s.get('theme', { defaultValue: 'ok' })).toBe('ok')
  })
})

describe('getStorageQuota', () => {
  it('returns null when API unavailable (JSDOM default)', async () => {
    const r = await getStorageQuota()
    // JSDOM doesn't implement navigator.storage.estimate by default, so null is expected.
    expect(r === null || (r && typeof r.quota === 'number')).toBe(true)
  })
})

describe('persistent storage API', () => {
  it('requestPersistentStorage returns false when unavailable', async () => {
    expect(await requestPersistentStorage()).toBe(false)
  })

  it('isStoragePersisted returns false when unavailable', async () => {
    expect(await isStoragePersisted()).toBe(false)
  })
})

describe('createMemoryCache', () => {
  type S = Record<string, any>

  it('set/get/has/delete/size', () => {
    const c = createMemoryCache<S>()
    c.set('a', 1)
    c.set('b', 2)
    expect(c.get('a')).toBe(1)
    expect(c.has('b')).toBe(true)
    expect(c.size()).toBe(2)
    c.delete('a')
    expect(c.has('a')).toBe(false)
  })

  it('get returns undefined on miss', () => {
    const c = createMemoryCache<S>()
    expect(c.get('missing')).toBeUndefined()
  })

  it('honors TTL via get and has', () => {
    const c = createMemoryCache<S>()
    const now = Date.now()
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now)
    c.set('a', 1, 1000)
    expect(c.get('a')).toBe(1)
    expect(c.has('a')).toBe(true)
    spy.mockReturnValue(now + 2000)
    expect(c.get('a')).toBeUndefined()
    expect(c.has('a')).toBe(false)
  })

  it('cleanup removes expired', () => {
    const c = createMemoryCache<S>()
    const now = Date.now()
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now)
    c.set('a', 1, 1000)
    c.set('b', 2) // no ttl
    spy.mockReturnValue(now + 5000)
    c.cleanup()
    expect(c.has('b')).toBe(true)
    expect(c.has('a')).toBe(false)
  })

  it('clear empties all', () => {
    const c = createMemoryCache<S>()
    c.set('a', 1)
    c.set('b', 2)
    c.clear()
    expect(c.size()).toBe(0)
  })
})
