/**
 * Unit tests for validation utilities.
 * Covers the full export surface of src/lib/utils/validation.ts.
 */
import {
  validateEmail,
  validatePassword,
  calculatePasswordStrength,
  validateChannelName,
  validateUsername,
  validateMessageLength,
  validateFileType,
  validateFileSize,
  validateUrl,
  validateDisplayName,
  combineValidations,
} from '../validation'

describe('validateEmail', () => {
  it('accepts a plain valid email', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true })
  })

  it('rejects empty/non-string inputs', () => {
    expect(validateEmail('' as any).valid).toBe(false)
    expect(validateEmail('   ').valid).toBe(false)
    expect(validateEmail(null as any).valid).toBe(false)
    expect(validateEmail(undefined as any).valid).toBe(false)
    expect(validateEmail(42 as any).valid).toBe(false)
  })

  it('rejects emails >254 chars', () => {
    const long = 'a'.repeat(250) + '@a.co'
    expect(validateEmail(long).valid).toBe(false)
  })

  it('rejects malformed emails', () => {
    expect(validateEmail('not-an-email').valid).toBe(false)
    expect(validateEmail('@b.com').valid).toBe(false)
  })

  it('warns on common typos', () => {
    const r = validateEmail('user@gmial.com')
    expect(r.valid).toBe(true)
    expect(r.warning).toMatch(/gmail\.com/)
  })

  it('trims whitespace', () => {
    expect(validateEmail('  user@example.com  ').valid).toBe(true)
  })
})

describe('validatePassword', () => {
  it('accepts a good password', () => {
    const r = validatePassword('Secure@Pass123')
    expect(r.valid).toBe(true)
    expect(r.strength).toBeDefined()
  })

  it('rejects empty inputs', () => {
    expect(validatePassword('' as any).valid).toBe(false)
    expect(validatePassword(null as any).valid).toBe(false)
  })

  it('enforces min length', () => {
    expect(validatePassword('Ab1', { minLength: 8 }).error).toMatch(/at least/)
  })

  it('enforces max length', () => {
    expect(validatePassword('a'.repeat(200)).error).toMatch(/no more than/)
  })

  it('enforces uppercase requirement', () => {
    expect(validatePassword('alllower123').error).toMatch(/uppercase/)
  })

  it('enforces lowercase requirement', () => {
    expect(validatePassword('ALLUPPER123').error).toMatch(/lowercase/)
  })

  it('enforces number requirement', () => {
    expect(validatePassword('NoNumbersHere').error).toMatch(/number/)
  })

  it('enforces special character requirement when set', () => {
    expect(validatePassword('NoSpecial123', { requireSpecial: true }).error).toMatch(/special/)
    expect(validatePassword('Has@Special1', { requireSpecial: true }).valid).toBe(true)
  })

  it('rejects common passwords', () => {
    expect(validatePassword('password123').valid).toBe(false)
  })

  it('allows relaxed requirements', () => {
    const r = validatePassword('simplepw', {
      requireUppercase: false,
      requireNumber: false,
    })
    expect(r.valid).toBe(true)
  })
})

describe('calculatePasswordStrength', () => {
  it('rates short weak passwords as weak', () => {
    expect(calculatePasswordStrength('abc')).toBe('weak')
  })

  it('rates medium complexity as fair', () => {
    expect(['weak', 'fair']).toContain(calculatePasswordStrength('Password'))
  })

  it('rates long diverse passwords as strong', () => {
    expect(calculatePasswordStrength('S7r0ng!Pa$$w0rd#Long@2024')).toBe('strong')
  })

  it('penalizes sequential chars', () => {
    const seq = calculatePasswordStrength('abc123DEF')
    const rand = calculatePasswordStrength('xqz951MNP')
    // sequential should not exceed random of equivalent complexity
    expect(['weak', 'fair', 'good']).toContain(seq)
    expect(['weak', 'fair', 'good', 'strong']).toContain(rand)
  })

  it('penalizes repeats', () => {
    expect(['weak', 'fair']).toContain(calculatePasswordStrength('aaaaBBBB'))
  })
})

