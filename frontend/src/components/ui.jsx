import { Icon } from './Icon'

export function Status({ children, tone = 'teal' }) {
  return <span className={`status status-${tone}`}>{children}</span>
}

export function PageTitle({ eyebrow, title, copy, action }) {
  return (
    <div className="page-title">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        {copy && <p>{copy}</p>}
      </div>
      {action}
    </div>
  )
}

export function Notice({ kind = 'error', children, className = '' }) {
  if (!children) return null
  const tone =
    kind === 'error'
      ? 'bg-[#f8e9e5] text-[#a34a40]'
      : kind === 'warn'
        ? 'border border-[#e3cba0] bg-[#fff8ea] text-[#77591e]'
        : 'bg-[#e7f2ee] text-[#216b61]'
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg px-4 py-3 text-xs leading-5 ${tone} ${className}`}>
      {children}
    </p>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="grid min-h-[40vh] place-items-center text-xs font-bold tracking-[.12em] text-[#7b898d]" aria-live="polite">
      <span className="flex items-center gap-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d7a84a] border-t-transparent" />
        {label.toUpperCase()}
      </span>
    </div>
  )
}

export function Empty({ title, text, action }) {
  return (
    <div className="rounded-xl border border-dashed border-[#c8d2ce] bg-[#fafbf9] p-8 text-center">
      <b className="font-serif text-xl text-[#082632]">{title}</b>
      <p className="mt-2 text-xs text-[#78878b]">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Modal({ title, eyebrow, onClose, children, wide = false }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="matter-modal" style={wide ? { width: 'min(760px, 100%)' } : undefined} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

export const field = 'mt-2 h-11 w-full rounded-lg border border-[#cdd6d2] bg-white px-3 text-sm font-normal outline-none focus:border-[#1f6e6a]'
export const area = 'mt-2 w-full rounded-lg border border-[#cdd6d2] bg-white p-3 text-sm font-normal leading-6 outline-none focus:border-[#1f6e6a]'
export const labelCls = 'block text-[14px] font-bold text-[#0b2635]'
