/**
 * Tests for quiet-hours utilities.
 */

import {
  parseTimeToMinutes,
  formatMinutesToTime,
  isWeekend,
  isInQuietHours,
  willBeInQuietHours,
  formatRemainingTime,
  validateQuietHoursSchedule,
  getNextQuietHoursPeriod,
  isInWeekendQuietHours,
  createDefaultSchedule,
  getDayDisplayName,
  getAllDaysOfWeek,
  getWeekdays,
  getWeekendDays,
} from '../quiet-hours'
import type { QuietHoursSchedule, DayOfWeek } from '../notification-types'

const baseSchedule = (overrides: Partial<QuietHoursSchedule> = {}): QuietHoursSchedule => ({
  enabled: true,
  startTime: '22:00',
  endTime: '08:00',
  days: [0, 1, 2, 3, 4, 5, 6],
  allowMentionsBreakthrough: true,
  enableOnWeekends: true,
  autoSetStatus: false,
  timezone: 'UTC',
  ...overrides,
})

describe('parseTimeToMinutes', () => {
  it('parses midnight', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0)
  })
  it('parses 09:30', () => {
    expect(parseTimeToMinutes('09:30')).toBe(9 * 60 + 30)
  })
  it('parses 23:59', () => {
    expect(parseTimeToMinutes('23:59')).toBe(23 * 60 + 59)
  })
})

describe('formatMinutesToTime', () => {
  it('formats 0 as 00:00', () => {
    expect(formatMinutesToTime(0)).toBe('00:00')
  })
  it('formats 90 as 01:30', () => {
    expect(formatMinutesToTime(90)).toBe('01:30')
  })
  it('pads single digits', () => {
    expect(formatMinutesToTime(65)).toBe('01:05')
  })
  it('wraps hours modulo 24', () => {
    expect(formatMinutesToTime(24 * 60)).toBe('00:00')
  })
})

describe('isWeekend', () => {
  it('treats Sunday as weekend', () => {
    expect(isWeekend(0)).toBe(true)
  })
  it('treats Saturday as weekend', () => {
    expect(isWeekend(6)).toBe(true)
  })
  it('rejects Monday', () => {
    expect(isWeekend(1)).toBe(false)
  })
  it('rejects Friday', () => {
    expect(isWeekend(5)).toBe(false)
  })
})

describe('isInQuietHours', () => {
  it('returns false when disabled', () => {
    const s = baseSchedule({ enabled: false })
    const d = new Date('2024-01-15T23:00:00Z') // Mon
    expect(isInQuietHours(s, { checkDate: d })).toBe(false)
  })

  it('returns true for overnight schedule past start', () => {
    const s = baseSchedule({ startTime: '22:00', endTime: '08:00' })
    const d = new Date('2024-01-15T23:30:00Z')
    // use checkDate path (uses local hours/minutes). Force offset-free math:
    const d2 = new Date(2024, 0, 15, 23, 30)
    expect(isInQuietHours(s, { checkDate: d2 })).toBe(true)
  })

  it('returns true for overnight schedule before end', () => {
    const d2 = new Date(2024, 0, 15, 3, 0)
    expect(isInQuietHours(baseSchedule(), { checkDate: d2 })).toBe(true)
  })

  it('returns false for regular schedule outside range', () => {
    const s = baseSchedule({ startTime: '09:00', endTime: '17:00' })
    const d2 = new Date(2024, 0, 15, 20, 0)
    expect(isInQuietHours(s, { checkDate: d2 })).toBe(false)
  })

  it('returns true for regular schedule inside range', () => {
    const s = baseSchedule({ startTime: '09:00', endTime: '17:00' })
    const d2 = new Date(2024, 0, 15, 12, 0)
    expect(isInQuietHours(s, { checkDate: d2 })).toBe(true)
  })

  it('returns false if day not included', () => {
    const s = baseSchedule({ days: [1, 2, 3, 4, 5] })
    const d2 = new Date(2024, 0, 14, 23, 30) // Sunday
    expect(isInQuietHours(s, { checkDate: d2 })).toBe(false)
  })

  it('respects enableOnWeekends=false on Saturday', () => {
    const s = baseSchedule({ enableOnWeekends: false })
    const d2 = new Date(2024, 0, 13, 23, 30) // Saturday
    expect(isInQuietHours(s, { checkDate: d2 })).toBe(false)
  })

  it('ignoreWeekendSettings bypasses enableOnWeekends', () => {
    const s = baseSchedule({ enableOnWeekends: false, startTime: '09:00', endTime: '17:00' })
    const d2 = new Date(2024, 0, 13, 12, 0)
    expect(isInQuietHours(s, { checkDate: d2, ignoreWeekendSettings: true })).toBe(true)
  })
})

