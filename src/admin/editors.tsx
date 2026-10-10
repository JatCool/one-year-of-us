/** One editor component per CMS section. */
import { BLOCK_KEYS, type Achievement, type BlockKey, type Commit, type Couple, type Memory, type Milestone, type Place, type SiteContent, type Texts } from '../content/model'
import { todayIso } from '../lib/dates'
import { pad2 } from '../lib/format'
import { BlockToggleBar, ImageField, ListEditor, Switch, valueOf, type BlockProps, type EditorProps, type ImageHandlers } from './ui'

/** Titles shown in the admin for each toggleable block. */
export const BLOCK_LABELS: Record<BlockKey, { title: string; desc: string }> = {
  milestones: { title: 'Наша дорога', desc: 'Хронологія важливих моментів із фото' },
  places: { title: 'Місця, які зберегли', desc: 'Картки міст і країн із фотографіями' },
  months: { title: 'Спогади', desc: 'Горизонтальна стрічка фотокарток (наприклад, по місяцях)' },
  achievements: { title: 'Досягнення', desc: 'Картки спільних перемог' },
  reasons: { title: 'Причини', desc: 'Інтерактивний генератор причин' },
  terminal: { title: 'Термінал', desc: 'Жартівлива «діагностика стосунків» (без окремих налаштувань)' },
  commits: { title: 'Git log', desc: 'Жартівлива історія комітів' },
  letter: { title: 'Лист', desc: 'Фінальний конверт з особистим листом' }
}

type ListKey = 'milestones' | 'places' | 'months' | 'achievements' | 'reasons' | 'commits'
/** Builds an `edit` function for one list of the document. */
const listEditor = <K extends ListKey>({ update }: EditorProps, key: K) =>
  (producer: (items: SiteContent[K]) => SiteContent[K]) => update(c => ({ ...c, [key]: producer(c[key]) }))