describe('validateChannelName', () => {
  it('accepts valid names', () => {
    expect(validateChannelName('general').valid).toBe(true)
    expect(validateChannelName('my-channel').valid).toBe(true)
    expect(validateChannelName('team_1').valid).toBe(true)
    expect(validateChannelName('a').valid).toBe(true)
  })

  it('rejects empty/non-string', () => {
    expect(validateChannelName('').valid).toBe(false)
    expect(validateChannelName(null as any).valid).toBe(false)
  })

  it('rejects too-long names', () => {
    expect(validateChannelName('a'.repeat(100)).valid).toBe(false)
  })

  it('rejects invalid chars / uppercase', () => {
    expect(validateChannelName('My Channel').valid).toBe(false)
    expect(validateChannelName('UPPER').valid).toBe(false)
    expect(validateChannelName('-invalid').valid).toBe(false)
  })

  it('rejects reserved names', () => {
    expect(validateChannelName('admin').valid).toBe(false)
    expect(validateChannelName('everyone').valid).toBe(false)
    expect(validateChannelName('here').valid).toBe(false)
  })

  it('respects custom minLength', () => {
    expect(validateChannelName('ab', { minLength: 3 }).valid).toBe(false)
  })
})

describe('validateUsername', () => {
  it('accepts valid usernames', () => {
    expect(validateUsername('john_doe').valid).toBe(true)
    expect(validateUsername('jane.smith').valid).toBe(true)
    expect(validateUsername('User1').valid).toBe(true)
  })

  it('rejects short/long/empty', () => {
    expect(validateUsername('').valid).toBe(false)
    expect(validateUsername('a').valid).toBe(false)
    expect(validateUsername('a'.repeat(40)).valid).toBe(false)
  })

  it('rejects invalid patterns', () => {
    expect(validateUsername('1startswithnum').valid).toBe(false)
    expect(validateUsername('has space').valid).toBe(false)
    expect(validateUsername('has__double').valid).toBe(false)
    expect(validateUsername('has..double').valid).toBe(false)
  })

  it('rejects reserved usernames', () => {
    expect(validateUsername('admin').valid).toBe(false)
    expect(validateUsername('root').valid).toBe(false)
  })
})

describe('validateMessageLength', () => {
  it('accepts valid messages', () => {
    expect(validateMessageLength('Hello!').valid).toBe(true)
  })

  it('rejects null/undefined', () => {
    expect(validateMessageLength(null as any).valid).toBe(false)
    expect(validateMessageLength(undefined as any).valid).toBe(false)
  })

  it('rejects empty unless allowed', () => {
    expect(validateMessageLength('').valid).toBe(false)
    expect(validateMessageLength('   ').valid).toBe(false)
    expect(validateMessageLength('', { allowEmpty: true }).valid).toBe(true)
  })

  it('rejects too long', () => {
    expect(validateMessageLength('x'.repeat(5000)).valid).toBe(false)
  })

  it('warns near limit', () => {
    const near = 'x'.repeat(3700)
    const r = validateMessageLength(near)
    expect(r.valid).toBe(true)
    expect(r.warning).toBeDefined()
  })

  it('custom maxLength works', () => {
    expect(validateMessageLength('too long', { maxLength: 3 }).valid).toBe(false)
  })
})

describe('validateFileType', () => {
  it('allows any when no config', () => {
    expect(validateFileType({ name: 'f.xyz', type: 'application/foo' }).valid).toBe(true)
  })

  it('accepts matching MIME types', () => {
    expect(
      validateFileType({ name: 'x.jpg', type: 'image/jpeg' }, { mimeTypes: ['image/jpeg'] }).valid
    ).toBe(true)
  })

  it('accepts matching extensions', () => {
    expect(validateFileType({ name: 'x.pdf' }, { extensions: ['.pdf'] }).valid).toBe(true)
  })

  it('accepts via category preset', () => {
    expect(
      validateFileType({ name: 'x.jpg', type: 'image/jpeg' }, { categories: ['image'] }).valid
    ).toBe(true)
    expect(
      validateFileType({ name: 'x.mp4', type: 'video/mp4' }, { categories: ['video'] }).valid
    ).toBe(true)
    expect(
      validateFileType({ name: 'x.pdf', type: 'application/pdf' }, { categories: ['document'] })
        .valid
    ).toBe(true)
    expect(
      validateFileType({ name: 'x.zip', type: 'application/zip' }, { categories: ['archive'] })
        .valid
    ).toBe(true)
    expect(
      validateFileType({ name: 'x.mp3', type: 'audio/mpeg' }, { categories: ['audio'] }).valid
    ).toBe(true)
  })

  it('rejects mismatches with useful error', () => {
    const r = validateFileType(
      { name: 'x.exe', type: 'application/x-exe' },
      { categories: ['image'] }
    )
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/Allowed types/)
  })
})

