import { describe, expect, it } from 'vitest'
import { normalizeContent } from '../content/model'
import { deriveStory } from './story'

describe('deriveStory', () => {
  it('works without any configuration', () => {
    const story = deriveStory(normalizeContent({}))
    expect(story).toMatchObject({ start: null, end: null, names: [], namesLabel: '', spanDays: null, level: 1 })
  })

  it('derives names, span and level from settings', () => {
    const story = deriveStory(normalizeContent({ couple: { partnerOne: ' Ann ', partnerTwo: 'Bo', startDate: '2024-05-01', anniversaryDate: '2026-05-01' } }))
    expect(story.names).toEqual(['Ann', 'Bo'])
    expect(story.namesLabel).toBe('ANN × BO')
    expect(story.spanDays).toBe(730)
    expect(story.level).toBe(2)
  })

  it('counts up to "now" when no anniversary date is set', () => {
    const story = deriveStory(normalizeContent({ couple: { startDate: '2026-01-01' } }), new Date(2026, 0, 11))
    expect(story.spanDays).toBe(10)
    expect(story.level).toBe(1)
  })
})
