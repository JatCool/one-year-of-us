import { ChangeEvent, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './lib/supabase'
import * as defaults from './data/anniversary'

type Milestone = typeof defaults.milestones[number]
type Place = typeof defaults.places[number]
type Memory = typeof defaults.months[number]
type Content = { couple: typeof defaults.couple; milestones: Milestone[]; places: Place[]; months: Memory[]; achievements: string[][]; reasons: string[]; commits: string[][]; letter: string; visibleBlocks?: Record<string, boolean> }
const initial: Content = { couple: defaults.couple, milestones: defaults.milestones, places: defaults.places, months: defaults.months, achievements: defaults.achievements, reasons: defaults.reasons, commits: defaults.commits, letter: defaults.letter, visibleBlocks: defaults.defaultVisibleBlocks }
const sections = [['milestones','💍','Наша дорога'],['places','🗺️','Місця, які зберегли'],['months','📸','12 місяців (Спогади)'],['settings','⚙️','Налаштування'],['achievements','🏆','Досягнення'],['reasons','❤️','Причини'],['commits','💻','Git log'],['letter','💌','Лист']] as const
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
    change(next)
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
  return <main className="admin-shell"><header className="admin-head"><div><p className="eyebrow">АНДРІЙ × АНАСТАСІЯ</p><h1>РЕДАКТОР <em>ІСТОРІЇ.</em></h1></div><button className="secondary" onClick={() => supabase!.auth.signOut()}>ВИЙТИ</button></header><nav className="admin-nav">{sections.map(([id, icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><i>{icon}</i><span>{label}</span>{id in visible && visible[id as defaults.BlockKey] === false && <em className="off-badge">вимкнено</em>}</button>)}</nav><section className="editor">{tab === 'milestones' && <Milestones content={content} change={change} imagePicker={imagePicker} enabled={visible.milestones !== false} toggle={() => toggleBlock('milestones')}/>} {tab === 'places' && <Places content={content} change={change} imagePicker={imagePicker} enabled={visible.places !== false} toggle={() => toggleBlock('places')}/>} {tab === 'months' && <Memories content={content} change={change} imagePicker={imagePicker} enabled={visible.months !== false} toggle={() => toggleBlock('months')}/>} {tab === 'settings' && <Settings content={content} change={change} visible={visible} toggle={toggleBlock}/>} {tab === 'letter' && <Letter content={content} change={change} enabled={visible.letter !== false} toggle={() => toggleBlock('letter')}/>} {tab === 'achievements' && <Achievements content={content} change={change} enabled={visible.achievements !== false} toggle={() => toggleBlock('achievements')}/>} {tab === 'reasons' && <Reasons content={content} change={change} enabled={visible.reasons !== false} toggle={() => toggleBlock('reasons')}/>} {tab === 'commits' && <Commits content={content} change={change} enabled={visible.commits !== false} toggle={() => toggleBlock('commits')}/>}<div className="savebar"><span>{status || 'Зміни зберігаються тільки після натискання кнопки'}</span><button className="primary" onClick={save}>ЗБЕРЕГТИ ЗМІНИ</button></div></section></main>
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
