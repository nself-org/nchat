/**
 * Unit tests for embedding-monitor.ts — in-memory metrics tracking.
 *
 * We avoid the one network-hitting method (`getReport`) and exercise the
 * pure-in-memory surface: recordPerformance, recordQuality, recordCost,
 * trackOperation, getPerformanceTrends, getAlerts, clearMetrics, getSummary.
 */
import { EmbeddingMonitor } from '../embedding-monitor'

// Silence console noise during tests
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterAll(() => {
  ;(console.warn as jest.Mock).mockRestore?.()
})

// mute apollo side-effects — getReport is the only consumer and we never call it
jest.mock('@/lib/apollo-client', () => ({ apolloClient: { query: jest.fn() } }))
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }))

describe('EmbeddingMonitor.recordPerformance', () => {
  it('stores a metric', () => {
    const m = new EmbeddingMonitor()
    m.recordPerformance({
      operation: 'embed',
      duration: 100,
      timestamp: new Date(),
      success: true,
    })
    expect(m.getSummary().metricsCount.performance).toBe(1)
  })
  it('caps metrics at 1000 (trims oldest)', () => {
    const m = new EmbeddingMonitor()
    for (let i = 0; i < 1200; i++) {
      m.recordPerformance({
        operation: 'op',
        duration: 10,
        timestamp: new Date(),
        success: true,
      })
    }
    expect(m.getSummary().metricsCount.performance).toBe(1000)
  })
  it('records failure metrics', () => {
    const m = new EmbeddingMonitor()
    m.recordPerformance({
      operation: 'embed',
      duration: 5,
      timestamp: new Date(),
      success: false,
      error: 'timeout',
    })
    expect(m.getSummary().metricsCount.performance).toBe(1)
  })
  it('does not throw on slow-operation branch', () => {
    const m = new EmbeddingMonitor()
    expect(() =>
      m.recordPerformance({
        operation: 'embed',
        duration: 9999,
        timestamp: new Date(),
        success: true,
      })
    ).not.toThrow()
  })
})

describe('EmbeddingMonitor.recordQuality', () => {
  it('stores a quality metric derived from the embedding', () => {
    const m = new EmbeddingMonitor()
    const normalized = (() => {
      const raw = [0.4, -0.3, 0.2, -0.5, 0.1, -0.2]
      const mag = Math.sqrt(raw.reduce((s, v) => s + v * v, 0))
      return raw.map((v) => v / mag)
    })()
    m.recordQuality('emb-1', normalized)
    expect(m.getSummary().metricsCount.quality).toBe(1)
  })
  it('caps quality metrics at 1000', () => {
    const m = new EmbeddingMonitor()
    for (let i = 0; i < 1100; i++) {
      m.recordQuality(`e${i}`, [0.1, 0.2, 0.3])
    }
    expect(m.getSummary().metricsCount.quality).toBe(1000)
  })
  it('handles anomalous embeddings (zero vector)', () => {
    const m = new EmbeddingMonitor()
    expect(() => m.recordQuality('bad', [0, 0, 0])).not.toThrow()
    expect(m.getSummary().metricsCount.quality).toBe(1)
  })
})

describe('EmbeddingMonitor.recordCost', () => {
  it('stores a cost metric', () => {
    const m = new EmbeddingMonitor()
    m.recordCost(100, 0.0001, 'text-embedding-3-small')
    expect(m.getSummary().metricsCount.cost).toBe(1)
  })
  it('caps cost metrics at 1000', () => {
    const m = new EmbeddingMonitor()
    for (let i = 0; i < 1100; i++) {
      m.recordCost(10, 0.00001, 'model')
    }
    expect(m.getSummary().metricsCount.cost).toBe(1000)
  })
})

describe('EmbeddingMonitor.trackOperation', () => {
  it('resolves and records success=true', async () => {
    const m = new EmbeddingMonitor()
    const result = await m.trackOperation('embed', async () => 'ok')
    expect(result).toBe('ok')
    expect(m.getSummary().metricsCount.performance).toBe(1)
  })
  it('propagates errors and records success=false', async () => {
    const m = new EmbeddingMonitor()
    await expect(m.trackOperation('embed', async () => {
      throw new Error('boom')
    })).rejects.toThrow('boom')
    expect(m.getSummary().metricsCount.performance).toBe(1)
  })
  it('handles non-Error throws', async () => {
    const m = new EmbeddingMonitor()
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    await expect(m.trackOperation('embed', async () => { throw 'stringy-error' })).rejects.toBe('stringy-error')
    expect(m.getSummary().metricsCount.performance).toBe(1)
  })
  it('accepts metadata', async () => {
    const m = new EmbeddingMonitor()
    await m.trackOperation('embed', async () => 42, { batch: 3 })
    expect(m.getSummary().metricsCount.performance).toBe(1)
  })
})

