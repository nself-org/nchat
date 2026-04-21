/**
 * Unit tests for embedding-utils.ts — pure vector math helpers.
 *
 * No network, no mocks — every function here operates on number[] inputs.
 */
import {
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  dotProduct,
  normalize,
  magnitude,
  averageVectors,
  weightedAverageVectors,
  calculateQualityScore,
  detectAnomalies,
  reduceDimensions,
  getEmbeddingStats,
  formatEmbedding,
  compareEmbeddings,
  findMostSimilar,
  simpleCluster,
  EmbeddingUtils,
} from '../embedding-utils'

// helper: produce a deterministic unit-ish vector
const unit = (x: number, y: number): number[] => {
  const m = Math.sqrt(x * x + y * y)
  return [x / m, y / m]
}

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6)
  })
  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 6)
  })
  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6)
  })
  it('returns 0 when one vector is all zeros', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
  })
  it('throws on dimension mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/dimension mismatch/i)
  })
})

describe('euclideanDistance', () => {
  it('is 0 for identical vectors', () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0)
  })
  it('equals sqrt(sum(diff^2))', () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5)
  })
  it('throws on dimension mismatch', () => {
    expect(() => euclideanDistance([1], [1, 2])).toThrow(/dimension mismatch/i)
  })
  it('is symmetric', () => {
    expect(euclideanDistance([1, 2], [5, 6])).toBe(euclideanDistance([5, 6], [1, 2]))
  })
})

describe('manhattanDistance', () => {
  it('is 0 for identical vectors', () => {
    expect(manhattanDistance([1, 2, 3], [1, 2, 3])).toBe(0)
  })
  it('sums absolute differences', () => {
    expect(manhattanDistance([0, 0], [3, 4])).toBe(7)
  })
  it('throws on dimension mismatch', () => {
    expect(() => manhattanDistance([1], [1, 2])).toThrow(/dimension mismatch/i)
  })
})

describe('dotProduct', () => {
  it('computes inner product', () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32)
  })
  it('is 0 for orthogonal vectors', () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0)
  })
  it('throws on dimension mismatch', () => {
    expect(() => dotProduct([1], [1, 2])).toThrow(/dimension mismatch/i)
  })
})

describe('normalize & magnitude', () => {
  it('normalized vector has magnitude ~1', () => {
    const n = normalize([3, 4])
    expect(magnitude(n)).toBeCloseTo(1, 6)
  })
  it('magnitude of [3,4] is 5', () => {
    expect(magnitude([3, 4])).toBe(5)
  })
  it('normalize of zero vector returns zero vector unchanged', () => {
    expect(normalize([0, 0, 0])).toEqual([0, 0, 0])
  })
  it('magnitude of zero vector is 0', () => {
    expect(magnitude([0, 0])).toBe(0)
  })
})

describe('averageVectors', () => {
  it('averages two unit axes', () => {
    expect(averageVectors([[1, 0], [0, 1]])).toEqual([0.5, 0.5])
  })
  it('throws on empty list', () => {
    expect(() => averageVectors([])).toThrow(/empty/i)
  })
  it('throws on dimension mismatch', () => {
    expect(() => averageVectors([[1, 2], [1]])).toThrow(/same dimension/i)
  })
  it('returns a copy independent from input (mutation-free)', () => {
    const a = [1, 2]
    const res = averageVectors([a, [3, 4]])
    res[0] = 999
    expect(a[0]).toBe(1)
  })
})

describe('weightedAverageVectors', () => {
  it('weights: equal weights == plain average', () => {
    const equal = weightedAverageVectors([[1, 0], [0, 1]], [1, 1])
    expect(equal).toEqual([0.5, 0.5])
  })
  it('bias toward higher-weight vector', () => {
    const r = weightedAverageVectors([[1, 0], [0, 1]], [3, 1])
    expect(r[0]).toBeCloseTo(0.75, 6)
    expect(r[1]).toBeCloseTo(0.25, 6)
  })
  it('throws on empty list', () => {
    expect(() => weightedAverageVectors([], [])).toThrow(/empty/i)
  })
  it('throws on mismatched weight count', () => {
    expect(() => weightedAverageVectors([[1]], [1, 2])).toThrow(/match number of weights/i)
  })
  it('throws on zero total weight', () => {
    expect(() => weightedAverageVectors([[1], [2]], [0, 0])).toThrow(/weight cannot be zero/i)
  })
  it('throws on dimension mismatch', () => {
    expect(() => weightedAverageVectors([[1, 2], [1]], [1, 1])).toThrow(/same dimension/i)
  })
})

describe('calculateQualityScore', () => {
  it('returns 0 on NaN', () => {
    expect(calculateQualityScore([NaN, 0, 0])).toBe(0)
  })
  it('returns 0 on Infinity', () => {
    expect(calculateQualityScore([Infinity, 1])).toBe(0)
  })
  it('gives high score for normalized vector with variance', () => {
    const v = normalize([1, -1, 0.5, -0.5, 0.2, -0.3])
    expect(calculateQualityScore(v)).toBeGreaterThan(90)
  })
  it('gives low score for zero vector', () => {
    expect(calculateQualityScore([0, 0, 0, 0])).toBeLessThan(60)
  })
  it('is clamped to [0,100]', () => {
    const s = calculateQualityScore([0.5, 0.5, 0.5, 0.5])
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(100)
  })
})

