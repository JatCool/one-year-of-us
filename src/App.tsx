import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  achievements as defaultAchievements,
  commits as defaultCommits,
  couple as defaultCouple,
  defaultMusic,
  defaultVisibleBlocks,
  letter as defaultLetter,
  milestones as defaultMilestones,
  months as defaultMonths,
  places as defaultPlaces,
  reasons as defaultReasons,
  type BlockKey,
  type MusicConfig
} from './data/anniversary'
import { supabase } from './lib/supabase'

const Photo = ({ src, className }: { src: string; className: string }) => {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  const isPlaceholder = !src || src.startsWith('/images/') || failed
  return !isPlaceholder ? (
    <div className={`${className} responsive-photo`}>
      <img src={src} alt="Спогад Андрія та Анастасії" loading="lazy" onError={() => setFailed(true)}/>
    </div>
  ) : (
    <div className={`${className} image`} />
  )
}

const ScrollReveal = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('shown')
      return
    }
    const watcher = new IntersectionObserver(([entry]) => {
      if (entry && entry.isIntersecting) {
        node.classList.add('shown')
        watcher.disconnect()
      }
    }, { threshold: 0.02, rootMargin: '0px 0px -20px 0px' })
    watcher.observe(node)

    // Safety fallback: reveal after timeout to prevent any invisible blocks
    const timer = window.setTimeout(() => {
      if (node && !node.classList.contains('shown')) {
        node.classList.add('shown')
      }
    }, 750)

    return () => {
      watcher.disconnect()
      window.clearTimeout(timer)
    }
  }, [])
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>
}

function Boot({ onStart }: { onStart: () => void }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const timer = window.setTimeout(() => setReady(true), 1750); return () => clearTimeout(timer) }, [])
  return (
    <main className="boot">
      <div className="boot-inner">
        <p className="eyebrow">АНДРІЙ × АНАСТАСІЯ / 01</p>
        <div className="boot-lines">
          <span>ініціалізація стосунків...</span>
          <span>завантаження спогадів...</span>
          <span>індексація 365 днів...</span>
          <span>перевірка сумісності...</span>
          <span>збирання моментів...</span>
          <span className="progress">████████████████████ <i>100%</i></span>
        </div>
        {ready && (
          <div className="ready">
            <p>✓ СИСТЕМА ГОТОВА</p>
            <button className="primary" onClick={onStart}>ПОЧАТИ НАШУ ІСТОРІЮ <b>↓</b></button>
          </div>
        )}
      </div>
    </main>
  )
}

