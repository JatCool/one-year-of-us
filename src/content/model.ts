/**
 * Content model for the site.
 *
 * Everything the public page shows comes from a single JSON document that is
 * edited in `/admin` and stored in Supabase (`site_content.content`). The
 * repository ships with NO personal data: `emptyContent()` is what a fresh
 * clone starts with, and every section on the site hides itself until it has
 * something to show.
 *
 * `normalizeContent()` is the only way raw JSON from the database enters the
 * app. It fills in missing fields, drops values of the wrong type and upgrades
 * documents saved by older versions of the site, so the UI never has to guard
 * against malformed data.
 */

/** The two people the site is about and the dates the counters are based on. */
export type Couple = {
  partnerOne: string
  partnerTwo: string
  /** ISO date (YYYY-MM-DD) the story starts; the live counter counts from it. */
  startDate: string
  /** ISO date (YYYY-MM-DD) being celebrated; defaults to "today" when empty. */
  anniversaryDate: string
}

/** Free-form headline texts. Empty strings fall back to neutral built-in copy. */
export type Texts = {
  heroTitle: string
  heroAccent: string
  heroSubtitle: string
  finalQuestion: string
  finalReply: string
}

export type Milestone = { icon: string; title: string; date: string; text: string; image: string }
export type Place = { place: string; date: string; note: string; image: string }
export type Memory = { month: string; caption: string; image: string }
/** `[number, title, description]` — stored as a tuple for backwards compatibility. */
export type Achievement = [number: string, title: string, text: string]
/** `[ISO date, commit message]` — stored as a tuple for backwards compatibility. */
export type Commit = [date: string, message: string]

export type MusicConfig = {
  url: string
  title: string
  /** Playback starts here (seconds). */
  startSeconds: number
  /** Playback stops/loops here (seconds); 0 means "until the end of the file". */
  endSeconds: number
  loop: boolean
  enabled: boolean
}

export const BLOCK_KEYS = ['milestones', 'places', 'months', 'achievements', 'reasons', 'terminal', 'commits', 'letter'] as const
export type BlockKey = (typeof BLOCK_KEYS)[number]
export type VisibleBlocks = Record<BlockKey, boolean>

export type SiteContent = {
  couple: Couple
  texts: Texts
  milestones: Milestone[]
  places: Place[]
  months: Memory[]
  achievements: Achievement[]
  reasons: string[]
  commits: Commit[]
  letter: string
  visibleBlocks: VisibleBlocks
  music: MusicConfig
}

/** Image-bearing collections; used by the admin upload helpers. */
export type ImageListKey = 'milestones' | 'places' | 'months'

export const emptyContent = (): SiteContent => ({
  couple: { partnerOne: '', partnerTwo: '', startDate: '', anniversaryDate: '' },
  texts: { heroTitle: '', heroAccent: '', heroSubtitle: '', finalQuestion: '', finalReply: '' },
  milestones: [],
  places: [],
  months: [],
  achievements: [],
  reasons: [],
  commits: [],
  letter: '',
  visibleBlocks: Object.fromEntries(BLOCK_KEYS.map(key => [key, true])) as VisibleBlocks,
  music: { url: '', title: '', startSeconds: 0, endSeconds: 0, loop: true, enabled: true }
})

type Json = Record<string, unknown>
const record = (value: unknown): Json => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {})
const text = (...candidates: unknown[]): string => {
  const found = candidates.find(value => typeof value === 'string')
  return typeof found === 'string' ? found : ''
}
const seconds = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0)
const list = <T,>(value: unknown, map: (item: unknown) => T): T[] => (Array.isArray(value) ? value.map(map) : [])
const tuple = (value: unknown, keys: string[]): string[] => {
  if (Array.isArray(value)) return keys.map((_, i) => text(value[i]))
  const item = record(value)
  return keys.map(key => text(item[key]))
}

/**
 * Turns any value read from storage into a complete, well-typed `SiteContent`.
 * Unknown fields are ignored; missing or invalid fields get empty defaults.
 *
 * Older documents used `couple.husband / wife / date / anniversary`; those keys
 * are still read so existing deployments keep working after an upgrade.
 */
export function normalizeContent(raw: unknown): SiteContent {
  const base = emptyContent()
  const source = record(raw)
  const couple = record(source.couple)
  const texts = record(source.texts)
  const blocks = record(source.visibleBlocks)
  const music = record(source.music)

  return {
    couple: {
      partnerOne: text(couple.partnerOne, couple.husband),
      partnerTwo: text(couple.partnerTwo, couple.wife),
      startDate: text(couple.startDate, couple.date),
      anniversaryDate: text(couple.anniversaryDate, couple.anniversary)
    },
    texts: {
      heroTitle: text(texts.heroTitle),
      heroAccent: text(texts.heroAccent),
      heroSubtitle: text(texts.heroSubtitle),
      finalQuestion: text(texts.finalQuestion),
      finalReply: text(texts.finalReply)
    },
    milestones: list(source.milestones, item => {
      const m = record(item)
      return { icon: text(m.icon), title: text(m.title), date: text(m.date), text: text(m.text), image: text(m.image) }
    }),
    places: list(source.places, item => {
      const p = record(item)
      return { place: text(p.place), date: text(p.date), note: text(p.note), image: text(p.image) }
    }),
    months: list(source.months, item => {
      const m = record(item)
      return { month: text(m.month), caption: text(m.caption), image: text(m.image) }
    }),
    achievements: list(source.achievements, item => tuple(item, ['number', 'title', 'text']) as Achievement),
    reasons: list(source.reasons, item => text(item)),
    commits: list(source.commits, item => tuple(item, ['date', 'message']) as Commit),
    letter: text(source.letter),
    visibleBlocks: Object.fromEntries(
      BLOCK_KEYS.map(key => [key, typeof blocks[key] === 'boolean' ? blocks[key] : base.visibleBlocks[key]])
    ) as VisibleBlocks,
    music: {
      url: text(music.url),
      title: text(music.title),
      startSeconds: seconds(music.startSeconds),
      endSeconds: seconds(music.endSeconds),
      loop: music.loop !== false,
      enabled: music.enabled !== false
    }
  }
}

/** True when nothing has been configured yet (fresh clone / empty database). */
export function isContentEmpty(content: SiteContent): boolean {
  const { couple, texts } = content
  return (
    ![couple.partnerOne, couple.partnerTwo, couple.startDate, couple.anniversaryDate, content.letter, content.music.url].some(v => v.trim()) &&
    !Object.values(texts).some(v => v.trim()) &&
    [content.milestones, content.places, content.months, content.achievements, content.reasons, content.commits].every(items => items.length === 0)
  )
}
