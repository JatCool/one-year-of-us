import { useState } from 'react'
import type { SiteContent } from '../content/model'
import { formatLongDate, formatShortDate } from '../lib/dates'
import { formatNumber, pad2, pluralUk } from '../lib/format'
import { Counter, Photo, ScrollReveal } from './components'
import { MusicPlayer } from './MusicPlayer'
import type { Story } from './story'

/**
 * The story page. Every section is driven by the CMS document and is hidden
 * when it is switched off in the admin or has no content yet.
 */
export function Site({ content, story }: { content: SiteContent; story: Story }) {
  const { texts, visibleBlocks: visible } = content
  const reasons = content.reasons.filter(reason => reason.trim())

  const show = {
    milestones: visible.milestones && content.milestones.length > 0,
    places: visible.places && content.places.length > 0,
    months: visible.months && content.months.length > 0,
    achievements: visible.achievements && content.achievements.length > 0,
    reasons: visible.reasons && reasons.length > 0,
    terminal: visible.terminal,
    commits: visible.commits && content.commits.length > 0,
    letter: visible.letter && content.letter.trim().length > 0
  }
  const sectionIds = { milestones: 'journey', places: 'places', months: 'gallery', achievements: 'achievements', reasons: 'reasons', terminal: 'terminal', commits: 'commits', letter: 'letter' } as const
  const firstSection = (Object.keys(show) as (keyof typeof show)[]).find(key => show[key])

  // Neutral headline until the owner writes their own.
  const hasCustomHero = !!(texts.heroTitle.trim() || texts.heroAccent.trim())
  const heroTitle = hasCustomHero ? texts.heroTitle : 'НАША'
  const heroAccent = hasCustomHero ? texts.heroAccent : 'ІСТОРІЯ.'

  return (
    <main>
      <MusicPlayer config={content.music} started />

      <section className="hero" id="hero">
        <div className="noise" />
        <div className="orb one" />
        <div className="orb two" />
        <div className="hero-inner">
          {story.start && (
            <p className="eyebrow">{formatShortDate(story.start)} — {story.end ? formatShortDate(story.end) : '∞'}</p>
          )}
          <h1>
            {heroTitle}
            {heroTitle && heroAccent && <br />}
            {heroAccent && <em>{heroAccent}</em>}
          </h1>
          {texts.heroSubtitle.trim() && <p className="hero-copy">{texts.heroSubtitle}</p>}
          {story.start && <Counter start={story.start} />}
          {firstSection && (
            <a className="primary" href={`#${sectionIds[firstSection]}`}>ДО НАШОЇ ІСТОРІЇ <b>↓</b></a>
          )}
        </div>
        <p className="side-mark">ІСТОРІЯ НАС / {pad2(story.level)}</p>
      </section>

      {show.milestones && <Milestones content={content} />}
      {show.places && <Places content={content} />}
      {show.months && <Gallery content={content} />}
      {show.achievements && <Achievements content={content} story={story} />}
      {show.reasons && <Reasons reasons={reasons} />}
      {show.terminal && <Terminal content={content} story={story} />}
      {show.commits && <Commits content={content} story={story} />}
      {show.letter && <Letter content={content} story={story} />}
      <Final content={content} story={story} />
    </main>
  )
}

type SectionProps = { content: SiteContent }
type StorySectionProps = SectionProps & { story: Story }

