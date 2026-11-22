import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { PortalLayout } from '../../components/PortalLayout'
import { Empty, Loading, Notice, PageTitle, Status, area, field, labelCls } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi } from '../../lib/auth'
import { Counter } from '../../motion/Counter'
import { CATEGORY_LABEL, ROLE_LABEL, ago, date, initials, rand } from '../../lib/format'

const TITLES = {
  verification: ['VERIFICATION OPERATIONS', 'Lawyer verification queue.', 'Review practitioner credentials, documents and practising status.'],
  moderation: ['POST MODERATION', 'Matter moderation.', 'Pause matters that include personal details, abuse or content that breaks the rules.'],
  payments: ['PAYMENTS & DISPUTES', 'Payments and disputes.', 'Review transactions and resolve client disputes.'],
  users: ['USERS & ROLES', 'Accounts and roles.', 'Create SAPS, court and Legal Aid accounts, change roles or suspend accounts.'],
  cases: ['DIGITAL JUSTICE', 'Justice case assignment.', 'Assign SAPS, prosecution, court and legal officials to digital case intakes.'],
  identity: ['IDENTITY', 'Identity reviews.', 'Manually verify South African ID submissions (only the last four digits are stored).'],
  stations: ['POLICE STATIONS', 'Station directory.', 'Update station details or import a refreshed provincial directory.'],
}
const CHECKS = [
  ['identity', 'Identity verification'],
  ['lpc', 'LPC enrolment'],
  ['practising', 'Practising certificate'],
  ['fidelity', 'Fidelity Fund certificate'],
  ['firm', 'Firm information'],
]
const ROLES = ['client', 'lawyer', 'legal-aid', 'saps', 'prosecutor', 'clerk', 'judicial-officer', 'admin']

export default function Admin() {
  const [params] = useSearchParams()
  const tab = TITLES[params.get('tab')] ? params.get('tab') : 'verification'
  const [flash, setFlash] = useState({ kind: '', text: '' })
  useEffect(() => {
    setFlash({ kind: '', text: '' })
  }, [tab])
  const [eyebrow, title, copy] = TITLES[tab]
  const props = { setFlash }
  return (
    <PortalLayout>
      <PageTitle eyebrow={eyebrow} title={title} copy={copy} />
      <Notice kind={flash.kind || 'error'} className="mb-4">
        {flash.text}
      </Notice>
      {tab === 'verification' && <Verification {...props} />}
      {tab === 'moderation' && <Moderation {...props} />}
      {tab === 'payments' && <PaymentsAdmin {...props} />}
      {tab === 'users' && <Users {...props} />}
      {tab === 'cases' && <Cases {...props} />}
      {tab === 'identity' && <Identity {...props} />}
      {tab === 'stations' && <Stations {...props} />}
    </PortalLayout>
  )
}

