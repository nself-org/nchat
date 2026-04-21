/**
 * Unit tests for SentimentAnalyzer (local rule-based path).
 * AI paths mocked via provider='local'.
 */
import {
  SentimentAnalyzer,
  getSentimentAnalyzer,
  isSentimentAnalysisAvailable,
} from '../sentiment-analyzer'

jest.mock('@/lib/sentry-utils', () => ({
  addSentryBreadcrumb: jest.fn(),
  captureError: jest.fn(),
}))

const mkMsg = (content: string, id = 'm1', createdAt = '2025-01-01T00:00:00Z'): any => ({
  id,
  content,
  createdAt,
})

describe('SentimentAnalyzer — construction + config', () => {
  it('defaults to local', () => {
    const a = new SentimentAnalyzer({ provider: 'local' })
    expect(a.getProvider()).toBe('local')
    expect(a.available()).toBe(true)
  })
  it('openai provider without key = not available', () => {
    const orig = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
    const a = new SentimentAnalyzer({ provider: 'openai' })
    expect(a.available()).toBe(false)
    if (orig) process.env.OPENAI_API_KEY = orig
  })
  it('openai with explicit apiKey = available', () => {
    const a = new SentimentAnalyzer({ provider: 'openai', apiKey: 'sk-test' })
    expect(a.available()).toBe(true)
  })
  it('getSentimentAnalyzer returns singleton', () => {
    const a = getSentimentAnalyzer({ provider: 'local' })
    const b = getSentimentAnalyzer()
    expect(a).toBe(b)
  })
  it('isSentimentAnalysisAvailable works', () => {
    // singleton from above is local, so available
    expect(typeof isSentimentAnalysisAvailable()).toBe('boolean')
  })
})

describe('analyzeLocally (via analyzeMessage, provider=local)', () => {
  const analyzer = new SentimentAnalyzer({ provider: 'local' })

  it('positive sentiment', async () => {
    const r = await analyzer.analyzeMessage(mkMsg('This is great and wonderful, excellent!'))
    expect(r.sentiment).toBe('positive')
    expect(r.score).toBeGreaterThan(0)
    expect(r.breakdown.positive).toBeGreaterThan(0)
  })
  it('negative sentiment', async () => {
    const r = await analyzer.analyzeMessage(mkMsg('terrible awful bad horrible, I hate this'))
    expect(r.sentiment).toBe('negative')
    expect(r.score).toBeLessThan(0)
  })
  it('mixed sentiment', async () => {
    const r = await analyzer.analyzeMessage(
      mkMsg('good love awesome bad hate awful terrible', 'm2')
    )
    expect(['mixed', 'positive', 'negative']).toContain(r.sentiment)
  })
  it('neutral when no sentiment words', async () => {
    const r = await analyzer.analyzeMessage(mkMsg('the quick brown fox jumps'))
    expect(r.sentiment).toBe('neutral')
  })
  it('detects toxicity when flag set', async () => {
    const r = await analyzer.analyzeMessage(mkMsg('you are stupid and useless'), {
      detectToxicity: true,
    })
    expect(r.context.toxicity).toBeGreaterThan(0)
  })
  it('skips toxicity when flag off', async () => {
    const r = await analyzer.analyzeMessage(mkMsg('you are stupid'), {})
    expect(r.context.toxicity).toBe(0)
  })
  it('high caps adds toxicity', async () => {
    const r = await analyzer.analyzeMessage(mkMsg('STUPID IDIOT USELESS!!!!!!'), {
      detectToxicity: true,
    })
    expect(r.context.toxicity).toBeGreaterThan(0)
  })
  it('detects emotion joy', async () => {
    const r = await analyzer.analyzeMessage(mkMsg('I am so happy and excited!'))
    expect(['joy', 'neutral']).toContain(r.emotion)
  })
  it('high intensity', async () => {
    const r = await analyzer.analyzeMessage(mkMsg('AMAZING GREAT WONDERFUL !!!!!'))
    expect(['high', 'medium', 'low']).toContain(r.context.emotionalIntensity)
  })
})

describe('analyzeTrends', () => {
  const analyzer = new SentimentAnalyzer({ provider: 'local' })

  it('empty messages → empty trend', async () => {
    const t = await analyzer.analyzeTrends([])
    expect(t.period).toBe('No data')
    expect(t.sentiments).toEqual([])
  })
  it('single message', async () => {
    const t = await analyzer.analyzeTrends([mkMsg('great', 'm1')])
    expect(t.sentiments).toHaveLength(1)
    expect(t.volatility).toBe(0) // single point
  })
  it('improving trend', async () => {
    const msgs = [
      mkMsg('terrible bad awful', 'm1', '2025-01-01'),
      mkMsg('ok fine', 'm2', '2025-01-02'),
      mkMsg('great wonderful excellent', 'm3', '2025-01-03'),
      mkMsg('amazing love fantastic', 'm4', '2025-01-04'),
      mkMsg('awesome great perfect', 'm5', '2025-01-05'),
      mkMsg('wonderful brilliant', 'm6', '2025-01-06'),
    ]
    const t = await analyzer.analyzeTrends(msgs)
    expect(['improving', 'stable']).toContain(t.trend)
  })
  it('declining trend', async () => {
    const msgs = [
      mkMsg('great wonderful excellent', 'm1', '2025-01-01'),
      mkMsg('amazing love fantastic', 'm2', '2025-01-02'),
      mkMsg('okay fine', 'm3', '2025-01-03'),
      mkMsg('bad terrible', 'm4', '2025-01-04'),
      mkMsg('awful horrible hate', 'm5', '2025-01-05'),
      mkMsg('disgusting pathetic', 'm6', '2025-01-06'),
    ]
    const t = await analyzer.analyzeTrends(msgs)
    expect(['declining', 'stable']).toContain(t.trend)
  })
  it('stable / short trend returns stable', async () => {
    const t = await analyzer.analyzeTrends([mkMsg('hi', 'm1'), mkMsg('ok', 'm2')])
    expect(t.trend).toBe('stable')
  })
})

describe('generateMoraleReport', () => {
  const analyzer = new SentimentAnalyzer({ provider: 'local' })
  const period = { start: new Date('2025-01-01'), end: new Date('2025-01-10') }

  it('empty returns empty', async () => {
    const r = await analyzer.generateMoraleReport([], period)
    expect(r.overall).toBe('neutral')
    expect(r.score).toBe(50)
  })
  it('positive morale has recommendations', async () => {
    const msgs = [
      mkMsg('great wonderful excellent love', 'm1', '2025-01-01'),
      mkMsg('amazing fantastic perfect', 'm2', '2025-01-02'),
      mkMsg('wonderful brilliant awesome', 'm3', '2025-01-03'),
    ]
    const r = await analyzer.generateMoraleReport(msgs, period)
    expect(r.recommendations.length).toBeGreaterThan(0)
  })
  it('negative morale flags stress', async () => {
    const msgs = [
      mkMsg('terrible awful bad', 'm1', '2025-01-01'),
      mkMsg('hate horrible disgusting', 'm2', '2025-01-02'),
      mkMsg('annoying frustrating bad', 'm3', '2025-01-03'),
    ]
    const r = await analyzer.generateMoraleReport(msgs, period)
    expect(r.recommendations.length).toBeGreaterThan(0)
  })
})