describe('EmbeddingMonitor.getPerformanceTrends', () => {
  it('returns empty structures when no metrics', () => {
    const m = new EmbeddingMonitor()
    const t = m.getPerformanceTrends(24)
    expect(t.timestamps).toEqual([])
    expect(t.avgDurations).toEqual([])
    expect(t.successRates).toEqual([])
  })
  it('groups metrics by hour', () => {
    const m = new EmbeddingMonitor()
    const now = Date.now()
    m.recordPerformance({ operation: 'a', duration: 100, timestamp: new Date(now), success: true })
    m.recordPerformance({ operation: 'b', duration: 200, timestamp: new Date(now + 1000), success: true })
    const t = m.getPerformanceTrends(24)
    expect(t.timestamps.length).toBeGreaterThan(0)
    expect(t.avgDurations.length).toBe(t.timestamps.length)
    expect(t.successRates.length).toBe(t.timestamps.length)
  })
  it('computes success rate as percentage', () => {
    const m = new EmbeddingMonitor()
    const now = new Date()
    m.recordPerformance({ operation: 'a', duration: 100, timestamp: now, success: true })
    m.recordPerformance({ operation: 'a', duration: 100, timestamp: now, success: false })
    const t = m.getPerformanceTrends(24)
    // two metrics in same hour → 50%
    expect(t.successRates[0]).toBeCloseTo(50, 0)
  })
  it('filters out metrics older than window', () => {
    const m = new EmbeddingMonitor()
    const ancient = new Date(Date.now() - 100 * 60 * 60 * 1000) // 100h ago
    m.recordPerformance({ operation: 'x', duration: 10, timestamp: ancient, success: true })
    const t = m.getPerformanceTrends(1) // last 1 hour only
    expect(t.timestamps).toEqual([])
  })
})

describe('EmbeddingMonitor.getAlerts', () => {
  it('returns no alerts when no metrics', () => {
    const m = new EmbeddingMonitor()
    expect(m.getAlerts()).toEqual([])
  })
  it('raises error-level alert on very low success rate', () => {
    const m = new EmbeddingMonitor()
    for (let i = 0; i < 100; i++) {
      m.recordPerformance({
        operation: 'x',
        duration: 100,
        timestamp: new Date(),
        success: i < 50, // 50% success
      })
    }
    const alerts = m.getAlerts()
    expect(alerts.some((a) => a.level === 'error' && /success rate/i.test(a.message))).toBe(true)
  })
  it('raises warning on degraded success rate (80-95%)', () => {
    const m = new EmbeddingMonitor()
    for (let i = 0; i < 100; i++) {
      m.recordPerformance({
        operation: 'x',
        duration: 100,
        timestamp: new Date(),
        success: i < 90, // 90% success → warning
      })
    }
    const alerts = m.getAlerts()
    expect(alerts.some((a) => a.level === 'warning')).toBe(true)
  })
  it('raises alert on very slow average duration', () => {
    const m = new EmbeddingMonitor()
    for (let i = 0; i < 10; i++) {
      m.recordPerformance({
        operation: 'x',
        duration: 15000,
        timestamp: new Date(),
        success: true,
      })
    }
    const alerts = m.getAlerts()
    expect(alerts.some((a) => a.level === 'error' && /slow/i.test(a.message))).toBe(true)
  })
  it('raises warning on high low-quality rate', () => {
    const m = new EmbeddingMonitor()
    // 20 quality metrics, all with zero vectors → 100% low-quality
    for (let i = 0; i < 20; i++) {
      m.recordQuality(`q${i}`, [0, 0, 0])
    }
    const alerts = m.getAlerts()
    expect(alerts.some((a) => /low-quality/i.test(a.message))).toBe(true)
  })
})

describe('EmbeddingMonitor.clearMetrics', () => {
  it('resets all three buckets to empty', () => {
    const m = new EmbeddingMonitor()
    m.recordPerformance({ operation: 'a', duration: 1, timestamp: new Date(), success: true })
    m.recordQuality('q', [0.1, 0.2])
    m.recordCost(1, 0.01, 'm')
    m.clearMetrics()
    const s = m.getSummary()
    expect(s.metricsCount.performance).toBe(0)
    expect(s.metricsCount.quality).toBe(0)
    expect(s.metricsCount.cost).toBe(0)
  })
})

describe('EmbeddingMonitor.getSummary', () => {
  it('returns correct counts and memoryUsage structure', () => {
    const m = new EmbeddingMonitor()
    m.recordPerformance({ operation: 'a', duration: 1, timestamp: new Date(), success: true })
    m.recordPerformance({ operation: 'b', duration: 2, timestamp: new Date(), success: true })
    m.recordQuality('q', [0.1, 0.2])
    const s = m.getSummary()
    expect(s.metricsCount.performance).toBe(2)
    expect(s.metricsCount.quality).toBe(1)
    expect(s.metricsCount.cost).toBe(0)
    expect(s.memoryUsage.total).toBe(3)
    expect(s.memoryUsage.maxMetrics).toBe(1000)
  })
})
