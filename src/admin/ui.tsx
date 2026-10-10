/** Building blocks shared by the admin section editors. */
import type { ChangeEvent, ReactNode } from 'react'
import type { ImageListKey, SiteContent } from '../content/model'

/** Applies a change to the latest content. Producers must be pure. */
export type Update = (producer: (prev: SiteContent) => SiteContent) => void
export type EditorProps = { content: SiteContent; update: Update }
export type BlockProps = { enabled: boolean; toggle: () => void }
export type ImageSlot = { list: ImageListKey; index: number }
export type ImageHandlers = {
  uploadImage: (slot: ImageSlot, file: File) => void
  removeImage: (slot: ImageSlot) => void
  busy: boolean
}

export const updateAt = <T,>(items: T[], index: number, change: (item: T) => T): T[] =>
  items.map((item, i) => (i === index ? change(item) : item))
export const removeAt = <T,>(items: T[], index: number): T[] => items.filter((_, i) => i !== index)
export function reorder<T>(items: T[], index: number, step: number): T[] {
  const target = index + step
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target] as T, next[index] as T]
  return next
}

/** Reads `event.target.value` eagerly so producers never touch the event later. */
export const valueOf = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => event.target.value

/** "Shown on the site / hidden" switch displayed at the top of each section editor. */
export function BlockToggleBar({ enabled, toggle, label }: BlockProps & { label: string }) {
  return (
    <div className={`section-toggle-bar ${enabled ? 'is-enabled' : 'is-disabled'}`}>
      <div className="section-toggle-info">
        <span className="toggle-status-pill">{enabled ? '● Відображається на сайті' : '○ Приховано на сайті'}</span>
        <p className="toggle-status-hint">
          {enabled
            ? `Блок «${label}» увімкнений і показується відвідувачам, якщо в ньому є вміст.`
            : `Блок «${label}» вимкнений і НЕ показується на сайті.`}
        </p>
      </div>
      <Switch checked={enabled} onChange={toggle} label={enabled ? 'УВІМКНЕНО' : 'ВИМКНЕНО'} />
    </div>
  )
}

export function Switch({ checked, onChange, label, ariaLabel }: { checked: boolean; onChange: () => void; label: string; ariaLabel?: string }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={ariaLabel} />
      <span className="slider" />
      <span className="toggle-label-text">{label}</span>
    </label>
  )
}

function Controls({ index, size, move, remove }: { index: number; size: number; move: (step: number) => void; remove: () => void }) {
  return (
    <div className="card-controls">
      <button type="button" disabled={index === 0} onClick={() => move(-1)} aria-label="Перемістити вище">↑</button>
      <button type="button" disabled={index === size - 1} onClick={() => move(1)} aria-label="Перемістити нижче">↓</button>
      <button
        type="button"
        className="danger"
        onClick={() => { if (window.confirm('Видалити цей елемент?')) remove() }}
      >
        Видалити
      </button>
    </div>
  )
}

/**
 * Generic editor for an ordered list: heading with an "add" button, and one
 * card per item with move up/down and delete controls.
 *
 * `edit` receives a producer over the latest list, so concurrent updates
 * (e.g. a photo upload finishing while typing) never overwrite each other.
 */
export function ListEditor<T>({
  title,
  description,
  items,
  edit,
  create,
  itemLabel,
  empty,
  renderItem
}: {
  title: string
  description: string
  items: T[]
  edit: (producer: (items: T[]) => T[]) => void
  create: (items: T[]) => T
  itemLabel: (item: T, index: number) => string
  empty: string
  renderItem: (item: T, index: number, change: (fn: (item: T) => T) => void) => ReactNode
}) {
  return (
    <>
      <div className="collection-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button type="button" className="secondary" onClick={() => edit(list => [...list, create(list)])}>+ ДОДАТИ</button>
      </div>
      {items.length === 0 && <p className="empty-hint">{empty}</p>}
      {items.map((item, index) => (
        <article className="edit-card" key={index}>
          <div className="card-heading">
            <b>{itemLabel(item, index)}</b>
            <Controls
              index={index}
              size={items.length}
              move={step => edit(list => reorder(list, index, step))}
              remove={() => edit(list => removeAt(list, index))}
            />
          </div>
          {renderItem(item, index, fn => edit(list => updateAt(list, index, fn)))}
        </article>
      ))}
    </>
  )
}

/** Photo preview with upload / remove buttons. Changes are saved immediately. */
export function ImageField({ url, slot, handlers }: { url: string; slot: ImageSlot; handlers: ImageHandlers }) {
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow picking the same file again
    if (file) handlers.uploadImage(slot, file)
  }
  return (
    <div className="image-picker-wrap">
      <label className={`image-picker ${handlers.busy ? 'is-busy' : ''}`}>
        <span className="image-preview">{url ? <img src={url} alt="Попередній перегляд" /> : <b>Немає фото</b>}</span>
        <span className="upload-action">{url ? 'ЗМІНИТИ ФОТО' : 'ДОДАТИ ФОТО'}</span>
        <input type="file" accept="image/*" onChange={onFile} disabled={handlers.busy} />
      </label>
      {url && (
        <button type="button" className="remove-photo-btn" disabled={handlers.busy} onClick={() => handlers.removeImage(slot)}>
          ВИДАЛИТИ ФОТО
        </button>
      )}
    </div>
  )
}
