/**
 * Date helpers. All dates in the content model are stored as plain ISO calendar
 * dates (`YYYY-MM-DD`) and interpreted in the visitor's local time zone.
 */
import { pad2 } from './format'

const DAY_MS = 86_400_000

/** Parses `YYYY-MM-DD` into a local-midnight `Date`; returns `null` for anything else. */
export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])]
  const date = new Date(year, month, day)
  // Reject overflowed dates such as 2025-02-31.
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null
}

/** Today's date as `YYYY-MM-DD` (local time). */
export const todayIso = (now = new Date()): string => `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`

/** Whole calendar days from `from` to `to` (never negative, unaffected by DST). */
export function daysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.max(0, Math.round((end - start) / DAY_MS))
}

/** Completed years between two dates (never negative). */
export function fullYearsBetween(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear()
  if (to.getMonth() < from.getMonth() || (to.getMonth() === from.getMonth() && to.getDate() < from.getDate())) years--
  return Math.max(0, years)
}

/** `25.09.2025` */
export const formatShortDate = (date: Date): string => `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`

/** `25 вересня 2025` (without the trailing "р." that `Intl` adds for Ukrainian). */
export function formatLongDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
  return [pick('day'), pick('month'), pick('year')].filter(Boolean).join(' ')
}
