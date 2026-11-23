import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Loading } from '../../components/ui'
import { LogoMark } from '../../components/Icon'
import { api } from '../../lib/api'
import { useApi, useAuth } from '../../lib/auth'
import { dateTime, date } from '../../lib/format'
import { Counter } from '../../motion/Counter'

const roleNames = {
  client: 'Individual / Client',
  lawyer: 'Legal practitioner',
  'legal-aid': 'Legal Aid practitioner',
  saps: 'SAPS official',
  prosecutor: 'Prosecutor',
  clerk: 'Court clerk',
  'judicial-officer': 'Magistrate / Judge',
  admin: 'Platform admin',
}
const stageLabels = {
  intake: 'Digital intake',
  docket: 'Police docket',
  'prosecutor-review': 'Prosecutor review',
  enrolled: 'Court roll',
  hearing: 'Hearing',
  judgment: 'Judgment',
  sentence: 'Sentence',
  appeal: 'Appeal',
  closed: 'Closed',
}
const NAV = ['Overview', 'Cases', 'Court roll', 'Documents', 'Messages', 'Activity']

const input = 'h-11 w-full rounded-lg border border-[#d7dfdc] bg-white px-3 text-sm outline-none focus:border-[#4c8a82]'
const textarea = 'w-full rounded-lg border border-[#d7dfdc] bg-white p-3 text-sm leading-5 outline-none focus:border-[#4c8a82]'
const button = 'w-full rounded-lg bg-[#082632] px-4 py-3 text-xs font-bold text-white disabled:opacity-50'

function Empty({ title, text }) {
  return (
    <div className="rounded-xl border border-dashed border-[#c8d2ce] bg-[#fafbf9] p-8 text-center">
      <b className="font-serif text-xl text-[#082632]">{title}</b>
      <p className="mt-2 text-xs text-[#78878b]">{text}</p>
    </div>
  )
}

function Panel({ eyebrow, title, children }) {
  return (
    <section className="rounded-xl border border-[#dce3df] bg-white p-5">
      <span className="text-[14px] font-bold tracking-[.12em] text-[#a87825]">{eyebrow}</span>
      <h2 className="mt-2 font-serif text-2xl text-[#082632]">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  )
}

const formData = (e) => Object.fromEntries(new FormData(e.currentTarget))
const toIso = (v) => (v ? new Date(v).toISOString() : '')

