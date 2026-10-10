import { useCallback, useEffect, useState } from 'react'

type Segment = { src: string; startSeconds: number; endSeconds: number; loop: boolean }

/**
 * Plays a `[startSeconds, endSeconds)` fragment of an audio file, optionally
 * looping it. Shared by the public music player and the admin preview.
 *
 * Attach the returned `ref` to an `<audio>` element. It is a callback ref, so
 * the listeners are (re)attached whenever the element mounts — e.g. after the
 * music URL is loaded from the CMS.
 */
export function useAudioSegment({ src, startSeconds, endSeconds, loop }: Segment) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const hasEnd = endSeconds > startSeconds

  useEffect(() => {
    if (!audio) return
    const restart = () => {
      audio.currentTime = startSeconds
      audio.play().catch(() => undefined)
    }
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (hasEnd && audio.currentTime >= endSeconds) {
        if (loop) restart()
        else {
          audio.pause()
          audio.currentTime = startSeconds
        }
      }
    }
    const onEnded = () => { if (loop) restart() }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [audio, src, startSeconds, endSeconds, loop, hasEnd])

  /** Starts playback; jumps to the segment start when outside it (or when `fromStart`). */
  const play = useCallback((fromStart = false) => {
    if (!audio) return
    if (fromStart || audio.currentTime < startSeconds || (hasEnd && audio.currentTime >= endSeconds)) {
      audio.currentTime = startSeconds
    }
    // Browsers may block autoplay; the user can always press play manually.
    audio.play().catch(() => setIsPlaying(false))
  }, [audio, startSeconds, endSeconds, hasEnd])

  const pause = useCallback(() => audio?.pause(), [audio])

  return { ref: setAudio, audio, isPlaying, currentTime, play, pause }
}
