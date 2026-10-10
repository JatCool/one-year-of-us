import { describe, expect, it } from 'vitest'
import { BLOCK_KEYS, emptyContent, isContentEmpty, normalizeContent } from './model'

describe('emptyContent', () => {
  it('ships without any personal data', () => {
    const content = emptyContent()
    expect(content.couple).toEqual({ partnerOne: '', partnerTwo: '', startDate: '', anniversaryDate: '' })
    expect(content.milestones).toEqual([])
    expect(content.places).toEqual([])
    expect(content.months).toEqual([])
    expect(content.achievements).toEqual([])
    expect(content.reasons).toEqual([])
    expect(content.commits).toEqual([])
    expect(content.letter).toBe('')
    expect(content.music.url).toBe('')
    expect(content.music.title).toBe('')
    expect(isContentEmpty(content)).toBe(true)
  })

  it('returns a fresh object every time', () => {
    const a = emptyContent()
    a.reasons.push('x')
    expect(emptyContent().reasons).toEqual([])
  })
})

describe('normalizeContent', () => {
  it('turns garbage into empty content', () => {
    for (const raw of [null, undefined, 42, 'text', [], { couple: 'nope', milestones: 'nope' }]) {
      expect(normalizeContent(raw)).toEqual(emptyContent())
    }
  })

  it('reads the legacy couple keys', () => {
    const content = normalizeContent({ couple: { husband: 'A', wife: 'B', date: '2025-01-02', anniversary: '2026-01-02' } })
    expect(content.couple).toEqual({ partnerOne: 'A', partnerTwo: 'B', startDate: '2025-01-02', anniversaryDate: '2026-01-02' })
  })

  it('prefers the current couple keys over legacy ones', () => {
    const content = normalizeContent({ couple: { partnerOne: 'New', husband: 'Old' } })
    expect(content.couple.partnerOne).toBe('New')
  })

  it('fills missing fields of list items and drops wrong types', () => {
    const content = normalizeContent({
      milestones: [{ title: 'T', image: 5 }],
      reasons: ['a', 3, null],
      achievements: [['01', 'Title'], { number: '02', title: 'Obj', text: 'x' }],
      commits: [['2025-01-01', 'init', 'extra']]
    })
    expect(content.milestones).toEqual([{ icon: '', title: 'T', date: '', text: '', image: '' }])
    expect(content.reasons).toEqual(['a', '', ''])
    expect(content.achievements).toEqual([['01', 'Title', ''], ['02', 'Obj', 'x']])
    expect(content.commits).toEqual([['2025-01-01', 'init']])
  })

  it('keeps explicit block visibility and defaults the rest to visible', () => {
    const content = normalizeContent({ visibleBlocks: { letter: false, terminal: 'no', unknown: false } })
    expect(content.visibleBlocks.letter).toBe(false)
    expect(content.visibleBlocks.terminal).toBe(true)
    expect(Object.keys(content.visibleBlocks).sort()).toEqual([...BLOCK_KEYS].sort())
  })

  it('sanitises music settings', () => {
    const content = normalizeContent({ music: { url: 'u', startSeconds: -4, endSeconds: 12.7, loop: false } })
    expect(content.music).toEqual({ url: 'u', title: '', startSeconds: 0, endSeconds: 12, loop: false, enabled: true })
  })

  it('is idempotent', () => {
    const once = normalizeContent({ couple: { husband: 'A' }, reasons: ['r'], music: { url: 'x' } })
    expect(normalizeContent(once)).toEqual(once)
  })
})

describe('isContentEmpty', () => {
  it('detects any configured value', () => {
    expect(isContentEmpty(normalizeContent({ couple: { partnerOne: 'A' } }))).toBe(false)
    expect(isContentEmpty(normalizeContent({ reasons: [''] }))).toBe(false)
    expect(isContentEmpty(normalizeContent({ texts: { heroTitle: 'Hi' } }))).toBe(false)
    expect(isContentEmpty(normalizeContent({ letter: '   ' }))).toBe(true)
  })
})
