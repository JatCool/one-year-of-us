import { describe, expect, it } from 'vitest'
import { daysBetween, formatLongDate, formatShortDate, fullYearsBetween, parseIsoDate, todayIso } from './dates'

describe('parseIsoDate', () => {
  it('parses valid dates as local midnight', () => {
    const date = parseIsoDate('2025-09-25')
    expect(date?.getFullYear()).toBe(2025)
    expect(date?.getMonth()).toBe(8)
    expect(date?.getDate()).toBe(25)
    expect(date?.getHours()).toBe(0)
  })

  it('rejects empty, malformed and overflowing dates', () => {
    for (const value of ['', '2025-9-25', '25.09.2025', '2025-02-31', '2025-13-01']) {
      expect(parseIsoDate(value)).toBeNull()
    }
  })
})

describe('date math', () => {
  const d = (iso: string) => parseIsoDate(iso)!

  it('counts calendar days, including across leap years', () => {
    expect(daysBetween(d('2025-09-25'), d('2026-09-25'))).toBe(365)
    expect(daysBetween(d('2027-09-25'), d('2028-09-25'))).toBe(366)
    expect(daysBetween(d('2026-01-02'), d('2026-01-01'))).toBe(0)
  })

  it('counts completed years', () => {
    expect(fullYearsBetween(d('2025-09-25'), d('2026-09-24'))).toBe(0)
    expect(fullYearsBetween(d('2025-09-25'), d('2026-09-25'))).toBe(1)
    expect(fullYearsBetween(d('2020-02-29'), d('2023-03-01'))).toBe(3)
  })
})

describe('formatting', () => {
  it('formats short and long dates', () => {
    const date = parseIsoDate('2025-09-05')!
    expect(formatShortDate(date)).toBe('05.09.2025')
    expect(formatLongDate(date)).toBe('5 вересня 2025')
  })

  it('formats today as ISO', () => {
    expect(todayIso(new Date(2026, 0, 7))).toBe('2026-01-07')
  })
})
