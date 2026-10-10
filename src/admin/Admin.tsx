import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { emptyContent, type BlockKey, type SiteContent } from '../content/model'
import { errorMessage } from '../lib/format'
import { deleteMediaByUrl, fetchContent, isEditor, saveContent, supabase, uploadMedia } from '../lib/supabase'
import { Achievements, BLOCK_LABELS, Commits, Letter, Memories, Milestones, Places, Reasons, Settings } from './editors'
import { MusicEditor } from './MusicEditor'
import type { ImageHandlers, ImageSlot, Update } from './ui'

const TABS = [
  ['settings', '⚙️', 'Налаштування'],
  ['milestones', '💍', 'Наша дорога'],
  ['places', '🗺️', 'Місця'],
  ['months', '📸', 'Спогади'],
  ['achievements', '🏆', 'Досягнення'],
  ['reasons', '💖', 'Причини'],
  ['commits', '💻', 'Git log'],
  ['letter', '💌', 'Лист'],
  ['music', '🎵', 'Музика']
] as const
type TabId = (typeof TABS)[number][0]

const siteHref = import.meta.env.BASE_URL

/** Private editor at `/admin`. */
export default function Admin() {
  if (!supabase) {
    return (
      <main className="admin-login">
        <p className="eyebrow">ПОТРІБНЕ НАЛАШТУВАННЯ</p>
        <h1>CMS ЩЕ НЕ <em>ПІДКЛЮЧЕНА.</em></h1>
        <p>
          Задайте <code>VITE_SUPABASE_URL</code> і <code>VITE_SUPABASE_ANON_KEY</code> у файлі <code>.env</code> (локально) або в
          secrets репозиторію (GitHub Pages) і перезберіть сайт. Деталі — у README.
        </p>
      </main>
    )
  }
  return <AdminAuth client={supabase} />
}

function AdminAuth({ client }: { client: SupabaseClient }) {
  // `undefined` while the stored session is being restored.
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => {
    client.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = client.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [client])

  if (user === undefined) return <main className="admin-login"><p className="eyebrow">ЗАВАНТАЖЕННЯ…</p></main>
  if (!user) return <Login client={client} />
  return <Workspace key={user.id} client={client} user={user} />
}

function Login({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    const { error: signInError } = await client.auth.signInWithPassword({ email, password })
    setBusy(false)
    setError(signInError ? 'Не вдалося увійти. Перевірте пошту та пароль.' : '')
  }

  return (
    <main className="admin-login">
      <p className="eyebrow">ПРИВАТНИЙ РЕДАКТОР</p>
      <h1>ВХІД ДО <em>РЕДАКТОРА.</em></h1>
      <form onSubmit={submit}>
        <label>Електронна пошта<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Пароль<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <button className="primary" disabled={busy}>{busy ? 'ВХОДИМО…' : 'УВІЙТИ'}</button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </main>
  )
}

type Phase = { kind: 'loading' } | { kind: 'forbidden' } | { kind: 'error'; message: string } | { kind: 'ready' }

/**
 * Signed-in editor. Holds the working copy of the document.
 *
 * Text edits only change local state until "Save" is pressed. Uploads,
 * photo/audio removal and block-visibility switches are written to the
 * database immediately (together with any other pending edits), so the
 * stored document never points at files that do not exist.
 */
