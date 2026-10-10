import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatNumber, pluralUk } from '../lib/format'

/** Shows an uploaded photo at its natural aspect ratio; renders nothing when missing or broken. */
export function Photo({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  if (!src || failed) return null
  return (
    <div className={`${className} responsive-photo`}>
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
    </div>
  )
}

/** Fades its children in when they scroll into view. */
export function ScrollReveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const show = () => node.classList.add('shown')
    if (typeof IntersectionObserver === 'undefined') return show()
    const watcher = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        show()
        watcher.disconnect()
      }
    }, { threshold: 0.02, rootMargin: '0px 0px -20px 0px' })
    watcher.observe(node)
    // Safety net: never leave a block invisible if the observer does not fire.
    const timer = window.setTimeout(show, 750)
    return () => {
      watcher.disconnect()
      window.clearTimeout(timer)
    }
  }, [])
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>
}

function elapsedSince(startMs: number) {
  const elapsed = Math.max(0, Date.now() - startMs)
  return { days: Math.floor(elapsed / 86_400_000), hours: Math.floor(elapsed / 3_600_000), minutes: Math.floor(elapsed / 60_000) }
}

const COUNTER_UNITS = [
  ['days', ['день', 'дні', 'днів']],
  ['hours', ['година', 'години', 'годин']],
  ['minutes', ['хвилина', 'хвилини', 'хвилин']]
] as const

/** Live "days / hours / minutes together" counter, updated every minute. */
export function Counter({ start }: { start: Date }) {
  const startMs = start.getTime()
  const [values, setValues] = useState(() => elapsedSince(startMs))
  useEffect(() => {
    setValues(elapsedSince(startMs))
    const id = window.setInterval(() => setValues(elapsedSince(startMs)), 60_000)
    return () => window.clearInterval(id)
  }, [startMs])
  return (
    <div className="counter">
      {COUNTER_UNITS.map(([unit, forms]) => (
        <div key={unit}>
          <strong>{formatNumber(values[unit])}</strong>
          <span>{pluralUk(values[unit], [...forms])}</span>
        </div>
      ))}
    </div>
  )
}

/** Full-screen message used for the "not configured", "empty" and error states. */
export function Notice({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children: ReactNode }) {
  return (
    <main className="notice">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </main>
  )
}
