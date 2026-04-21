/**
 * Unit tests for object utilities.
 */
import {
  isPlainObject,
  deepMerge,
  pick,
  omit,
  deepClone,
  isEqual,
  isEmpty,
  get,
  set,
  unset,
  has,
  flattenObject,
  unflattenObject,
  mapValues,
  mapKeys,
  filterObject,
  compact,
  fromEntries,
  invert,
  mergeWith,
  diff,
} from '../object'

describe('isPlainObject', () => {
  it('recognizes plain objects', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
    expect(isPlainObject(Object.create(null))).toBe(true)
  })

  it('rejects non-plain / primitives', () => {
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject(undefined)).toBe(false)
    expect(isPlainObject('str')).toBe(false)
    expect(isPlainObject(42)).toBe(false)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(new Date())).toBe(false)
    expect(isPlainObject(new Map())).toBe(false)
  })
})

describe('deepMerge', () => {
  it('merges nested objects', () => {
    const out = deepMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } })
    expect(out).toEqual({ a: 1, b: { c: 2, d: 3 } })
  })

  it('overrides primitives from later sources', () => {
    expect(deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 })
  })

  it('returns target when no sources', () => {
    const t = { a: 1 }
    expect(deepMerge(t)).toEqual({ a: 1 })
  })

  it('skips non-plain-object sources', () => {
    const out = deepMerge({ a: 1 } as any, null as any, 'str' as any, { b: 2 } as any)
    expect(out).toEqual({ a: 1, b: 2 })
  })

  it('does not overwrite with undefined', () => {
    const out = deepMerge({ a: 1 } as any, { a: undefined } as any)
    expect(out.a).toBe(1)
  })
})

describe('pick', () => {
  it('picks requested keys', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 })
  })

  it('skips missing keys', () => {
    expect(pick({ a: 1 } as any, ['a', 'x'] as any)).toEqual({ a: 1 })
  })

  it('handles null/non-object gracefully', () => {
    expect(pick(null as any, ['a'] as any)).toEqual({})
  })
})

describe('omit', () => {
  it('omits given keys', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 })
  })

  it('handles null gracefully', () => {
    expect(omit(null as any, ['a'] as any)).toEqual({})
  })
})

describe('deepClone', () => {
  it('clones nested objects', () => {
    const src = { a: { b: 1, c: [1, 2, { d: 3 }] } }
    const clone = deepClone(src)
    expect(clone).toEqual(src)
    expect(clone).not.toBe(src)
    expect(clone.a).not.toBe(src.a)
    clone.a.b = 99
    expect(src.a.b).toBe(1)
  })

  it('passes through primitives', () => {
    expect(deepClone(5)).toBe(5)
    expect(deepClone('x')).toBe('x')
    expect(deepClone(null)).toBeNull()
  })

  it('clones Date', () => {
    const d = new Date('2020-01-01')
    const c = deepClone(d)
    expect(c).toEqual(d)
    expect(c).not.toBe(d)
  })

  it('clones Map', () => {
    const m = new Map([['a', 1]])
    const c = deepClone(m)
    expect(c.get('a')).toBe(1)
    expect(c).not.toBe(m)
  })

  it('clones Set', () => {
    const s = new Set([1, 2])
    const c = deepClone(s)
    expect(c.has(1)).toBe(true)
    expect(c).not.toBe(s)
  })

  it('clones arrays', () => {
    const a = [1, 2, 3]
    const c = deepClone(a)
    expect(c).toEqual(a)
    expect(c).not.toBe(a)
  })
})

describe('isEqual', () => {
  it('handles primitives', () => {
    expect(isEqual(1, 1)).toBe(true)
    expect(isEqual(1, 2)).toBe(false)
    expect(isEqual(null, null)).toBe(true)
    expect(isEqual(null, undefined)).toBe(false)
  })

  it('handles different types', () => {
    expect(isEqual(1, '1')).toBe(false)
  })

  it('handles arrays', () => {
    expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false)
    expect(isEqual([1, 2], [1, 2, 3])).toBe(false)
  })

  it('handles Date', () => {
    const a = new Date('2020-01-01')
    const b = new Date('2020-01-01')
    expect(isEqual(a, b)).toBe(true)
    expect(isEqual(a, new Date('2021-01-01'))).toBe(false)
  })

  it('handles RegExp', () => {
    expect(isEqual(/abc/g, /abc/g)).toBe(true)
    expect(isEqual(/abc/g, /xyz/g)).toBe(false)
  })

  it('handles Map', () => {
    expect(isEqual(new Map([['a', 1]]), new Map([['a', 1]]))).toBe(true)
    expect(isEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false)
    expect(isEqual(new Map(), new Map([['a', 1]]))).toBe(false)
  })

  it('handles Set', () => {
    expect(isEqual(new Set([1, 2]), new Set([1, 2]))).toBe(true)
    expect(isEqual(new Set([1]), new Set([2]))).toBe(false)
  })

  it('handles nested objects', () => {
    expect(isEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
    expect(isEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
    expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })
})

describe('isEmpty', () => {
  it('detects empty structures', () => {
    expect(isEmpty({})).toBe(true)
    expect(isEmpty([])).toBe(true)
    expect(isEmpty('')).toBe(true)
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty(undefined)).toBe(true)
    expect(isEmpty(new Map())).toBe(true)
    expect(isEmpty(new Set())).toBe(true)
  })

  it('detects non-empty', () => {
    expect(isEmpty({ a: 1 })).toBe(false)
    expect(isEmpty([1])).toBe(false)
    expect(isEmpty('x')).toBe(false)
    expect(isEmpty(new Map([['a', 1]]))).toBe(false)
    expect(isEmpty(new Set([1]))).toBe(false)
  })

  it('returns false for numbers / booleans', () => {
    expect(isEmpty(0)).toBe(false)
    expect(isEmpty(false)).toBe(false)
  })
})

