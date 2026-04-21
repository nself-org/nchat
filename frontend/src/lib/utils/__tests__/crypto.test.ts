/**
 * Unit tests for crypto utilities.
 * Security-sensitive: test every branch of ID generation and encoding.
 */
import {
  generateId,
  generateUUID,
  generateShortId,
  generateNumericId,
  randomString,
  hashString,
  simpleHash,
  constantTimeCompare,
  base64Encode,
  base64Decode,
  base64UrlEncode,
  base64UrlDecode,
  bufferToHex,
  hexToBuffer,
  randomBytes,
  generateSecureToken,
  hashPassword,
  createFingerprint,
  generateSlugId,
  isCryptoAvailable,
  isSubtleCryptoAvailable,
} from '../crypto'

describe('generateId', () => {
  it('returns empty string for length <= 0', () => {
    expect(generateId(0)).toBe('')
    expect(generateId(-5)).toBe('')
  })

  it('returns correct length', () => {
    expect(generateId(10)).toHaveLength(10)
    expect(generateId(21)).toHaveLength(21)
  })

  it('uses custom alphabet', () => {
    const id = generateId(20, '0123456789')
    expect(/^[0-9]+$/.test(id)).toBe(true)
  })

  it('produces different IDs on successive calls', () => {
    expect(generateId(16)).not.toBe(generateId(16))
  })
})

describe('generateUUID', () => {
  it('returns a v4 UUID', () => {
    const u = generateUUID()
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('produces unique UUIDs', () => {
    expect(generateUUID()).not.toBe(generateUUID())
  })
})

describe('generateShortId / generateNumericId', () => {
  it('short id default length 8', () => {
    expect(generateShortId()).toHaveLength(8)
    expect(/^[A-Za-z0-9]+$/.test(generateShortId())).toBe(true)
  })

  it('numeric id is digits only', () => {
    expect(/^[0-9]+$/.test(generateNumericId(6))).toBe(true)
  })
})

describe('randomString', () => {
  it('produces strings matching configured charset', () => {
    expect(/^[0-9]+$/.test(randomString(10, { uppercase: false, lowercase: false, numbers: true }))).toBe(
      true
    )
    expect(/^[A-Z]+$/.test(randomString(10, { uppercase: true, lowercase: false, numbers: false }))).toBe(
      true
    )
  })

  it('defaults to mixed when no options selected', () => {
    const s = randomString(20, { uppercase: false, lowercase: false, numbers: false, symbols: false })
    expect(s).toHaveLength(20)
  })

  it('supports customAlphabet exclusively', () => {
    const s = randomString(10, {
      customAlphabet: 'xy',
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
    })
    expect(/^[xy]+$/.test(s)).toBe(true)
  })
})

describe('hashString / simpleHash', () => {
  it('hashString returns hex-encoded hash', async () => {
    const h = await hashString('hello world')
    expect(/^[0-9a-f]+$/.test(h)).toBe(true)
    expect(h.length).toBeGreaterThan(30)
  })

  it('hashString deterministic for same input', async () => {
    const a = await hashString('x')
    const b = await hashString('x')
    expect(a).toBe(b)
  })

  it('supports SHA-1 algorithm', async () => {
    const h = await hashString('hello', 'SHA-1')
    expect(h.length).toBe(40)
  })

  it('simpleHash returns 8-char hex', () => {
    expect(/^[0-9a-f]{8}$/.test(simpleHash('hello'))).toBe(true)
  })

  it('simpleHash empty string', () => {
    expect(simpleHash('')).toBe('0')
  })
})

describe('constantTimeCompare', () => {
  it('returns true for equal strings', () => {
    expect(constantTimeCompare('abc', 'abc')).toBe(true)
  })

  it('returns false for different lengths', () => {
    expect(constantTimeCompare('abc', 'abcd')).toBe(false)
  })

  it('returns false for different content', () => {
    expect(constantTimeCompare('abc', 'xyz')).toBe(false)
  })
})

describe('base64 encoding', () => {
  it('base64Encode / Decode roundtrip', () => {
    const orig = 'hello world'
    expect(base64Decode(base64Encode(orig))).toBe(orig)
  })

  it('base64Encode handles unicode', () => {
    const orig = 'café'
    expect(base64Decode(base64Encode(orig))).toBe(orig)
  })

  it('base64UrlEncode replaces special chars', () => {
    const out = base64UrlEncode('any carnal pleasur')
    expect(out).not.toContain('+')
    expect(out).not.toContain('/')
    expect(out).not.toContain('=')
  })

  it('base64UrlDecode restores', () => {
    const orig = 'hello'
    expect(base64UrlDecode(base64UrlEncode(orig))).toBe(orig)
  })

  it('base64UrlDecode handles no padding', () => {
    const orig = 'hi'
    expect(base64UrlDecode(base64UrlEncode(orig))).toBe(orig)
  })
})

describe('bufferToHex / hexToBuffer', () => {
  it('bufferToHex returns hex string', () => {
    const buf = new Uint8Array([0, 1, 255]).buffer
    expect(bufferToHex(buf)).toBe('0001ff')
  })

  it('hexToBuffer reverses bufferToHex', () => {
    const orig = new Uint8Array([10, 20, 30, 40])
    const h = bufferToHex(orig.buffer)
    const buf = hexToBuffer(h)
    expect(new Uint8Array(buf)).toEqual(orig)
  })
})

describe('randomBytes / generateSecureToken', () => {
  it('randomBytes returns Uint8Array of correct length', () => {
    const b = randomBytes(16)
    expect(b).toBeInstanceOf(Uint8Array)
    expect(b.length).toBe(16)
  })

  it('generateSecureToken is URL-safe', () => {
    const t = generateSecureToken(32)
    expect(/^[A-Za-z0-9_-]+$/.test(t)).toBe(true)
  })
})

describe('hashPassword / createFingerprint', () => {
  it('hashPassword returns a hash', async () => {
    const h = await hashPassword('secret', 'salt')
    expect(/^[0-9a-f]+$/.test(h)).toBe(true)
  })

  it('hashPassword is different with different salts', async () => {
    const a = await hashPassword('secret', 'salt1')
    const b = await hashPassword('secret', 'salt2')
    expect(a).not.toBe(b)
  })

  it('createFingerprint combines values', async () => {
    const f1 = await createFingerprint('a', 'b')
    const f2 = await createFingerprint('a', 'b')
    expect(f1).toBe(f2)
    const f3 = await createFingerprint('a', 'c')
    expect(f1).not.toBe(f3)
  })
})

describe('generateSlugId', () => {
  it('produces adj-color-animal-4char format', () => {
    const s = generateSlugId()
    expect(s.split('-').length).toBe(4)
  })
})

describe('crypto availability guards', () => {
  it('returns booleans', () => {
    expect(typeof isCryptoAvailable()).toBe('boolean')
    expect(typeof isSubtleCryptoAvailable()).toBe('boolean')
  })
})
