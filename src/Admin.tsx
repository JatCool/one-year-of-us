import { ChangeEvent, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from './lib/supabase'
import * as defaults from './data/anniversary'

type Milestone = typeof defaults.milestones[number]
type Place = typeof defaults.places[number]
type Memory = typeof defaults.months[number]
type Content = { couple: typeof defaults.couple; milestones: Milestone[]; places: Place[]; months: Memory[]; achievements: string[][]; reasons: string[]; commits: string[][]; letter: string; visibleBlocks?: Record<string, boolean>; music?: defaults.MusicConfig }
const initial: Content = { couple: defaults.couple, milestones: defaults.milestones, places: defaults.places, months: defaults.months, achievements: defaults.achievements, reasons: defaults.reasons, commits: defaults.commits, letter: defaults.letter, visibleBlocks: defaults.defaultVisibleBlocks, music: defaults.defaultMusic }
const sections = [['milestones','💍','Наша дорога'],['places','🗺️','Місця, які зберегли'],['months','📸','12 місяців (Спогади)'],['settings','⚙️','Налаштування'],['achievements','🏆','Досягнення'],['reasons','💖','Причини'],['commits','💻','Git log'],['letter','💌','Лист'],['music','🎵','Музика']] as const
const copy = <T,>(item: T): T => JSON.parse(JSON.stringify(item))

export default function Admin() {
  const [session, setSession] = useState(false), [tab, setTab] = useState<(typeof sections)[number][0]>('milestones'), [content, setContent] = useState<Content>(copy(initial)), [status, setStatus] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('')
  useEffect(() => { if (!supabase) return; supabase.auth.getSession().then(({ data }) => setSession(!!data.session)); const { data: listener } = supabase.auth.onAuthStateChange((_, next) => setSession(!!next)); return () => listener.subscription.unsubscribe() }, [])
  useEffect(() => { if (!supabase || !session) return; supabase.from('site_content').select('content').eq('id', 'main').maybeSingle().then(({ data }) => { if (data?.content) setContent(data.content as Content) }) }, [session])
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (status === 'Є незбережені зміни') { event.preventDefault(); event.returnValue = '' } }; addEventListener('beforeunload', warn); return () => removeEventListener('beforeunload', warn) }, [status])
  const change = (next: Content) => { setContent(next); setStatus('Є незбережені зміни') }
  const save = async () => { if (!supabase) return; setStatus('Зберігаємо…'); const { error } = await supabase.from('site_content').upsert({ id: 'main', content, updated_at: new Date().toISOString() }); setStatus(error ? `Помилка: ${error.message}` : 'Збережено ✓') }
  const toggleBlock = async (key: defaults.BlockKey) => {
    const current = { ...defaults.defaultVisibleBlocks, ...(content.visibleBlocks || {}) }
    const nextBlocks = { ...current, [key]: !current[key] }
    const next = { ...content, visibleBlocks: nextBlocks }
    setContent(next)
    if (supabase) {
      setStatus('Зберігаємо…')
      const { error } = await supabase.from('site_content').upsert({ id: 'main', content: next, updated_at: new Date().toISOString() })
      setStatus(error ? `Помилка: ${error.message}` : (nextBlocks[key] ? 'Блок увімкнено ✓' : 'Блок вимкнено (приховано на сайті) ✓'))
    }
  }
  const upload = async (event: ChangeEvent<HTMLInputElement>, assign: (url: string) => Content) => {
    const file = event.target.files?.[0]
    if (!file || !supabase) return

    setStatus('Завантажуємо фото…')
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const { error: uploadError } = await supabase.storage.from('anniversary-media').upload(path, file)
    if (uploadError) return setStatus(`Помилка: ${uploadError.message}`)

    const next = assign(supabase.storage.from('anniversary-media').getPublicUrl(path).data.publicUrl)
    setStatus('Зберігаємо фото…')
    const { error: saveError } = await supabase.from('site_content').upsert({ id: 'main', content: next, updated_at: new Date().toISOString() })
    setStatus(saveError ? `Помилка збереження фото: ${saveError.message}` : 'Фото збережено ✓')
  }
  const removeImage = async (assign: (url: string) => Content) => {
    if (!supabase) return
    setStatus('Видаляємо фото…')
    const next = assign('')
    const { error: saveError } = await supabase.from('site_content').upsert({ id: 'main', content: next, updated_at: new Date().toISOString() })
    setStatus(saveError ? `Помилка: ${saveError.message}` : 'Фото видалено ✓')
  }
  const uploadAudio = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !supabase) return
    setStatus('Завантажуємо аудіо…')
    const ext = file.name.split('.').pop() || 'mp3'
    const path = `audio-${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('anniversary-media').upload(path, file, {
      contentType: file.type || 'audio/mpeg'
    })
    if (uploadError) return setStatus(`Помилка: ${uploadError.message}`)

    const publicUrl = supabase.storage.from('anniversary-media').getPublicUrl(path).data.publicUrl
    const currentMusic = content.music || defaults.defaultMusic
    const nextMusic = {
      ...currentMusic,
      url: publicUrl,
      title: currentMusic.title || file.name.replace(/\.[^/.]+$/, "")
    }
    const next = { ...content, music: nextMusic }
    setContent(next)
    setStatus('Зберігаємо аудіо…')
    const { error: saveError } = await supabase.from('site_content').upsert({ id: 'main', content: next, updated_at: new Date().toISOString() })
    setStatus(saveError ? `Помилка: ${saveError.message}` : 'Аудіо завантажено та збережено ✓')
  }
  const removeAudio = async () => {
    if (!supabase) return
    setStatus('Видаляємо аудіо…')
    const currentMusic = content.music || defaults.defaultMusic
    const nextMusic = { ...currentMusic, url: '' }
    const next = { ...content, music: nextMusic }
    setContent(next)
    const { error: saveError } = await supabase.from('site_content').upsert({ id: 'main', content: next, updated_at: new Date().toISOString() })
    setStatus(saveError ? `Помилка: ${saveError.message}` : 'Аудіо видалено ✓')
  }
  const imagePicker = (current: string, assign: (url: string) => Content) => (
    <div className="image-picker-wrap">
      <label className="image-picker">
        <span className="image-preview">{current ? <img src={current} alt="Попередній перегляд"/> : <b>Немає фото</b>}</span>
        <span className="upload-action">ЗМІНИТИ ФОТО</span>
        <input type="file" accept="image/*" onChange={event => upload(event, assign)}/>
      </label>
      {current ? <button type="button" className="remove-photo-btn" onClick={() => removeImage(assign)}>ВИДАЛИТИ ФОТО</button> : null}
    </div>
  )
  const visible = { ...defaults.defaultVisibleBlocks, ...(content.visibleBlocks || {}) }
  if (!supabase) return <main className="admin-login"><h1>CMS ще не підключена</h1><p>Додайте Supabase secrets у GitHub та перезапустіть deployment.</p></main>
  if (!session) return <main className="admin-login"><p className="eyebrow">ПРИВАТНИЙ РЕДАКТОР</p><h1>ВХІД ДО <em>ІСТОРІЇ.</em></h1><form onSubmit={async event => { event.preventDefault(); const { error } = await supabase!.auth.signInWithPassword({ email, password }); setStatus(error ? 'Не вдалося увійти. Перевірте пошту та пароль.' : '') }}><label>Електронна пошта<input type="email" value={email} onChange={e => setEmail(e.target.value)} required/></label><label>Пароль<input type="password" value={password} onChange={e => setPassword(e.target.value)} required/></label><button className="primary">УВІЙТИ</button>{status && <p className="form-error">{status}</p>}</form></main>
  return <main className="admin-shell"><header className="admin-head"><div><p className="eyebrow">АНДРІЙ × АНАСТАСІЯ</p><h1>РЕДАКТОР <em>ІСТОРІЇ.</em></h1></div><button className="secondary" onClick={() => supabase!.auth.signOut()}>ВИЙТИ</button></header><nav className="admin-nav">{sections.map(([id, icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><i>{icon}</i><span>{label}</span>{id in visible && visible[id as defaults.BlockKey] === false && <em className="off-badge">вимкнено</em>}</button>)}</nav><section className="editor">{tab === 'milestones' && <Milestones content={content} change={change} imagePicker={imagePicker} enabled={visible.milestones !== false} toggle={() => toggleBlock('milestones')}/>} {tab === 'places' && <Places content={content} change={change} imagePicker={imagePicker} enabled={visible.places !== false} toggle={() => toggleBlock('places')}/>} {tab === 'months' && <Memories content={content} change={change} imagePicker={imagePicker} enabled={visible.months !== false} toggle={() => toggleBlock('months')}/>} {tab === 'settings' && <Settings content={content} change={change} visible={visible} toggle={toggleBlock}/>} {tab === 'letter' && <Letter content={content} change={change} enabled={visible.letter !== false} toggle={() => toggleBlock('letter')}/>} {tab === 'achievements' && <Achievements content={content} change={change} enabled={visible.achievements !== false} toggle={() => toggleBlock('achievements')}/>} {tab === 'reasons' && <Reasons content={content} change={change} enabled={visible.reasons !== false} toggle={() => toggleBlock('reasons')}/>} {tab === 'commits' && <Commits content={content} change={change} enabled={visible.commits !== false} toggle={() => toggleBlock('commits')}/>} {tab === 'music' && <MusicEditor content={content} change={change} uploadAudio={uploadAudio} removeAudio={removeAudio} />}<div className="savebar"><span>{status || 'Зміни зберігаються тільки після натискання кнопки'}</span><button className="primary" onClick={save}>ЗБЕРЕГТИ ЗМІНИ</button></div></section></main>
}

type Props = { content: Content; change: (next: Content) => void }
type SectionProps = Props & { enabled: boolean; toggle: () => void }

const Controls = ({ index, size, move, remove }: { index: number; size: number; move: (step: number) => void; remove: () => void }) => (
  <div className="card-controls">
    <button disabled={index === 0} onClick={() => move(-1)} aria-label="Перемістити вище">↑</button>
    <button disabled={index === size - 1} onClick={() => move(1)} aria-label="Перемістити нижче">↓</button>
    <button className="danger" onClick={remove}>Видалити</button>
  </div>
)

const updateAt = <T,>(items: T[], index: number, next: T) => items.map((item, current) => current === index ? next : item)
const reorder = <T,>(items: T[], index: number, step: number) => {
  const target = index + step
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function BlockToggleBar({ enabled, toggle, label }: { enabled: boolean; toggle: () => void; label?: string }) {
  return (
    <div className={`section-toggle-bar ${enabled ? 'is-enabled' : 'is-disabled'}`}>
      <div className="section-toggle-info">
        <span className="toggle-status-pill">{enabled ? '● Відображається на сайті' : '○ Приховано на сайті'}</span>
        <p className="toggle-status-hint">
          {enabled
            ? `Цей блок (${label || 'секція'}) увімкнений та показується відвідувачам.`
            : `Цей блок (${label || 'секція'}) вимкнений та НЕ показується на сайті.`}
        </p>
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={enabled} onChange={toggle} />
        <span className="slider" />
        <span className="toggle-label-text">{enabled ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}</span>
      </label>
    </div>
  )
}

const BLOCK_LABELS: Record<defaults.BlockKey, { title: string; desc: string }> = {
  milestones: { title: 'Наша дорога (Розділи 01—05)', desc: 'Основна хронологія важливих моментів' },
  places: { title: 'Місця, які зберегли', desc: 'Картки міст і країн із фотографіями' },
  months: { title: '12 місяців / 12 спогадів', desc: 'Стрічка спогадів із фотографіями кожного місяця' },
  achievements: { title: 'Досягнення', desc: 'Картки спільних перемог та рівнів' },
  reasons: { title: 'Причини', desc: 'Інтерактивний генератор причин' },
  terminal: { title: 'Термінал', desc: 'Ретро-термінал на головній сторінці' },
  commits: { title: 'Git log', desc: 'Жартівлива історія комітів' },
  letter: { title: 'Лист', desc: 'Фінальний конверт з особистим листом' },
}

function Settings({ content, change, visible, toggle }: Props & { visible: Record<defaults.BlockKey, boolean>; toggle: (key: defaults.BlockKey) => void }) {
  const set = (key: keyof Content['couple'], value: string) => change({ ...content, couple: { ...content.couple, [key]: value } })
  const blockKeys = Object.keys(BLOCK_LABELS) as defaults.BlockKey[]

  return (
    <>
      <h2>Налаштування</h2>
      <p>Основні дані для вашої історії.</p>
      <div className="field-grid">
        <label>Ім’я дружини<input value={content.couple.wife} onChange={e => set('wife', e.target.value)}/></label>
        <label>Ім’я чоловіка<input value={content.couple.husband} onChange={e => set('husband', e.target.value)}/></label>
        <label>Дата весілля<input type="date" value={content.couple.date} onChange={e => set('date', e.target.value)}/></label>
        <label>Дата річниці<input type="date" value={content.couple.anniversary} onChange={e => set('anniversary', e.target.value)}/></label>
      </div>

      <div className="visibility-section">
        <h3>Видимість блоків на сайті</h3>
        <p>Вимкніть непотрібні або ще не заповнені блоки, щоб вони не показувалися на сайті.</p>
        <div className="visibility-grid">
          {blockKeys.map(key => {
            const isBlockEnabled = visible[key] !== false
            const info = BLOCK_LABELS[key]
            return (
              <div key={key} className={`visibility-row ${isBlockEnabled ? 'row-enabled' : 'row-disabled'}`}>
                <div className="visibility-row-info">
                  <h4>{info.title}</h4>
                  <p>{info.desc}</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={isBlockEnabled} onChange={() => toggle(key)} />
                  <span className="slider" />
                  <span className="toggle-label-text">{isBlockEnabled ? 'УВІМК' : 'ВИМК'}</span>
                </label>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function Letter({ content, change, enabled, toggle }: SectionProps) {
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label="Лист" />
      <h2>Лист</h2>
      <p>Абзаци та переноси рядків залишаться такими самими на сайті.</p>
      <label>Текст листа<textarea rows={14} value={content.letter} onChange={e => change({ ...content, letter: e.target.value })}/></label>
      <p className="preview-label">ПОПЕРЕДНІЙ ПЕРЕГЛЯД</p>
      <article className="letter-preview"><p>{content.letter}</p></article>
    </>
  )
}

function Milestones({ content, change, imagePicker, enabled, toggle }: SectionProps & { imagePicker: (current: string, assign: (url: string) => Content) => ReactNode }) {
  const set = (index: number, item: Milestone) => {
    const next = { ...content, milestones: updateAt(content.milestones, index, item) }
    change(next)
    return next
  }
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label="Наша дорога" />
      <CollectionHeader
        title="Наша дорога"
        description="Верхня секція «НАША ДОРОГА» (Розділи 01—05 на сайті). Фото показується у відповідному розділі."
        add={() => change({ ...content, milestones: [...content.milestones, { icon: '✦', title: 'Нова подія', date: '', text: '', image: '' }] })}
      >
        {content.milestones.map((item, index) => (
          <article className="edit-card" key={index}>
            <div className="card-heading">
              <b>Розділ 0{index + 1} ({item.title || 'Нова подія'})</b>
              <Controls index={index} size={content.milestones.length} move={step => change({ ...content, milestones: reorder(content.milestones, index, step) })} remove={() => change({ ...content, milestones: content.milestones.filter((_, i) => i !== index) })} />
            </div>
            <div className="card-grid">
              {imagePicker(item.image, image => set(index, { ...item, image }))}
              <div className="field-grid">
                <label>Значок<input value={item.icon} onChange={e => set(index, { ...item, icon: e.target.value })} /></label>
                <label>Дата<input value={item.date} onChange={e => set(index, { ...item, date: e.target.value })} /></label>
                <label className="span-all">Назва<input value={item.title} onChange={e => set(index, { ...item, title: e.target.value })} /></label>
                <label className="span-all">Опис<textarea rows={3} value={item.text} onChange={e => set(index, { ...item, text: e.target.value })} /></label>
              </div>
            </div>
          </article>
        ))}
      </CollectionHeader>
    </>
  )
}

function Places({ content, change, imagePicker, enabled, toggle }: SectionProps & { imagePicker: (current: string, assign: (url: string) => Content) => ReactNode }) {
  const set = (i: number, item: Place) => {
    const next = { ...content, places: updateAt(content.places, i, item) }
    change(next)
    return next
  }
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label="Місця, які зберегли" />
      <CollectionHeader
        title="Місця, які зберегли"
        description="Секція «МІСЦЯ, ЯКІ ЗБЕРЕГЛИ» на сайті. Кожне місце має власне фото (Україна, Греція тощо)."
        add={() => change({ ...content, places: [...content.places, { place: 'Нове місце', date: '', note: '', image: '' }] })}
      >
        {content.places.map((item, i) => (
          <article className="edit-card" key={i}>
            <div className="card-heading">
              <b>Місце {i + 1} ({item.place || 'Без назви'})</b>
              <Controls index={i} size={content.places.length} move={s => change({ ...content, places: reorder(content.places, i, s) })} remove={() => change({ ...content, places: content.places.filter((_, x) => x !== i) })} />
            </div>
            <div className="card-grid">
              {imagePicker(item.image, image => set(i, { ...item, image }))}
              <div className="field-grid">
                <label>Назва місця<input value={item.place} onChange={e => set(i, { ...item, place: e.target.value })} /></label>
                <label>Дата / період<input value={item.date} onChange={e => set(i, { ...item, date: e.target.value })} /></label>
                <label className="span-all">Спогад<textarea rows={3} value={item.note} onChange={e => set(i, { ...item, note: e.target.value })} /></label>
              </div>
            </div>
          </article>
        ))}
      </CollectionHeader>
    </>
  )
}

function Memories({ content, change, imagePicker, enabled, toggle }: SectionProps & { imagePicker: (current: string, assign: (url: string) => Content) => ReactNode }) {
  const set = (i: number, item: Memory) => {
    const next = { ...content, months: updateAt(content.months, i, item) }
    change(next)
    return next
  }
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label="12 місяців (Спогади)" />
      <CollectionHeader
        title="12 місяців (Спогади)"
        description="Секція «12 МІСЯЦІВ / 12 СПОГАДІВ» на сайті (горизонтальна стрічка фотокарток)."
        add={() => change({ ...content, months: [...content.months, { month: 'НОВИЙ СПОГАД', caption: '', image: '' }] })}
      >
        {content.months.map((item, i) => (
          <article className="edit-card" key={i}>
            <div className="card-heading">
              <b>Спогад {i + 1} ({item.month || 'Місяць'})</b>
              <Controls index={i} size={content.months.length} move={s => change({ ...content, months: reorder(content.months, i, s) })} remove={() => change({ ...content, months: content.months.filter((_, x) => x !== i) })} />
            </div>
            <div className="card-grid">
              {imagePicker(item.image, image => set(i, { ...item, image }))}
              <div className="field-grid">
                <label>Назва / місяць<input value={item.month} onChange={e => set(i, { ...item, month: e.target.value })} /></label>
                <label className="span-all">Підпис<textarea rows={3} value={item.caption} onChange={e => set(i, { ...item, caption: e.target.value })} /></label>
              </div>
            </div>
          </article>
        ))}
      </CollectionHeader>
    </>
  )
}

function Achievements({ content, change, enabled, toggle }: SectionProps) {
  const set = (i: number, next: string[]) => change({ ...content, achievements: updateAt(content.achievements, i, next) })
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label="Досягнення" />
      <CollectionHeader
        title="Досягнення"
        description="Ваші маленькі й великі перемоги разом."
        add={() => change({ ...content, achievements: [...content.achievements, ['06', 'НОВЕ ДОСЯГНЕННЯ', 'Опис']] })}
      >
        {content.achievements.map((item, i) => (
          <article className="edit-card compact" key={i}>
            <div className="card-heading">
              <b>Досягнення {i + 1}</b>
              <Controls index={i} size={content.achievements.length} move={s => change({ ...content, achievements: reorder(content.achievements, i, s) })} remove={() => change({ ...content, achievements: content.achievements.filter((_, x) => x !== i) })} />
            </div>
            <div className="field-grid">
              <label>Номер<input value={item[0]} onChange={e => set(i, [e.target.value, item[1], item[2]])} /></label>
              <label>Назва<input value={item[1]} onChange={e => set(i, [item[0], e.target.value, item[2]])} /></label>
              <label className="span-all">Опис<textarea rows={2} value={item[2]} onChange={e => set(i, [item[0], item[1], e.target.value])} /></label>
            </div>
          </article>
        ))}
      </CollectionHeader>
    </>
  )
}

function Reasons({ content, change, enabled, toggle }: SectionProps) {
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label="Причини" />
      <CollectionHeader
        title="Причини"
        description="Кожна причина відкриватиметься випадково й без повторів."
        add={() => change({ ...content, reasons: [...content.reasons, 'Нова причина'] })}
      >
        {content.reasons.map((reason, i) => (
          <article className="edit-card compact" key={i}>
            <div className="card-heading">
              <b>Причина {i + 1}</b>
              <Controls index={i} size={content.reasons.length} move={s => change({ ...content, reasons: reorder(content.reasons, i, s) })} remove={() => change({ ...content, reasons: content.reasons.filter((_, x) => x !== i) })} />
            </div>
            <label>Текст причини<textarea rows={3} value={reason} onChange={e => change({ ...content, reasons: updateAt(content.reasons, i, e.target.value) })} /></label>
          </article>
        ))}
      </CollectionHeader>
    </>
  )
}

function Commits({ content, change, enabled, toggle }: SectionProps) {
  const set = (i: number, next: string[]) => change({ ...content, commits: updateAt(content.commits, i, next) })
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label="Git log" />
      <CollectionHeader
        title="Git log"
        description="Кодові назви комітів можна залишити англійськими — це частина жарту."
        add={() => change({ ...content, commits: [...content.commits, ['2026-01-01', 'new_memory']] })}
      >
        {content.commits.map((item, i) => (
          <article className="edit-card compact" key={i}>
            <div className="card-heading">
              <b>Коміт {i + 1}</b>
              <Controls index={i} size={content.commits.length} move={s => change({ ...content, commits: reorder(content.commits, i, s) })} remove={() => change({ ...content, commits: content.commits.filter((_, x) => x !== i) })} />
            </div>
            <div className="field-grid">
              <label>Дата<input type="date" value={item[0]} onChange={e => set(i, [e.target.value, item[1]])} /></label>
              <label>Назва коміту<input value={item[1]} onChange={e => set(i, [item[0], e.target.value])} /></label>
            </div>
          </article>
        ))}
      </CollectionHeader>
    </>
  )
}

function CollectionHeader({ title, description, add, children }: { title: string; description: string; add: () => void; children: ReactNode }) {
  return (
    <>
      <div className="collection-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button className="secondary" onClick={add}>+ ДОДАТИ</button>
      </div>
      {children}
    </>
  )
}

function MusicEditor({
  content,
  change,
  uploadAudio,
  removeAudio
}: Props & {
  uploadAudio: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  removeAudio: () => Promise<void>
}) {
  const music = content.music || defaults.defaultMusic
  const isEnabled = music.enabled !== false
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggleMusic = () => {
    change({
      ...content,
      music: { ...music, enabled: !isEnabled }
    })
  }

  const setMusicField = <K extends keyof defaults.MusicConfig>(key: K, val: defaults.MusicConfig[K]) => {
    change({
      ...content,
      music: { ...music, [key]: val }
    })
  }

  const startMin = Math.floor((music.startSeconds || 0) / 60)
  const startSec = (music.startSeconds || 0) % 60
  const endMin = Math.floor((music.endSeconds || 0) / 60)
  const endSec = (music.endSeconds || 0) % 60

  const handleStartMin = (min: number) => {
    const total = Math.max(0, min * 60 + startSec)
    setMusicField('startSeconds', total)
  }
  const handleStartSec = (sec: number) => {
    const total = Math.max(0, startMin * 60 + Math.min(59, Math.max(0, sec)))
    setMusicField('startSeconds', total)
  }
  const handleEndMin = (min: number) => {
    const total = Math.max(0, min * 60 + endSec)
    setMusicField('endSeconds', total)
  }
  const handleEndSec = (sec: number) => {
    const total = Math.max(0, endMin * 60 + Math.min(59, Math.max(0, sec)))
    setMusicField('endSeconds', total)
  }

  const formatMinSec = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
    const s = Math.floor(totalSeconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const togglePlayTest = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.currentTime = music.startSeconds || 0
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (music.endSeconds && music.endSeconds > music.startSeconds && audio.currentTime >= music.endSeconds) {
        if (music.loop) {
          audio.currentTime = music.startSeconds || 0
          audio.play()
        } else {
          audio.pause()
          audio.currentTime = music.startSeconds || 0
          setIsPlaying(false)
        }
      }
    }
    const onEnded = () => {
      if (music.loop) {
        audio.currentTime = music.startSeconds || 0
        audio.play()
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
  }, [music.startSeconds, music.endSeconds, music.loop])

  return (
    <>
      <BlockToggleBar enabled={isEnabled} toggle={toggleMusic} label="Музика" />
      <div className="collection-heading">
        <div>
          <h2>Фонова музика</h2>
          <p>Додайте романтичну музику для сайту. Можна вказати з якої хвилини починати, на якій завершувати та зациклювати трек.</p>
        </div>
      </div>

      <div className="music-editor-grid">
        <article className="edit-card">
          <div className="card-heading">
            <b>1. Аудіофайл або посилання</b>
          </div>
          <div className="field-grid">
            <label className="span-all">
              Назва треку / пісні
              <input
                value={music.title || ''}
                placeholder="Наприклад: Ed Sheeran — Perfect"
                onChange={e => setMusicField('title', e.target.value)}
              />
            </label>

            <div className="span-all audio-upload-box">
              <label className="audio-upload-btn">
                <span>📁 ЗАВАНТАЖИТИ АУДІОФАЙЛ (MP3 / WAV / M4A)</span>
                <input type="file" accept="audio/*" onChange={uploadAudio} />
              </label>
              <div className="upload-divider"><span>АБО ВКАЖІТЬ ПРЯМЕ ПОСИЛАННЯ (URL)</span></div>
              <label>
                Пряме посилання на аудіо
                <input
                  type="url"
                  placeholder="https://.../music.mp3"
                  value={music.url || ''}
                  onChange={e => setMusicField('url', e.target.value)}
                />
              </label>
            </div>

            {music.url && (
              <div className="span-all audio-loaded-row">
                <span className="audio-url-label">Файл підключено: <b>{music.url.split('/').pop()}</b></span>
                <button type="button" className="danger" onClick={removeAudio}>ВИДАЛИТИ АУДІО</button>
              </div>
            )}
          </div>
        </article>

        {music.url && (
          <article className="edit-card">
            <div className="card-heading">
              <b>2. Інтервал відтворення та зациклення</b>
            </div>

            <div className="music-timing-grid">
              <div className="timing-box">
                <span className="timing-title">Початок треку</span>
                <p className="timing-hint">З якої хвилини та секунди починати:</p>
                <div className="time-inputs-row">
                  <label>
                    <span className="sub-label">Хвилини:</span>
                    <input
                      type="number"
                      min={0}
                      value={startMin}
                      onChange={e => handleStartMin(parseInt(e.target.value) || 0)}
                    />
                  </label>
                  <span className="colon">:</span>
                  <label>
                    <span className="sub-label">Секунди:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={startSec}
                      onChange={e => handleStartSec(parseInt(e.target.value) || 0)}
                    />
                  </label>
                </div>
                <div className="time-preview-badge">
                  Початок: <b>{formatMinSec(music.startSeconds || 0)}</b> ({music.startSeconds || 0} сек)
                </div>
                {isPlaying && (
                  <button
                    type="button"
                    className="secondary small-action-btn"
                    onClick={() => {
                      const cur = Math.floor(currentTime)
                      setMusicField('startSeconds', cur)
                    }}
                  >
                    Встановити поточний час ({formatMinSec(currentTime)}) як початок
                  </button>
                )}
              </div>

              <div className="timing-box">
                <span className="timing-title">Кінець треку</span>
                <p className="timing-hint">На якій хвилині зупиняти / зациклювати (00:00 = до кінця треку):</p>
                <div className="time-inputs-row">
                  <label>
                    <span className="sub-label">Хвилини:</span>
                    <input
                      type="number"
                      min={0}
                      value={endMin}
                      onChange={e => handleEndMin(parseInt(e.target.value) || 0)}
                    />
                  </label>
                  <span className="colon">:</span>
                  <label>
                    <span className="sub-label">Секунди:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={endSec}
                      onChange={e => handleEndSec(parseInt(e.target.value) || 0)}
                    />
                  </label>
                </div>
                <div className="time-preview-badge">
                  {music.endSeconds && music.endSeconds > 0
                    ? <>Кінець: <b>{formatMinSec(music.endSeconds)}</b> ({music.endSeconds} сек)</>
                    : <>Кінець: <b>До самого кінця треку</b></>}
                </div>
                {isPlaying && (
                  <button
                    type="button"
                    className="secondary small-action-btn"
                    onClick={() => {
                      const cur = Math.ceil(currentTime)
                      setMusicField('endSeconds', cur)
                    }}
                  >
                    Встановити поточний час ({formatMinSec(currentTime)}) як кінець
                  </button>
                )}
              </div>
            </div>

            <div className="loop-toggle-row">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={music.loop}
                  onChange={() => setMusicField('loop', !music.loop)}
                />
                <span className="slider" />
                <span className="toggle-label-text">{music.loop ? 'ЗАЦИКЛЕНО 🔁' : 'БЕЗ ПОВТОРУ'}</span>
              </label>
              <div className="loop-desc">
                <b>Зациклювати музику (повторювати по колу)</b>
                <p>Коли музика дійде до кінця або вказаної хвилини, вона почне грати знову з обраного початку.</p>
              </div>
            </div>

            <div className="music-player-preview">
              <span className="preview-label">ПРОСЛУХАТИ НАЛАШТОВАНИЙ ФРАГМЕНТ:</span>
              <audio ref={audioRef} src={music.url} preload="metadata" />
              <div className="player-controls-row">
                <button type="button" className="primary" onClick={togglePlayTest}>
                  {isPlaying ? '⏸ ЗУПИНИТИ' : '▶ ПРОСЛУХАТИ ФРАГМЕНТ'}
                </button>
                <div className="player-status-info">
                  <span>Поточний час: <b>{formatMinSec(currentTime)}</b></span>
                  <span>Діапазон: <b>{formatMinSec(music.startSeconds || 0)} — {music.endSeconds > 0 ? formatMinSec(music.endSeconds) : 'кінець'}</b></span>
                  <span>Повтор: <b>{music.loop ? 'Увімкнено 🔁' : 'Вимкнено'}</b></span>
                </div>
              </div>
            </div>
          </article>
        )}
      </div>
    </>
  )
}