function Counter() {
  const [values, setValues] = useState({ days: 365, hours: 8760, minutes: 525600 })
  useEffect(() => {
    const update = () => {
      const start = new Date('2025-09-25T00:00:00')
      const now = new Date()
      const elapsed = Math.max(0, now.getTime() - start.getTime())
      setValues({
        days: Math.floor(elapsed / 86400000),
        hours: Math.floor(elapsed / 3600000),
        minutes: Math.floor(elapsed / 60000)
      })
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [])
  const labels: Record<string, string> = { days: 'днів', hours: 'годин', minutes: 'хвилин' }
  return (
    <div className="counter">
      {Object.entries(values).map(([name, value]) => (
        <div key={name}>
          <strong>{value.toLocaleString('uk-UA')}</strong>
          <span>{labels[name]}</span>
        </div>
      ))}
    </div>
  )
}

function MusicPlayer({ config, started }: { config?: MusicConfig; started: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [minimized, setMinimized] = useState(false)

  const url = config?.url
  const isEnabled = config?.enabled !== false && !!url
  const startSec = config?.startSeconds || 0
  const endSec = config?.endSeconds || 0
  const loop = config?.loop !== false
  const title = config?.title || 'Наша особлива мелодія'

  useEffect(() => {
    if (!started || !isEnabled || !url) return
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = startSec
    audio.play().then(() => setIsPlaying(true)).catch(() => {
      setIsPlaying(false)
    })
  }, [started, isEnabled, url, startSec])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (endSec > startSec && audio.currentTime >= endSec) {
        if (loop) {
          audio.currentTime = startSec
          audio.play().catch(() => {})
        } else {
          audio.pause()
          audio.currentTime = startSec
          setIsPlaying(false)
        }
      }
    }

    const onEnded = () => {
      if (loop) {
        audio.currentTime = startSec
        audio.play().catch(() => {})
      } else {
        setIsPlaying(false)
      }
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [startSec, endSec, loop])

  if (!isEnabled) return null

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      if (audio.currentTime < startSec || (endSec > startSec && audio.currentTime >= endSec)) {
        audio.currentTime = startSec
      }
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const formatMinSec = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <aside className={`floating-music ${isPlaying ? 'playing' : ''} ${minimized ? 'minimized' : ''}`} aria-label="Музичний плеєр">
      <audio ref={audioRef} src={url} preload="auto" />
      <button
        type="button"
        className="music-toggle-btn"
        onClick={togglePlay}
        title={isPlaying ? "Призупинити музику" : "Увімкнути музику"}
        aria-label={isPlaying ? "Призупинити музику" : "Увімкнути музику"}
      >
        <div className="music-bars">
          <span /><span /><span /><span />
        </div>
        <span className="music-icon">{isPlaying ? '⏸' : '▶'}</span>
      </button>

      {!minimized && (
        <div className="music-details">
          <div className="music-info">
            <strong className="music-title">{title}</strong>
            <span className="music-time">
              {formatMinSec(currentTime)} {endSec > startSec ? `/ ${formatMinSec(endSec)}` : ''}
              {loop && <i className="music-loop-tag" title="Зациклено"> 🔁</i>}
            </span>
          </div>
          <div className="music-actions">
            <button
              type="button"
              className="music-action-btn"
              onClick={toggleMute}
              title={isMuted ? "Увімкнути звук" : "Вимкнути звук"}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button
              type="button"
              className="music-action-btn music-minimize"
              onClick={() => setMinimized(true)}
              title="Згорнути"
            >
              —
            </button>
          </div>
        </div>
      )}

      {minimized && (
        <button
          type="button"
          className="music-expand-btn"
          onClick={() => setMinimized(false)}
          title="Розгорнути інформацію про музику"
        >
          🎵
        </button>
      )}
    </aside>
  )
}

function App() {
  const [started, setStarted] = useState(false)
  const [reasonIndex, setReasonIndex] = useState<number>(0)
  const [showAllReasons, setShowAllReasons] = useState(false)
  const [opened, setOpened] = useState(false)
  const [place, setPlace] = useState(0)
  const [final, setFinal] = useState(false)
  const [stored, setStored] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const load = () => {
      supabase?.from('site_content').select('content').eq('id','main').maybeSingle().then(({ data }) => {
        if (data?.content) setStored(data.content as Record<string, unknown>)
      })
    }
    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [])

  const milestones = (stored?.milestones as typeof defaultMilestones) || defaultMilestones
  const places = (stored?.places as typeof defaultPlaces) || defaultPlaces
  const months = (stored?.months as typeof defaultMonths) || defaultMonths
  const achievements = (stored?.achievements as typeof defaultAchievements) || defaultAchievements
  const reasons = (Array.isArray(stored?.reasons) && stored.reasons.length > 0) ? (stored.reasons as string[]) : defaultReasons
  const commits = (stored?.commits as typeof defaultCommits) || defaultCommits
  const letter = (stored?.letter as string) || defaultLetter
  const music = (stored?.music as MusicConfig | undefined) || defaultMusic
  const visibleBlocks: Record<BlockKey, boolean> = { ...defaultVisibleBlocks, ...(stored?.visibleBlocks as Record<BlockKey, boolean> | undefined) }

  const nextReason = () => {
    setReasonIndex(prev => {
      if (reasons.length <= 1) return 0
      const available = reasons.map((_, i) => i).filter(i => i !== prev)
      return available[Math.floor(Math.random() * available.length)]
    })
  }

  if (!started) {
    return (
      <Boot onStart={() => {
        setStarted(true)
        requestAnimationFrame(() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' }))
      }} />
    )
  }

  return (
    <main>
      <MusicPlayer config={music} started={started} />

      <section className="hero" id="hero">
        <div className="noise"/>
        <div className="orb one"/>
        <div className="orb two"/>
        <div className="hero-inner">
          <p className="eyebrow">25.09.2025 — 25.09.2026</p>
          <h1>ОДИН РІК<br/><em>НАС.</em></h1>
          <p className="hero-copy">365 днів. Незліченні спогади. І я б однаково обрав тебе.</p>
          <Counter/>
          <a className="primary" href="#journey">ДО НАШОГО РОКУ <b>↓</b></a>
        </div>
        <p className="side-mark">ІСТОРІЯ НАС / 01</p>
      </section>

      {visibleBlocks.milestones !== false && (
        <section className="section journey" id="journey">
          <ScrollReveal>
            <p className="eyebrow">РОЗДІЛИ / 01—05</p>
            <h2>НАША <em>ДОРОГА.</em></h2>
            <p className="section-intro">П’ять моментів одного красивого й непередбачуваного року.</p>
          </ScrollReveal>
          <div className="timeline">
            {milestones.map((item, i) => (
              <ScrollReveal className="timeline-item" key={item.title}>
                <article className="milestone">
                  <div className="milestone-number">0{i + 1}</div>
                  <Photo src={item.image} className="milestone-image"/>
                  <div className="milestone-copy">
                    <span className="glyph">{item.icon}</span>
                    <p className="date">{item.date}</p>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>
      )}

      {visibleBlocks.places !== false && (
        <section className="section places" id="places">
          <ScrollReveal>
            <p className="eyebrow">КІЛЬКА КООРДИНАТ</p>
            <h2>МІСЦЯ, ЯКІ <em>ЗБЕРЕГЛИ.</em></h2>
          </ScrollReveal>
          <div className="places-layout">
            <div className="route">
              {places.map((item, i) => (
                <button
                  aria-label={`Відкрити ${item.place}`}
                  className={`route-stop ${place === i ? 'active' : ''}`}
                  onClick={() => setPlace(i)}
                  key={item.place}
                >
                  <i>0{i + 1}</i>
                  <span>{item.place}</span>
                </button>
              ))}
            </div>
            <ScrollReveal className="place-card">
              <Photo src={places[place]?.image || ''} className="place-image"/>
              <p className="date">{places[place]?.date}</p>
              <h3>{places[place]?.place}</h3>
              <p>{places[place]?.note}</p>
            </ScrollReveal>
          </div>
        </section>
      )}

      {visibleBlocks.months !== false && (
        <section className="section gallery" id="gallery">
          <ScrollReveal>
            <p className="eyebrow">ДВАНАДЦЯТЬ МАЛЕНЬКИХ ФІЛЬМІВ</p>
            <h2>12 МІСЯЦІВ / <em>12 СПОГАДІВ.</em></h2>
          </ScrollReveal>
          <div className="memory-track">
            {months.map((month) => (
              <article className="memory" key={month.month}>
                <Photo src={month.image} className="memory-image"/>
                <p className="date">{month.month} / 2026</p>
                <p>{month.caption}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {visibleBlocks.achievements !== false && (
        <section className="section achievements" id="achievements">
          <ScrollReveal>
            <p className="eyebrow">ГРАВЕЦЬ ПЕРШИЙ + ГРАВЧИНЯ ДРУГА</p>
            <h2>ДОСЯГНЕННЯ <em>РОЗБЛОКОВАНО.</em></h2>
          </ScrollReveal>
          <div className="achievement-grid">
            {achievements.map(([number, title, text]) => (
              <ScrollReveal key={number}>
                <article className="achievement">
                  <span className="badge">✦</span>
                  <span className="achievement-no">#{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <small>РОЗБЛОКОВАНО</small>
                </article>
              </ScrollReveal>
            ))}
            <ScrollReveal>
              <button
                className="achievement locked"
                onClick={() => alert("Гарна спроба.\nМайбутнє ще не розблокувати.\n\nЗаходь наступного року.")}
              >
                <span className="badge">⌁</span>
                <span className="achievement-no">#06</span>
                <h3>РІВЕНЬ 02 — ЗАЧИНЕНО</h3>
                <p>Відкриється завтра.</p>
                <small>НАТИСНИ, ЩОБ СПРОБУВАТИ</small>
              </button>
            </ScrollReveal>
          </div>
        </section>
      )}

      {visibleBlocks.reasons !== false && reasons.length > 0 && (
        <section className="section reasons" id="reasons">
          <ScrollReveal>
            <div className="section-head">
              <p className="eyebrow">СПИСОК, ЩО НЕ ЗАКІНЧУЄТЬСЯ / 💖 ПРИЧИНИ</p>
              <h2>ЧОМУ САМЕ <em>ТИ?</em></h2>
              <p className="section-intro">Кожен спільний день додає ще одну відповідь. Ось за що я тебе безмежно кохаю:</p>
            </div>

            <div className="reason-container">
              <div className="reason-card-active">
                <div className="reason-meta">
                  <span className="reason-badge">ПРИЧИНА #{reasonIndex + 1}</span>
                  <span className="reason-total">із {reasons.length}</span>
                </div>
                <blockquote className="reason-quote">
                  «{reasons[reasonIndex] || reasons[0]}»
                </blockquote>
                <div className="reason-btn-row">
                  <button className="primary" onClick={nextReason}>
                    НАСТУПНА ПРИЧИНА <b>→</b>
                  </button>
                  <button
                    className="secondary reason-view-toggle"
                    onClick={() => setShowAllReasons(prev => !prev)}
                  >
                    {showAllReasons ? 'ЗГОРНУТИ СПИСОК ▲' : `ПОКАЗАТИ ВСІ (${reasons.length}) ▼`}
                  </button>
                </div>
              </div>

              {showAllReasons && (
                <div className="reasons-all-grid">
                  {reasons.map((r, i) => (
                    <article
                      key={i}
                      className={`reason-item-card ${i === reasonIndex ? 'selected-reason' : ''}`}
                      onClick={() => setReasonIndex(i)}
                    >
                      <span className="item-number">0{i + 1}</span>
                      <p>{r}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>
        </section>
      )}

      {visibleBlocks.terminal !== false && (
        <section className="section terminal-section" id="terminal">
          <ScrollReveal>
            <p className="eyebrow">ШВИДКА ДІАГНОСТИКА</p>
            <h2>НАШ <em>ТЕРМІНАЛ.</em></h2>
            <div className="terminal">
              <div className="terminal-top">
                <i/><i/><i/>
                <span>relationship@andrey:~$ ./analyze-marriage.sh</span>
              </div>
              <div className="terminal-body">
                <p>&gt; Ініціалізація...</p>
                <p>&gt; Завантаження спогадів...</p>
                <p>&gt; Обробка 365 днів...</p>
                <p>&gt; Пошук суперечок... <b>знайдено взаєморозуміння</b></p>
                <p>&gt; Пошук сміху... <b>у надлишку</b></p>
                <br/>
                <p className="ok">✓ спогади проіндексовано</p>
                <p className="ok">✓ пригоди завершено</p>
                <p className="ok">✓ складні дні пережито</p>
                <p className="ok">✓ наші жарти виявлено</p>
                <p className="ok">✓ любов підтверджено</p>
                <br/>
                <p>СТАТУС СТОСУНКІВ:</p>
                <p className="bar">████████████████████ <b>100%</b></p>
                <p>СУМІСНІСТЬ: <strong>∞%</strong></p>
                <br/>
                <p>ФІНАЛЬНА РЕКОМЕНДАЦІЯ:</p>
                <p className="forever">БУТИ РАЗОМ<br/>НАЗАВЖДИ</p>
                <p className="muted">Процес завершено з кодом 0.</p>
              </div>
            </div>
          </ScrollReveal>
        </section>
      )}

      {visibleBlocks.commits !== false && (
        <section className="section git" id="commits">
          <ScrollReveal>
            <p className="eyebrow">КОНТРОЛЬ ВЕРСІЙ / ЛЮБОВ</p>
            <h2>НАШІ СТОСУНКИ — <em>GIT LOG.</em></h2>
            <div className="git-log">
              {commits.map(([date, commit]) => (
                <div className="commit" key={date}>
                  <time>{date}</time>
                  <span>commit: <b>{commit}</b></span>
                </div>
              ))}
              <div className="git-stats">
                <span>365 комітів</span>
                <span>0 критичних змін</span>
                <span>∞ планів попереду</span>
              </div>
              <p>наступний реліз <b>v2.0 — РІК ДРУГИЙ</b></p>
            </div>
          </ScrollReveal>
        </section>
      )}

      {visibleBlocks.letter !== false && (
        <section className="letter-section" id="letter">
          <ScrollReveal>
            <p className="eyebrow">ТЕ, ЩО Я НАСПРАВДІ ХОЧУ СКАЗАТИ</p>
            <h2>І ЩЕ ОДНЕ <em>ВАЖЛИВЕ...</em></h2>

            <div className={`envelope-container ${opened ? 'is-open' : 'is-closed'}`}>
              <div className="envelope-box">
                <div className="env-back" />

                <div className="env-letter-sheet">
                  <div className="parchment">
                    <div className="parchment-header">
                      <span className="parchment-tag">ОСОБИСТИЙ ЛИСТ</span>
                      <span className="parchment-seal">✦</span>
                      <span className="parchment-date">25 ВЕРЕСНЯ 2026</span>
                    </div>
                    <div className="parchment-body">
                      <p>{letter}</p>
                    </div>
                    <div className="parchment-footer">
                      <span>— З любов’ю назавжди</span>
                    </div>
                  </div>
                </div>

                <div className="env-pocket" />
                <div className="env-flap" />

                {!opened && (
                  <button
                    aria-label="Відкрити лист"
                    className="env-seal-button"
                    onClick={() => setOpened(true)}
                  >
                    <span className="seal-wax">
                      <span className="seal-icon">💌</span>
                      <span className="seal-caption">ВІДКРИТИ ЛИСТ</span>
                    </span>
                  </button>
                )}
              </div>

              {opened && (
                <div className="letter-opened-controls">
                  <button
                    type="button"
                    className="secondary fold-letter-btn"
                    onClick={() => setOpened(false)}
                  >
                    ЗГОРНУТИ ЛИСТ ↑
                  </button>
                </div>
              )}
            </div>
          </ScrollReveal>
        </section>
      )}

      <section className="final">
        <p className="eyebrow">КІНЕЦЬ — ЦЕ ПОЧАТОК</p>
        <p className="level">РІВЕНЬ 01 ЗАВЕРШЕНО</p>
        <h2>365 / <em>365</em> ДНІВ</h2>
        {!final ? (
          <>
            <p>Готова до рівня 02?</p>
            <div>
              <button className="primary" onClick={() => setFinal(true)}>ТАК ♡</button>
              <button className="secondary" onClick={() => setFinal(true)}>АВЖЕЖ</button>
            </div>
          </>
        ) : (
          <div className="good-choice">
            <p>Правильний вибір.</p>
            <h3>Побачимось у другому році.</h3>
          </div>
        )}
        <footer>
          АНДРІЙ × АНАСТАСІЯ<br/>
          <span>25.09.2025 — ∞</span>
        </footer>
      </section>
    </main>
  )
}

export default App
