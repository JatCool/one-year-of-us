/** Small, dependency-free formatting helpers shared by the site and the admin. */

/** `7` → `"07"`. Used for chapter / achievement numbers. */
export const pad2 = (value: number): string => String(Math.max(0, Math.floor(value))).padStart(2, '0')

/** Seconds → `"mm:ss"`. Invalid input renders as `"00:00"`. */
export function formatMinSec(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0
  return `${pad2(Math.floor(safe / 60))}:${pad2(safe % 60)}`
}

/**
 * Picks the Ukrainian plural form for `count`.
 * `pluralUk(1, ['день', 'дні', 'днів'])` → `'день'`, `2` → `'дні'`, `5` → `'днів'`.
 */
export function pluralUk(count: number, [one, few, many]: [string, string, string]): string {
  const n = Math.abs(Math.trunc(count))
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

/** Thousands-separated number in Ukrainian locale. */
export const formatNumber = (value: number): string => value.toLocaleString('uk-UA')

/** Extracts a readable message from anything thrown. */
export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'Невідома помилка'
