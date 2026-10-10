import { useEffect, useState } from 'react'
import type { MusicConfig } from '../content/model'
import { useAudioSegment } from '../hooks/useAudioSegment'
import { formatMinSec } from '../lib/format'

/**
 * Floating background-music player. Renders nothing unless a track URL is set
 * and music is enabled in the admin. Starts playing once the visitor presses
 * the start button on the boot screen (`started`), which satisfies browser
 * autoplay policies.
 */
export function MusicPlayer({ config, started }: { config: MusicConfig; started: boolean }) {
  const [isMuted, setIsMuted] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const enabled = config.enabled && !!config.url
  const player = useAudioSegment({ src: config.url, startSeconds: config.startSeconds, endSeconds: config.endSeconds, loop: config.loop })
  const { audio, play } = player

  useEffect(() => {
    if (started && enabled && audio) play(true)
  }, [started, enabled, audio, play])

  useEffect(() => {
    if (audio) audio.muted = isMuted
  }, [audio, isMuted])

  if (!enabled) return null

  const hasEnd = config.endSeconds > config.startSeconds
  const toggle = () => (player.isPlaying ? player.pause() : play())
  const playLabel = player.isPlaying ? 'Призупинити музику' : 'Увімкнути музику'

  return (
    <aside className={`floating-music ${player.isPlaying ? 'playing' : ''} ${minimized ? 'minimized' : ''}`} aria-label="Музичний плеєр">
      <audio ref={player.ref} src={config.url} preload="auto" />
      <button type="button" className="music-toggle-btn" onClick={toggle} title={playLabel} aria-label={playLabel}>
        <div className="music-bars" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <span className="music-icon" aria-hidden="true">{player.isPlaying ? '⏸' : '▶'}</span>
      </button>

      {minimized ? (
        <button type="button" className="music-expand-btn" onClick={() => setMinimized(false)} title="Розгорнути плеєр" aria-label="Розгорнути плеєр">
          🎵
        </button>
      ) : (
        <div className="music-details">
          <div className="music-info">
            <strong className="music-title">{config.title || 'Музика'}</strong>
            <span className="music-time">
              {formatMinSec(player.currentTime)} {hasEnd ? `/ ${formatMinSec(config.endSeconds)}` : ''}
              {config.loop && <i className="music-loop-tag" title="Зациклено"> 🔁</i>}
            </span>
          </div>
          <div className="music-actions">
            <button
              type="button"
              className="music-action-btn"
              onClick={() => setIsMuted(muted => !muted)}
              title={isMuted ? 'Увімкнути звук' : 'Вимкнути звук'}
              aria-label={isMuted ? 'Увімкнути звук' : 'Вимкнути звук'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button type="button" className="music-action-btn music-minimize" onClick={() => setMinimized(true)} title="Згорнути" aria-label="Згорнути плеєр">
              —
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
