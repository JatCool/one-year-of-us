import { describe, expect, it } from 'vitest'
import { MEDIA_BUCKET, mediaPathFromUrl } from './supabase'

describe('mediaPathFromUrl', () => {
  const base = 'https://abc.supabase.co'
  const prefix = `${base}/storage/v1/object/public/${MEDIA_BUCKET}/`

  it('extracts the object path from our public URLs', () => {
    expect(mediaPathFromUrl(`${prefix}image-1-photo.jpg`, base)).toBe('image-1-photo.jpg')
    expect(mediaPathFromUrl(`${prefix}a%20b.mp3?t=1`, `${base}/`)).toBe('a b.mp3')
  })

  it('ignores foreign or empty URLs', () => {
    expect(mediaPathFromUrl('https://example.com/song.mp3', base)).toBeNull()
    expect(mediaPathFromUrl(`${base}/storage/v1/object/public/other-bucket/x.jpg`, base)).toBeNull()
    expect(mediaPathFromUrl('', base)).toBeNull()
    expect(mediaPathFromUrl(`${prefix}x.jpg`, '')).toBeNull()
  })
})
