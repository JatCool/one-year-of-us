import { useEffect, useMemo, useState } from 'react'
import { emptyContent, isContentEmpty, type SiteContent } from '../content/model'
import { formatNumber, pad2, pluralUk } from '../lib/format'
import { fetchContent, supabase } from '../lib/supabase'
import { Notice } from './components'
import { Site } from './Site'
import { deriveStory, type Story } from './story'

type LoadState =
  | { status: 'unconfigured' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; content: SiteContent | null }

/**
 * Loads the site document from Supabase and refreshes it when the tab regains
 * focus, so edits made in `/admin` show up without a manual reload.
 */
function useSiteContent(): LoadState {
  const [state, setState] = useState<LoadState>(supabase ? { status: 'loading' } : { status: 'unconfigured' })

  useEffect(() => {
    const client = supabase
    if (!client) return
    let active = true
    const load = () => {
      fetchContent(client)
        .then(content => { if (active) setState({ status: 'ready', content }) })
        // A failed background refresh keeps whatever is already on screen.
        .catch(() => { if (active) setState(prev => (prev.status === 'ready' ? prev : { status: 'error' })) })
    }
    load()
    window.addEventListener('focus', load)
    return () => {
      active = false
      window.removeEventListener('focus', load)
    }
  }, [])

  return state
}

const adminHref = `${import.meta.env.BASE_URL}admin`
const EMPTY = emptyContent()

/** Public page: setup/empty/error notices, then the boot screen, then the story. */
export default function App() {
  const state = useSiteContent()
  const [started, setStarted] = useState(false)
  const content = state.status === 'ready' ? state.content : null
  const story = useMemo(() => deriveStory(content ?? EMPTY), [content])

  useEffect(() => {
    const title = content?.texts.heroTitle.trim() || story.names.join(' × ')
    if (title) document.title = title
  }, [content, story])

  if (state.status === 'unconfigured') {
    return (
      <Notice eyebrow="ПОТРІБНЕ НАЛАШТУВАННЯ" title={<>CMS ЩЕ НЕ <em>ПІДКЛЮЧЕНО.</em></>}>
        <p>
          Задайте змінні <code>VITE_SUPABASE_URL</code> та <code>VITE_SUPABASE_ANON_KEY</code> (локально — у файлі <code>.env</code>,
          для GitHub Pages — у secrets репозиторію) і перезберіть сайт. Покрокова інструкція — у README.
        </p>
      </Notice>
    )
  }
  if (state.status === 'error') {
    return (
      <Notice eyebrow="ПОМИЛКА" title={<>ЩОСЬ ПІШЛО <em>НЕ ТАК.</em></>}>
        <p>Не вдалося завантажити вміст сайту. Перевірте з’єднання та оновіть сторінку.</p>
      </Notice>
    )
  }
  if (state.status === 'ready' && (!content || isContentEmpty(content))) {
    return (
      <Notice eyebrow="ПОРОЖНІЙ САЙТ" title={<>ТУТ ПОКИ <em>ПОРОЖНЬО.</em></>}>
        <p>Увійдіть у редактор, щоб додати імена, дати, фото й тексти. Сайт заповниться автоматично.</p>
        <a className="primary" href={adminHref}>ВІДКРИТИ РЕДАКТОР <b>→</b></a>
      </Notice>
    )
  }

  if (!started || !content) {
    return (
      <Boot
        story={story}
        canStart={!!content}
        onStart={() => {
          setStarted(true)
          requestAnimationFrame(() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' }))
        }}
      />
    )
  }
  return <Site content={content} story={story} />
}

/** Intro "terminal boot" screen. The start button appears once content has loaded. */
function Boot({ story, canStart, onStart }: { story: Story; canStart: boolean; onStart: () => void }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1750)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <main className="boot">
      <div className="boot-inner">
        <p className="eyebrow">{[story.namesLabel, pad2(story.level)].filter(Boolean).join(' / ')}</p>
        <div className="boot-lines">
          <span>ініціалізація стосунків...</span>
          <span>завантаження спогадів...</span>
          {story.spanDays !== null && (
            <span>індексація {formatNumber(story.spanDays)} {pluralUk(story.spanDays, ['дня', 'днів', 'днів'])}...</span>
          )}
          <span>перевірка сумісності...</span>
          <span>збирання моментів...</span>
          <span className="progress">████████████████████ <i>100%</i></span>
        </div>
        {ready && canStart && (
          <div className="ready">
            <p>✓ СИСТЕМА ГОТОВА</p>
            <button className="primary" onClick={onStart}>ПОЧАТИ НАШУ ІСТОРІЮ <b>↓</b></button>
          </div>
        )}
      </div>
    </main>
  )
}