function Verification({ setFlash }) {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [overview, ov] = useApi('/admin/overview')
  const [data, { loading, reload }] = useApi(`/admin/verifications?status=${status}&q=${encodeURIComponent(q)}`)
  const [sel, setSel] = useState(null)
  const [checks, setChecks] = useState({})
  const [note, setNote] = useState('')
  const current = data?.applicants.find((a) => a.id === sel) ?? data?.applicants[0]
  useEffect(() => {
    if (current) {
      setChecks(current.checks)
      setNote(current.reviewNote || '')
    }
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action) => {
    const r = await api.post(`/admin/verifications/${current.id}`, { action, note, checks })
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    setFlash({ kind: 'success', text: action === 'save' ? 'Checks saved.' : `Application ${r.status.replace('-', ' ')}.` })
    reload()
    ov.reload()
  }
  const m = overview?.metrics
  return (
    <>
      {m && (
        <div className="admin-metrics">
          <div>
            <span>PENDING REVIEW</span>
            <b>
              <Counter value={m.pending} />
            </b>
            <small>{m.submittedToday} submitted today</small>
          </div>
          <div>
            <span>MORE INFO NEEDED</span>
            <b>
              <Counter value={m.moreInfo} />
            </b>
            <small>Average age {m.moreInfoAgeDays} days</small>
          </div>
          <div>
            <span>APPROVED THIS WEEK</span>
            <b>
              <Counter value={m.approvedWeek} />
            </b>
            <small>{m.passRate}% pass rate</small>
          </div>
          <div>
            <span>EXPIRING SOON</span>
            <b>
              <Counter value={m.expiringSoon} />
            </b>
            <small>Practising certificates (60 days)</small>
          </div>
        </div>
      )}
      <div className="admin-layout">
        <section className="panel verification-list">
          <div className="panel-head">
            <div>
              <span>APPLICATIONS</span>
              <h2>Review queue</h2>
            </div>
            <div className="filter-search">
              <Icon name="search" size={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search applicant" />
            </div>
          </div>
          <select className={`${field} mb-3`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Pending & more info</option>
            <option value="pending">Pending</option>
            <option value="more-info">More info requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="incomplete">Incomplete profiles</option>
          </select>
          {loading && !data && <Loading />}
          {data?.applicants.length === 0 && <p className="p-4 text-xs text-[#65767b]">The queue is clear.</p>}
          {data?.applicants.map((a) => (
            <button className={current?.id === a.id ? 'active' : ''} key={a.id} onClick={() => setSel(a.id)}>
              <span className="avatar-initials">{initials(a.name)}</span>
              <div>
                <b>{a.name}</b>
                <p>
                  {a.practitionerType} · {a.province || 'Province not set'}
                </p>
                <small>{a.submittedAt ? `Submitted ${ago(a.submittedAt)}` : 'Not submitted'}</small>
              </div>
              <Status tone={a.verificationStatus === 'approved' ? 'teal' : Object.values(a.checks).includes('failed') ? 'red' : 'gold'}>
                {a.verificationStatus.replace('-', ' ').toUpperCase()}
              </Status>
            </button>
          ))}
        </section>
        {current ? (
          <section className="panel verification-detail">
            <div className="applicant-head">
              <span className="avatar-initials large">{initials(current.name)}</span>
              <div>
                <span className="eyebrow">APPLICATION LXB-LP-{String(current.id).padStart(4, '0')}</span>
                <h2>{current.name}</h2>
                <p>
                  {current.practitionerType} · {current.firm || 'Firm not provided'} · {current.email}
                </p>
              </div>
              <Status tone="gold">{current.verificationStatus.replace('-', ' ').toUpperCase()}</Status>
            </div>
            <div className="verification-checks">
              {CHECKS.map(([k, label]) => {
                const detail = {
                  identity: current.identityStatus === 'verified' ? 'Account identity verified' : `Identity ${current.identityStatus.replace('-', ' ')}`,
                  lpc: current.lpcNumber ? `Enrolment ${current.lpcNumber}` : 'Not provided',
                  practising: current.practisingCertExpiry ? `Valid until ${date(current.practisingCertExpiry)}` : 'Not provided',
                  fidelity: current.fidelityCert || 'Not provided',
                  firm: [current.firm, current.city, current.province].filter(Boolean).join(' · ') || 'Not provided',
                }[k]
                const c = checks[k] || 'review'
                return (
                  <div key={k}>
                    <span className={`check-dot ${c === 'passed' ? 'passed' : ''}`}>{c === 'passed' ? '✓' : '!'}</span>
                    <div>
                      <b>{label}</b>
                      <p>{detail}</p>
                    </div>
                    <Status tone={c === 'passed' ? 'teal' : c === 'failed' ? 'red' : 'gold'}>{c.toUpperCase()}</Status>
                    <select value={c} onChange={(e) => setChecks({ ...checks, [k]: e.target.value })} className="rounded-md border border-[#d8ddd9] bg-white px-2 py-1 text-xs">
                      <option value="review">Review</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[14px] text-[#65767b]">
              Verify the LPC number on the Legal Practice Council roll and confirm the Fidelity Fund certificate with the LPFF before passing these checks.
            </p>
            <label>
              Review note (shared with the applicant when requesting info or rejecting)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the verification record…" />
            </label>
            <div className="admin-actions">
              <button className="btn btn-ghost" onClick={() => act('save')}>
                Save checks
              </button>
              <button className="btn btn-ghost" onClick={() => act('more-info')}>
                Request information
              </button>
              <button className="btn reject" onClick={() => act('reject')}>
                Reject
              </button>
              <button className="btn btn-primary" onClick={() => act('approve')}>
                Approve practitioner
              </button>
            </div>
          </section>
        ) : (
          <section className="panel verification-detail">
            <Empty title="No applicant selected" text="New applications appear here as practitioners submit them." />
          </section>
        )}
      </div>
    </>
  )
}

function Moderation({ setFlash }) {
  const [data, { loading, reload }] = useApi('/admin/matters')
  const moderate = async (m, status) => {
    const note = status === 'hidden' ? window.prompt('Reason (sent to the client):') : ''
    if (status === 'hidden' && !note) return
    const r = await api.post(`/admin/matters/${m.id}/moderate`, { status, note })
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    setFlash({ kind: 'success', text: status === 'hidden' ? 'Matter paused.' : 'Matter restored.' })
    reload()
  }
  if (loading && !data) return <Loading />
  return (
    <section className="panel">
      {data.matters.length === 0 && <Empty title="No matters yet" text="Posted matters appear here." />}
      {data.matters.map((m) => (
        <article key={m.id} className="border-b border-[#edf0ee] py-4 last:border-0">
          <div className="flex flex-wrap items-center gap-2">
            <Status tone={m.moderationStatus === 'hidden' ? 'red' : 'teal'}>{m.moderationStatus.toUpperCase()}</Status>
            <Status tone="gold">{m.status.toUpperCase()}</Status>
            <b className="text-sm">{m.title}</b>
            <span className="ml-auto text-[14px] text-[#829095]">
              {m.reference} · {m.clientName} · {ago(m.createdAt)} · {m.offerCount} offers
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#52646a]">{m.description}</p>
          <p className="mt-1 text-[14px] text-[#829095]">
            {CATEGORY_LABEL[m.category]} · {m.province} · {m.urgency}
            {m.moderationNote ? ` · Note: ${m.moderationNote}` : ''}
          </p>
          <div className="mt-2">
            {m.moderationStatus === 'visible' ? (
              <button className="text-xs font-bold text-[#a34a40]" onClick={() => moderate(m, 'hidden')}>
                Pause matter
              </button>
            ) : (
              <button className="text-xs font-bold text-[#1f6e6a]" onClick={() => moderate(m, 'visible')}>
                Restore matter
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  )
}

function PaymentsAdmin({ setFlash }) {
  const [data, { loading, reload }] = useApi('/admin/payments')
  const resolve = async (p, outcome) => {
    const note = window.prompt(outcome === 'refund' ? 'Refund reason (shared with both parties):' : 'Resolution note (shared with both parties):')
    if (!note) return
    const r = await api.post(`/admin/payments/${p.id}/resolve`, { outcome, note })
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    setFlash({ kind: 'success', text: 'Dispute resolved.' })
    reload()
  }
  const refundPaid = async (p) => {
    const reference = window.prompt('PayFast refund reference (optional):') ?? null
    if (reference === null) return
    const r = await api.post(`/admin/payments/${p.id}/refund-paid`, { reference })
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    setFlash({ kind: 'success', text: 'Refund marked as paid. The client has been notified.' })
    reload()
  }
  if (loading && !data) return <Loading />
  return (
    <section className="panel document-panel">
      {data.payments.length === 0 && <Empty title="No payments yet" text="Transactions appear here." />}
      {data.payments.map((p) => (
        <div key={p.id} className="document-row">
          <span className="doc-icon">R</span>
          <div>
            <b>{p.description}</b>
            <small>
              {p.matterReference} · {p.clientName} → {p.lawyerName} · {date(p.createdAt)} · {p.provider || 'no provider'}
            </small>
            {p.disputeNote && <small className="block whitespace-pre-wrap text-[#a34a40]">{p.disputeNote}</small>}
            {p.refundAmount > 0 && (
              <small className="block text-[#1f6e6a]">
                Refund {rand(p.refundAmount)} · {p.refundStatus === 'pending' ? 'to process' : 'paid'} · {p.refundReason}
              </small>
            )}
          </div>
          <Status tone={p.status === 'paid' ? 'teal' : p.status === 'disputed' ? 'red' : 'gold'}>{p.status.toUpperCase()}</Status>
          <b className="text-xs">{rand(p.amount)}</b>
          {p.refundStatus === 'pending' && (
            <button className="doc-download" onClick={() => refundPaid(p)}>
              Mark refund paid
            </button>
          )}
          {p.status === 'disputed' && (
            <span className="flex gap-2">
              <button className="doc-download" onClick={() => resolve(p, 'uphold')}>
                Close
              </button>
              <button className="doc-download" onClick={() => resolve(p, 'refund')}>
                Refund
              </button>
            </span>
          )}
        </div>
      ))}
    </section>
  )
}

function Users({ setFlash }) {
  const [role, setRole] = useState('')
  const [q, setQ] = useState('')
  const [data, { reload }] = useApi(`/admin/users?role=${role}&q=${encodeURIComponent(q)}`)
  const create = async (e) => {
    e.preventDefault()
    const el = e.currentTarget
    const r = await api.post('/admin/users', Object.fromEntries(new FormData(el)))
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    el.reset()
    setFlash({ kind: 'success', text: 'Account created. Share the temporary password securely and ask them to change it.' })
    reload()
  }
  const update = async (u, body) => {
    const r = await api.patch(`/admin/users/${u.id}`, body)
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    reload()
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="panel">
        <div className="mb-4 flex flex-wrap gap-2">
          <input className={`${field} mt-0 max-w-xs`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" />
          <select className={`${field} mt-0 max-w-[220px]`} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#dce3df] text-[14px] text-[#7f8d91]">
                <th className="py-2">NAME</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>IDENTITY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id} className="border-b border-[#edf0ee]">
                  <td className="py-3 font-bold">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} onChange={(e) => update(u, { role: e.target.value })} className="rounded-md border border-[#d8ddd9] bg-white px-2 py-1">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{u.identityStatus}</td>
                  <td>
                    <button
                      className={`font-bold ${u.accountStatus === 'active' ? 'text-[#a34a40]' : 'text-[#1f6e6a]'}`}
                      onClick={() => update(u, { accountStatus: u.accountStatus === 'active' ? 'suspended' : 'active' })}
                    >
                      {u.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <form onSubmit={create} className="panel h-max space-y-3">
        <span className="eyebrow">CREATE OFFICIAL ACCOUNT</span>
        <label className={labelCls}>
          FULL NAME
          <input name="name" required className={field} />
        </label>
        <label className={labelCls}>
          EMAIL
          <input name="email" type="email" required className={field} />
        </label>
        <label className={labelCls}>
          ROLE
          <select name="role" className={field} defaultValue="saps">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          TEMPORARY PASSWORD (10+ CHARACTERS)
          <input name="password" required minLength={10} className={field} />
        </label>
        <button className="btn btn-primary w-full">Create account</button>
      </form>
    </div>
  )
}

function Cases({ setFlash }) {
  const [data, { loading, reload }] = useApi('/admin/cases')
  const assign = async (c, email) => {
    if (!email) return
    const r = await api.post(`/justice/cases/${c.id}/participants`, { email })
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    setFlash({ kind: 'success', text: 'Participant assigned and notified.' })
    reload()
  }
  const remove = async (c, p) => {
    if (!window.confirm(`Remove ${p.name} from ${c.reference}?`)) return
    const r = await api.del(`/admin/cases/${c.id}/participants/${p.id}`)
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    reload()
  }
  if (loading && !data) return <Loading />
  return (
    <div className="space-y-4">
      {data.cases.length === 0 && <Empty title="No justice cases yet" text="Digital intakes appear here for assignment." />}
      {data.cases.map((c) => (
        <section key={c.id} className="panel">
          <div className="flex flex-wrap items-center gap-2">
            <Status tone={c.participants.some((p) => p.team !== 'clients') ? 'teal' : 'gold'}>
              {c.participants.some((p) => p.team !== 'clients') ? 'ASSIGNED' : 'AWAITING ASSIGNMENT'}
            </Status>
            <b className="text-sm">{c.title}</b>
            <span className="ml-auto font-mono text-[14px] text-[#829095]">
              {c.officialCaseNumber || c.reference} · {c.caseType} · {c.stage} · by {c.creator}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.participants.map((p) => (
              <span key={`${p.id}-${p.team}`} className="flex items-center gap-2 rounded-full bg-[#eef3f1] px-3 py-1 text-[14px]">
                {p.name} · {ROLE_LABEL[p.role]}
                {p.team !== 'clients' && (
                  <button className="text-[#a34a40]" onClick={() => remove(c, p)} aria-label={`Remove ${p.name}`}>
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <select className={`${field} mt-0 max-w-sm`} defaultValue="" onChange={(e) => assign(c, e.target.value) && (e.target.value = '')}>
              <option value="">Assign an official…</option>
              {data.officials
                .filter((o) => !c.participants.some((p) => p.id === o.id))
                .map((o) => (
                  <option key={o.id} value={o.email}>
                    {ROLE_LABEL[o.role]} · {o.name}
                  </option>
                ))}
            </select>
          </div>
        </section>
      ))}
    </div>
  )
}

function Identity({ setFlash }) {
  const [data, { loading, reload }] = useApi('/admin/identity')
  const decide = async (u, decision) => {
    const note = decision === 'reject' ? window.prompt('Reason (shared with the user):') || '' : ''
    const r = await api.post(`/admin/identity/${u.id}`, { decision, note })
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    setFlash({ kind: 'success', text: decision === 'verify' ? 'Identity verified.' : 'Identity review rejected.' })
    reload()
  }
  if (loading && !data) return <Loading />
  return (
    <section className="panel">
      {data.users.length === 0 && <Empty title="No pending identity reviews" text="Submissions appear here for manual verification." />}
      {data.users.map((u) => (
        <div key={u.id} className="matter-row">
          <span className="avatar-initials">{initials(u.name)}</span>
          <div>
            <h3>{u.name}</h3>
            <p>
              {u.email} · {ROLE_LABEL[u.role]} · ID ending <b>{u.idNumberLast4}</b>
            </p>
          </div>
          <button className="btn btn-ghost" onClick={() => decide(u, 'reject')}>
            Reject
          </button>
          <button className="btn btn-primary" onClick={() => decide(u, 'verify')}>
            Verify
          </button>
        </div>
      ))}
    </section>
  )
}

function Stations({ setFlash }) {
  const [data, { reload }] = useApi('/police-stations')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null)
  const [json, setJson] = useState('')
  const [source, setSource] = useState('')
  const save = async (e) => {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget))
    const r = await api.put(`/admin/police-stations/${edit.id}`, { ...f, phoneNumbers: f.phoneNumbers.split(',').map((x) => x.trim()) })
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    setEdit(null)
    setFlash({ kind: 'success', text: 'Station updated.' })
    reload()
  }
  const importJson = async () => {
    let rows
    try {
      rows = JSON.parse(json)
    } catch {
      return setFlash({ kind: 'error', text: 'That is not valid JSON.' })
    }
    const r = await api.post('/admin/police-stations/import', { stations: rows, sourceLabel: source })
    if (!r.ok) return setFlash({ kind: 'error', text: r.error })
    setFlash({ kind: 'success', text: `${r.imported} stations imported.` })
    setJson('')
    reload()
  }
  const list = (data?.stations ?? []).filter((s) => !q || `${s.name} ${s.district} ${s.commander}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <section className="panel">
        <input className={`${field} mt-0 mb-3`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${data?.stations.length ?? ''} stations`} />
        <div className="max-h-[640px] overflow-y-auto">
          {list.map((s) => (
            <div key={s.id} className="flex items-center gap-3 border-b border-[#edf0ee] py-3 text-xs">
              <div className="min-w-0 flex-1">
                <b>{s.name} SAPS</b> <span className="text-[#829095]">· {s.district}</span>
                <p className="truncate text-[#65767b]">
                  {s.commander} · {s.phoneNumbers.map((p) => p.number).join(', ')}
                </p>
              </div>
              <button className="font-bold text-[#1f6e6a]" onClick={() => setEdit(s)}>
                Edit
              </button>
            </div>
          ))}
        </div>
      </section>
      <aside className="space-y-4">
        {edit && (
          <form onSubmit={save} className="panel space-y-3">
            <span className="eyebrow">EDIT {edit.name.toUpperCase()}</span>
            <label className={labelCls}>
              COMMANDER
              <input name="commander" defaultValue={edit.commander || ''} className={field} />
            </label>
            <label className={labelCls}>
              PHONE NUMBERS (COMMA SEPARATED)
              <input name="phoneNumbers" defaultValue={edit.phoneNumbers.map((p) => p.number).join(', ')} className={field} />
            </label>
            <label className={labelCls}>
              CLUSTER / DISTRICT
              <input name="district" defaultValue={edit.district} className={field} />
            </label>
            <label className={labelCls}>
              ADDRESS
              <textarea name="address" rows={2} defaultValue={edit.address} className={area} />
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button className="btn btn-primary">Save</button>
            </div>
          </form>
        )}
        <section className="panel space-y-3">
          <span className="eyebrow">IMPORT DIRECTORY</span>
          <p className="text-[14px] leading-5 text-[#65767b]">
            Paste a JSON array: <code>[{'{'}"name","district","commander","phoneNumbers":[],"address"{'}'}]</code>. Existing stations are updated by name.
          </p>
          <input className={field} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source label, e.g. SAPS Provincial Directory, June 2026" />
          <textarea className={area} rows={6} value={json} onChange={(e) => setJson(e.target.value)} placeholder="[ … ]" />
          <button className="btn btn-primary w-full" onClick={importJson} disabled={!json || !source}>
            Import stations
          </button>
        </section>
      </aside>
    </div>
  )
}