export function Settings({ content, update, toggle }: EditorProps & { toggle: (key: BlockKey) => void }) {
  const setCouple = (key: keyof Couple, value: string) => update(c => ({ ...c, couple: { ...c.couple, [key]: value } }))
  const setText = (key: keyof Texts, value: string) => update(c => ({ ...c, texts: { ...c.texts, [key]: value } }))
  const { couple, texts } = content

  return (
    <>
      <h2>Налаштування</h2>
      <p>Почніть звідси: імена й дати використовуються в заголовках, лічильнику, фінальному блоці та футері сайту.</p>
      <div className="field-grid">
        <label>Перше ім’я<input value={couple.partnerOne} onChange={e => setCouple('partnerOne', valueOf(e))} /></label>
        <label>Друге ім’я<input value={couple.partnerTwo} onChange={e => setCouple('partnerTwo', valueOf(e))} /></label>
        <label>
          Дата початку історії
          <input type="date" value={couple.startDate} onChange={e => setCouple('startDate', valueOf(e))} />
          <small className="field-hint">Від неї рахується лічильник днів, годин і хвилин.</small>
        </label>
        <label>
          Дата річниці
          <input type="date" value={couple.anniversaryDate} onChange={e => setCouple('anniversaryDate', valueOf(e))} />
          <small className="field-hint">Необов’язково. Якщо порожньо — рахуємо до сьогодні.</small>
        </label>
      </div>

      <div className="visibility-section">
        <h3>Тексти головного екрана та фіналу</h3>
        <p>Порожні поля замінюються нейтральними стандартними текстами.</p>
        <div className="field-grid">
          <label>Заголовок<input value={texts.heroTitle} placeholder="НАША" onChange={e => setText('heroTitle', valueOf(e))} /></label>
          <label>Акцент заголовка (курсив)<input value={texts.heroAccent} placeholder="ІСТОРІЯ." onChange={e => setText('heroAccent', valueOf(e))} /></label>
          <label className="span-all">Підзаголовок<textarea rows={2} value={texts.heroSubtitle} placeholder="Кілька слів під заголовком" onChange={e => setText('heroSubtitle', valueOf(e))} /></label>
          <label>Питання у фіналі<input value={texts.finalQuestion} placeholder="Готові до наступного рівня?" onChange={e => setText('finalQuestion', valueOf(e))} /></label>
          <label>Відповідь після натискання<input value={texts.finalReply} placeholder="Побачимось на наступному рівні." onChange={e => setText('finalReply', valueOf(e))} /></label>
        </div>
      </div>

      <div className="visibility-section">
        <h3>Видимість блоків на сайті</h3>
        <p>Блоки без вмісту ховаються автоматично. Тут можна вимкнути й заповнені блоки. Перемикачі зберігаються одразу.</p>
        <div className="visibility-grid">
          {BLOCK_KEYS.map(key => {
            const enabled = content.visibleBlocks[key]
            return (
              <div key={key} className={`visibility-row ${enabled ? 'row-enabled' : 'row-disabled'}`}>
                <div className="visibility-row-info">
                  <h4>{BLOCK_LABELS[key].title}</h4>
                  <p>{BLOCK_LABELS[key].desc}</p>
                </div>
                <Switch checked={enabled} onChange={() => toggle(key)} label={enabled ? 'УВІМК' : 'ВИМК'} ariaLabel={BLOCK_LABELS[key].title} />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

type ImageEditorProps = EditorProps & BlockProps & { images: ImageHandlers }

export function Milestones(props: ImageEditorProps) {
  const { content, enabled, toggle, images } = props
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label={BLOCK_LABELS.milestones.title} />
      <ListEditor<Milestone>
        title="Наша дорога"
        description="Головні розділи вашої історії. Кожен розділ може мати фото."
        items={content.milestones}
        edit={listEditor(props, 'milestones')}
        create={() => ({ icon: '✦', title: '', date: '', text: '', image: '' })}
        itemLabel={(item, i) => `Розділ ${pad2(i + 1)}${item.title ? ` — ${item.title}` : ''}`}
        empty="Розділів ще немає. Натисніть «+ ДОДАТИ», щоб створити перший."
        renderItem={(item, index, change) => (
          <div className="card-grid">
            <ImageField url={item.image} slot={{ list: 'milestones', index }} handlers={images} />
            <div className="field-grid">
              <label>Значок<input value={item.icon} placeholder="✦" onChange={e => { const icon = valueOf(e); change(m => ({ ...m, icon })) }} /></label>
              <label>Дата (довільний текст)<input value={item.date} placeholder="ОСІНЬ 2025" onChange={e => { const date = valueOf(e); change(m => ({ ...m, date })) }} /></label>
              <label className="span-all">Назва<input value={item.title} placeholder="ПОЧАТОК" onChange={e => { const title = valueOf(e); change(m => ({ ...m, title })) }} /></label>
              <label className="span-all">Опис<textarea rows={3} value={item.text} onChange={e => { const text = valueOf(e); change(m => ({ ...m, text })) }} /></label>
            </div>
          </div>
        )}
      />
    </>
  )
}

export function Places(props: ImageEditorProps) {
  const { content, enabled, toggle, images } = props
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label={BLOCK_LABELS.places.title} />
      <ListEditor<Place>
        title="Місця, які зберегли"
        description="Міста й країни, які щось для вас означають. Кожне місце має власне фото."
        items={content.places}
        edit={listEditor(props, 'places')}
        create={() => ({ place: '', date: '', note: '', image: '' })}
        itemLabel={(item, i) => `Місце ${i + 1}${item.place ? ` — ${item.place}` : ''}`}
        empty="Місць ще немає."
        renderItem={(item, index, change) => (
          <div className="card-grid">
            <ImageField url={item.image} slot={{ list: 'places', index }} handlers={images} />
            <div className="field-grid">
              <label>Назва місця<input value={item.place} onChange={e => { const place = valueOf(e); change(p => ({ ...p, place })) }} /></label>
              <label>Дата / підпис<input value={item.date} onChange={e => { const date = valueOf(e); change(p => ({ ...p, date })) }} /></label>
              <label className="span-all">Спогад<textarea rows={3} value={item.note} onChange={e => { const note = valueOf(e); change(p => ({ ...p, note })) }} /></label>
            </div>
          </div>
        )}
      />
    </>
  )
}

export function Memories(props: ImageEditorProps) {
  const { content, enabled, toggle, images } = props
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label={BLOCK_LABELS.months.title} />
      <ListEditor<Memory>
        title="Спогади"
        description="Горизонтальна стрічка фотокарток — наприклад, один спогад на кожен місяць."
        items={content.months}
        edit={listEditor(props, 'months')}
        create={() => ({ month: '', caption: '', image: '' })}
        itemLabel={(item, i) => `Спогад ${i + 1}${item.month ? ` — ${item.month}` : ''}`}
        empty="Спогадів ще немає."
        renderItem={(item, index, change) => (
          <div className="card-grid">
            <ImageField url={item.image} slot={{ list: 'months', index }} handlers={images} />
            <div className="field-grid">
              <label>Назва / місяць<input value={item.month} placeholder="ВЕРЕСЕНЬ 2025" onChange={e => { const month = valueOf(e); change(m => ({ ...m, month })) }} /></label>
              <label className="span-all">Підпис<textarea rows={3} value={item.caption} onChange={e => { const caption = valueOf(e); change(m => ({ ...m, caption })) }} /></label>
            </div>
          </div>
        )}
      />
    </>
  )
}

export function Achievements(props: EditorProps & BlockProps) {
  const { content, enabled, toggle } = props
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label={BLOCK_LABELS.achievements.title} />
      <ListEditor<Achievement>
        title="Досягнення"
        description="Ваші маленькі й великі перемоги разом. Номер можна залишити порожнім — він підставиться автоматично."
        items={content.achievements}
        edit={listEditor(props, 'achievements')}
        create={items => [pad2(items.length + 1), '', '']}
        itemLabel={(_, i) => `Досягнення ${i + 1}`}
        empty="Досягнень ще немає."
        renderItem={([number, title, text], _, change) => (
          <div className="field-grid">
            <label>Номер<input value={number} onChange={e => { const v = valueOf(e); change(a => [v, a[1], a[2]]) }} /></label>
            <label>Назва<input value={title} onChange={e => { const v = valueOf(e); change(a => [a[0], v, a[2]]) }} /></label>
            <label className="span-all">Опис<textarea rows={2} value={text} onChange={e => { const v = valueOf(e); change(a => [a[0], a[1], v]) }} /></label>
          </div>
        )}
      />
    </>
  )
}

export function Reasons(props: EditorProps & BlockProps) {
  const { content, enabled, toggle } = props
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label={BLOCK_LABELS.reasons.title} />
      <ListEditor<string>
        title="Причини"
        description="Кожна причина відкриватиметься випадково, без повторів підряд. Порожні причини не показуються."
        items={content.reasons}
        edit={listEditor(props, 'reasons')}
        create={() => ''}
        itemLabel={(_, i) => `Причина ${i + 1}`}
        empty="Причин ще немає."
        renderItem={(reason, _, change) => (
          <label>Текст причини<textarea rows={3} value={reason} onChange={e => { const v = valueOf(e); change(() => v) }} /></label>
        )}
      />
    </>
  )
}

export function Commits(props: EditorProps & BlockProps) {
  const { content, enabled, toggle } = props
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label={BLOCK_LABELS.commits.title} />
      <ListEditor<Commit>
        title="Git log"
        description="Важливі дати у вигляді комітів. Назви комітів можна писати англійською — це частина жарту."
        items={content.commits}
        edit={listEditor(props, 'commits')}
        create={() => [todayIso(), '']}
        itemLabel={(_, i) => `Коміт ${i + 1}`}
        empty="Комітів ще немає."
        renderItem={([date, message], _, change) => (
          <div className="field-grid">
            <label>Дата<input type="date" value={date} onChange={e => { const v = valueOf(e); change(c => [v, c[1]]) }} /></label>
            <label>Назва коміту<input value={message} placeholder="first_date" onChange={e => { const v = valueOf(e); change(c => [c[0], v]) }} /></label>
          </div>
        )}
      />
    </>
  )
}

export function Letter({ content, update, enabled, toggle }: EditorProps & BlockProps) {
  return (
    <>
      <BlockToggleBar enabled={enabled} toggle={toggle} label={BLOCK_LABELS.letter.title} />
      <h2>Лист</h2>
      <p>Абзаци та переноси рядків збережуться на сайті. Порожній лист не показується.</p>
      <label>Текст листа<textarea rows={14} value={content.letter} onChange={e => { const letter = valueOf(e); update(c => ({ ...c, letter })) }} /></label>
      {content.letter.trim() && (
        <>
          <p className="preview-label">ПОПЕРЕДНІЙ ПЕРЕГЛЯД</p>
          <article className="letter-preview"><p>{content.letter}</p></article>
        </>
      )}
    </>
  )
}
