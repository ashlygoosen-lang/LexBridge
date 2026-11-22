import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { PortalLayout } from '../../components/PortalLayout'
import { Empty, Loading, Notice, Status, area, field, labelCls } from '../../components/ui'
import { api, submitRedirect } from '../../lib/api'
import { useApi, useAuth } from '../../lib/auth'
import { date, dateTime, dayNum, monthShort, rand, time, toCents, weekday } from '../../lib/format'

const TABS = ['Overview', 'Messages', 'Documents', 'Fees & invoices', 'Timeline', 'Mandate']
const FORMAT = { video: 'Secure video call', phone: 'Phone call', 'in-person': 'In person' }

function Avatar({ lawyer, size = 44 }) {
  return lawyer?.photoUrl ? (
    <img src={lawyer.photoUrl} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <span className="avatar-initials">{lawyer?.name?.[0]}</span>
  )
}

function icsFor(ev, title) {
  const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = new Date(new Date(ev.eventDate).getTime() + 3600_000).toISOString()
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LexBridge//EN',
    'BEGIN:VEVENT',
    `UID:${ev.eventDate}-${Math.random().toString(36).slice(2)}@lexbridge`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(ev.eventDate)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${ev.title} — ${title}`.replace(/[,;]/g, ' '),
    `DESCRIPTION:${(ev.details || '').replace(/[,;\n]/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'lexbridge-event.ics'
  a.click()
  URL.revokeObjectURL(url)
}

export function Workspace() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'Overview'
  const setTab = (t) => setParams(t === 'Overview' ? {} : { tab: t })
  const [data, { loading, error, reload }] = useApi(`/matters/${id}/workspace`)
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState({ kind: '', text: '' })
  const chatEnd = useRef(null)

  // Keep the conversation live while the Messages tab is open.
  useEffect(() => {
    if (tab !== 'Messages') return
    const t = setInterval(reload, 8000)
    return () => clearInterval(t)
  }, [tab, reload])
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'end' })
  }, [data?.messages?.length, tab])

  if (loading && !data)
    return (
      <PortalLayout>
        <Loading />
      </PortalLayout>
    )
  if (error || !data)
    return (
      <PortalLayout>
        <Empty title="Workspace unavailable" text={error} action={<Link className="btn btn-primary" to="/matters">My matters</Link>} />
      </PortalLayout>
    )

  const isLawyer = data.role === 'lawyer'
  const m = data.matter
  const counterpart = isLawyer ? { name: data.client.name } : data.lawyer
  const flash = (kind, text) => setNotice({ kind, text })

  const send = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    const r = await api.post(`/matters/${m.id}/messages`, { body: message })
    if (!r.ok) return flash('error', r.error)
    setMessage('')
    reload()
  }
  const upload = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const r = await api.upload(`/matters/${m.id}/documents`, fd)
    if (!r.ok) return flash('error', r.error)
    e.target.reset()
    flash('success', 'Document shared securely.')
    reload()
  }

  return (
    <PortalLayout>
      <div className="workspace-title">
        <div>
          <span>
            <Status tone={m.status === 'closed' ? 'gold' : 'teal'}>{m.status === 'closed' ? 'CLOSED MATTER' : 'ACTIVE MATTER'}</Status> {m.reference}
          </span>
          <h1>{m.title}</h1>
          <p>
            {m.courtName || m.courtLevel || m.province} · {isLawyer ? `Client: ${data.client.name}` : `Lawyer: ${data.lawyer.name}`}
          </p>
        </div>
        <div>
          <small>{data.nextEvent ? `NEXT ${data.nextEvent.kind.toUpperCase()}` : 'NEXT DATE'}</small>
          <b>{data.nextEvent ? `${date(data.nextEvent.eventDate, { year: undefined })} · ${time(data.nextEvent.eventDate)}` : 'None scheduled'}</b>
          {data.nextEvent && <button onClick={() => icsFor(data.nextEvent, m.title)}>Add to calendar</button>}
        </div>
      </div>
      {!isLawyer && data.checkoutStep !== 'done' && (
        <section className="alert-card">
          <div className="alert-mark">!</div>
          <div>
            <Status tone="gold">ACTION NEEDED</Status>
            <h2>
              {data.checkoutStep === 'payment' ? 'Pay your consultation fee' : data.checkoutStep === 'schedule' ? 'Choose a consultation time' : 'Sign your mandate'}
            </h2>
            <p>Complete checkout so {data.lawyer.name} can start work.</p>
          </div>
          <button className="btn btn-gold" onClick={() => navigate(`/matters/${m.id}/checkout`)}>
            Continue <Icon name="arrow" size={17} />
          </button>
        </section>
      )}
      <div className="workspace-tabs">
        {TABS.map((item) => (
          <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
            {item}
            {item === 'Messages' && data.messages.some((x) => x.senderId !== user.id && !x.readAt) ? ' •' : ''}
          </button>
        ))}
      </div>
      <Notice kind={notice.kind || 'error'} className="mb-4">
        {notice.text}
      </Notice>

      {tab === 'Messages' && (
        <div className="messages-layout">
          <section className="chat-panel">
            <div className="chat-head">
              {isLawyer ? <span className="avatar-initials">{data.client.name[0]}</span> : <Avatar lawyer={data.lawyer} />}
              <div>
                <b>{counterpart.name}</b>
                <small>{isLawyer ? 'Client' : `Typically replies within ${Math.max(1, Math.round(data.lawyer.responseMinutes / 60))} hour`}</small>
              </div>
              <Status>{m.status === 'closed' ? 'CLOSED' : 'SECURE'}</Status>
            </div>
            <div className="chat-body">
              <div className="system-message">
                <Icon name="lock" size={14} /> Messages are private to you and {counterpart.name.split(' ')[0]} and stored securely.
              </div>
              {data.messages.length === 0 && <p className="text-center text-xs text-[#7b898d]">No messages yet — say hello.</p>}
              {data.messages.map((x) => {
                const mine = x.senderId === user.id
                const fromLawyer = x.senderId === data.lawyer.id
                return (
                  <div className={`chat-bubble ${fromLawyer ? 'lawyer-message' : 'client-message'}`} key={x.id} style={mine ? { marginLeft: 'auto' } : undefined}>
                    <p>{x.body}</p>
                    <small>
                      {date(x.createdAt, { year: undefined })} {time(x.createdAt)}
                      {mine ? ` · ${x.readAt ? 'Read' : 'Sent'}` : ` · ${x.senderName}`}
                    </small>
                  </div>
                )
              })}
              <div ref={chatEnd} />
            </div>
            <form className="chat-input" onSubmit={send}>
              <button type="button" title="Share a document" onClick={() => setTab('Documents')}>
                +
              </button>
              <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a secure message…" maxLength={4000} disabled={m.status === 'closed'} />
              <button type="submit" disabled={m.status === 'closed'}>
                Send
              </button>
            </form>
          </section>
          <aside className="case-contact">
            <span className="eyebrow">{isLawyer ? 'YOUR CLIENT' : 'YOUR LAWYER'}</span>
            {isLawyer ? <span className="avatar-initials large">{data.client.name[0]}</span> : <Avatar lawyer={data.lawyer} size={64} />}
            <h3>{counterpart.name}</h3>
            <p>{isLawyer ? 'Client' : `Verified ${data.lawyer.practitionerType.toLowerCase()}`}</p>
            {!isLawyer && <button onClick={() => navigate(`/lawyers/${data.lawyer.id}`)}>View profile</button>}
            {isLawyer && data.client.phone && (
              <p className="text-xs">
                {data.client.phone}
                <br />
                {data.client.email}
              </p>
            )}
            <div>
              <small>CONSULTATION</small>
              <p>
                {data.consultation ? (
                  <>
                    {FORMAT[data.consultation.format]}
                    <br />
                    {date(data.consultation.startsAt, { year: undefined })} · {time(data.consultation.startsAt)}
                  </>
                ) : (
                  'Not yet booked'
                )}
              </p>
            </div>
          </aside>
        </div>
      )}

      {tab === 'Documents' && (
        <section className="panel document-panel">
          <div className="panel-head">
            <div>
              <span>SECURE DOCUMENT VAULT</span>
              <h2>Case documents</h2>
            </div>
          </div>
          {m.status !== 'closed' && (
            <form onSubmit={upload} className="mb-4 grid gap-3 rounded-xl bg-[#f3f6f4] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className={labelCls}>
                DOCUMENT TITLE
                <input name="title" className={field} placeholder="e.g. Proof of address" maxLength={160} />
              </label>
              <label className={labelCls}>
                FILE (PDF, WORD, IMAGE OR TEXT · MAX 15 MB)
                <input name="file" type="file" required accept=".pdf,.txt,.doc,.docx,image/*" className="mt-2 block w-full text-xs" />
                {isLawyer && (
                  <span className="mt-2 flex items-center gap-2 font-normal">
                    <input type="checkbox" name="status" value="review" /> Ask the client to review
                  </span>
                )}
              </label>
              <button className="btn btn-primary">
                <Icon name="upload" size={16} /> Upload document
              </button>
            </form>
          )}
          {data.documents.length === 0 && <Empty title="No documents yet" text="Documents you or your lawyer share appear here." />}
          {data.documents.map((doc) => (
            <div className="document-row" key={doc.id}>
              <span className="doc-icon">{(doc.originalName.split('.').pop() || 'FILE').slice(0, 4).toUpperCase()}</span>
              <div>
                <b>{doc.title}</b>
                <small>
                  {doc.uploaderId === user.id ? 'Uploaded by you' : `Shared by ${doc.uploaderName}`} · {(doc.size / 1024 / 1024).toFixed(1)} MB ·{' '}
                  {date(doc.createdAt)}
                </small>
              </div>
              <Status tone={doc.status === 'review' ? 'gold' : 'teal'}>{doc.status === 'review' ? 'REVIEW' : 'READY'}</Status>
              <a href={`/api/documents/${doc.id}/download`} className="doc-download">
                Download
              </a>
            </div>
          ))}
        </section>
      )}

      {tab === 'Fees & invoices' && <FeesTab data={data} isLawyer={isLawyer} reload={reload} flash={flash} />}

      {tab === 'Timeline' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <span>MATTER HISTORY</span>
              <h2>Timeline</h2>
            </div>
          </div>
          <div className="space-y-0">
            {[...data.events].reverse().map((e) => (
              <article key={e.id} className="relative border-l border-[#b9cbc6] pb-6 pl-6 last:pb-0">
                <span className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-[#d7a84a] ring-4 ring-[#fff8ea]" />
                <div className="flex flex-wrap gap-3">
                  <b className="text-xs text-[#0b2635]">{e.title}</b>
                  <span className="text-[10px] font-bold text-[#a67722]">{e.kind.toUpperCase()}</span>
                  <time className="ml-auto text-[10px] text-[#829095]">{dateTime(e.eventDate)}</time>
                </div>
                {e.details && <p className="mt-2 text-xs leading-5 text-[#65767b]">{e.details}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'Mandate' && (
        <section className="panel">
          <span className="eyebrow">ENGAGEMENT AGREEMENT</span>
          {data.mandate ? (
            <>
              <h2 className="mt-2 font-serif text-3xl text-[#0b2635]">Mandate · version {data.mandate.version}</h2>
              <p className="mt-2 text-xs text-[#65767b]">
                Signed electronically by <b>{data.mandate.signedName}</b> on {dateTime(data.mandate.signedAt)}
              </p>
              <pre className="mt-5 max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl bg-[#f7f8f6] p-5 font-sans text-xs leading-6 text-[#3f5056]">
                {data.mandate.content}
              </pre>
              <p className="mt-3 break-all font-mono text-[10px] text-[#879397]">Audit fingerprint · SHA-256 {data.mandate.contentHash}</p>
            </>
          ) : (
            <Empty
              title="Mandate not yet signed"
              text={isLawyer ? 'The client signs after paying and booking the consultation.' : 'Complete checkout to review and sign your mandate.'}
              action={!isLawyer && <Link className="btn btn-primary" to={`/matters/${m.id}/checkout`}>Go to checkout</Link>}
            />
          )}
        </section>
      )}

      {tab === 'Overview' && (
        <div className="workspace-overview">
          <section className="panel">
            <div className="panel-head">
              <div>
                <span>MATTER PROGRESS</span>
                <h2>Where things stand</h2>
              </div>
              <Status tone={m.status === 'closed' ? 'gold' : 'teal'}>{m.status === 'closed' ? 'CLOSED' : 'ON TRACK'}</Status>
            </div>
            <div className="progress-track">
              {data.progress.map((p, i) => (
                <div key={p.label} className={p.done ? 'done' : p.current || (!p.done && data.progress[i - 1]?.done) ? 'current' : ''}>
                  <span>{p.done ? <Icon name="check" size={13} /> : i + 1}</span>
                  <b>{p.label}</b>
                  <small>{p.date ? date(p.date, { year: undefined }) : p.done ? 'Done' : 'Pending'}</small>
                </div>
              ))}
            </div>
            <div className="workspace-note">
              <Icon name="document" />
              <div>
                <b>Lawyer’s latest update</b>
                <p>{data.latestUpdate ? `${data.latestUpdate.title}. ${data.latestUpdate.details || ''}` : 'No updates have been posted yet.'}</p>
                {data.latestUpdate && <small>{dateTime(data.latestUpdate.eventDate)}</small>}
              </div>
            </div>
            {isLawyer && m.status !== 'closed' && <LawyerUpdateForm matterId={m.id} reload={reload} flash={flash} />}
          </section>
          <aside>
            <div className="panel next-event">
              <span className="eyebrow">NEXT EVENT</span>
              {data.nextEvent ? (
                <>
                  <b className="big-date">{dayNum(data.nextEvent.eventDate)}</b>
                  <h3>{new Date(data.nextEvent.eventDate).toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg', month: 'long', year: 'numeric' })}</h3>
                  <p>
                    {data.nextEvent.title} · {time(data.nextEvent.eventDate)}
                    <br />
                    {data.nextEvent.details}
                  </p>
                  <a
                    className="next-event-link"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.nextEvent.details || m.courtName || '')}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View directions
                  </a>
                </>
              ) : (
                <p className="mt-3 text-xs text-[#65767b]">No upcoming hearings, consultations or deadlines.</p>
              )}
            </div>
            <div className="panel fee-snapshot">
              <span className="eyebrow">FEE SNAPSHOT</span>
              <p>
                <span>Estimate</span>
                <b>{rand(data.fees.estimate)}</b>
              </p>
              <p>
                <span>Paid</span>
                <b>{rand(data.fees.paid)}</b>
              </p>
              <div>
                <span style={{ width: `${Math.min(100, data.fees.estimate ? (data.fees.paid / data.fees.estimate) * 100 : 0)}%` }} />
              </div>
              <button onClick={() => setTab('Fees & invoices')}>View fees & invoices</button>
            </div>
            {m.status === 'assigned' && (
              <button
                className="btn btn-ghost mt-3 w-full"
                onClick={async () => {
                  if (!window.confirm('Mark this matter as closed? Both parties keep read-only access.')) return
                  const r = await api.post(`/matters/${m.id}/close`)
                  if (!r.ok) return flash('error', r.error)
                  reload()
                }}
              >
                Close matter
              </button>
            )}
          </aside>
        </div>
      )}
    </PortalLayout>
  )
}

function LawyerUpdateForm({ matterId, reload, flash }) {
  const [kind, setKind] = useState('update')
  const submit = async (e) => {
    e.preventDefault()
    const body = Object.fromEntries(new FormData(e.currentTarget))
    const r = await api.post(`/matters/${matterId}/events`, { ...body, kind })
    if (!r.ok) return flash('error', r.error)
    e.target.reset()
    flash('success', kind === 'update' ? 'Update shared with your client.' : 'Date added and your client was notified.')
    reload()
  }
  return (
    <form onSubmit={submit} className="mt-5 space-y-3 rounded-xl bg-[#f3f6f4] p-4">
      <div className="flex flex-wrap gap-2 text-[11px] font-bold">
        {[
          ['update', 'Post update'],
          ['hearing', 'Add hearing'],
          ['deadline', 'Add deadline'],
        ].map(([k, l]) => (
          <button type="button" key={k} onClick={() => setKind(k)} className={`rounded-md px-3 py-1.5 ${kind === k ? 'bg-[#0b2635] text-white' : 'bg-white text-[#607078]'}`}>
            {l}
          </button>
        ))}
      </div>
      <input name="title" required className={field} placeholder={kind === 'update' ? 'Update headline' : kind === 'hearing' ? 'e.g. Bail hearing' : 'e.g. Plea due'} />
      {kind !== 'update' && <input name="eventDate" type="datetime-local" required className={field} />}
      {kind === 'hearing' && <input name="courtName" className={field} placeholder="Court name (optional)" />}
      <textarea name="details" rows={3} className={area} placeholder={kind === 'hearing' ? 'Courtroom and what to bring' : 'Details for your client'} />
      <button className="btn btn-primary">Share with client</button>
    </form>
  )
}

function FeesTab({ data, isLawyer, reload, flash }) {
  const pay = async (p) => {
    const r = await api.post(`/payments/${p.id}/pay`, { method: 'Card' })
    if (!r.ok) return flash('error', r.error)
    if (r.redirect) return submitRedirect(r.redirect)
    flash('success', r.testMode ? 'Payment recorded (test mode — no money was charged).' : 'Payment complete.')
    reload()
  }
  const invoice = async (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const r = await api.post(`/matters/${data.matter.id}/invoices`, { description: f.get('description'), amount: toCents(f.get('amount')) })
    if (!r.ok) return flash('error', r.error)
    e.target.reset()
    flash('success', 'Invoice sent to your client.')
    reload()
  }
  return (
    <div className="workspace-overview">
      <section className="panel">
        <div className="panel-head">
          <div>
            <span>FEES & INVOICES</span>
            <h2>Payment history</h2>
          </div>
        </div>
        {data.payments.length === 0 && <Empty title="No payments yet" text="Consultation fees and invoices appear here." />}
        {data.payments.map((p) => (
          <div className="document-row" key={p.id}>
            <span className="doc-icon">R</span>
            <div>
              <b>{p.description}</b>
              <small>
                {p.kind === 'consultation' ? 'Consultation' : 'Invoice'} · {date(p.createdAt)} · VAT {rand(p.vat)}
                {p.provider === 'test' ? ' · test payment' : ''}
              </small>
            </div>
            <Status tone={p.status === 'paid' ? 'teal' : p.status === 'disputed' ? 'red' : 'gold'}>{p.status.toUpperCase()}</Status>
            <b className="text-xs">{rand(p.amount)}</b>
            {!isLawyer && p.status === 'pending' && (
              <button className="doc-download" onClick={() => pay(p)}>
                Pay now
              </button>
            )}
          </div>
        ))}
      </section>
      <aside>
        <div className="panel fee-snapshot">
          <span className="eyebrow">AGREED ESTIMATE</span>
          <p>
            <span>Estimate</span>
            <b>{rand(data.fees.estimate)}</b>
          </p>
          <p>
            <span>Paid to date</span>
            <b>{rand(data.fees.paid)}</b>
          </p>
          {data.offer && (
            <ul className="mt-3 space-y-1 text-[11px] text-[#52646a]">
              <li>Consultation · {rand(data.offer.consultFee)}</li>
              {data.offer.breakdown.map((b) => (
                <li key={b.label}>
                  {b.label} · {rand(b.amount)}
                </li>
              ))}
            </ul>
          )}
        </div>
        {isLawyer && data.matter.status === 'assigned' && (
          <form onSubmit={invoice} className="panel mt-4 space-y-3">
            <span className="eyebrow">REQUEST PAYMENT</span>
            <input name="description" required className={field} placeholder="e.g. Court appearance" maxLength={160} />
            <input name="amount" required inputMode="decimal" className={field} placeholder="Amount incl. VAT (R)" />
            <button className="btn btn-primary w-full">Send invoice</button>
          </form>
        )}
      </aside>
    </div>
  )
}

// ---------- checkout: pay → schedule → sign ----------
export function Checkout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [data, { loading, error, reload }] = useApi(`/matters/${id}/checkout`)
  const [method, setMethod] = useState('Card')
  const [slot, setSlot] = useState(null)
  const [day, setDay] = useState(0)
  const [format, setFormat] = useState('video')
  const [agree, setAgree] = useState(false)
  const [name, setName] = useState('')
  const [err, setErr] = useState(params.get('cancelled') ? 'Payment was cancelled. You can try again.' : '')
  const [busy, setBusy] = useState(false)

  if (loading && !data)
    return (
      <PortalLayout>
        <Loading />
      </PortalLayout>
    )
  if (error || !data)
    return (
      <PortalLayout>
        <Empty title="Checkout unavailable" text={error} action={<Link className="btn btn-primary" to="/matters">My matters</Link>} />
      </PortalLayout>
    )
  const stepIndex = { payment: 1, schedule: 2, mandate: 3, done: 4 }[data.step]
  const p = data.payment

  const primary = async () => {
    setErr('')
    setBusy(true)
    let r
    if (data.step === 'payment') {
      r = await api.post(`/payments/${p.id}/pay`, { method })
      if (r.ok && r.redirect) return submitRedirect(r.redirect)
    } else if (data.step === 'schedule') {
      if (!slot) {
        setBusy(false)
        return setErr('Choose a consultation time.')
      }
      r = await api.post(`/matters/${id}/consultation`, { startsAt: slot, format })
    } else if (data.step === 'mandate') {
      r = await api.post(`/matters/${id}/mandate/sign`, { agree, signedName: name })
    } else return navigate(`/matters/${id}/workspace`)
    setBusy(false)
    if (!r.ok) return setErr(r.error)
    if (data.step === 'mandate') return navigate(`/matters/${id}/workspace?signed=1`)
    reload()
  }

  return (
    <PortalLayout>
      <div className="page-title">
        <div>
          <span>SECURE CHECKOUT & ENGAGEMENT</span>
          <h1>
            {data.step === 'payment'
              ? 'Pay consultation fee.'
              : data.step === 'schedule'
                ? 'Choose a consultation time.'
                : data.step === 'mandate'
                  ? 'Review and sign your mandate.'
                  : 'You’re all set.'}
          </h1>
          <p>Your payment and personal information are protected.</p>
        </div>
      </div>
      {data.paymentMode === 'test' && data.step === 'payment' && (
        <Notice kind="warn" className="mb-4">
          Test mode: payments are recorded as paid immediately and no money is charged. Connect PayFast to take live payments.
        </Notice>
      )}
      <div className="checkout-steps">
        {['Payment', 'Schedule', 'Mandate'].map((s, i) => (
          <div className={stepIndex >= i + 1 ? 'active' : ''} key={s}>
            <span>{stepIndex > i + 1 ? '✓' : i + 1}</span>
            <b>{s}</b>
          </div>
        ))}
      </div>
      <div className="checkout-layout">
        {data.step === 'payment' && (
          <section className="checkout-card">
            <span className="eyebrow">PAYMENT METHOD</span>
            <h2>How would you like to pay?</h2>
            <div className="payment-methods">
              {['Card', 'Instant EFT', 'Digital wallet'].map((x) => (
                <button className={method === x ? 'active' : ''} onClick={() => setMethod(x)} key={x}>
                  <span className="radio">{method === x && <i />}</span>
                  <b>{x}</b>
                  <small>{x === 'Card' ? 'Visa or Mastercard' : x === 'Instant EFT' ? 'Pay securely from your bank' : 'Use a saved payment method'}</small>
                </button>
              ))}
            </div>
            <p className="secure-note mt-5">
              <Icon name="lock" size={15} /> You’ll complete payment on our payment provider’s secure page. LexBridge never sees or stores your card or
              bank details.
            </p>
          </section>
        )}
        {data.step === 'schedule' && (
          <section className="checkout-card">
            <span className="eyebrow">AVAILABLE TIMES</span>
            <h2>Select your consultation.</h2>
            <div className="date-pills">
              {data.slots.map((d, i) => (
                <button
                  className={day === i ? 'active' : ''}
                  key={d.date}
                  onClick={() => {
                    setDay(i)
                    setSlot(null)
                  }}
                >
                  {weekday(d.times[0].startsAt)} {dayNum(d.times[0].startsAt)}
                  <small>{monthShort(d.times[0].startsAt)}</small>
                </button>
              ))}
            </div>
            {data.slots[day] && (
              <>
                <h3>
                  {new Date(data.slots[day].times[0].startsAt).toLocaleDateString('en-ZA', {
                    timeZone: 'Africa/Johannesburg',
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                <div className="time-grid">
                  {data.slots[day].times.map((t) => (
                    <button key={t.startsAt} disabled={!t.available} className={slot === t.startsAt ? 'active' : ''} onClick={() => setSlot(t.startsAt)}>
                      {t.label}
                      {!t.available && ' · booked'}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="format-choice">
              <b>Consultation format</b>
              {Object.entries(FORMAT).map(([k, l]) => (
                <label key={k}>
                  <input type="radio" name="format" checked={format === k} onChange={() => setFormat(k)} /> {l}
                </label>
              ))}
            </div>
          </section>
        )}
        {data.step === 'mandate' && (
          <section className="checkout-card mandate-card">
            <span className="eyebrow">ENGAGEMENT AGREEMENT · VERSION {data.mandate.version}</span>
            <h2>Mandate and fee agreement</h2>
            <p className="legal-intro">Please read this agreement carefully. It defines who will act for you, the scope of work and the fees that apply.</p>
            <div className="mandate-scroll">
              {data.mandate.content.split('\n\n').map((block) => {
                const [head, ...rest] = block.split('\n')
                return (
                  <div key={head}>
                    <h3>{head}</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{rest.join('\n')}</p>
                  </div>
                )
              })}
            </div>
            <label className="consent">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I have read and agree to the mandate and fee terms.
            </label>
            <div className="signature-box">
              <span>TYPE YOUR FULL NAME TO SIGN</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={data.clientName} />
              <small>Electronic signature recorded with date, time and audit trail.</small>
            </div>
          </section>
        )}
        {data.step === 'done' && (
          <section className="checkout-card">
            <span className="eyebrow">ENGAGEMENT COMPLETE</span>
            <h2>Your lawyer can start work.</h2>
            <p className="legal-intro">
              Consultation booked for {data.consultation ? `${dateTime(data.consultation.startsAt)} · ${FORMAT[data.consultation.format]}` : '—'}. Mandate
              signed {dateTime(data.mandate.signedAt)}.
            </p>
          </section>
        )}
        <aside className="order-summary">
          <span className="eyebrow">ORDER SUMMARY</span>
          <div className="summary-lawyer">
            {data.lawyer.photoUrl ? <img src={data.lawyer.photoUrl} alt="" /> : <span className="avatar-initials">{data.lawyer.name[0]}</span>}
            <div>
              <b>{data.lawyer.name}</b>
              <small>Verified {data.lawyer.practitionerType.toLowerCase()}</small>
            </div>
          </div>
          <h3>60-minute consultation</h3>
          <p>
            {data.matter.title}
            <br />
            {FORMAT[data.consultation?.format || format]}
          </p>
          <div className="summary-lines">
            <p>
              <span>Consultation</span>
              <b>{rand(p.amount - p.vat)}</b>
            </p>
            <p>
              <span>VAT (15%)</span>
              <b>{rand(p.vat)}</b>
            </p>
            <p className="summary-total">
              <span>Total</span>
              <b>{rand(p.amount)}</b>
            </p>
          </div>
          <p className="secure-note">
            <Icon name="lock" size={15} /> {p.status === 'paid' ? `Paid ${date(p.paidAt)}.` : 'Secure encrypted payment.'} This covers the consultation only.
          </p>
          <Notice>{err}</Notice>
          <button className="btn btn-gold" onClick={primary} disabled={busy || (data.step === 'mandate' && (!agree || name.trim().length < 3))}>
            {busy
              ? 'Please wait…'
              : data.step === 'payment'
                ? `Pay ${rand(p.amount)}`
                : data.step === 'schedule'
                  ? 'Confirm consultation'
                  : data.step === 'mandate'
                    ? 'Sign mandate'
                    : 'Open case workspace'}{' '}
            <Icon name="arrow" size={16} />
          </button>
        </aside>
      </div>
    </PortalLayout>
  )
}

export function Payments() {
  const { user } = useAuth()
  const [data, { loading, reload }] = useApi('/payments')
  const [flash, setFlash] = useState({ kind: '', text: '' })
  const [dispute, setDispute] = useState(null)
  const isLawyer = user.role === 'lawyer'
  const pay = async (p) => {
    const r = await api.post(`/payments/${p.id}/pay`, { method: 'Card' })
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    if (r.redirect) return submitRedirect(r.redirect)
    setFlash({ kind: 'success', text: r.testMode ? 'Payment recorded (test mode — no money was charged).' : 'Payment complete.' })
    reload()
  }
  const sendDispute = async (e) => {
    e.preventDefault()
    const r = await api.post(`/payments/${dispute.id}/dispute`, { note: new FormData(e.currentTarget).get('note') })
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    setDispute(null)
    setFlash({ kind: 'success', text: 'Dispute logged. Our team will review it within 2 business days.' })
    reload()
  }
  return (
    <PortalLayout>
      <div className="page-title">
        <div>
          <span>{isLawyer ? 'EARNINGS & PAYOUTS' : 'PAYMENTS & MANDATES'}</span>
          <h1>{isLawyer ? 'Your earnings.' : 'Payments and invoices.'}</h1>
          <p>{isLawyer ? 'Consultation fees and invoices paid by your clients.' : 'Pay invoices, download records or raise a dispute.'}</p>
        </div>
      </div>
      {loading && !data && <Loading />}
      {data && (
        <>
          {data.paymentMode === 'test' && (
            <Notice kind="warn" className="mb-4">
              Test mode — no money moves until a payment provider is connected.
            </Notice>
          )}
          <Notice kind={flash.kind || 'error'} className="mb-4">
            {flash.text}
          </Notice>
          <div className="metric-grid">
            <article>
              <span>{isLawyer ? 'RECEIVED' : 'PAID'}</span>
              <b>{rand(data.totals.paid, { decimals: false })}</b>
              <small>All matters</small>
            </article>
            <article>
              <span>{isLawyer ? 'AWAITING CLIENT' : 'OUTSTANDING'}</span>
              <b>{rand(data.totals.pending, { decimals: false })}</b>
              <small>Pending invoices</small>
            </article>
            <article>
              <span>DISPUTED</span>
              <b>{rand(data.totals.disputed, { decimals: false })}</b>
              <small>Under review</small>
            </article>
            <article>
              <span>TRANSACTIONS</span>
              <b>{data.payments.length}</b>
              <small>Total records</small>
            </article>
          </div>
          <section className="panel document-panel">
            {data.payments.length === 0 && <Empty title="No payments yet" text="Payments appear here after an offer is accepted." />}
            {data.payments.map((p) => (
              <div className="document-row" key={p.id}>
                <span className="doc-icon">R</span>
                <div>
                  <b>{p.description}</b>
                  <small>
                    <Link to={`/matters/${p.matterId}/workspace?tab=Fees+%26+invoices`}>{p.matterReference}</Link> · {date(p.createdAt)}
                    {p.paidAt ? ` · paid ${date(p.paidAt)}` : ''}
                  </small>
                </div>
                <Status tone={p.status === 'paid' ? 'teal' : p.status === 'disputed' || p.status === 'failed' ? 'red' : 'gold'}>{p.status.toUpperCase()}</Status>
                <b className="text-xs">{rand(p.amount)}</b>
                {!isLawyer && p.status === 'pending' && (
                  <button className="doc-download" onClick={() => pay(p)}>
                    Pay now
                  </button>
                )}
                {!isLawyer && p.status === 'paid' && (
                  <button className="doc-download" onClick={() => setDispute(p)}>
                    Dispute
                  </button>
                )}
              </div>
            ))}
          </section>
        </>
      )}
      {dispute && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setDispute(null)}>
          <form className="matter-modal" onSubmit={sendDispute}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">PAYMENT DISPUTE</span>
                <h2>{dispute.description}</h2>
              </div>
            </div>
            <label className={labelCls}>
              WHAT WENT WRONG?
              <textarea name="note" required minLength={10} rows={5} className={area} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDispute(null)}>
                Cancel
              </button>
              <button className="btn btn-gold">Submit dispute</button>
            </div>
          </form>
        </div>
      )}
    </PortalLayout>
  )
}