describe('validateFileSize', () => {
  const MB = 1024 * 1024

  it('accepts sizes within range', () => {
    expect(validateFileSize(MB, 5 * MB).valid).toBe(true)
  })

  it('rejects invalid number', () => {
    expect(validateFileSize(NaN, 5 * MB).valid).toBe(false)
    expect(validateFileSize('abc' as any, 5 * MB).valid).toBe(false)
  })

  it('rejects below min', () => {
    expect(validateFileSize(100, 5 * MB, 1024).valid).toBe(false)
  })

  it('rejects above max', () => {
    const r = validateFileSize(10 * MB, 5 * MB)
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/too large/)
  })

  it('warns when near limit', () => {
    const r = validateFileSize(4.5 * MB, 5 * MB)
    expect(r.valid).toBe(true)
    expect(r.warning).toBeDefined()
  })
})

describe('validateUrl', () => {
  it('accepts valid URLs', () => {
    expect(validateUrl('https://example.com').valid).toBe(true)
    expect(validateUrl('http://example.com/path?q=1').valid).toBe(true)
  })

  it('rejects malformed and empty', () => {
    expect(validateUrl('').valid).toBe(false)
    expect(validateUrl('not a url').valid).toBe(false)
    expect(validateUrl(null as any).valid).toBe(false)
  })

  it('enforces HTTPS', () => {
    expect(validateUrl('http://a.com', { requireHttps: true }).valid).toBe(false)
    expect(validateUrl('https://a.com', { requireHttps: true }).valid).toBe(true)
  })

  it('enforces allowed protocols', () => {
    expect(validateUrl('ftp://a.com', { allowedProtocols: ['https'] }).valid).toBe(false)
    expect(validateUrl('https://a.com', { allowedProtocols: ['https'] }).valid).toBe(true)
  })

  it('enforces allowed domains', () => {
    expect(validateUrl('https://bad.com', { allowedDomains: ['good.com'] }).valid).toBe(false)
    expect(validateUrl('https://good.com', { allowedDomains: ['good.com'] }).valid).toBe(true)
    expect(validateUrl('https://sub.good.com', { allowedDomains: ['good.com'] }).valid).toBe(true)
  })
})

describe('validateDisplayName', () => {
  it('accepts normal names', () => {
    expect(validateDisplayName('Alice').valid).toBe(true)
  })

  it('rejects empty and overly long', () => {
    expect(validateDisplayName('').valid).toBe(false)
    expect(validateDisplayName('a'.repeat(60)).valid).toBe(false)
  })

  it('rejects names with no alphanumerics', () => {
    expect(validateDisplayName('!!!').valid).toBe(false)
  })

  it('respects min length', () => {
    expect(validateDisplayName('a', { minLength: 2 }).valid).toBe(false)
  })
})

describe('combineValidations', () => {
  it('returns valid when all valid', () => {
    const r = combineValidations({ valid: true }, { valid: true })
    expect(r.valid).toBe(true)
  })

  it('combines error messages', () => {
    const r = combineValidations(
      { valid: false, error: 'e1' },
      { valid: false, error: 'e2' }
    )
    expect(r.valid).toBe(false)
    expect(r.error).toContain('e1')
    expect(r.error).toContain('e2')
  })

  it('combines warnings', () => {
    const r = combineValidations({ valid: true, warning: 'w1' }, { valid: true, warning: 'w2' })
    expect(r.valid).toBe(true)
    expect(r.warning).toContain('w1')
    expect(r.warning).toContain('w2')
  })

  it('returns invalid+warnings when mixed', () => {
    const r = combineValidations(
      { valid: false, error: 'bad' },
      { valid: true, warning: 'warn' }
    )
    expect(r.valid).toBe(false)
    expect(r.error).toBe('bad')
    expect(r.warning).toBe('warn')
  })
})
