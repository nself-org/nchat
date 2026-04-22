/**
 * Tests for channel-rules store management.
 */

import {
  createChannelRuleStore,
  createChannelRule,
  updateChannelRule,
  deleteChannelRule,
  getChannelRule,
  getAllChannelRules,
  getChannelRulesByLevel,
  muteChannelRule,
  unmuteChannelRule,
  isChannelRuleMuted,
  isMuteActive,
  cleanupExpiredMutes,
  DEFAULT_MUTE_DURATIONS,
  PRIORITY_ORDER,
} from '../channel-rules'

describe('createChannelRuleStore', () => {
  it('creates store with defaults', () => {
    const s = createChannelRuleStore()
    expect(s.channelRules).toEqual({})
    expect(s.categoryRules).toEqual({})
    expect(s.globalDefaultLevel).toBe('all')
    expect(s.globalDefaultThreadLevel).toBe('participating')
  })
  it('accepts partial overrides', () => {
    const s = createChannelRuleStore({ globalDefaultLevel: 'mentions' })
    expect(s.globalDefaultLevel).toBe('mentions')
  })
})

describe('createChannelRule', () => {
  it('creates with defaults', () => {
    const r = createChannelRule('c1')
    expect(r.channelId).toBe('c1')
    expect(r.level).toBe('all')
    expect(r.mute.isMuted).toBe(false)
    expect(r.threadPreferences).toEqual({})
    expect(r.defaultThreadLevel).toBe('participating')
    expect(r.overrideGlobal).toBe(true)
    expect(r.createdAt).toEqual(r.updatedAt)
  })
  it('accepts options', () => {
    const r = createChannelRule('c1', { level: 'nothing', channelName: 'general' })
    expect(r.level).toBe('nothing')
    expect(r.channelName).toBe('general')
  })
})

describe('update/delete/get', () => {
  it('update creates rule if missing', () => {
    const s = createChannelRuleStore()
    const s2 = updateChannelRule(s, 'c1', { level: 'mentions' })
    expect(s2.channelRules['c1'].level).toBe('mentions')
  })
  it('update merges existing rule', async () => {
    let s = createChannelRuleStore()
    s = updateChannelRule(s, 'c1', { level: 'all' })
    const firstUpdatedAt = s.channelRules['c1'].updatedAt
    await new Promise((r) => setTimeout(r, 2))
    const s2 = updateChannelRule(s, 'c1', { channelName: 'dev' })
    expect(s2.channelRules['c1'].level).toBe('all')
    expect(s2.channelRules['c1'].channelName).toBe('dev')
    expect(s2.channelRules['c1'].updatedAt).not.toBe(firstUpdatedAt)
  })
  it('delete removes rule', () => {
    let s = createChannelRuleStore()
    s = updateChannelRule(s, 'c1', { level: 'all' })
    s = deleteChannelRule(s, 'c1')
    expect(s.channelRules['c1']).toBeUndefined()
  })
  it('getChannelRule returns null when missing', () => {
    const s = createChannelRuleStore()
    expect(getChannelRule(s, 'nope')).toBeNull()
  })
  it('getAllChannelRules returns all', () => {
    let s = createChannelRuleStore()
    s = updateChannelRule(s, 'c1', {})
    s = updateChannelRule(s, 'c2', {})
    expect(getAllChannelRules(s)).toHaveLength(2)
  })
  it('getChannelRulesByLevel filters', () => {
    let s = createChannelRuleStore()
    s = updateChannelRule(s, 'c1', { level: 'all' })
    s = updateChannelRule(s, 'c2', { level: 'nothing' })
    expect(getChannelRulesByLevel(s, 'nothing')).toHaveLength(1)
    expect(getChannelRulesByLevel(s, 'nothing')[0].channelId).toBe('c2')
  })
})

