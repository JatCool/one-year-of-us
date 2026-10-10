import type { SiteContent } from '../content/model'
import { daysBetween, fullYearsBetween, parseIsoDate } from '../lib/dates'

/** Values derived from the configured names and dates, shared by all sections. */
export type Story = {
  start: Date | null
  end: Date | null
  /** Non-empty partner names, in order. */
  names: string[]
  /** `"A × B"` in upper case, or `""` when no names are set. */
  namesLabel: string
  /** Days from the start date to the anniversary (or today); `null` without a start date. */
  spanDays: number | null
  /** Completed "levels" (years), at least 1. Drives "level 01 completed" style copy. */
  level: number
}

export function deriveStory(content: SiteContent, now = new Date()): Story {
  const { partnerOne, partnerTwo, startDate, anniversaryDate } = content.couple
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(anniversaryDate)
  const until = end ?? now
  const names = [partnerOne, partnerTwo].map(name => name.trim()).filter(Boolean)
  return {
    start,
    end,
    names,
    namesLabel: names.join(' × ').toUpperCase(),
    spanDays: start ? daysBetween(start, until) : null,
    level: start ? Math.max(1, fullYearsBetween(start, until)) : 1
  }
}