describe('get/set/unset/has', () => {
  const obj = { a: { b: { c: 1 } }, arr: [10, 20] }

  it('get resolves deep paths', () => {
    expect(get(obj, 'a.b.c')).toBe(1)
    expect(get(obj, ['a', 'b', 'c'])).toBe(1)
  })

  it('get returns default on missing', () => {
    expect(get(obj, 'a.x.y', 'DEF')).toBe('DEF')
    expect(get(obj, 'missing', 0)).toBe(0)
  })

  it('get on non-object returns default', () => {
    expect(get(null, 'a', 'd')).toBe('d')
    expect(get(undefined, 'a', 'd')).toBe('d')
  })

  it('set creates nested paths', () => {
    const out = set({} as any, 'a.b.c', 5)
    expect(out).toEqual({ a: { b: { c: 5 } } })
  })

  it('set creates array when next key is numeric', () => {
    const out = set({} as any, 'a.0', 'v')
    expect(Array.isArray((out as any).a)).toBe(true)
  })

  it('unset removes deep key', () => {
    const src = { a: { b: { c: 1, d: 2 } } }
    const out = unset(src as any, 'a.b.c')
    expect(out).toEqual({ a: { b: { d: 2 } } })
  })

  it('unset on non-existent path is a no-op', () => {
    const src = { a: { b: 1 } }
    const out = unset(src as any, 'x.y.z')
    expect(out).toEqual(src)
  })

  it('has detects presence', () => {
    expect(has(obj, 'a.b.c')).toBe(true)
    expect(has(obj, 'a.x.y')).toBe(false)
    expect(has(null, 'a')).toBe(false)
  })
})

describe('flatten / unflatten', () => {
  it('flattens', () => {
    expect(flattenObject({ a: { b: 1, c: { d: 2 } } })).toEqual({ 'a.b': 1, 'a.c.d': 2 })
  })

  it('unflattens', () => {
    expect(unflattenObject({ 'a.b': 1, 'a.c.d': 2 })).toEqual({ a: { b: 1, c: { d: 2 } } })
  })

  it('roundtrip preserves', () => {
    const src = { x: { y: { z: 'v' } }, k: 1 }
    expect(unflattenObject(flattenObject(src))).toEqual(src)
  })
})

describe('mapValues / mapKeys', () => {
  it('maps values', () => {
    expect(mapValues({ a: 1, b: 2 } as any, (v: any) => v * 2)).toEqual({ a: 2, b: 4 })
  })

  it('maps keys', () => {
    expect(mapKeys({ a: 1 } as any, (k) => (k as string).toUpperCase())).toEqual({ A: 1 })
  })

  it('handles null gracefully', () => {
    expect(mapValues(null as any, (v) => v)).toEqual({})
    expect(mapKeys(null as any, (k) => String(k))).toEqual({})
  })
})

describe('filterObject / compact', () => {
  it('filters by predicate', () => {
    expect(filterObject({ a: 1, b: 2, c: 3 } as any, (v: any) => v > 1)).toEqual({ b: 2, c: 3 })
  })

  it('compact removes null/undefined', () => {
    expect(compact({ a: 1, b: null, c: undefined, d: 'x' } as any)).toEqual({ a: 1, d: 'x' })
  })

  it('handles null gracefully', () => {
    expect(filterObject(null as any, () => true)).toEqual({})
  })
})

describe('fromEntries / invert', () => {
  it('fromEntries rebuilds object', () => {
    expect(fromEntries([['a', 1], ['b', 2]] as any)).toEqual({ a: 1, b: 2 })
  })

  it('invert swaps keys/values', () => {
    expect(invert({ a: '1', b: '2' })).toEqual({ '1': 'a', '2': 'b' })
  })
})

describe('mergeWith', () => {
  it('uses customizer first', () => {
    const out = mergeWith(
      { a: [1] } as any,
      { a: [2] } as any,
      (target: any, source: any) =>
        Array.isArray(target) && Array.isArray(source) ? [...target, ...source] : undefined
    )
    expect(out.a).toEqual([1, 2])
  })

  it('falls back to deep merge for nested objects', () => {
    const out = mergeWith(
      { a: { b: 1 } } as any,
      { a: { c: 2 } } as any,
      () => undefined
    )
    expect(out.a).toEqual({ b: 1, c: 2 })
  })
})

describe('diff', () => {
  it('reports added/changed keys', () => {
    const d = diff({ a: 1, b: 2 } as any, { a: 1, b: 3, c: 4 } as any)
    expect(d).toEqual({ b: 3, c: 4 })
  })

  it('is empty when equal', () => {
    expect(diff({ a: 1 } as any, { a: 1 } as any)).toEqual({})
  })
})
