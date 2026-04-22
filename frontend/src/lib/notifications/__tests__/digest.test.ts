/**
 * Tests for digest config and behavior.
 */

import {
  DEFAULT_DIGEST_CONFIG,
  createDigestConfig,
  shouldBypassDigest,
  shouldSendDigest,
  getNextDigestTime,
  generateDigest,
  createDeliveryState,
  markDigestSent,
  addPendingNotification,
  formatDigestAsText,
  type DigestEntry,
  type DigestConfig,
} from '../digest'

const entry = (over: Partial<DigestEntry> = {}): DigestEntry => ({
  id: 'e1',
  type: 'mention',
  priority: 'normal',
  title: 'New mention',
  body: 'Alice mentioned you',
  channelId: 'c1',
  channelName: 'general',
  senderId: 'u1',
  senderName: 'Alice',
  createdAt: new Date().toISOString(),
  isRead: false,
  ...over,
})

describe('createDigestConfig', () => {
  it('returns defaults', () => {
    const c = createDigestConfig()
    expect(c).toEqual(DEFAULT_DIGEST_CONFIG)
  })
  it('applies overrides', () => {
    const c = createDigestConfig({ frequency: 'weekly', enabled: true })
    expect(c.frequency).toBe('weekly')
    expect(c.enabled).toBe(true)
  })
})

describe('shouldBypassDigest', () => {
  it('bypasses when realtime', () => {
    expect(shouldBypassDigest(createDigestConfig({ frequency: 'realtime', enabled: true }), entry())).toBe(true)
  })
  it('bypasses when disabled', () => {
    expect(shouldBypassDigest(createDigestConfig({ enabled: false }), entry())).toBe(true)
  })
  it('bypasses urgent priority', () => {
    const c = createDigestConfig({ enabled: true, bypassPriorities: ['urgent'] })
    expect(shouldBypassDigest(c, entry({ priority: 'urgent' }))).toBe(true)
  })
  it('bypasses listed type', () => {
    const c = createDigestConfig({ enabled: true, bypassPriorities: [], bypassTypes: ['mention'] })
    expect(shouldBypassDigest(c, entry({ type: 'mention' }))).toBe(true)
  })
  it('does not bypass normal entry', () => {
    const c = createDigestConfig({ enabled: true, bypassPriorities: [], bypassTypes: [] })
    expect(shouldBypassDigest(c, entry())).toBe(false)
  })
})

describe('shouldSendDigest', () => {
  it('false when disabled', () => {
    expect(shouldSendDigest(createDigestConfig({ enabled: false }), createDeliveryState())).toBe(false)
  })
  it('false when realtime', () => {
    expect(
      shouldSendDigest(createDigestConfig({ enabled: true, frequency: 'realtime' }), createDeliveryState())
    ).toBe(false)
  })
  it('false when pending count below minimum', () => {
    const s = { ...createDeliveryState(), pendingCount: 1 }
    expect(shouldSendDigest(createDigestConfig({ enabled: true, minimumBatchSize: 3 }), s)).toBe(false)
  })
  it('true when nextScheduledAt passed', () => {
    const s = {
      ...createDeliveryState(),
      pendingCount: 10,
      nextScheduledAt: new Date(Date.now() - 1000).toISOString(),
    }
    expect(
      shouldSendDigest(createDigestConfig({ enabled: true, minimumBatchSize: 3 }), s, new Date())
    ).toBe(true)
  })
  it('true when no schedule and no prior send', () => {
    const s = { ...createDeliveryState(), pendingCount: 5 }
    expect(shouldSendDigest(createDigestConfig({ enabled: true, minimumBatchSize: 3 }), s)).toBe(true)
  })
})