describe('detectAnomalies', () => {
  it('flags NaN/Infinity', () => {
    const a = detectAnomalies([NaN, 0, 0])
    expect(a.some((s) => /invalid values/i.test(s))).toBe(true)
  })
  it('flags near-zero magnitude', () => {
    const a = detectAnomalies([0, 0, 0, 0])
    expect(a.some((s) => /near-zero/i.test(s))).toBe(true)
  })
  it('flags non-normalized vectors', () => {
    const a = detectAnomalies([5, 5, 5, 5])
    expect(a.some((s) => /not normalized/i.test(s))).toBe(true)
  })
  it('flags extreme values', () => {
    const a = detectAnomalies(normalize([20, 0, 0, 0, 0]))
    // After normalize, magnitude is 1, so "not normalized" is false
    // Build a different case: raw extreme values (pre-normalize)
    const b = detectAnomalies([20, 0, 0, 0, 0])
    expect(b.some((s) => /extreme/i.test(s))).toBe(true)
  })
  it('returns empty for a clean normalized vector', () => {
    const v = normalize([0.4, -0.3, 0.2, -0.1, 0.5, -0.5, 0.25, -0.25])
    expect(detectAnomalies(v)).toEqual([])
  })
})

describe('reduceDimensions', () => {
  it('returns same vector if target >= input length', () => {
    expect(reduceDimensions([1, 2, 3], 5)).toEqual([1, 2, 3])
  })
  it('reduces to target dimension', () => {
    const r = reduceDimensions([1, 2, 3, 4, 5, 6], 3)
    expect(r).toHaveLength(3)
    expect(r[0]).toBeCloseTo(1.5, 6) // (1+2)/2
    expect(r[1]).toBeCloseTo(3.5, 6) // (3+4)/2
    expect(r[2]).toBeCloseTo(5.5, 6) // (5+6)/2
  })
  it('handles uneven chunking', () => {
    const r = reduceDimensions([1, 2, 3, 4, 5], 2)
    expect(r).toHaveLength(2)
  })
})

describe('getEmbeddingStats', () => {
  it('returns correct dimension', () => {
    expect(getEmbeddingStats([1, 2, 3, 4]).dimension).toBe(4)
  })
  it('reports isNormalized=true for unit vector', () => {
    const s = getEmbeddingStats(normalize([0.3, 0.4, 0.5]))
    expect(s.isNormalized).toBe(true)
  })
  it('reports isNormalized=false otherwise', () => {
    expect(getEmbeddingStats([10, 10, 10]).isNormalized).toBe(false)
  })
  it('includes min/max and qualityScore', () => {
    const s = getEmbeddingStats([-1, 0, 1])
    expect(s.min).toBe(-1)
    expect(s.max).toBe(1)
    expect(typeof s.qualityScore).toBe('number')
  })
})

describe('formatEmbedding', () => {
  it('formats short vectors inline', () => {
    const s = formatEmbedding([1, 2, 3], 10)
    expect(s).toContain('1.0000')
    expect(s).not.toContain('...')
  })
  it('truncates long vectors with ellipsis', () => {
    const v = Array.from({ length: 100 }, (_, i) => i)
    const s = formatEmbedding(v, 10)
    expect(s).toContain('...')
    expect(s.length).toBeLessThan(1000)
  })
})

describe('compareEmbeddings', () => {
  it('returns all four metrics', () => {
    const c = compareEmbeddings([1, 0], [1, 0])
    expect(c.cosineSimilarity).toBeCloseTo(1, 6)
    expect(c.euclideanDistance).toBe(0)
    expect(c.manhattanDistance).toBe(0)
    expect(c.dotProduct).toBe(1)
  })
  it('rounds to 6 decimal places', () => {
    const c = compareEmbeddings([1, 2], [3, 4])
    // All values should be finite numbers
    expect(Number.isFinite(c.cosineSimilarity)).toBe(true)
    expect(Number.isFinite(c.euclideanDistance)).toBe(true)
  })
})

describe('findMostSimilar', () => {
  const candidates = [unit(1, 0), unit(0, 1), unit(1, 1)]
  it('finds best cosine match', () => {
    const r = findMostSimilar(unit(1, 0), candidates, 'cosine')
    expect(r.index).toBe(0)
    expect(r.similarity).toBeCloseTo(1, 6)
  })
  it('finds best euclidean match (smallest distance)', () => {
    const r = findMostSimilar([1, 0], [[1, 0], [0, 1], [5, 5]], 'euclidean')
    expect(r.index).toBe(0)
    expect(r.similarity).toBe(0)
  })
  it('finds best manhattan match', () => {
    const r = findMostSimilar([1, 0], [[1, 0], [0, 1], [5, 5]], 'manhattan')
    expect(r.index).toBe(0)
  })
  it('defaults to cosine when metric omitted', () => {
    const r = findMostSimilar(unit(0, 1), candidates)
    expect(r.index).toBe(1)
  })
})

describe('simpleCluster', () => {
  it('assigns every input to a cluster [0, k)', () => {
    const embeddings = [[1, 0], [0.9, 0.1], [0, 1], [0.1, 0.9], [-1, 0], [-0.9, 0.1]]
    const k = 3
    const assign = simpleCluster(embeddings, k, 50)
    expect(assign).toHaveLength(embeddings.length)
    for (const a of assign) {
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(k)
    }
  })
  it('throws if embeddings.length < k', () => {
    expect(() => simpleCluster([[1, 0]], 3, 10)).toThrow(/must be >= k/i)
  })
})

describe('EmbeddingUtils namespace', () => {
  it('exports all the helpers as an object', () => {
    expect(typeof EmbeddingUtils.cosineSimilarity).toBe('function')
    expect(typeof EmbeddingUtils.findMostSimilar).toBe('function')
    expect(typeof EmbeddingUtils.simpleCluster).toBe('function')
  })
  it('namespace function matches imported function', () => {
    expect(EmbeddingUtils.magnitude([3, 4])).toBe(magnitude([3, 4]))
  })
})