export default function JusticeDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, { loading, reload }] = useApi(user ? '/justice/dashboard' : null)
  const [active, setActive] = useState('Overview')
  const [selected, setSelected] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState(null)

  if (user === null) return <Navigate to="/login?next=/dashboard" replace />
  if (!data && loading) return <Loading />
  if (!data) return <Loading label="Unable to load" />

  const { cases, hearings, filings, notifications, audit, docket, decisions, messages, legalAid, timeRecords } = data
  const selectedCase = selected || String(cases[0]?.id ?? '')
  const currentCase = cases.find((c) => String(c.id) === selectedCase) ?? cases[0]
  const unread = notifications.filter((n) => n.deliveryStatus !== 'read').length

  const run = async (work, success = 'Update saved.', reset) => {
    setResult(null)
    setPending(true)
    const r = await work()
    setPending(false)
    if (!r.ok) return setResult({ kind: 'error', text: r.error })
    setResult({ kind: 'success', text: r.reference ? `${success} Reference: ${r.reference}` : success })
    reset?.reset?.()
    reload()
  }
  const submit = (fn, success) => (e) => {
    e.preventDefault()
    const el = e.currentTarget
    run(() => fn(formData(e), el), success, el)
  }

  const caseSelect = (
    <select name="case" required value={selectedCase} onChange={(e) => setSelected(e.target.value)} className={input}>
      <option value="">Choose a case</option>
      {cases.map((c) => (
        <option value={c.id} key={c.id}>
          {c.officialCaseNumber || c.platformReference} · {c.title}
        </option>
      ))}
    </select>
  )
  const role = user.role
  const tools = { caseSelect, currentCase, run, submit, pending }

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-[#17262d] lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-r border-[#dce3df] bg-[#082632] px-5 py-6 text-white">
        <Link to="/" className="flex items-center gap-3 font-serif text-2xl" aria-label="LexBridge Justice home">
          <LogoMark height={34} />
          <span>
            Lex<b className="font-medium text-[#dfbd6e]">Bridge</b> <span className="block font-sans text-[12px] tracking-[.2em] text-[#8fcac3]">JUSTICE</span>
          </span>
        </Link>
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#d9b45f] font-serif text-lg text-[#082632]">{user.name.charAt(0)}</div>
          <b className="mt-3 block text-sm">{user.name}</b>
          <span className="mt-1 block text-[14px] font-bold tracking-[.12em] text-[#8fcac3]">{roleNames[role].toUpperCase()}</span>
        </div>
        <nav className="mt-8 flex gap-1 overflow-x-auto lg:block lg:space-y-1">
          {NAV.map((item) => (
            <button
              key={item}
              onClick={() => setActive(item)}
              className={`flex w-full min-w-max items-center rounded-lg px-4 py-3 text-left text-xs font-bold ${active === item ? 'bg-white text-[#082632]' : 'text-[#a9bec1] hover:bg-white/5'}`}
            >
              {item}
              {item === 'Messages' && messages.some((m) => m.incoming && !m.readAt) && <span className="ml-auto h-2 w-2 rounded-full bg-[#d9b45f]" />}
            </button>
          ))}
        </nav>
        <div className="mt-10 border-t border-white/10 pt-5">
          {['client', 'lawyer', 'admin'].includes(role) && (
            <Link to={role === 'client' ? '/client' : role === 'lawyer' ? '/lawyer' : '/admin'} className="block px-4 py-2 text-xs text-[#9cb1b4]">
              ← Marketplace portal
            </Link>
          )}
          <Link to="/police-stations" className="block px-4 py-2 text-xs text-[#9cb1b4]">
            SAPS station directory
          </Link>
          <Link to="/police-report" className="block px-4 py-2 text-xs text-[#9cb1b4]">
            Police report workspace
          </Link>
          <button
            onClick={async () => {
              await logout()
              navigate('/')
            }}
            className="mt-3 w-full rounded-lg border border-white/15 px-4 py-3 text-left text-xs font-bold text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="flex min-h-[72px] flex-wrap items-center gap-3 border-b border-[#dce3df] bg-white px-5 py-3 lg:px-8">
          <div>
            <span className="text-[14px] font-bold tracking-[.14em] text-[#a87825]">SOUTH AFRICAN DIGITAL JUSTICE WORKSPACE</span>
            <h1 className="font-serif text-2xl text-[#082632]">{active}</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="rounded-full bg-[#e7f1ee] px-3 py-2 text-[14px] font-bold text-[#1d6e68]">
              {user.identityStatus === 'verified' ? 'IDENTITY VERIFIED' : user.identityStatus === 'pending' ? 'IDENTITY UNDER REVIEW' : 'IDENTITY REVIEW REQUIRED'}
            </span>
            <button
              onClick={async () => {
                await api.post('/auth/notifications/read')
                reload()
              }}
              className="rounded-full bg-[#fff4dc] px-3 py-2 text-[14px] font-bold text-[#8a641d]"
              title="Mark all as read"
            >
              {unread} NOTICES
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-4 lg:p-8">
          <div className="rounded-xl border border-[#ead5a9] bg-[#fff9eb] px-4 py-3 text-xs leading-5 text-[#785b22]">
            <b>Authority boundary:</b> digital references are not official CAS or court numbers. Official registration, warrants, orders and judgments require an
            authorised role and remain subject to SAPS, court and Department of Justice systems.
          </div>
          {result && (
            <div role="status" className={`mt-4 rounded-lg px-4 py-3 text-sm ${result.kind === 'error' ? 'bg-[#f8e6e2] text-[#9c453e]' : 'bg-[#e7f2ee] text-[#216b61]'}`}>
              {result.text}
            </div>
          )}

          {active === 'Overview' && (
            <>
              <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Active cases', cases.filter((c) => c.stage !== 'closed').length, 'Across your permitted matters'],
                  ['Upcoming hearings', hearings.filter((h) => new Date(h.startsAt) > new Date() && h.status === 'scheduled').length, 'Court roll and appearances'],
                  ['Filed documents', filings.length, 'Secure case records'],
                  ['Unread notices', unread, 'In-app delivery queue'],
                ].map(([label, count, description]) => (
                  <article key={label} className="rounded-xl border border-[#dce3df] bg-white p-5 shadow-[0_8px_30px_rgba(8,38,50,.04)]">
                    <span className="text-[14px] font-bold text-[#79898e]">{label.toUpperCase()}</span>
                    <strong className="mt-3 block font-serif text-4xl text-[#082632]">
                      <Counter value={count} />
                    </strong>
                    <p className="mt-2 text-xs text-[#7b898d]">{description}</p>
                  </article>
                ))}
              </section>
              <section className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
                <div className="rounded-xl border border-[#dce3df] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[14px] font-bold text-[#a87825]">CASE PIPELINE</span>
                      <h2 className="mt-1 font-serif text-2xl text-[#082632]">Your active matters</h2>
                    </div>
                    <button onClick={() => setActive('Cases')} className="text-xs font-bold text-[#1d6e68]">
                      View workspace →
                    </button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {cases.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelected(String(c.id))
                          setActive('Cases')
                        }}
                        className="flex w-full items-center gap-4 rounded-xl border border-[#e2e7e4] p-4 text-left transition hover:border-[#9fc6be]"
                      >
                        <span className={`h-10 w-1 rounded-full ${c.caseType === 'criminal' ? 'bg-[#b95d4d]' : 'bg-[#4c8a82]'}`} />
                        <div className="min-w-0 flex-1">
                          <b className="block truncate text-sm text-[#082632]">{c.title}</b>
                          <span className="mt-1 block font-mono text-[14px] text-[#829095]">{c.officialCaseNumber || c.platformReference}</span>
                        </div>
                        <span className="rounded-full bg-[#eef3f1] px-3 py-1 text-[14px] font-bold text-[#52666a]">{(stageLabels[c.stage] || c.stage).toUpperCase()}</span>
                      </button>
                    ))}
                    {cases.length === 0 && <Empty title="No assigned cases yet" text="Create an intake or wait for an authorised case assignment." />}
                  </div>
                </div>
                <div className="rounded-xl border border-[#dce3df] bg-white p-5">
                  <span className="text-[14px] font-bold text-[#a87825]">NEXT ON THE ROLL</span>
                  <h2 className="mt-1 font-serif text-2xl text-[#082632]">Hearings & deadlines</h2>
                  <div className="mt-5 space-y-4">
                    {hearings
                      .filter((h) => new Date(h.startsAt) > new Date(Date.now() - 864e5))
                      .slice(0, 4)
                      .map((h) => (
                        <div key={h.id} className="border-l-2 border-[#d9b45f] pl-4">
                          <b className="block text-sm capitalize">{h.hearingType.replaceAll('-', ' ')}</b>
                          <time className="mt-1 block text-xs text-[#65767b]">
                            {dateTime(h.startsAt)} · {h.courtroom}
                          </time>
                        </div>
                      ))}
                    {cases
                      .filter((c) => c.detentionDeadline)
                      .map((c) => (
                        <div key={`d${c.id}`} className="border-l-2 border-[#b95d4d] pl-4">
                          <b className="block text-sm">Detention deadline</b>
                          <time className="mt-1 block text-xs text-[#65767b]">
                            {dateTime(c.detentionDeadline)} · {c.platformReference}
                          </time>
                        </div>
                      ))}
                    {hearings.length === 0 && <p className="text-xs leading-5 text-[#7b898d]">No hearings are currently scheduled.</p>}
                  </div>
                </div>
              </section>
              <JusticeInsights
                role={role}
                cases={cases}
                hearings={hearings}
                audit={audit}
                messages={messages}
                decisions={decisions}
                go={(tab, caseId) => {
                  if (caseId) setSelected(String(caseId))
                  setActive(tab)
                }}
              />
              {role === 'legal-aid' && <LegalAidQueue items={legalAid} {...tools} />}
            </>
          )}

          {active === 'Cases' && (
            <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
              <div className="space-y-4">
                {cases.map((c) => (
                  <article key={c.id} className={`rounded-xl border bg-white p-5 ${String(currentCase?.id) === String(c.id) ? 'border-[#4c8a82] ring-2 ring-[#dceee9]' : 'border-[#dce3df]'}`}>
                    <button onClick={() => setSelected(String(c.id))} className="w-full text-left">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[#082632] px-3 py-1 text-[14px] font-bold text-white">{c.caseType.toUpperCase()}</span>
                        <span className="rounded-full bg-[#edf3f1] px-3 py-1 text-[14px] font-bold text-[#51666a]">{stageLabels[c.stage] ?? c.stage}</span>
                        <span className="ml-auto font-mono text-[14px] text-[#718287]">{c.officialCaseNumber || c.platformReference}</span>
                      </div>
                      <h2 className="mt-4 font-serif text-2xl text-[#082632]">{c.title}</h2>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#66777b]">{c.summary}</p>
                    </button>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#e5e9e7] pt-4 text-[14px] sm:grid-cols-3">
                      <div>
                        <b className="text-[#849196]">COURT</b>
                        <span className="mt-1 block text-xs">{c.courtName || 'Not enrolled'}</span>
                      </div>
                      <div>
                        <b className="text-[#849196]">NEXT DEADLINE</b>
                        <span className="mt-1 block text-xs">{c.nextDeadline ? dateTime(c.nextDeadline) : 'None recorded'}</span>
                      </div>
                      <div>
                        <b className="text-[#849196]">PARTICIPANTS</b>
                        <span className="mt-1 block text-xs">{c.participants.length ? c.participants.map((p) => p.name).join(', ') : 'Awaiting assignment'}</span>
                      </div>
                    </div>
                    {String(currentCase?.id) === String(c.id) && <CaseRecord c={c} docket={docket} decisions={decisions} hearings={hearings} role={role} {...tools} />}
                  </article>
                ))}
                {cases.length === 0 && <Empty title="No cases in this workspace" text="Your cases will appear here after intake or assignment." />}
              </div>
              <div className="space-y-4">
                {role === 'client' && <ClientCaseTools identity={user.identityStatus} {...tools} />}
                {role === 'saps' && <PoliceTools {...tools} />}
                {role === 'prosecutor' && <ProsecutorTools {...tools} />}
                {role === 'clerk' && <ClerkTools {...tools} />}
                {role === 'judicial-officer' && <JudicialTools {...tools} />}
                {(role === 'lawyer' || role === 'legal-aid') && <PractitionerTools records={timeRecords} {...tools} />}
                {role === 'legal-aid' && <LegalAidQueue items={legalAid} {...tools} />}
                {['clerk', 'saps', 'legal-aid', 'admin'].includes(role) && currentCase && <AssignTool role={role} {...tools} />}
              </div>
            </section>
          )}

          {active === 'Court roll' && (
            <section className="mt-5 rounded-xl border border-[#dce3df] bg-white p-5">
              <h2 className="font-serif text-3xl text-[#082632]">Court roll</h2>
              <p className="mt-2 text-xs text-[#718186]">Only hearings for cases assigned to you are shown.</p>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#dce3df] text-[14px] text-[#7f8d91]">
                      <th className="pb-3">DATE & TIME</th>
                      <th className="pb-3">CASE</th>
                      <th className="pb-3">HEARING</th>
                      <th className="pb-3">COURTROOM</th>
                      <th className="pb-3">STATUS</th>
                      {['clerk', 'judicial-officer'].includes(role) && <th className="pb-3">UPDATE</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {hearings.map((h) => {
                      const c = cases.find((x) => x.id === h.caseId)
                      return (
                        <tr key={h.id} className="border-b border-[#edf0ee]">
                          <td className="py-4 font-bold">{dateTime(h.startsAt)}</td>
                          <td>{c?.officialCaseNumber || c?.platformReference || 'Restricted'}</td>
                          <td className="capitalize">{h.hearingType.replaceAll('-', ' ')}</td>
                          <td>{h.courtroom}</td>
                          <td>
                            <span className="rounded-full bg-[#edf3f1] px-2 py-1 text-[14px] font-bold">{h.status.toUpperCase()}</span>
                          </td>
                          {['clerk', 'judicial-officer'].includes(role) && (
                            <td>
                              <select
                                className="h-9 rounded-lg border border-[#d7dfdc] bg-white px-2 text-xs"
                                value={h.status}
                                onChange={(e) => run(() => api.patch(`/justice/hearings/${h.id}`, { status: e.target.value }), 'Hearing updated.')}
                              >
                                {['scheduled', 'in-progress', 'postponed', 'completed', 'cancelled'].map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {hearings.length === 0 && <Empty title="The assigned roll is clear" text="Scheduled matters will appear here." />}
              </div>
            </section>
          )}

          {active === 'Documents' && (
            <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
              <div className="rounded-xl border border-[#dce3df] bg-white p-5">
                <h2 className="font-serif text-3xl text-[#082632]">Secure filings & evidence</h2>
                <div className="mt-5 space-y-3">
                  {filings.map((f) => (
                    <article key={f.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-[#e1e6e3] p-4">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf3f1] text-[14px] font-bold text-[#1d6e68]">FILE</span>
                      <div className="min-w-0 flex-1">
                        <b className="text-sm">{f.title}</b>
                        <p className="mt-1 text-[14px] text-[#7f8c90]">
                          {f.fileType.toUpperCase()} · {f.ownerName} · {date(f.createdAt)} · {cases.find((c) => c.id === f.caseId)?.platformReference}
                        </p>
                        <p className="mt-1 truncate font-mono text-[14px] text-[#879397]">SHA-256 {f.sha256}</p>
                      </div>
                      <span className="rounded-full bg-[#fff4dc] px-2 py-1 text-[14px] font-bold text-[#8a641d]">{f.filingStatus.toUpperCase()}</span>
                      <a href={`/api/justice/files/${f.id}/download`} className="text-xs font-bold text-[#1d6e68]">
                        Download
                      </a>
                      {role === 'clerk' && f.filingStatus !== 'sealed' && (
                        <select
                          className="h-9 rounded-lg border border-[#d7dfdc] bg-white px-2 text-xs"
                          defaultValue=""
                          onChange={(e) => e.target.value && run(() => api.post(`/justice/files/${f.id}/status`, { status: e.target.value }), 'Filing status updated.')}
                        >
                          <option value="">Clerk action…</option>
                          <option value="accepted">Accept</option>
                          <option value="rejected">Reject</option>
                          <option value="sealed">Seal</option>
                        </select>
                      )}
                    </article>
                  ))}
                  {filings.length === 0 && <Empty title="No case files submitted" text="Secure uploads and e-filings appear here." />}
                </div>
              </div>
              <UploadTool {...tools} />
            </section>
          )}

          {active === 'Messages' && (
            <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
              <div className="space-y-5">
                <div className="rounded-xl border border-[#dce3df] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-3xl text-[#082632]">Secure case messages</h2>
                    {messages.some((m) => m.incoming && !m.readAt) && (
                      <button className="text-xs font-bold text-[#1d6e68]" onClick={() => run(() => api.post('/justice/messages/read'), 'Messages marked as read.')}>
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#718186]">Messages are restricted to assigned case participants.</p>
                  <div className="mt-6 space-y-3">
                    {messages.map((m) => (
                      <article key={m.id} className={`rounded-lg border p-4 ${m.incoming && !m.readAt ? 'border-[#d9b45f] bg-[#fffaf0]' : 'border-[#e1e6e3]'}`}>
                        <div className="flex flex-wrap gap-3">
                          <b className="text-sm">{m.subject}</b>
                          <span className="ml-auto text-[14px] text-[#829095]">{dateTime(m.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-[14px] font-bold text-[#a87825]">{m.incoming ? `From ${m.senderName}` : `To ${m.recipientName}`}</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#65767b]">{m.message}</p>
                      </article>
                    ))}
                    {messages.length === 0 && <Empty title="No messages yet" text="Messages with assigned participants appear here." />}
                  </div>
                </div>
                <div className="rounded-xl border border-[#dce3df] bg-white p-5">
                  <h2 className="font-serif text-2xl text-[#082632]">Notifications</h2>
                  <div className="mt-4 space-y-3">
                    {notifications.slice(0, 10).map((n) => (
                      <article key={n.id} className="rounded-lg border border-[#e1e6e3] p-4">
                        <div className="flex gap-3">
                          <b className="text-sm">{n.title}</b>
                          <span className="ml-auto text-[14px] font-bold text-[#1d6e68]">{n.deliveryStatus.toUpperCase()}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[#65767b]">{n.message}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
              <MessageTool {...tools} />
            </section>
          )}

          {active === 'Activity' && (
            <section className="mt-5 rounded-xl border border-[#dce3df] bg-white p-5">
              <h2 className="font-serif text-3xl text-[#082632]">Immutable activity trail</h2>
              <p className="mt-2 text-xs text-[#718186]">Workflow actions are append-only — the database itself rejects edits and deletions.</p>
              <div className="mt-6 space-y-0">
                {audit.map((a) => (
                  <article key={a.id} className="relative border-l border-[#b7cbc6] pb-7 pl-6">
                    <span className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-[#d9b45f] ring-4 ring-[#fff8e9]" />
                    <div className="flex flex-wrap gap-3">
                      <b className="text-sm">{a.action}</b>
                      <span className="text-[14px] font-bold text-[#a87825]">{a.actor}</span>
                      <time className="ml-auto text-[14px] text-[#849196]">{dateTime(a.createdAt)}</time>
                    </div>
                    {a.details && <p className="mt-2 text-xs text-[#65767b]">{a.details}</p>}
                  </article>
                ))}
                {audit.length === 0 && <Empty title="No workflow events yet" text="Authorised activity will be recorded here." />}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function CaseRecord({ c, docket, decisions, hearings, role, run, pending }) {
  const d = docket.filter((x) => x.caseId === c.id)
  const dec = decisions.filter((x) => x.caseId === c.id)
  const h = hearings.filter((x) => x.caseId === c.id)
  const canSeeDocket = ['saps', 'prosecutor', 'clerk', 'judicial-officer', 'lawyer', 'legal-aid', 'admin'].includes(role)
  return (
    <div className="mt-5 space-y-4 border-t border-[#e5e9e7] pt-4">
      <p className="whitespace-pre-wrap text-xs leading-6 text-[#52646a]">{c.summary}</p>
      {canSeeDocket && d.length > 0 && (
        <div>
          <b className="text-[14px] tracking-[.12em] text-[#a87825]">DOCKET ({d.length})</b>
          <ul className="mt-2 space-y-2">
            {d.map((x) => (
              <li key={x.id} className="rounded-lg bg-[#f7f8f6] p-3 text-xs">
                <b>{x.title}</b> <span className="text-[14px] uppercase text-[#829095]">· {x.entryType.replaceAll('-', ' ')} · {x.ownerName} · {date(x.occurredAt)}</span>
                <p className="mt-1 text-[#65767b]">{x.details}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {h.length > 0 && (
        <div>
          <b className="text-[14px] tracking-[.12em] text-[#a87825]">HEARINGS</b>
          <ul className="mt-2 space-y-1 text-xs">
            {h.map((x) => (
              <li key={x.id}>
                <span className="capitalize">{x.hearingType.replaceAll('-', ' ')}</span> · {dateTime(x.startsAt)} · {x.courtroom} · {x.status}
                {x.outcome ? ` — ${x.outcome}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {dec.length > 0 && (
        <div>
          <b className="text-[14px] tracking-[.12em] text-[#a87825]">SEALED DECISIONS</b>
          <ul className="mt-2 space-y-2">
            {dec.map((x) => (
              <li key={x.id} className="rounded-lg border border-[#e3cba0] bg-[#fff8ea] p-3 text-xs">
                <b>{x.title}</b> <span className="text-[14px] uppercase text-[#8a641d]">· {x.decisionType} · {date(x.effectiveAt)}</span>
                <p className="mt-1 whitespace-pre-wrap text-[#65767b]">{x.summary}</p>
                {x.appealable && <p className="mt-1 text-[14px] font-bold text-[#8a641d]">Appealable</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {['saps', 'prosecutor', 'clerk', 'judicial-officer'].includes(role) && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const v = new FormData(e.currentTarget).get('detention')
            run(() => api.post(`/justice/cases/${c.id}/deadlines`, { detentionDeadline: toIso(v) }), 'Detention deadline recorded.')
          }}
        >
          <label className="text-[14px] font-bold text-[#849196]">
            DETENTION DEADLINE
            <input name="detention" type="datetime-local" className="mt-1 block h-9 rounded-lg border border-[#d7dfdc] px-2 text-xs" />
          </label>
          <button disabled={pending} className="h-9 rounded-lg border border-[#082632] px-3 text-xs font-bold">
            Save
          </button>
        </form>
      )}
    </div>
  )
}

function ClientCaseTools({ submit, pending, identity }) {
  return (
    <>
      <Panel eyebrow="NEW MATTER" title="Start a digital intake">
        <form onSubmit={submit((d) => api.post('/justice/cases', { ...d, rightsConfirmed: d.rightsConfirmed === 'on' }), 'Intake created.')} className="space-y-3">
          <input className={input} name="title" required placeholder="Short case title" />
          <select className={input} name="caseType" required>
            <option value="">Criminal or civil?</option>
            <option value="criminal">Criminal matter</option>
            <option value="civil">Civil matter</option>
          </select>
          <input className={input} name="jurisdiction" placeholder="Town, station or court area" />
          <textarea className={textarea} name="summary" minLength={30} rows={5} required placeholder="Explain what happened in plain language" />
          <label className="flex gap-2 text-xs leading-4 text-[#65767b]">
            <input type="checkbox" name="rightsConfirmed" required />I understand this is a digital intake, not an official CAS or court case.
          </label>
          <button disabled={pending} className={button}>
            Create secure intake
          </button>
        </form>
      </Panel>
      {identity !== 'verified' && identity !== 'pending' && (
        <Panel eyebrow="IDENTITY" title="Request SA ID review">
          <form onSubmit={submit((d) => api.post('/justice/identity', d), 'Identity review requested.')} className="space-y-3">
            <p className="text-xs leading-5 text-[#65767b]">
              Your full ID is validated in memory and not stored. Only the last four digits are retained for manual verification.
            </p>
            <input className={input} name="idNumber" inputMode="numeric" pattern="[0-9]{13}" maxLength={13} required placeholder="13-digit South African ID number" />
            <button disabled={pending} className={button}>
              Submit for manual review
            </button>
          </form>
        </Panel>
      )}
    </>
  )
}

const DOCKET_TYPES = [
  ['statement', 'Statement'],
  ['arrest', 'Arrest'],
  ['investigation', 'Investigation'],
  ['warrant-request', 'Warrant request'],
  ['summons', 'Summons'],
  ['bail', 'Bail'],
  ['detention', 'Detention'],
  ['prosecutor-handover', 'Prosecutor handover'],
]

function DocketForm({ caseSelect, submit, pending }) {
  return (
    <Panel eyebrow="DOCKET" title="Add immutable docket entry">
      <form onSubmit={submit((d) => api.post('/justice/docket', d), 'Docket entry recorded.')} className="space-y-3">
        {caseSelect}
        <input className={input} name="title" required placeholder="Entry title" />
        <select className={input} name="entryType">
          {DOCKET_TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <textarea className={textarea} name="details" rows={5} required minLength={10} placeholder="Factual docket entry" />
        <button disabled={pending} className={button}>
          Record docket entry
        </button>
      </form>
    </Panel>
  )
}

function PoliceTools(props) {
  const { caseSelect, currentCase, submit, pending } = props
  return (
    <>
      <Panel eyebrow="OFFICIAL REGISTRATION" title="Register authorised reference">
        <form onSubmit={submit((d) => api.post(`/justice/cases/${d.case}/official-number`, d), 'Official reference registered.')} className="space-y-3">
          {caseSelect}
          <input className={input} name="number" required placeholder="CAS / authorised reference" defaultValue={currentCase?.officialCaseNumber || ''} key={currentCase?.id} />
          <button disabled={pending || !currentCase} className={button}>
            Register case
          </button>
        </form>
      </Panel>
      <DocketForm {...props} />
    </>
  )
}

function ProsecutorTools(props) {
  const { currentCase, run, pending } = props
  const [reason, setReason] = useState('')
  return (
    <>
      <Panel eyebrow="PROSECUTION DECISION" title={currentCase ? `Decide on ${currentCase.platformReference}` : 'Choose a case'}>
        <textarea className={textarea} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reasons (recorded in the audit trail)" />
        <button
          disabled={pending || !currentCase}
          onClick={() => run(() => api.post(`/justice/cases/${currentCase.id}/prosecution`, { decision: 'prosecute', reason }), 'Prosecution decision recorded.')}
          className={button}
        >
          Authorise prosecution
        </button>
        <button
          disabled={pending || !currentCase}
          onClick={() =>
            window.confirm('Decline prosecution and close this case?') &&
            run(() => api.post(`/justice/cases/${currentCase.id}/prosecution`, { decision: 'decline', reason }), 'Declination recorded.')
          }
          className="w-full rounded-lg border border-[#a14e43] px-4 py-3 text-xs font-bold text-[#a14e43]"
        >
          Decline prosecution
        </button>
      </Panel>
      <DocketForm {...props} />
    </>
  )
}

function ClerkTools({ caseSelect, currentCase, submit, pending }) {
  return (
    <>
      <Panel eyebrow="COURT ENROLMENT" title="Schedule on the court roll">
        <form onSubmit={submit((d) => api.post('/justice/hearings', { ...d, startsAt: toIso(d.startsAt) }), 'Hearing scheduled.')} className="space-y-3">
          {caseSelect}
          <select className={input} name="hearingType">
            <option value="first-appearance">First appearance</option>
            <option value="bail">Bail hearing</option>
            <option value="motion">Motion</option>
            <option value="trial">Trial</option>
            <option value="sentencing">Sentencing</option>
            <option value="appeal">Appeal</option>
          </select>
          <input className={input} name="startsAt" type="datetime-local" required />
          <input className={input} name="courtroom" required placeholder="Court and courtroom" />
          <button disabled={pending} className={button}>
            Add to court roll
          </button>
        </form>
      </Panel>
      <Panel eyebrow="COURT REFERENCE" title="Record court case number">
        <form onSubmit={submit((d) => api.post(`/justice/cases/${currentCase.id}/official-number`, d), 'Court reference registered.')} className="space-y-3">
          <input className={input} name="number" required placeholder="Official court case number" />
          <input className={input} name="courtName" placeholder="Court name" defaultValue={currentCase?.courtName || ''} key={currentCase?.id} />
          <button disabled={pending || !currentCase} className={button}>
            Save official number
          </button>
        </form>
      </Panel>
    </>
  )
}

function JudicialTools({ caseSelect, submit, pending }) {
  return (
    <Panel eyebrow="JUDICIAL RECORD" title="Record order or judgment">
      <form onSubmit={submit((d) => api.post('/justice/decisions', { ...d, appealable: d.appealable === 'on' }), 'Decision recorded.')} className="space-y-3">
        {caseSelect}
        <input className={input} name="title" required placeholder="Decision title" />
        <select className={input} name="decisionType">
          <option value="order">Order</option>
          <option value="judgment">Judgment</option>
          <option value="sentence">Sentence</option>
          <option value="warrant">Warrant</option>
          <option value="appeal-outcome">Appeal outcome</option>
        </select>
        <textarea className={textarea} name="summary" rows={6} required minLength={10} placeholder="Reasons, terms and outcome" />
        <label className="flex gap-2 text-xs text-[#65767b]">
          <input type="checkbox" name="appealable" />
          This decision may be appealed
        </label>
        <button disabled={pending} className={button}>
          Seal decision record
        </button>
      </form>
    </Panel>
  )
}

function PractitionerTools({ caseSelect, currentCase, submit, run, pending, records }) {
  const total = records.reduce((s, r) => s + r.minutes, 0)
  const billable = records.filter((r) => r.billable && r.hourlyRate).reduce((s, r) => s + (r.minutes / 60) * r.hourlyRate, 0)
  return (
    <>
      <Panel eyebrow="TIME & BILLING" title="Record practitioner time">
        <form
          onSubmit={submit((d) => api.post('/justice/time', { ...d, minutes: Number(d.minutes), billable: d.billable === 'on' }), 'Time record saved.')}
          className="space-y-3"
        >
          {caseSelect}
          <input className={input} name="description" required placeholder="Work performed" />
          <div className="grid grid-cols-2 gap-2">
            <input className={input} name="minutes" type="number" min="1" max="1440" required placeholder="Minutes" />
            <input className={input} name="hourlyRate" type="number" min="0" placeholder="Hourly rate (R)" />
          </div>
          <label className="flex gap-2 text-xs text-[#65767b]">
            <input type="checkbox" name="billable" defaultChecked />
            Billable time
          </label>
          <button disabled={pending} className={button}>
            Save time entry
          </button>
        </form>
        {records.length > 0 && (
          <div className="border-t border-[#e5e9e7] pt-3 text-xs">
            <p className="font-bold">
              {Math.floor(total / 60)}h {total % 60}m recorded · R {billable.toLocaleString('en-ZA', { maximumFractionDigits: 2 })} billable
            </p>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {records.map((r) => (
                <li key={r.id} className="flex justify-between gap-2 text-[#65767b]">
                  <span>
                    {date(r.workedAt)} · {r.caseReference} · {r.description} · {r.minutes} min
                  </span>
                  <button className="text-[#a14e43]" onClick={() => run(() => api.del(`/justice/time/${r.id}`), 'Time entry removed.')}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
      <Panel eyebrow="DEADLINES" title="Next procedural deadline">
        <form onSubmit={submit((d) => api.post(`/justice/cases/${currentCase.id}/deadlines`, { nextDeadline: toIso(d.nextDeadline) }), 'Deadline saved.')} className="space-y-3">
          <input className={input} name="nextDeadline" type="datetime-local" required />
          <button disabled={pending || !currentCase} className={button}>
            Save deadline for {currentCase?.platformReference ?? 'selected case'}
          </button>
        </form>
      </Panel>
    </>
  )
}

function LegalAidQueue({ items, run, pending }) {
  return (
    <Panel eyebrow="LEGAL AID SCREENING" title={`Screening queue (${items.filter((i) => ['requested', 'screening'].includes(i.status)).length})`}>
      {items.length === 0 && <p className="text-xs text-[#7b898d]">No requests.</p>}
      {items.map((l) => (
        <article key={l.id} className="rounded-lg border border-[#e1e6e3] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-sm">{l.caseTitle}</b>
            <span className="ml-auto rounded-full bg-[#fff4dc] px-2 py-1 text-[14px] font-bold text-[#8a641d]">{l.status.toUpperCase()}</span>
          </div>
          <p className="mt-1 text-[14px] text-[#829095]">
            {l.caseReference} · {l.ownerName} · {date(l.createdAt)}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#65767b]">{l.motivation}</p>
          {['requested', 'screening', 'approved'].includes(l.status) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {l.status === 'requested' && (
                <button disabled={pending} onClick={() => run(() => api.post(`/justice/legal-aid/${l.id}`, { status: 'screening' }), 'Screening started.')} className="rounded-lg border border-[#082632] px-3 py-2 text-[14px] font-bold">
                  Start screening
                </button>
              )}
              {l.status !== 'approved' && (
                <button disabled={pending} onClick={() => run(() => api.post(`/justice/legal-aid/${l.id}`, { status: 'approved' }), 'Request approved.')} className="rounded-lg border border-[#1d6e68] px-3 py-2 text-[14px] font-bold text-[#1d6e68]">
                  Approve
                </button>
              )}
              <button
                disabled={pending}
                onClick={() => run(() => api.post(`/justice/legal-aid/${l.id}`, { status: 'assigned' }), 'You were assigned to the case.')}
                className="rounded-lg bg-[#082632] px-3 py-2 text-[14px] font-bold text-white"
              >
                Assign to me
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  const note = window.prompt('Reason for declining (shared with the applicant):')
                  if (note) run(() => api.post(`/justice/legal-aid/${l.id}`, { status: 'declined', note }), 'Request declined.')
                }}
                className="rounded-lg border border-[#a14e43] px-3 py-2 text-[14px] font-bold text-[#a14e43]"
              >
                Decline
              </button>
            </div>
          )}
        </article>
      ))}
    </Panel>
  )
}

function AssignTool({ role, currentCase, submit, pending }) {
  const who = {
    clerk: 'clients, legal practitioners or court officials',
    saps: 'another SAPS official',
    'legal-aid': 'a Legal Aid or private practitioner',
    admin: 'any participant',
  }[role]
  return (
    <Panel eyebrow="ASSIGNMENT" title={`Add to ${currentCase.platformReference}`}>
      <form onSubmit={submit((d) => api.post(`/justice/cases/${currentCase.id}/participants`, d), 'Participant assigned.')} className="space-y-3">
        <p className="text-xs leading-5 text-[#65767b]">Your role can add {who}. Enter the email of their registered account.</p>
        <input className={input} type="email" name="email" required placeholder="name@example.co.za" />
        <button disabled={pending} className={button}>
          Assign participant
        </button>
      </form>
    </Panel>
  )
}

function UploadTool({ caseSelect, run, pending }) {
  return (
    <Panel eyebrow="E-FILING" title="Submit a secure file">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const el = e.currentTarget
          run(() => api.upload('/justice/files', new FormData(el)), 'Secure file submitted.', el)
        }}
        className="space-y-3"
      >
        {caseSelect}
        <input className={input} name="title" required placeholder="Document title" />
        <select className={input} name="fileType">
          <option value="evidence">Evidence</option>
          <option value="pleading">Pleading</option>
          <option value="summons">Summons</option>
          <option value="affidavit">Affidavit</option>
          <option value="bail-application">Bail application</option>
          <option value="notice">Notice</option>
          <option value="judgment">Judgment</option>
          <option value="appeal">Appeal</option>
          <option value="other">Other</option>
        </select>
        <input className="block w-full text-xs" name="file" type="file" accept=".pdf,.txt,.doc,.docx,image/*" required />
        <p className="text-[14px] leading-4 text-[#7d8b8f]">PDF, Word, image or text · maximum 15 MB · visible only to permitted case participants.</p>
        <button disabled={pending} className={button}>
          Upload and submit
        </button>
      </form>
    </Panel>
  )
}

function MessageTool({ currentCase, caseSelect, submit, pending }) {
  return (
    <>
      <Panel eyebrow="SECURE MESSAGE" title="Message a case participant">
        <form onSubmit={submit((d) => api.post('/justice/messages', d), 'Message sent.')} className="space-y-3">
          {caseSelect}
          <select className={input} name="recipient" required>
            <option value="">Choose recipient</option>
            {currentCase?.participants.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name} · {roleNames[p.role]}
              </option>
            ))}
          </select>
          <input className={input} name="subject" required placeholder="Subject" />
          <textarea className={textarea} name="message" rows={5} required placeholder="Write a secure case message" />
          <button disabled={pending} className={button}>
            Send secure message
          </button>
        </form>
      </Panel>
      {currentCase && (
        <Panel eyebrow="LEGAL REPRESENTATION" title="Request Legal Aid screening">
          <form onSubmit={submit((d) => api.post('/justice/legal-aid', { ...d, case: currentCase.id }), 'Legal Aid screening requested.')} className="space-y-3">
            <textarea className={textarea} name="motivation" minLength={20} rows={4} required placeholder="Explain your financial and legal assistance needs" />
            <button disabled={pending} className={button}>
              Request screening
            </button>
          </form>
        </Panel>
      )}
    </>
  )
}

// Role-aware shortcuts, case stage breakdown, latest activity and inbox for the overview.
const ROLE_ACTIONS = {
  saps: [
    ['Open docket entry', 'Record statements, exhibits and investigation steps', 'Cases'],
    ['Upload evidence', 'Attach files to a case record', 'Documents'],
    ['Message prosecutor', 'Send a secure note to an assigned participant', 'Messages'],
  ],
  prosecutor: [
    ['Review dockets', 'Decide to prosecute, decline or request more', 'Cases'],
    ['Court roll', 'See upcoming appearances', 'Court roll'],
    ['Case documents', 'Charge sheets and filings', 'Documents'],
  ],
  clerk: [
    ['Schedule a hearing', 'Add a case to the court roll', 'Cases'],
    ['Manage the roll', 'Update hearing status and outcomes', 'Court roll'],
    ['Accept filings', 'Review and seal documents', 'Documents'],
  ],
  'judicial-officer': [
    ['Record a decision', 'Orders, judgments and sentences', 'Cases'],
    ['Today’s roll', 'Hearings before you', 'Court roll'],
    ['Case record', 'Filed documents and evidence', 'Documents'],
  ],
  'legal-aid': [
    ['Screen requests', 'Approve or decline Legal Aid applications', 'Overview'],
    ['Log time', 'Record work on assigned cases', 'Cases'],
    ['Message client', 'Secure case messages', 'Messages'],
  ],
  lawyer: [
    ['Case workspace', 'Filings, time records and case notes', 'Cases'],
    ['File a document', 'Upload to the case record', 'Documents'],
    ['Messages', 'Talk to case participants', 'Messages'],
  ],
  client: [
    ['Follow my case', 'Stage, hearings and decisions', 'Cases'],
    ['My documents', 'Statements and uploads', 'Documents'],
    ['Messages', 'Contact your case team', 'Messages'],
  ],
  admin: [
    ['All cases', 'Review stages and participants', 'Cases'],
    ['Court roll', 'Every scheduled hearing', 'Court roll'],
    ['Audit trail', 'Who did what, and when', 'Activity'],
  ],
}

function JusticeInsights({ role, cases, hearings, audit, messages, decisions, go }) {
  const actions = ROLE_ACTIONS[role] || ROLE_ACTIONS.client
  const byStage = Object.keys(stageLabels)
    .map((k) => [k, cases.filter((c) => c.stage === k).length])
    .filter(([, n]) => n > 0)
  const max = Math.max(1, ...byStage.map(([, n]) => n))
  const inbox = messages.filter((m) => m.incoming).slice(0, 3)
  const unreadInbox = messages.filter((m) => m.incoming && !m.readAt).length
  const overdue = hearings.filter((h) => h.status === 'scheduled' && new Date(h.startsAt) < new Date(Date.now() - 864e5)).length
  const recentDecision = decisions[0]
  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-3">
      <div className="rounded-xl border border-[#dce3df] bg-white p-5">
        <span className="text-[14px] font-bold text-[#a87825]">QUICK ACTIONS</span>
        <h2 className="mt-1 font-serif text-2xl text-[#082632]">Your tools</h2>
        <div className="mt-4 grid gap-2">
          {actions.map(([title, text, tab]) => (
            <button key={title} onClick={() => go(tab)} className="justice-action">
              <b>{title}</b>
              <small>{text}</small>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
        {overdue > 0 && (
          <p className="mt-4 rounded-lg bg-[#f8e6e2] px-3 py-2 text-[14px] text-[#9c453e]">
            {overdue} hearing{overdue > 1 ? 's are' : ' is'} past its date but still marked scheduled. Update the outcome on the court roll.
          </p>
        )}
      </div>
      <div className="rounded-xl border border-[#dce3df] bg-white p-5">
        <span className="text-[14px] font-bold text-[#a87825]">CASE STAGES</span>
        <h2 className="mt-1 font-serif text-2xl text-[#082632]">Where your cases are</h2>
        {byStage.length === 0 ? (
          <p className="mt-4 text-[14px] text-[#7b898d]">No cases yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {byStage.map(([k, n]) => (
              <li key={k}>
                <button className="stage-bar" onClick={() => go('Cases', cases.find((c) => c.stage === k)?.id)}>
                  <span>{stageLabels[k]}</span>
                  <b>{n}</b>
                  <i style={{ width: `${(n / max) * 100}%` }} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {recentDecision && (
          <div className="mt-5 rounded-lg bg-[#f4f6f5] p-3 text-[14px]">
            <span className="font-bold text-[#a87825]">LATEST DECISION</span>
            <b className="mt-1 block text-[#082632]">{recentDecision.title}</b>
            <span className="text-[#65767b]">
              {recentDecision.decisionType} · {dateTime(recentDecision.effectiveAt)}
            </span>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-[#dce3df] bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[14px] font-bold text-[#a87825]">INBOX{unreadInbox ? ` · ${unreadInbox} UNREAD` : ''}</span>
            <h2 className="mt-1 font-serif text-2xl text-[#082632]">Recent messages</h2>
          </div>
          <button onClick={() => go('Messages')} className="text-[14px] font-bold text-[#1d6e68]">
            Open →
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {inbox.length === 0 && <li className="text-[14px] text-[#7b898d]">No messages yet.</li>}
          {inbox.map((m) => (
            <li key={m.id} className={`rounded-lg border p-3 text-[14px] ${m.readAt ? 'border-[#e2e7e4]' : 'border-[#e3cba0] bg-[#fffaf0]'}`}>
              <b className="block text-[#082632]">{m.subject}</b>
              <span className="text-[#65767b]">
                {m.senderName} · {dateTime(m.createdAt)}
              </span>
            </li>
          ))}
        </ul>
        <span className="mt-5 block text-[14px] font-bold text-[#a87825]">LATEST ACTIVITY</span>
        <ul className="mt-2 space-y-2">
          {audit.slice(0, 4).map((a) => (
            <li key={a.id} className="text-[14px] leading-5">
              <b className="text-[#082632]">{a.actor}</b> <span className="text-[#52646a]">{a.action.replaceAll('-', ' ')}</span>
              <small className="block text-[13px] text-[#829095]">{dateTime(a.createdAt)}</small>
            </li>
          ))}
          {audit.length === 0 && <li className="text-[14px] text-[#7b898d]">No activity recorded yet.</li>}
        </ul>
        {audit.length > 4 && (
          <button onClick={() => go('Activity')} className="mt-3 text-[14px] font-bold text-[#1d6e68]">
            Full audit trail →
          </button>
        )}
      </div>
    </section>
  )
}