describe('getNextDigestTime', () => {
  it('returns null when disabled', () => {
    expect(getNextDigestTime(createDigestConfig({ enabled: false }))).toBeNull()
  })
  it('returns null for realtime', () => {
    expect(getNextDigestTime(createDigestConfig({ enabled: true, frequency: 'realtime' }))).toBeNull()
  })
  it('returns future Date for hourly', () => {
    const now = new Date('2024-01-15T10:30:00Z')
    const next = getNextDigestTime(createDigestConfig({ enabled: true, frequency: 'hourly' }), undefined, now)
    expect(next).toBeInstanceOf(Date)
    expect(next!.getTime()).toBeGreaterThan(now.getTime())
  })
  it('returns future Date for daily', () => {
    const now = new Date('2024-01-15T10:00:00Z')
    const next = getNextDigestTime(
      createDigestConfig({ enabled: true, frequency: 'daily', deliveryTime: '09:00' }),
      undefined,
      now
    )
    expect(next!.getTime()).toBeGreaterThan(now.getTime())
  })
  it('returns future Date for weekly', () => {
    const now = new Date('2024-01-15T10:00:00Z')
    const next = getNextDigestTime(
      createDigestConfig({ enabled: true, frequency: 'weekly', weeklyDay: 1, deliveryTime: '09:00' }),
      undefined,
      now
    )
    expect(next!.getTime()).toBeGreaterThan(now.getTime())
  })
})

describe('generateDigest', () => {
  it('returns empty-ish digest for no entries', () => {
    const c = createDigestConfig({ enabled: true, bypassPriorities: [], bypassTypes: [] })
    const d = generateDigest([], c)
    expect(d.groups).toEqual([])
    expect(d.summary.totalNotifications).toBe(0)
  })
  it('separates bypassed entries', () => {
    const c = createDigestConfig({
      enabled: true,
      bypassPriorities: ['urgent'],
      bypassTypes: [],
      smartGrouping: false,
      groupBy: ['type'],
    })
    const entries = [entry({ id: '1' }), entry({ id: '2', priority: 'urgent' })]
    const d = generateDigest(entries, c)
    expect(d.bypassed.some((e) => e.id === '2')).toBe(true)
  })
  it('filters read notifications when includeRead=false', () => {
    const c = createDigestConfig({ enabled: true, bypassPriorities: [], includeRead: false, groupBy: ['type'] })
    const entries = [entry({ id: 'r', isRead: true }), entry({ id: 'u', isRead: false })]
    const d = generateDigest(entries, c)
    expect(d.bypassed.find((e) => e.id === 'r')).toBeUndefined()
  })
  it('includes digest id and period', () => {
    const c = createDigestConfig({ enabled: true, bypassPriorities: [], groupBy: ['type'] })
    const d = generateDigest([entry()], c)
    expect(d.id).toMatch(/^digest_/)
    expect(d.period.from).toBeTruthy()
    expect(d.period.to).toBeTruthy()
  })
})

describe('delivery state helpers', () => {
  it('createDeliveryState default', () => {
    const s = createDeliveryState()
    expect(s.pendingCount).toBe(0)
    expect(s.isReady).toBe(false)
    expect(s.lastSentAt).toBeNull()
  })
  it('addPendingNotification increments and flips isReady', () => {
    const c = createDigestConfig({ enabled: true, minimumBatchSize: 2, bypassPriorities: [] })
    let s = createDeliveryState()
    s = addPendingNotification(s, c)
    expect(s.pendingCount).toBe(1)
    expect(s.isReady).toBe(false)
    s = addPendingNotification(s, c)
    expect(s.pendingCount).toBe(2)
    expect(s.isReady).toBe(true)
  })
  it('markDigestSent clears pendingCount and records lastSentAt', () => {
    const c = createDigestConfig({ enabled: true, frequency: 'daily', bypassPriorities: [] })
    let s = addPendingNotification(createDeliveryState(), c)
    s = markDigestSent(s, c)
    expect(s.pendingCount).toBe(0)
    expect(s.isReady).toBe(false)
    expect(s.lastSentAt).toBeTruthy()
  })
})

describe('formatDigestAsText', () => {
  it('produces header and summary line', () => {
    const c = createDigestConfig({ enabled: true, bypassPriorities: [], groupBy: ['type'] })
    const d = generateDigest([entry()], c)
    const txt = formatDigestAsText(d)
    expect(txt).toContain('NOTIFICATION DIGEST')
    expect(txt).toContain('Period:')
    expect(txt).toContain('Total:')
  })
})