describe('willBeInQuietHours', () => {
  it('delegates to isInQuietHours with the target date', () => {
    const s = baseSchedule({ startTime: '09:00', endTime: '17:00' })
    const d = new Date(2024, 0, 15, 10, 0)
    expect(willBeInQuietHours(s, d)).toBe(true)
  })
})

describe('formatRemainingTime', () => {
  it('formats minutes', () => {
    expect(formatRemainingTime(5)).toBe('5 minutes')
    expect(formatRemainingTime(1)).toBe('1 minute')
  })
  it('formats hours', () => {
    expect(formatRemainingTime(60)).toBe('1 hour')
    expect(formatRemainingTime(120)).toBe('2 hours')
  })
  it('formats hours + minutes', () => {
    expect(formatRemainingTime(90)).toBe('1 hour 30 minutes')
  })
  it('formats days', () => {
    expect(formatRemainingTime(24 * 60)).toBe('1 day')
    expect(formatRemainingTime(48 * 60)).toBe('2 days')
  })
  it('formats days + hours', () => {
    expect(formatRemainingTime(24 * 60 + 3 * 60)).toBe('1 day 3 hours')
  })
})

describe('validateQuietHoursSchedule', () => {
  it('returns valid for correct schedule', () => {
    const r = validateQuietHoursSchedule(baseSchedule())
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual([])
  })
  it('flags invalid start time format', () => {
    const r = validateQuietHoursSchedule(baseSchedule({ startTime: 'bad' }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('start'))).toBe(true)
  })
  it('flags invalid end time format', () => {
    const r = validateQuietHoursSchedule(baseSchedule({ endTime: '25:61' }))
    expect(r.valid).toBe(false)
  })
  it('flags empty days', () => {
    const r = validateQuietHoursSchedule(baseSchedule({ days: [] }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('day'))).toBe(true)
  })
  it('flags out-of-range day', () => {
    const r = validateQuietHoursSchedule(baseSchedule({ days: [7 as DayOfWeek] }))
    expect(r.valid).toBe(false)
  })
  it('flags invalid timezone', () => {
    const r = validateQuietHoursSchedule(baseSchedule({ timezone: 'Not/A_Zone' }))
    expect(r.valid).toBe(false)
  })
})

describe('getNextQuietHoursPeriod', () => {
  it('returns null when disabled', () => {
    expect(getNextQuietHoursPeriod(baseSchedule({ enabled: false }))).toBeNull()
  })
  it('returns null when no days', () => {
    expect(getNextQuietHoursPeriod(baseSchedule({ days: [] }))).toBeNull()
  })
  it('returns object with start/end when active', () => {
    const r = getNextQuietHoursPeriod(baseSchedule())
    expect(r).not.toBeNull()
    expect(r?.start).toBeInstanceOf(Date)
    expect(r?.end).toBeInstanceOf(Date)
  })
})

describe('isInWeekendQuietHours', () => {
  it('returns false when undefined', () => {
    expect(isInWeekendQuietHours(undefined, baseSchedule())).toBe(false)
  })
  it('returns false when disabled', () => {
    expect(
      isInWeekendQuietHours({ enabled: false, startTime: '00:00', endTime: '12:00' }, baseSchedule())
    ).toBe(false)
  })
})

describe('createDefaultSchedule', () => {
  it('creates schedule with defaults', () => {
    const s = createDefaultSchedule('UTC')
    expect(s.enabled).toBe(false)
    expect(s.startTime).toBe('22:00')
    expect(s.endTime).toBe('08:00')
    expect(s.timezone).toBe('UTC')
    expect(s.days.length).toBe(7)
  })
  it('falls back to local timezone when not given', () => {
    const s = createDefaultSchedule()
    expect(typeof s.timezone).toBe('string')
    expect(s.timezone.length).toBeGreaterThan(0)
  })
})

describe('day helpers', () => {
  it('getDayDisplayName short', () => {
    expect(getDayDisplayName(0, 'short')).toBe('Sun')
    expect(getDayDisplayName(6, 'short')).toBe('Sat')
  })
  it('getDayDisplayName long', () => {
    expect(getDayDisplayName(1, 'long')).toBe('Monday')
  })
  it('getAllDaysOfWeek returns 7 entries', () => {
    const all = getAllDaysOfWeek()
    expect(all).toHaveLength(7)
    expect(all[0].value).toBe(0)
    expect(all[6].shortLabel).toBe('Sat')
  })
  it('getWeekdays returns Mon-Fri', () => {
    expect(getWeekdays()).toEqual([1, 2, 3, 4, 5])
  })
  it('getWeekendDays returns Sun+Sat', () => {
    expect(getWeekendDays()).toEqual([0, 6])
  })
})
