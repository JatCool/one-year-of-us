import type { ChangeEvent } from 'react'
import type { MusicConfig } from '../content/model'
import { useAudioSegment } from '../hooks/useAudioSegment'
import { formatMinSec } from '../lib/format'
import { BlockToggleBar, Switch, valueOf, type EditorProps } from './ui'

type MusicEditorProps = EditorProps & {
  uploadAudio: (file: File) => void
  removeAudio: () => void
  busy: boolean
}

const toInt = (value: string) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const fileNameFromUrl = (url: string) => {
  const name = url.split(/[?#]/)[0]?.split('/').pop() ?? url
  try { return decodeURIComponent(name) } catch { return name }
}

/** Minutes + seconds input pair bound to a number of seconds. */
function TimeInput({ value, onChange }: { value: number; onChange: (seconds: number) => void }) {
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return (
    <div className="time-inputs-row">
      <label>
        <span className="sub-label">Хвилини:</span>
        <input type="number" min={0} value={minutes} onChange={e => onChange(toInt(valueOf(e)) * 60 + seconds)} />
      </label>
      <span className="colon">:</span>
      <label>
        <span className="sub-label">Секунди:</span>
        <input type="number" min={0} max={59} value={seconds} onChange={e => onChange(minutes * 60 + Math.min(59, toInt(valueOf(e))))} />
      </label>
    </div>
  )
}

/** Background music settings: upload or link a track, pick a fragment, loop it. */
export function MusicEditor({ content, update, uploadAudio, removeAudio, busy }: MusicEditorProps) {
  const music = content.music
  const player = useAudioSegment({ src: music.url, startSeconds: music.startSeconds, endSeconds: music.endSeconds, loop: music.loop })
  const setField = <K extends keyof MusicConfig>(key: K, value: MusicConfig[K]) =>
    update(c => ({ ...c, music: { ...c.music, [key]: value } }))
  const hasEnd = music.endSeconds > music.startSeconds

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) uploadAudio(file)
  }

  return (
    <>
      <BlockToggleBar enabled={music.enabled} toggle={() => setField('enabled', !music.enabled)} label="Музика" />
      <div className="collection-heading">
        <div>
          <h2>Фонова музика</h2>
          <p>Трек почне грати, коли відвідувач натисне кнопку старту. Можна обрати фрагмент і зациклити його.</p>
        </div>
      </div>

      <div className="music-editor-grid">
        <article className="edit-card">
          <div className="card-heading"><b>1. Аудіофайл або посилання</b></div>
          <div className="field-grid">
            <label className="span-all">
              Назва треку
              <input value={music.title} placeholder="Виконавець — Назва" onChange={e => setField('title', valueOf(e))} />
            </label>

            <div className="span-all audio-upload-box">
              <label className={`audio-upload-btn ${busy ? 'is-busy' : ''}`}>
                <span>📁 ЗАВАНТАЖИТИ АУДІОФАЙЛ (MP3 / M4A / WAV)</span>
                <input type="file" accept="audio/*" onChange={onFile} disabled={busy} />
              </label>
              <div className="upload-divider"><span>АБО ВКАЖІТЬ ПРЯМЕ ПОСИЛАННЯ (URL)</span></div>
              <label>
                Пряме посилання на аудіофайл
                <input type="url" placeholder="https://example.com/music.mp3" value={music.url} onChange={e => setField('url', valueOf(e).trim())} />
              </label>
            </div>

            {music.url && (
              <div className="span-all audio-loaded-row">
                <span className="audio-url-label">Файл підключено: <b>{fileNameFromUrl(music.url)}</b></span>
                <button type="button" className="danger" onClick={removeAudio} disabled={busy}>ВИДАЛИТИ АУДІО</button>
              </div>
            )}
          </div>
        </article>

        {music.url && (
          <article className="edit-card">
            <div className="card-heading"><b>2. Інтервал відтворення та зациклення</b></div>

            <div className="music-timing-grid">
              <div className="timing-box">
                <span className="timing-title">Початок</span>
                <p className="timing-hint">З якої хвилини та секунди починати:</p>
                <TimeInput value={music.startSeconds} onChange={value => setField('startSeconds', value)} />
                <div className="time-preview-badge">Початок: <b>{formatMinSec(music.startSeconds)}</b></div>
                {player.isPlaying && (
                  <button type="button" className="secondary small-action-btn" onClick={() => setField('startSeconds', Math.floor(player.currentTime))}>
                    Поточний час ({formatMinSec(player.currentTime)}) як початок
                  </button>
                )}
              </div>

              <div className="timing-box">
                <span className="timing-title">Кінець</span>
                <p className="timing-hint">Де зупиняти / зациклювати (00:00 — до кінця треку):</p>
                <TimeInput value={music.endSeconds} onChange={value => setField('endSeconds', value)} />
                <div className="time-preview-badge">
                  Кінець: <b>{music.endSeconds > 0 ? formatMinSec(music.endSeconds) : 'до кінця треку'}</b>
                </div>
                {music.endSeconds > 0 && !hasEnd && (
                  <p className="form-error">Кінець має бути пізніше за початок — інакше трек гратиме до кінця.</p>
                )}
                {player.isPlaying && (
                  <button type="button" className="secondary small-action-btn" onClick={() => setField('endSeconds', Math.ceil(player.currentTime))}>
                    Поточний час ({formatMinSec(player.currentTime)}) як кінець
                  </button>
                )}
              </div>
            </div>

            <div className="loop-toggle-row">
              <Switch checked={music.loop} onChange={() => setField('loop', !music.loop)} label={music.loop ? 'ЗАЦИКЛЕНО 🔁' : 'БЕЗ ПОВТОРУ'} />
              <div className="loop-desc">
                <b>Повторювати по колу</b>
                <p>Дійшовши до кінця фрагмента, музика почне грати знову з обраного початку.</p>
              </div>
            </div>

            <div className="music-player-preview">
              <span className="preview-label">ПРОСЛУХАТИ ФРАГМЕНТ:</span>
              <audio ref={player.ref} src={music.url} preload="metadata" />
              <div className="player-controls-row">
                <button type="button" className="primary" onClick={() => (player.isPlaying ? player.pause() : player.play(true))}>
                  {player.isPlaying ? '⏸ ЗУПИНИТИ' : '▶ ПРОСЛУХАТИ'}
                </button>
                <div className="player-status-info">
                  <span>Поточний час: <b>{formatMinSec(player.currentTime)}</b></span>
                  <span>Діапазон: <b>{formatMinSec(music.startSeconds)} — {hasEnd ? formatMinSec(music.endSeconds) : 'кінець'}</b></span>
                  <span>Повтор: <b>{music.loop ? 'увімкнено 🔁' : 'вимкнено'}</b></span>
                </div>
              </div>
            </div>
          </article>
        )}
      </div>
    </>
  )
}
