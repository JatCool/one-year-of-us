import { describe, expect, it } from 'vitest'
import { errorMessage, formatMinSec, pad2, pluralUk } from './format'

describe('pad2', () => {
  it('pads to two digits without truncating larger numbers', () => {
    expect(pad2(1)).toBe('01')
    expect(pad2(10)).toBe('10')
    expect(pad2(123)).toBe('123')
  })
})

describe('formatMinSec', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatMinSec(0)).toBe('00:00')
    expect(formatMinSec(65.9)).toBe('01:05')
    expect(formatMinSec(Number.NaN)).toBe('00:00')
    expect(formatMinSec(-3)).toBe('00:00')
  })
})

describe('pluralUk', () => {
  const forms: [string, string, string] = ['день', 'дні', 'днів']
  it.each([
    [1, 'день'], [21, 'день'], [101, 'день'],
    [2, 'дні'], [4, 'дні'], [22, 'дні'],
    [0, 'днів'], [5, 'днів'], [11, 'днів'], [12, 'днів'], [14, 'днів'], [111, 'днів'], [365, 'днів']
  ])('%i → %s', (count, expected) => {
    expect(pluralUk(count, forms)).toBe(expected)
  })
})

describe('errorMessage', () => {
  it('extracts messages', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage('text')).toBe('text')
    expect(errorMessage({})).toBe('Невідома помилка')
  })
})