function Milestones({ content }: SectionProps) {
  const count = content.milestones.length
  return (
    <section className="section journey" id="journey">
      <ScrollReveal>
        <p className="eyebrow">РОЗДІЛИ / 01—{pad2(count)}</p>
        <h2>НАША <em>ДОРОГА.</em></h2>
        <p className="section-intro">{count} {pluralUk(count, ['момент', 'моменти', 'моментів'])}, з яких складається наша історія.</p>
      </ScrollReveal>
      <div className="timeline">
        {content.milestones.map((item, i) => (
          <ScrollReveal className="timeline-item" key={i}>
            <article className="milestone">
              <div className="milestone-number">{pad2(i + 1)}</div>
              <Photo src={item.image} alt={item.title} className="milestone-image" />
              <div className="milestone-copy">
                {item.icon && <span className="glyph">{item.icon}</span>}
                {item.date && <p className="date">{item.date}</p>}
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

function Places({ content }: SectionProps) {
  const [selected, setSelected] = useState(0)
  const places = content.places
  const index = Math.min(selected, places.length - 1)
  const current = places[index]
  return (
    <section className="section places" id="places">
      <ScrollReveal>
        <p className="eyebrow">КІЛЬКА КООРДИНАТ</p>
        <h2>МІСЦЯ, ЯКІ <em>ЗБЕРЕГЛИ.</em></h2>
      </ScrollReveal>
      <div className="places-layout">
        <div className="route" role="tablist">
          {places.map((item, i) => (
            <button
              role="tab"
              aria-selected={index === i}
              className={`route-stop ${index === i ? 'active' : ''}`}
              onClick={() => setSelected(i)}
              key={i}
            >
              <i>{pad2(i + 1)}</i>
              <span>{item.place}</span>
            </button>
          ))}
        </div>
        {current && (
          <ScrollReveal className="place-card">
            <Photo src={current.image} alt={current.place} className="place-image" />
            {current.date && <p className="date">{current.date}</p>}
            <h3>{current.place}</h3>
            <p>{current.note}</p>
          </ScrollReveal>
        )}
      </div>
    </section>
  )
}

function Gallery({ content }: SectionProps) {
  const count = content.months.length
  return (
    <section className="section gallery" id="gallery">
      <ScrollReveal>
        <p className="eyebrow">МАЛЕНЬКІ ФІЛЬМИ ПРО НАС</p>
        <h2>
          {count} {pluralUk(count, ['МІСЯЦЬ', 'МІСЯЦІ', 'МІСЯЦІВ'])} / <em>{count} {pluralUk(count, ['СПОГАД', 'СПОГАДИ', 'СПОГАДІВ'])}.</em>
        </h2>
      </ScrollReveal>
      <div className="memory-track">
        {content.months.map((memory, i) => (
          <article className="memory" key={i}>
            <Photo src={memory.image} alt={memory.caption || memory.month} className="memory-image" />
            {memory.month && <p className="date">{memory.month}</p>}
            <p>{memory.caption}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Achievements({ content, story }: StorySectionProps) {
  const [triedLocked, setTriedLocked] = useState(false)
  const players = story.names.length === 2 ? `${story.names[0]} + ${story.names[1]}`.toUpperCase() : 'ДВА ГРАВЦІ'
  const nextLevel = pad2(story.level + 1)
  return (
    <section className="section achievements" id="achievements">
      <ScrollReveal>
        <p className="eyebrow">{players}</p>
        <h2>ДОСЯГНЕННЯ <em>РОЗБЛОКОВАНО.</em></h2>
      </ScrollReveal>
      <div className="achievement-grid">
        {content.achievements.map(([number, title, text], i) => (
          <ScrollReveal key={i}>
            <article className="achievement">
              <span className="badge">✦</span>
              <span className="achievement-no">#{number || pad2(i + 1)}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <small>РОЗБЛОКОВАНО</small>
            </article>
          </ScrollReveal>
        ))}
        <ScrollReveal>
          <button className="achievement locked" onClick={() => setTriedLocked(true)} aria-live="polite">
            <span className="badge">⌁</span>
            <span className="achievement-no">#{pad2(content.achievements.length + 1)}</span>
            <h3>РІВЕНЬ {nextLevel} — ЗАЧИНЕНО</h3>
            <p>{triedLocked ? 'Гарна спроба. Майбутнє ще не розблокувати — заходь згодом.' : 'Відкриється згодом.'}</p>
            <small>{triedLocked ? 'ЩЕ НЕ ЧАС' : 'НАТИСНИ, ЩОБ СПРОБУВАТИ'}</small>
          </button>
        </ScrollReveal>
      </div>
    </section>
  )
}

function Reasons({ reasons }: { reasons: string[] }) {
  const [selected, setSelected] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const index = Math.min(selected, reasons.length - 1)

  const nextReason = () => {
    if (reasons.length <= 1) return
    const others = reasons.map((_, i) => i).filter(i => i !== index)
    setSelected(others[Math.floor(Math.random() * others.length)] ?? 0)
  }

  return (
    <section className="section reasons" id="reasons">
      <ScrollReveal>
        <div className="section-head">
          <p className="eyebrow">СПИСОК, ЩО НЕ ЗАКІНЧУЄТЬСЯ / 💖 ПРИЧИНИ</p>
          <h2>ЧОМУ САМЕ <em>ТИ?</em></h2>
          <p className="section-intro">Кожен спільний день додає ще одну відповідь.</p>
        </div>

        <div className="reason-container">
          <div className="reason-card-active">
            <div className="reason-meta">
              <span className="reason-badge">ПРИЧИНА #{index + 1}</span>
              <span className="reason-total">із {reasons.length}</span>
            </div>
            <blockquote className="reason-quote" aria-live="polite">«{reasons[index]}»</blockquote>
            <div className="reason-btn-row">
              {reasons.length > 1 && (
                <button className="primary" onClick={nextReason}>НАСТУПНА ПРИЧИНА <b>→</b></button>
              )}
              <button className="secondary reason-view-toggle" onClick={() => setShowAll(prev => !prev)} aria-expanded={showAll}>
                {showAll ? 'ЗГОРНУТИ СПИСОК ▲' : `ПОКАЗАТИ ВСІ (${reasons.length}) ▼`}
              </button>
            </div>
          </div>

          {showAll && (
            <div className="reasons-all-grid">
              {reasons.map((reason, i) => (
                <button
                  type="button"
                  key={i}
                  className={`reason-item-card ${i === index ? 'selected-reason' : ''}`}
                  onClick={() => setSelected(i)}
                  aria-pressed={i === index}
                >
                  <span className="item-number">{pad2(i + 1)}</span>
                  <p>{reason}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollReveal>
    </section>
  )
}

/** Turns a name into something that looks like a shell user name. */
const shellUser = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-') || 'us'

function Terminal({ content, story }: StorySectionProps) {
  return (
    <section className="section terminal-section" id="terminal">
      <ScrollReveal>
        <p className="eyebrow">ШВИДКА ДІАГНОСТИКА</p>
        <h2>НАШ <em>ТЕРМІНАЛ.</em></h2>
        <div className="terminal">
          <div className="terminal-top">
            <i /><i /><i />
            <span>relationship@{shellUser(content.couple.partnerOne)}:~$ ./analyze-us.sh</span>
          </div>
          <div className="terminal-body">
            <p>&gt; Ініціалізація...</p>
            <p>&gt; Завантаження спогадів...</p>
            <p>&gt; Обробка {story.spanDays !== null ? `${formatNumber(story.spanDays)} ${pluralUk(story.spanDays, ['дня', 'днів', 'днів'])}` : 'спільних днів'}...</p>
            <p>&gt; Пошук суперечок... <b>знайдено взаєморозуміння</b></p>
            <p>&gt; Пошук сміху... <b>у надлишку</b></p>
            <br />
            <p className="ok">✓ спогади проіндексовано</p>
            <p className="ok">✓ пригоди завершено</p>
            <p className="ok">✓ складні дні пережито</p>
            <p className="ok">✓ наші жарти виявлено</p>
            <p className="ok">✓ любов підтверджено</p>
            <br />
            <p>СТАТУС СТОСУНКІВ:</p>
            <p className="bar">████████████████████ <b>100%</b></p>
            <p>СУМІСНІСТЬ: <strong>∞%</strong></p>
            <br />
            <p>ФІНАЛЬНА РЕКОМЕНДАЦІЯ:</p>
            <p className="forever">БУТИ РАЗОМ<br />НАЗАВЖДИ</p>
            <p className="muted">Процес завершено з кодом 0.</p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}

function Commits({ content, story }: StorySectionProps) {
  const next = story.level + 1
  return (
    <section className="section git" id="commits">
      <ScrollReveal>
        <p className="eyebrow">КОНТРОЛЬ ВЕРСІЙ / ЛЮБОВ</p>
        <h2>НАШІ СТОСУНКИ — <em>GIT LOG.</em></h2>
        <div className="git-log">
          {content.commits.map(([date, message], i) => (
            <div className="commit" key={i}>
              <time dateTime={date}>{date}</time>
              <span>commit: <b>{message}</b></span>
            </div>
          ))}
          <div className="git-stats">
            {story.spanDays !== null && (
              <span>{formatNumber(story.spanDays)} {pluralUk(story.spanDays, ['коміт', 'коміти', 'комітів'])}</span>
            )}
            <span>0 критичних змін</span>
            <span>∞ планів попереду</span>
          </div>
          <p>наступний реліз <b>v{next}.0 — РІВЕНЬ {pad2(next)}</b></p>
        </div>
      </ScrollReveal>
    </section>
  )
}

function Letter({ content, story }: StorySectionProps) {
  const [opened, setOpened] = useState(false)
  return (
    <section className="letter-section" id="letter">
      <ScrollReveal>
        <p className="eyebrow">ТЕ, ЩО Я НАСПРАВДІ ХОЧУ СКАЗАТИ</p>
        <h2>І ЩЕ ОДНЕ <em>ВАЖЛИВЕ...</em></h2>

        <div className={`envelope-container ${opened ? 'is-open' : 'is-closed'}`}>
          <div className="envelope-box">
            <div className="env-back" />
            <div className="env-letter-sheet" aria-hidden={!opened}>
              <div className="parchment">
                <div className="parchment-header">
                  <span className="parchment-tag">ОСОБИСТИЙ ЛИСТ</span>
                  <span className="parchment-seal">✦</span>
                  <span className="parchment-date">{story.end ? formatLongDate(story.end).toUpperCase() : ''}</span>
                </div>
                <div className="parchment-body">
                  <p>{content.letter}</p>
                </div>
                <div className="parchment-footer">
                  <span>— З любов’ю назавжди</span>
                </div>
              </div>
            </div>
            <div className="env-pocket" />
            <div className="env-flap" />
            {!opened && (
              <button aria-label="Відкрити лист" className="env-seal-button" onClick={() => setOpened(true)}>
                <span className="seal-wax">
                  <span className="seal-icon">💌</span>
                  <span className="seal-caption">ВІДКРИТИ ЛИСТ</span>
                </span>
              </button>
            )}
          </div>

          {opened && (
            <div className="letter-opened-controls">
              <button type="button" className="secondary fold-letter-btn" onClick={() => setOpened(false)}>
                ЗГОРНУТИ ЛИСТ ↑
              </button>
            </div>
          )}
        </div>
      </ScrollReveal>
    </section>
  )
}

function Final({ content, story }: StorySectionProps) {
  const [answered, setAnswered] = useState(false)
  const { texts } = content
  const days = story.spanDays
  return (
    <section className="final">
      <p className="eyebrow">КІНЕЦЬ — ЦЕ ПОЧАТОК</p>
      <p className="level">РІВЕНЬ {pad2(story.level)} ЗАВЕРШЕНО</p>
      {days !== null && (
        <h2>{formatNumber(days)} / <em>{formatNumber(days)}</em> {pluralUk(days, ['ДЕНЬ', 'ДНІ', 'ДНІВ'])}</h2>
      )}
      {!answered ? (
        <>
          <p>{texts.finalQuestion.trim() || `Готові до рівня ${pad2(story.level + 1)}?`}</p>
          <div>
            <button className="primary" onClick={() => setAnswered(true)}>ТАК ♡</button>
            <button className="secondary" onClick={() => setAnswered(true)}>АВЖЕЖ</button>
          </div>
        </>
      ) : (
        <div className="good-choice" aria-live="polite">
          <p>Правильний вибір.</p>
          <h3>{texts.finalReply.trim() || 'Побачимось на наступному рівні.'}</h3>
        </div>
      )}
      {(story.namesLabel || story.start) && (
        <footer>
          {story.namesLabel}
          {story.namesLabel && story.start && <br />}
          {story.start && <span>{formatShortDate(story.start)} — ∞</span>}
        </footer>
      )}
    </section>
  )
}