function Workspace({ client, user }: { client: SupabaseClient; user: User }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [content, setContent] = useState<SiteContent>(emptyContent)
  // Always the latest content, also inside async callbacks that outlive a render.
  const contentRef = useRef(content)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [tab, setTab] = useState<TabId>('settings')

  const load = useCallback(async () => {
    setPhase({ kind: 'loading' })
    try {
      if (!(await isEditor(client, user.id))) return setPhase({ kind: 'forbidden' })
      const stored = (await fetchContent(client)) ?? emptyContent()
      contentRef.current = stored
      setContent(stored)
      setDirty(false)
      setPhase({ kind: 'ready' })
    } catch (error) {
      setPhase({ kind: 'error', message: errorMessage(error) })
    }
  }, [client, user.id])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const commit = (producer: (prev: SiteContent) => SiteContent) => {
    const next = producer(contentRef.current)
    contentRef.current = next
    setContent(next)
    return next
  }

  const update: Update = producer => {
    commit(producer)
    setDirty(true)
    setStatus('')
  }

  /** Writes `snapshot` to the database. Resolves to `true` on success. */
  const persist = async (snapshot: SiteContent, success: string) => {
    setBusy(true)
    setStatus('Зберігаємо…')
    try {
      await saveContent(client, snapshot)
      // Edits made while the request was in flight are still unsaved.
      setDirty(contentRef.current !== snapshot)
      setStatus(success)
      return true
    } catch (error) {
      setDirty(true)
      setStatus(`Помилка збереження: ${errorMessage(error)}`)
      return false
    } finally {
      setBusy(false)
    }
  }

  /** Uploads a file, stores its URL via `apply`, saves, then deletes the file it replaced. */
  const replaceMedia = async (file: File | null, kind: 'image' | 'audio', previous: string, apply: (prev: SiteContent, url: string) => SiteContent, success: string) => {
    setBusy(true)
    try {
      let url = ''
      if (file) {
        setStatus(kind === 'image' ? 'Завантажуємо фото…' : 'Завантажуємо аудіо…')
        url = await uploadMedia(client, file, kind)
      }
      const next = commit(prev => apply(prev, url))
      if ((await persist(next, success)) && previous && previous !== url) await deleteMediaByUrl(client, previous)
    } catch (error) {
      setStatus(`Помилка: ${errorMessage(error)}`)
    } finally {
      setBusy(false)
    }
  }

  const images: ImageHandlers = {
    busy,
    uploadImage: (slot, file) => void replaceMedia(file, 'image', imageAt(contentRef.current, slot), (c, url) => withImage(c, slot, url), 'Фото збережено ✓'),
    removeImage: slot => void replaceMedia(null, 'image', imageAt(contentRef.current, slot), (c, url) => withImage(c, slot, url), 'Фото видалено ✓')
  }

  const uploadAudio = (file: File) =>
    void replaceMedia(file, 'audio', contentRef.current.music.url, (c, url) => ({
      ...c,
      music: { ...c.music, url, title: c.music.title || file.name.replace(/\.[^/.]+$/, '') }
    }), 'Аудіо завантажено та збережено ✓')

  const removeAudio = () =>
    void replaceMedia(null, 'audio', contentRef.current.music.url, (c, url) => ({ ...c, music: { ...c.music, url } }), 'Аудіо видалено ✓')

  const toggleBlock = (key: BlockKey) => {
    const next = commit(c => ({ ...c, visibleBlocks: { ...c.visibleBlocks, [key]: !c.visibleBlocks[key] } }))
    void persist(next, next.visibleBlocks[key] ? `Блок «${BLOCK_LABELS[key].title}» увімкнено ✓` : `Блок «${BLOCK_LABELS[key].title}» приховано ✓`)
  }

  const signOut = () => {
    if (dirty && !window.confirm('Є незбережені зміни. Вийти без збереження?')) return
    void client.auth.signOut()
  }

  const header = (
    <header className="admin-head">
      <div>
        <p className="eyebrow">{[content.couple.partnerOne, content.couple.partnerTwo].filter(Boolean).join(' × ').toUpperCase() || 'ПРИВАТНИЙ РЕДАКТОР'}</p>
        <h1>РЕДАКТОР <em>ІСТОРІЇ.</em></h1>
      </div>
      <div className="admin-head-actions">
        <a className="secondary" href={siteHref} target="_blank" rel="noreferrer">САЙТ ↗</a>
        <button type="button" className="secondary" onClick={signOut}>ВИЙТИ</button>
      </div>
    </header>
  )

  if (phase.kind !== 'ready') {
    return (
      <main className="admin-shell">
        {header}
        <section className="editor">
          {phase.kind === 'loading' && <p>Завантажуємо вміст…</p>}
          {phase.kind === 'forbidden' && (
            <>
              <h2>Немає прав редактора</h2>
              <p>
                Акаунт <b>{user.email}</b> увійшов, але не доданий до списку редакторів. Виконайте в Supabase SQL Editor:
              </p>
              <pre className="code-block">insert into public.site_editors (user_id) values ('{user.id}');</pre>
              <button type="button" className="primary" onClick={() => void load()}>ПЕРЕВІРИТИ ЗНОВУ</button>
            </>
          )}
          {phase.kind === 'error' && (
            <>
              <h2>Не вдалося завантажити дані</h2>
              <p className="form-error">{phase.message}</p>
              <p>Переконайтеся, що файл <code>supabase/schema.sql</code> виконано у вашому проєкті Supabase.</p>
              <button type="button" className="primary" onClick={() => void load()}>СПРОБУВАТИ ЗНОВУ</button>
            </>
          )}
        </section>
      </main>
    )
  }

  const v = content.visibleBlocks
  const editorProps = { content, update }

  return (
    <main className="admin-shell">
      {header}
      <nav className="admin-nav">
        {TABS.map(([id, icon, label]) => (
          <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
            <i aria-hidden="true">{icon}</i>
            <span>{label}</span>
            {id in v && !v[id as BlockKey] && <em className="off-badge">вимкнено</em>}
          </button>
        ))}
      </nav>
      <section className="editor">
        {tab === 'settings' && <Settings {...editorProps} toggle={toggleBlock} />}
        {tab === 'milestones' && <Milestones {...editorProps} images={images} enabled={v.milestones} toggle={() => toggleBlock('milestones')} />}
        {tab === 'places' && <Places {...editorProps} images={images} enabled={v.places} toggle={() => toggleBlock('places')} />}
        {tab === 'months' && <Memories {...editorProps} images={images} enabled={v.months} toggle={() => toggleBlock('months')} />}
        {tab === 'achievements' && <Achievements {...editorProps} enabled={v.achievements} toggle={() => toggleBlock('achievements')} />}
        {tab === 'reasons' && <Reasons {...editorProps} enabled={v.reasons} toggle={() => toggleBlock('reasons')} />}
        {tab === 'commits' && <Commits {...editorProps} enabled={v.commits} toggle={() => toggleBlock('commits')} />}
        {tab === 'letter' && <Letter {...editorProps} enabled={v.letter} toggle={() => toggleBlock('letter')} />}
        {tab === 'music' && <MusicEditor {...editorProps} uploadAudio={uploadAudio} removeAudio={removeAudio} busy={busy} />}

        <div className="savebar">
          <span role="status">{status || (dirty ? 'Є незбережені зміни' : 'Усі зміни збережено')}</span>
          <button type="button" className="primary" onClick={() => void persist(contentRef.current, 'Збережено ✓')} disabled={busy || !dirty}>
            ЗБЕРЕГТИ ЗМІНИ
          </button>
        </div>
      </section>
    </main>
  )
}

const imageAt = (content: SiteContent, { list, index }: ImageSlot): string => content[list][index]?.image ?? ''

function withImage(content: SiteContent, { list, index }: ImageSlot, url: string): SiteContent {
  const patch = <T extends { image: string }>(items: T[]) => items.map((item, i) => (i === index ? { ...item, image: url } : item))
  switch (list) {
    case 'milestones': return { ...content, milestones: patch(content.milestones) }
    case 'places': return { ...content, places: patch(content.places) }
    case 'months': return { ...content, months: patch(content.months) }
  }
}