describe('mute operations', () => {
  it('muteChannelRule sets permanent mute by default', () => {
    let s = createChannelRuleStore()
    s = updateChannelRule(s, 'c1', {})
    s = muteChannelRule(s, 'c1')
    expect(s.channelRules['c1'].mute.isMuted).toBe(true)
    expect(s.channelRules['c1'].mute.expiresAt).toBeNull()
  })

  it('mute with known duration sets future expiry', () => {
    let s = createChannelRuleStore()
    s = updateChannelRule(s, 'c1', {})
    s = muteChannelRule(s, 'c1', { duration: '15m', reason: 'focus' })
    expect(s.channelRules['c1'].mute.isMuted).toBe(true)
    expect(s.channelRules['c1'].mute.reason).toBe('focus')
    expect(new Date(s.channelRules['c1'].mute.expiresAt!).getTime()).toBeGreaterThan(Date.now())
  })

  it('mute with numeric duration', () => {
    let s = createChannelRuleStore()
    s = muteChannelRule(s, 'c1', { duration: 5_000 })
    expect(s.channelRules['c1'].mute.expiresAt).toBeTruthy()
  })

  it('unmute clears mute state', () => {
    let s = createChannelRuleStore()
    s = muteChannelRule(s, 'c1')
    s = unmuteChannelRule(s, 'c1')
    expect(s.channelRules['c1'].mute.isMuted).toBe(false)
    expect(s.channelRules['c1'].mute.expiresAt).toBeNull()
  })
})

describe('isMuteActive', () => {
  it('false when not muted', () => {
    expect(isMuteActive({ isMuted: false, expiresAt: null })).toBe(false)
  })
  it('true for permanent mute', () => {
    expect(isMuteActive({ isMuted: true, expiresAt: null })).toBe(true)
  })
  it('false when expired', () => {
    expect(isMuteActive({ isMuted: true, expiresAt: new Date(Date.now() - 1000).toISOString() })).toBe(false)
  })
  it('true when future expiry', () => {
    expect(isMuteActive({ isMuted: true, expiresAt: new Date(Date.now() + 10_000).toISOString() })).toBe(true)
  })
})

describe('isChannelRuleMuted', () => {
  it('false when rule missing', () => {
    expect(isChannelRuleMuted(createChannelRuleStore(), 'nope')).toBe(false)
  })
  it('true when muted', () => {
    let s = createChannelRuleStore()
    s = updateChannelRule(s, 'c1', {})
    s = muteChannelRule(s, 'c1')
    expect(isChannelRuleMuted(s, 'c1')).toBe(true)
  })
})

describe('cleanupExpiredMutes', () => {
  it('clears expired mutes, keeps active ones', () => {
    let s = createChannelRuleStore()
    s = updateChannelRule(s, 'c1', {
      mute: { isMuted: true, expiresAt: new Date(Date.now() - 1000).toISOString() },
    })
    s = updateChannelRule(s, 'c2', {
      mute: { isMuted: true, expiresAt: new Date(Date.now() + 60_000).toISOString() },
    })
    const cleaned = cleanupExpiredMutes(s)
    expect(cleaned.channelRules['c1'].mute.isMuted).toBe(false)
    expect(cleaned.channelRules['c2'].mute.isMuted).toBe(true)
  })
  it('returns same store when nothing changed', () => {
    const s = createChannelRuleStore()
    const cleaned = cleanupExpiredMutes(s)
    expect(cleaned).toBe(s)
  })
})

describe('constants', () => {
  it('PRIORITY_ORDER has urgent first', () => {
    expect(PRIORITY_ORDER[0]).toBe('urgent')
    expect(PRIORITY_ORDER).toHaveLength(4)
  })
  it('DEFAULT_MUTE_DURATIONS contains expected keys', () => {
    expect(DEFAULT_MUTE_DURATIONS['15m']).toBe(15 * 60 * 1000)
    expect(DEFAULT_MUTE_DURATIONS['1w']).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
