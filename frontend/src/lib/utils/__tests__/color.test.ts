/**
 * Unit tests for color utilities.
 */
import {
  hexToRgb,
  hexToRgba,
  rgbToHex,
  rgbaToHex,
  rgbToHsl,
  hslToRgb,
  hexToHsl,
  hslToHex,
  lighten,
  darken,
  saturate,
  desaturate,
  adjustHue,
  getComplementary,
  getContrastColor,
  getLuminance,
  getContrastRatio,
  meetsContrastRequirement,
  mix,
  tint,
  shade,
  generatePalette,
  getTriadic,
  getAnalogous,
  getSplitComplementary,
  toGrayscale,
  invert,
  isValidHex,
  parseColor,
  toRgbString,
  toHslString,
} from '../color'

describe('hexToRgb / hexToRgba', () => {
  it('converts 6-char hex', () => {
    expect(hexToRgb('#ff5500')).toEqual({ r: 255, g: 85, b: 0 })
  })

  it('expands shorthand', () => {
    expect(hexToRgb('f50')).toEqual({ r: 255, g: 85, b: 0 })
  })

  it('strips alpha from 8-char hex', () => {
    expect(hexToRgb('#ff550080')).toEqual({ r: 255, g: 85, b: 0 })
  })

  it('returns null on invalid', () => {
    expect(hexToRgb('zzz')).toBeNull()
    expect(hexToRgb('#12')).toBeNull()
  })

  it('hexToRgba parses 8-char', () => {
    const r = hexToRgba('#ff550080')
    expect(r?.r).toBe(255)
    expect(r?.a).toBeCloseTo(128 / 255, 2)
  })

  it('hexToRgba defaults alpha on 6-char', () => {
    expect(hexToRgba('#ff0000')?.a).toBe(1)
  })

  it('hexToRgba returns null on invalid', () => {
    expect(hexToRgba('invalid_!!')).toBeNull()
    expect(hexToRgba('#xyz')).toBeNull()
  })
})

describe('rgbToHex', () => {
  it('converts object form', () => {
    expect(rgbToHex({ r: 255, g: 85, b: 0 })).toBe('#ff5500')
  })

  it('converts number form', () => {
    expect(rgbToHex(255, 85, 0)).toBe('#ff5500')
  })

  it('clamps values', () => {
    expect(rgbToHex(300, -10, 128)).toBe('#ff0080')
  })
})

describe('rgbaToHex', () => {
  it('adds alpha channel', () => {
    expect(rgbaToHex({ r: 255, g: 0, b: 0, a: 1 })).toBe('#ff0000ff')
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 0 })).toBe('#00000000')
  })
})

describe('rgb <-> hsl roundtrip', () => {
  it('rgbToHsl produces valid ranges', () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 })
    expect(hsl.h).toBeGreaterThanOrEqual(0)
    expect(hsl.h).toBeLessThanOrEqual(360)
  })

  it('hslToRgb produces valid rgb', () => {
    const rgb = hslToRgb({ h: 0, s: 1, l: 0.5 })
    expect(rgb.r).toBeGreaterThanOrEqual(0)
    expect(rgb.r).toBeLessThanOrEqual(255)
  })

  it('gray hsl returns gray rgb', () => {
    const rgb = hslToRgb({ h: 0, s: 0, l: 0.5 })
    expect(rgb.r).toBe(rgb.g)
    expect(rgb.g).toBe(rgb.b)
  })

  it('hexToHsl and hslToHex work', () => {
    const hsl = hexToHsl('#ff0000')
    expect(hsl).not.toBeNull()
    expect(hslToHex(hsl!)).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('hexToHsl returns null on invalid', () => {
    expect(hexToHsl('nope')).toBeNull()
  })
})

describe('color transforms', () => {
  it('lighten returns a valid hex', () => {
    expect(lighten('#3366ff', 0.2)).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('darken returns a valid hex', () => {
    expect(darken('#3366ff', 0.2)).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('saturate / desaturate', () => {
    expect(saturate('#3366ff', 0.1)).toMatch(/^#/)
    expect(desaturate('#3366ff', 0.1)).toMatch(/^#/)
  })

  it('adjustHue rotates', () => {
    expect(adjustHue('#ff0000', 120)).toMatch(/^#/)
  })

  it('getComplementary', () => {
    expect(getComplementary('#ff0000')).toMatch(/^#/)
  })

  it('lighten returns input on invalid', () => {
    expect(lighten('invalid', 0.1)).toBe('invalid')
  })
})

describe('luminance and contrast', () => {
  it('getLuminance returns number', () => {
    expect(typeof getLuminance({ r: 255, g: 255, b: 255 })).toBe('number')
  })

  it('getContrastColor returns white or black', () => {
    expect(getContrastColor('#000000')).toBeDefined()
    expect(getContrastColor('#ffffff')).toBeDefined()
  })

  it('getContrastRatio returns >=1', () => {
    const r = getContrastRatio('#000000', '#ffffff')
    expect(r).toBeGreaterThan(1)
  })

  it('meetsContrastRequirement for AA', () => {
    expect(meetsContrastRequirement('#000000', '#ffffff')).toBe(true)
    expect(meetsContrastRequirement('#777777', '#888888')).toBe(false)
  })
})

describe('mix / tint / shade', () => {
  it('mix blends two colors', () => {
    expect(mix('#ff0000', '#0000ff', 0.5)).toMatch(/^#/)
  })

  it('tint', () => {
    expect(tint('#3366ff', 0.1)).toMatch(/^#/)
  })

  it('shade', () => {
    expect(shade('#3366ff', 0.1)).toMatch(/^#/)
  })
})

describe('palette generators', () => {
  it('generatePalette returns N colors', () => {
    const p = generatePalette('#3366ff', 5)
    expect(p.length).toBe(5)
    expect(p.every((c) => /^#/.test(c))).toBe(true)
  })

  it('getTriadic returns 3 colors', () => {
    const t = getTriadic('#ff0000')
    expect(t.length).toBe(3)
  })

  it('getAnalogous returns 3 colors', () => {
    const a = getAnalogous('#ff0000', 30)
    expect(a.length).toBe(3)
  })

  it('getSplitComplementary returns 3 colors', () => {
    const s = getSplitComplementary('#ff0000', 30)
    expect(s.length).toBe(3)
  })
})

describe('grayscale / invert', () => {
  it('toGrayscale produces hex', () => {
    expect(toGrayscale('#3366ff')).toMatch(/^#/)
  })

  it('invert negates rgb', () => {
    expect(invert('#000000')).toBe('#ffffff')
  })
})

describe('isValidHex / parse / toXString', () => {
  it('isValidHex', () => {
    expect(isValidHex('#ff0000')).toBe(true)
    expect(isValidHex('#f00')).toBe(true)
    expect(isValidHex('not')).toBe(false)
  })

  it('parseColor accepts hex', () => {
    expect(parseColor('#ff0000')).not.toBeNull()
  })

  it('toRgbString produces rgb/rgba string', () => {
    const s = toRgbString('#ff0000')
    expect(s).toMatch(/rgb/)
  })

  it('toHslString produces hsl/hsla string', () => {
    const s = toHslString('#ff0000')
    expect(s).toMatch(/hsl/)
  })
})
