import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loading, Notice } from '../../components/ui'
import { PublicHeader } from '../../components/PublicHeader'
import { LogoMark } from '../../components/Icon'
import { api } from '../../lib/api'
import { useApi, useAuth } from '../../lib/auth'
import { dateTime, date, homeFor } from '../../lib/format'

const INCIDENT_TYPES = ['Assault', 'Theft or robbery', 'Fraud', 'Domestic violence', 'Property damage', 'Harassment or intimidation', 'Missing person', 'Other']
const STEPS = ['platform-draft', 'reported-to-saps', 'under-investigation', 'court-enrolled', 'closed']
const input = 'mt-2 h-12 w-full rounded-lg border border-[#cdd6d2] bg-white px-4 text-sm font-normal outline-none focus:border-[#1f6e6a]'

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 font-serif text-2xl text-[#0b2635]" aria-label="LexBridge home">
      <LogoMark height={36} />
      <span>
        Lex<b className="font-medium text-[#b8892f]">Bridge</b>
      </span>
    </Link>
  )
}

function SignInGate({ next }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f6f4] px-5">
      <section className="max-w-xl rounded-2xl border border-[#dce3df] bg-white p-9 text-center shadow-[0_24px_70px_rgba(8,34,47,.1)]">
        <span className="text-[14px] font-bold tracking-[.15em] text-[#a67722]">PRIVATE CASE RECORDS</span>
        <h1 className="mt-4 font-serif text-4xl text-[#0b2635]">Sign in before recording a police matter.</h1>
        <p className="mt-4 text-sm leading-6 text-[#65767b]">
          Your statement, evidence and case timeline contain sensitive personal information and must be tied to a secure account.
        </p>
        <p className="mt-4 rounded-lg border border-[#e3cba0] bg-[#fff8ea] p-3 text-xs text-[#77591e]">
          <b>Emergency?</b> Call SAPS on 10111 or the GBV Command Centre on 0800 428 428.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="rounded-lg bg-[#0b2635] px-5 py-3 text-xs font-bold text-white">
            Sign in
          </Link>
          <Link to={`/login?mode=signup&next=${encodeURIComponent(next)}`} className="rounded-lg border border-[#cbd4d1] px-5 py-3 text-xs font-bold text-[#0b2635]">
            Create account
          </Link>
        </div>
      </section>
    </main>
  )
}

export function PoliceReport() {
  const { user } = useAuth()
  if (user === undefined) return <Loading />
  if (!user) return <SignInGate next="/police-report" />
  return <PoliceReportForm />
}

function PoliceReportForm() {
  const { user } = useAuth()
  const [stations] = useApi('/police-stations')
  const [reports] = useApi('/police-reports')
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [f, setF] = useState({
    title: '',
    incidentType: '',
    incidentDate: '',
    incidentLocation: '',
    summary: '',
    isEmergency: false,
    policeStation: '',
    statement: '',
    sapsHandover: false,
    lawyerMatching: false,
    sensitiveDataProcessing: false,
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const stepValid = [
    f.title && f.incidentType && f.incidentDate && f.incidentLocation && f.summary.trim().length >= 20,
    true,
    f.statement.trim().length >= 40,
    f.sapsHandover && f.lawyerMatching && f.sensitiveDataProcessing,
  ]

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!stepValid.every(Boolean)) {
      const first = stepValid.findIndex((v) => !v)
      setStep(first + 1)
      return setError(
        first === 0 ? 'Complete the incident details (summary needs 20+ characters).' : first === 2 ? 'Your statement needs at least 40 characters.' : 'Confirm all consent items.',
      )
    }
    setBusy(true)
    const r = await api.post('/police-reports', { ...f, incidentDate: new Date(f.incidentDate).toISOString() })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    setSuccess({ id: r.reportId, reference: r.reference })
  }

  return (
    <div className="min-h-screen bg-[#f3f6f4] text-[#17242b]">
      <header className="flex h-[72px] items-center border-b border-[#dce3df] bg-white/90 px-5 backdrop-blur-xl lg:px-10">
        <Brand />
        <nav className="ml-auto flex items-center gap-5 text-xs font-bold text-[#52646a]">
          <Link to="/police-stations" className="hidden sm:block">
            Find a police station
          </Link>
          <Link to={homeFor(user)} className="hidden sm:block">
            My dashboard
          </Link>
          <Link to="/" className="rounded-lg bg-[#0b2635] px-4 py-3 text-white">
            Legal marketplace
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <span className="text-[14px] font-bold tracking-[.16em] text-[#a67722]">POLICE REPORT & LEGAL SUPPORT</span>
            <h1 className="mt-3 font-serif text-5xl tracking-[-.045em] text-[#0b2635]">Report. Preserve. Follow through.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65767b]">
              Prepare your information for SAPS, preserve every statement version and connect with a lawyer as the matter moves toward court.
            </p>
          </div>
          <div className="max-w-md rounded-xl border border-[#e3cba0] bg-[#fff8ea] px-4 py-3 text-xs leading-5 text-[#77591e]">
            <b>Important:</b> This platform cannot itself open an official SAPS case. A CAS or occurrence-book reference from SAPS confirms official reporting.
            In an emergency call <b>10111</b>.
          </div>
        </div>

        {reports?.reports?.length > 0 && (
          <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {reports.reports.map((report) => (
              <Link
                key={report.id}
                to={`/police-report/${report.id}`}
                className="rounded-xl border border-[#dce3df] bg-white p-5 shadow-[0_8px_25px_rgba(8,34,47,.05)] transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#e8f2ef] px-2 py-1 text-[14px] font-bold text-[#1f6e6a]">
                    {report.officialStatus.replaceAll('-', ' ').toUpperCase()}
                  </span>
                  <span className="text-[14px] text-[#829095]">{date(report.updatedAt)}</span>
                </div>
                <h2 className="mt-4 font-serif text-xl text-[#0b2635]">{report.title}</h2>
                <p className="mt-2 font-mono text-[14px] text-[#65767b]">{report.casNumber || report.platformReference}</p>
                <span className="mt-5 inline-block text-[14px] font-bold text-[#1f6e6a]">Open case tracker →</span>
              </Link>
            ))}
          </section>
        )}

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#dce3df] bg-white shadow-[0_24px_70px_rgba(8,34,47,.09)]">
          <div className="grid grid-cols-4 border-b border-[#e1e6e3] bg-[#f8faf8]">
            {['Incident', 'Police station', 'Statement', 'Review & save'].map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => !success && setStep(index + 1)}
                className={`min-h-16 border-r border-[#e1e6e3] px-2 text-[14px] font-bold last:border-r-0 ${step === index + 1 ? 'bg-[#0b2635] text-white' : 'text-[#718085]'}`}
              >
                <span
                  className={`mr-2 inline-grid h-6 w-6 place-items-center rounded-full ${step === index + 1 ? 'bg-[#d9b45f] text-[#0b2635]' : stepValid[index] && index !== 1 ? 'bg-[#e2f0ec] text-[#1f6e6a]' : 'border border-[#bdc8c4]'}`}
                >
                  {index + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {success ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e2f0ec] text-2xl text-[#1f6e6a]">✓</span>
              <h2 className="mt-6 font-serif text-3xl text-[#0b2635]">Your platform report is secure.</h2>
              <p className="mt-3 text-sm text-[#65767b]">
                Reference <b className="font-mono text-[#0b2635]">{success.reference}</b>. Take the report to SAPS to open an official case and obtain a CAS number.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link to={`/police-report/${success.id}`} className="rounded-lg bg-[#0b2635] px-5 py-3 text-xs font-bold text-white">
                  Open case tracker
                </Link>
                <Link to="/police-stations" className="rounded-lg border border-[#bdc8c4] px-5 py-3 text-xs font-bold text-[#0b2635]">
                  Find a SAPS station
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="p-6 lg:p-9">
              <div className={step === 1 ? 'grid gap-5 lg:grid-cols-2' : 'hidden'}>
                <div className="lg:col-span-2">
                  <span className="text-[14px] font-bold tracking-[.12em] text-[#a67722]">STEP 1</span>
                  <h2 className="mt-2 font-serif text-3xl text-[#0b2635]">What happened?</h2>
                </div>
                <label className="text-[14px] font-bold text-[#0b2635]">
                  REPORT TITLE
                  <input value={f.title} onChange={set('title')} maxLength={140} placeholder="A short, private title for your records" className={input} />
                </label>
                <label className="text-[14px] font-bold text-[#0b2635]">
                  INCIDENT TYPE
                  <select value={f.incidentType} onChange={set('incidentType')} className={input}>
                    <option value="">Choose a category</option>
                    {INCIDENT_TYPES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="text-[14px] font-bold text-[#0b2635]">
                  DATE AND TIME
                  <input type="datetime-local" value={f.incidentDate} max={new Date().toISOString().slice(0, 16)} onChange={set('incidentDate')} className={input} />
                </label>
                <label className="text-[14px] font-bold text-[#0b2635]">
                  LOCATION
                  <input value={f.incidentLocation} onChange={set('incidentLocation')} maxLength={240} placeholder="Where did this happen?" className={input} />
                </label>
                <label className="text-[14px] font-bold text-[#0b2635] lg:col-span-2">
                  BRIEF SUMMARY
                  <textarea
                    value={f.summary}
                    onChange={set('summary')}
                    maxLength={2500}
                    rows={4}
                    placeholder="Summarise the incident. You can provide the full account in your statement."
                    className="mt-2 w-full rounded-lg border border-[#cdd6d2] p-4 text-sm font-normal leading-6"
                  />
                </label>
                <label className="flex items-center gap-3 text-xs text-[#9d473f] lg:col-span-2">
                  <input type="checkbox" checked={f.isEmergency} onChange={set('isEmergency')} /> This is an emergency or someone is in immediate danger
                </label>
                {f.isEmergency && (
                  <Notice className="lg:col-span-2">Call SAPS on 10111 now. For gender-based violence, call 0800 428 428. Save this report afterwards.</Notice>
                )}
              </div>

              <div className={step === 2 ? 'block' : 'hidden'}>
                <span className="text-[14px] font-bold tracking-[.12em] text-[#a67722]">STEP 2</span>
                <h2 className="mt-2 font-serif text-3xl text-[#0b2635]">Choose a SAPS station.</h2>
                <p className="mt-2 text-sm text-[#65767b]">The closest station may help confirm where the matter should be reported.</p>
                <label className="mt-6 block text-[14px] font-bold text-[#0b2635]">
                  WESTERN CAPE POLICE STATION
                  <select value={f.policeStation} onChange={set('policeStation')} className="mt-2 h-14 w-full rounded-lg border border-[#cdd6d2] bg-white px-4 text-sm">
                    <option value="">Choose later</option>
                    {stations?.stations.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name} SAPS · {s.district}
                      </option>
                    ))}
                  </select>
                </label>
                <Link to="/police-stations" target="_blank" className="mt-4 inline-block text-[14px] font-bold text-[#1f6e6a]">
                  Search all {stations?.stations.length ?? ''} stations and contact details →
                </Link>
              </div>

              <div className={step === 3 ? 'block' : 'hidden'}>
                <span className="text-[14px] font-bold tracking-[.12em] text-[#a67722]">STEP 3</span>
                <h2 className="mt-2 font-serif text-3xl text-[#0b2635]">Record your original statement.</h2>
                <div className="mt-4 rounded-lg border border-[#c9ded8] bg-[#edf5f2] p-4 text-xs leading-5 text-[#496b67]">
                  <b>Your original is preserved.</b> Later corrections create a new numbered version. The original text, timestamp and SHA-256 fingerprint remain
                  visible and cannot be overwritten.
                </div>
                <label className="mt-6 block text-[14px] font-bold text-[#0b2635]">
                  FULL STATEMENT
                  <textarea
                    value={f.statement}
                    onChange={set('statement')}
                    maxLength={12000}
                    rows={14}
                    placeholder="Describe what you personally saw, heard and experienced in chronological order. Separate facts from assumptions."
                    className="mt-2 w-full rounded-lg border border-[#cdd6d2] p-4 text-sm font-normal leading-7"
                  />
                  <span className="mt-1 block text-right font-normal text-[#829095]">{f.statement.length.toLocaleString()} / 12 000</span>
                </label>
              </div>

              <div className={step === 4 ? 'block' : 'hidden'}>
                <span className="text-[14px] font-bold tracking-[.12em] text-[#a67722]">STEP 4</span>
                <h2 className="mt-2 font-serif text-3xl text-[#0b2635]">Review the legal status.</h2>
                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {[
                    ['1', 'Platform report', 'Securely prepares your information.'],
                    ['2', 'SAPS reporting', 'Visit or contact SAPS to obtain a CAS reference.'],
                    ['3', 'Lawyer & court', 'Connect counsel and follow dates and filings.'],
                  ].map(([n, t, c]) => (
                    <div key={n} className="rounded-xl border border-[#dce3df] p-4">
                      <span className="text-[14px] font-bold text-[#a67722]">0{n}</span>
                      <b className="mt-3 block font-serif text-lg text-[#0b2635]">{t}</b>
                      <p className="mt-1 text-xs leading-5 text-[#65767b]">{c}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 space-y-3 rounded-xl bg-[#f5f7f4] p-5">
                  {[
                    ['sapsHandover', 'I understand this report does not become an official SAPS case until SAPS records it.'],
                    ['lawyerMatching', 'I consent to use this information to match me with a verified lawyer.'],
                    ['sensitiveDataProcessing', 'I consent to the secure processing of sensitive case information under the privacy notice.'],
                  ].map(([k, l]) => (
                    <label key={k} className="flex gap-3 text-xs leading-5 text-[#52646a]">
                      <input type="checkbox" checked={f[k]} onChange={set(k)} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              <Notice className="mt-5">{error}</Notice>
              <div className="mt-8 flex justify-between border-t border-[#e2e7e4] pt-6">
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => setStep(Math.max(1, step - 1))}
                  className="rounded-lg border border-[#cbd4d1] px-5 py-3 text-xs font-bold text-[#52646a] disabled:opacity-30"
                >
                  Back
                </button>
                {step < 4 ? (
                  <button type="button" onClick={() => setStep(step + 1)} className="rounded-lg bg-[#0b2635] px-6 py-3 text-xs font-bold text-white">
                    Continue
                  </button>
                ) : (
                  <button disabled={busy} className="rounded-lg bg-[#d7a84a] px-6 py-3 text-xs font-bold text-[#0b2635] disabled:opacity-50">
                    {busy ? 'Securing report…' : 'Save secure report'}
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  )
}

export function CaseTracker() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, { loading, error, reload }] = useApi(user ? `/police-reports/${id}` : null)
  const [tab, setTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [compare, setCompare] = useState(null)
  const [msg, setMsg] = useState({ kind: '', text: '' })
  const [busy, setBusy] = useState(false)

  if (user === null) return <SignInGate next={`/police-report/${id}`} />
  if (loading && !data) return <Loading />
  if (error || !data)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f6f4] px-5 text-center">
        <div>
          <h1 className="font-serif text-3xl text-[#0b2635]">Report not found</h1>
          <p className="mt-2 text-sm text-[#65767b]">{error}</p>
          <Link to="/police-report" className="mt-5 inline-block rounded-lg bg-[#0b2635] px-5 py-3 text-xs font-bold text-white">
            All reports
          </Link>
        </div>
      </main>
    )

  const { report, revisions, events, evidence, isOwner } = data
  const current = revisions[revisions.length - 1]
  const activeStep = Math.max(0, STEPS.indexOf(report.officialStatus))

  const run = async (fn, ok) => {
    setMsg({ kind: '', text: '' })
    setBusy(true)
    const r = await fn()
    setBusy(false)
    if (!r.ok) return setMsg({ kind: 'error', text: r.error })
    setEditing(false)
    setMsg({ kind: 'success', text: ok })
    reload()
  }
  const form = (e) => Object.fromEntries(new FormData(e.currentTarget))
  const openIntake = () =>
    run(
      () =>
        api
          .post('/justice/cases', {
            title: report.title,
            caseType: 'criminal',
            summary: `${report.incidentType} on ${dateTime(report.incidentDate)} at ${report.incidentLocation}. ${report.summary}`,
            jurisdiction: report.policeStation?.name || report.incidentLocation,
            sourceReportId: report.id,
            rightsConfirmed: true,
          })
          .then((r) => {
            if (r.ok) navigate('/dashboard')
            return r
          }),
      'Digital justice intake created.',
    )

  return (
    <div className="min-h-screen bg-[#f3f6f4] text-[#17242b]">
      <header className="flex min-h-[72px] items-center gap-5 border-b border-[#dce3df] bg-white px-5 lg:px-10">
        <Brand />
        <Link to="/police-report" className="ml-auto text-xs font-bold text-[#52646a]">
          ← All reports
        </Link>
        <Link to="/police-stations" className="rounded-lg bg-[#0b2635] px-4 py-3 text-xs font-bold text-white">
          Station directory
        </Link>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="rounded-2xl bg-[#0b2635] p-6 text-white lg:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <span className="rounded-full bg-[#d7a84a] px-3 py-1 text-[14px] font-bold text-[#0b2635]">
                {report.officialStatus.replaceAll('-', ' ').toUpperCase()}
              </span>
              <h1 className="mt-4 font-serif text-4xl">{report.title}</h1>
              <p className="mt-2 font-mono text-xs text-[#9fb5b8]">
                {report.casNumber ? `SAPS: ${report.casNumber}` : `Platform: ${report.platformReference}`}
                {report.casNumber && ` · Platform: ${report.platformReference}`}
              </p>
            </div>
            <div className="max-w-sm rounded-xl border border-white/15 bg-white/5 p-4 text-xs leading-5 text-[#c5d3d4]">
              {report.casNumber
                ? 'A SAPS reference has been recorded by the client. LexBridge has not independently verified it.'
                : 'This is a platform report, not an official SAPS case. Take it to SAPS and record the reference they provide.'}
            </div>
          </div>
          <div className="mt-8 grid grid-cols-5 gap-1">
            {['Report prepared', 'SAPS reference', 'Investigation', 'Court', 'Closed'].map((label, index) => (
              <div key={label}>
                <div className={`h-1 rounded-full ${index <= activeStep ? 'bg-[#d7a84a]' : 'bg-white/15'}`} />
                <p className={`mt-2 text-[14px] font-bold ${index <= activeStep ? 'text-white' : 'text-[#668187]'}`}>{label.toUpperCase()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex overflow-x-auto rounded-xl border border-[#dce3df] bg-white p-1">
          {[
            ['overview', 'Case overview'],
            ['statement', `Statement history (${revisions.length})`],
            ['evidence', `Evidence (${evidence.length})`],
            ['timeline', 'Timeline'],
            ['lawyer', 'Find a lawyer'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`min-w-max flex-1 rounded-lg px-5 py-3 text-xs font-bold ${tab === key ? 'bg-[#0b2635] text-white' : 'text-[#65767b]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Notice kind={msg.kind || 'error'} className="mt-4">
          {msg.text}
        </Notice>

        {tab === 'overview' && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
            <section className="space-y-5">
              <div className="rounded-xl border border-[#dce3df] bg-white p-6">
                <span className="text-[14px] font-bold text-[#a67722]">INCIDENT</span>
                <h2 className="mt-2 font-serif text-2xl text-[#0b2635]">{report.incidentType}</h2>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[14px] font-bold text-[#829095]">DATE</dt>
                    <dd className="mt-1">{dateTime(report.incidentDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-[14px] font-bold text-[#829095]">LOCATION</dt>
                    <dd className="mt-1">{report.incidentLocation}</dd>
                  </div>
                  {report.investigatingOfficer && (
                    <div>
                      <dt className="text-[14px] font-bold text-[#829095]">INVESTIGATING OFFICER</dt>
                      <dd className="mt-1">
                        {[report.investigatingOfficer.rank, report.investigatingOfficer.name].filter(Boolean).join(' ')}
                        {report.investigatingOfficer.contactNumber && ` · ${report.investigatingOfficer.contactNumber}`}
                      </dd>
                    </div>
                  )}
                </dl>
                <p className="mt-5 border-t border-[#e6ebe8] pt-5 text-sm leading-6 text-[#52646a]">{report.summary}</p>
              </div>
              {isOwner && (
                <div className="rounded-xl border border-[#dce3df] bg-white p-6">
                  <span className="text-[14px] font-bold text-[#a67722]">DIGITAL JUSTICE</span>
                  <h2 className="mt-2 font-serif text-xl text-[#0b2635]">{data.linkedCase ? 'Linked justice case' : 'Follow this matter to court'}</h2>
                  <p className="mt-2 text-xs leading-5 text-[#65767b]">
                    {data.linkedCase
                      ? `This report is linked to digital case ${data.linkedCase.reference}. Assigned SAPS and court officials update it there.`
                      : 'Open a digital justice intake so assigned SAPS, prosecution and court officials can work on the matter with you.'}
                  </p>
                  {data.linkedCase ? (
                    <Link to="/dashboard" className="mt-4 inline-block rounded-lg bg-[#0b2635] px-5 py-3 text-xs font-bold text-white">
                      Open justice workspace
                    </Link>
                  ) : (
                    <button onClick={openIntake} disabled={busy} className="mt-4 rounded-lg bg-[#0b2635] px-5 py-3 text-xs font-bold text-white">
                      Create justice intake from this report
                    </button>
                  )}
                </div>
              )}
            </section>
            <aside className="space-y-5">
              {report.policeStation && (
                <section className="rounded-xl border border-[#dce3df] bg-white p-5">
                  <span className="text-[14px] font-bold text-[#a67722]">SELECTED SAPS STATION</span>
                  <h2 className="mt-2 font-serif text-xl text-[#0b2635]">{report.policeStation.name} SAPS</h2>
                  <p className="mt-2 text-xs leading-5 text-[#65767b]">{report.policeStation.address}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {report.policeStation.phoneNumbers?.map((item) => (
                      <a key={item.number} href={`tel:${item.number.replace(/\s/g, '')}`} className="text-xs font-bold text-[#1f6e6a]">
                        {item.number}
                      </a>
                    ))}
                  </div>
                </section>
              )}
              {isOwner && !report.casNumber && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const d = form(e)
                    run(() => api.post(`/police-reports/${report.id}/saps-reference`, d), 'SAPS reference recorded.')
                  }}
                  className="rounded-xl border border-[#e3cba0] bg-[#fff8ea] p-5"
                >
                  <span className="text-[14px] font-bold text-[#a67722]">AFTER VISITING SAPS</span>
                  <h2 className="mt-2 font-serif text-xl text-[#0b2635]">Record the official reference</h2>
                  <p className="mt-2 text-xs leading-5 text-[#77591e]">Enter only a CAS or occurrence-book number supplied by SAPS.</p>
                  <input name="reference" required placeholder="e.g. CAS 123/06/2025" className="mt-4 h-11 w-full rounded-lg border border-[#dcc591] bg-white px-3 text-sm" />
                  <details className="mt-3 text-xs text-[#77591e]">
                    <summary className="cursor-pointer font-bold">Investigating officer (optional)</summary>
                    <input name="officerRank" placeholder="Rank" className="mt-2 h-10 w-full rounded-lg border border-[#dcc591] bg-white px-3 text-sm" />
                    <input name="officerName" placeholder="Name" className="mt-2 h-10 w-full rounded-lg border border-[#dcc591] bg-white px-3 text-sm" />
                    <input name="officerContact" placeholder="Contact number" className="mt-2 h-10 w-full rounded-lg border border-[#dcc591] bg-white px-3 text-sm" />
                  </details>
                  <button disabled={busy} className="mt-3 w-full rounded-lg bg-[#0b2635] py-3 text-xs font-bold text-white">
                    Save SAPS reference
                  </button>
                </form>
              )}
              {isOwner && report.officialStatus === 'reported-to-saps' && (
                <button
                  disabled={busy}
                  onClick={() => run(() => api.post(`/police-reports/${report.id}/status`, { status: 'under-investigation' }), 'Status updated.')}
                  className="w-full rounded-lg border border-[#0b2635] bg-white py-3 text-xs font-bold text-[#0b2635]"
                >
                  SAPS confirmed an investigation
                </button>
              )}
              {isOwner && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const d = form(e)
                    run(() => api.post(`/police-reports/${report.id}/court`, { court: d.court, courtDate: d.courtDate ? new Date(d.courtDate).toISOString() : '' }), 'Court date recorded.')
                  }}
                  className="rounded-xl border border-[#dce3df] bg-white p-5"
                >
                  <span className="text-[14px] font-bold text-[#a67722]">COURT TRACKING</span>
                  <h2 className="mt-2 font-serif text-xl text-[#0b2635]">{report.linkedCourt || 'Add a court milestone'}</h2>
                  {report.nextCourtDate && <p className="mt-2 text-sm font-bold text-[#1f6e6a]">{dateTime(report.nextCourtDate)}</p>}
                  <input name="court" required placeholder="Court name" className="mt-4 h-10 w-full rounded-lg border border-[#cdd6d2] px-3 text-sm" />
                  <input type="datetime-local" name="courtDate" required className="mt-2 h-10 w-full rounded-lg border border-[#cdd6d2] px-3 text-sm" />
                  <button disabled={busy} className="mt-3 w-full rounded-lg border border-[#0b2635] py-3 text-xs font-bold text-[#0b2635]">
                    Record court date
                  </button>
                </form>
              )}
              {isOwner && report.officialStatus !== 'closed' && (
                <button
                  onClick={() => window.confirm('Close this report? You can still view it.') && run(() => api.post(`/police-reports/${report.id}/status`, { status: 'closed' }), 'Report closed.')}
                  className="w-full text-xs font-bold text-[#9d473f]"
                >
                  Close this report
                </button>
              )}
            </aside>
          </div>
        )}

        {tab === 'statement' && (
          <section className="mt-5 rounded-xl border border-[#dce3df] bg-white p-5 lg:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[14px] font-bold text-[#a67722]">APPEND-ONLY AUDIT RECORD</span>
                <h2 className="mt-2 font-serif text-3xl text-[#0b2635]">Every version, preserved.</h2>
                <p className="mt-2 text-xs text-[#65767b]">The original cannot be edited or deleted. Amendments create a new fingerprinted version.</p>
              </div>
              {isOwner && (
                <button onClick={() => setEditing(!editing)} className="rounded-lg bg-[#0b2635] px-5 py-3 text-xs font-bold text-white">
                  {editing ? 'Cancel amendment' : 'Add amendment'}
                </button>
              )}
            </div>
            {editing && current && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const d = form(e)
                  run(() => api.post(`/police-reports/${report.id}/amend`, { content: d.content, changeSummary: d.summary }), 'New statement version recorded.')
                }}
                className="mt-6 rounded-xl bg-[#f3f6f4] p-5"
              >
                <label className="text-[14px] font-bold text-[#0b2635]">
                  WHY ARE YOU CHANGING THE STATEMENT?
                  <input name="summary" required minLength={5} placeholder="Describe the correction or new information" className="mt-2 h-11 w-full rounded-lg border border-[#cdd6d2] px-3 text-sm font-normal" />
                </label>
                <label className="mt-4 block text-[14px] font-bold text-[#0b2635]">
                  COMPLETE REVISED STATEMENT
                  <textarea name="content" required minLength={40} defaultValue={current.content} rows={12} className="mt-2 w-full rounded-lg border border-[#cdd6d2] p-4 text-sm font-normal leading-6" />
                </label>
                <button disabled={busy} className="mt-4 rounded-lg bg-[#d7a84a] px-5 py-3 text-xs font-bold text-[#0b2635]">
                  {busy ? 'Recording…' : 'Record new immutable version'}
                </button>
              </form>
            )}
            <div className="mt-7 space-y-4">
              {[...revisions].reverse().map((revision, reverseIndex) => {
                const originalIndex = revisions.length - 1 - reverseIndex
                const previous = revisions[originalIndex - 1]
                return (
                  <article key={revision.id} className={`rounded-xl border p-5 ${revision.versionNumber === 1 ? 'border-[#c9ded8] bg-[#f0f7f4]' : 'border-[#dce3df]'}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-[#0b2635] px-3 py-1 text-[14px] font-bold text-white">VERSION {revision.versionNumber}</span>
                      {revision.versionNumber === 1 && <span className="text-[14px] font-bold text-[#1f6e6a]">LOCKED ORIGINAL</span>}
                      <span className={`text-[14px] font-bold ${revision.integrity ? 'text-[#1f6e6a]' : 'text-[#a34a40]'}`}>
                        {revision.integrity ? '✓ FINGERPRINT VERIFIED' : '⚠ FINGERPRINT MISMATCH'}
                      </span>
                      <time className="ml-auto text-[14px] text-[#829095]">{dateTime(revision.createdAt)}</time>
                    </div>
                    <p className="mt-3 text-xs font-bold text-[#a67722]">{revision.changeSummary || 'No change summary supplied'}</p>
                    <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-6 text-[#3f5056]">{revision.content}</pre>
                    <div className="mt-4 break-all border-t border-[#dde5e1] pt-3 font-mono text-[14px] text-[#879397]">SHA-256 · {revision.contentHash}</div>
                    {previous && (
                      <button onClick={() => setCompare(compare === revision.versionNumber ? null : revision.versionNumber)} className="mt-3 text-[14px] font-bold text-[#1f6e6a]">
                        {compare === revision.versionNumber ? 'Hide comparison' : `Compare with version ${previous.versionNumber}`}
                      </button>
                    )}
                    {compare === revision.versionNumber && previous && (
                      <div className="mt-4 grid gap-3 border-t border-[#dde5e1] pt-4 lg:grid-cols-2">
                        <div className="rounded-lg bg-[#f9ece9] p-4">
                          <b className="text-[14px] text-[#9a4f47]">BEFORE · VERSION {previous.versionNumber}</b>
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-5">{previous.content}</p>
                        </div>
                        <div className="rounded-lg bg-[#e9f4ef] p-4">
                          <b className="text-[14px] text-[#277267]">AFTER · VERSION {revision.versionNumber}</b>
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-5">{revision.content}</p>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {tab === 'evidence' && (
          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="rounded-xl border border-[#dce3df] bg-white p-6">
              <h2 className="font-serif text-3xl text-[#0b2635]">Evidence inventory</h2>
              <p className="mt-2 text-xs text-[#65767b]">Each file is fingerprinted with SHA-256 when uploaded so you can show it has not changed.</p>
              <div className="mt-5 space-y-3">
                {evidence.length === 0 && <p className="text-sm text-[#7b898d]">No evidence attached yet.</p>}
                {evidence.map((e) => (
                  <article key={e.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-[#e1e6e3] p-4">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf3f1] text-[14px] font-bold text-[#1d6e68]">{e.category.slice(0, 3).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <b className="text-sm">{e.title}</b>
                      <p className="mt-1 text-[14px] text-[#7f8c90]">
                        {e.originalName} · {(e.size / 1024).toFixed(0)} KB · added {date(e.createdAt)}
                        {e.capturedAt ? ` · captured ${date(e.capturedAt)}` : ''}
                      </p>
                      <p className="mt-1 truncate font-mono text-[14px] text-[#879397]">SHA-256 {e.sha256}</p>
                    </div>
                    <a href={`/api/evidence/${e.id}/download`} className="text-xs font-bold text-[#1f6e6a]">
                      Download
                    </a>
                  </article>
                ))}
              </div>
            </div>
            {isOwner && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const el = e.currentTarget
                  run(
                    () =>
                      api.upload(`/police-reports/${report.id}/evidence`, fd).then((r) => {
                        if (r.ok) el.reset()
                        return r
                      }),
                    'Evidence attached and fingerprinted.',
                  )
                }}
                className="h-max space-y-3 rounded-xl border border-[#dce3df] bg-white p-5"
              >
                <span className="text-[14px] font-bold text-[#a67722]">ADD EVIDENCE</span>
                <input name="title" required placeholder="What is this?" className="h-11 w-full rounded-lg border border-[#cdd6d2] px-3 text-sm" />
                <select name="category" required className="h-11 w-full rounded-lg border border-[#cdd6d2] bg-white px-3 text-sm">
                  <option value="">Category</option>
                  {['photo', 'video', 'document', 'medical', 'communication', 'other'].map((c) => (
                    <option key={c} value={c}>
                      {c[0].toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
                <textarea name="description" rows={3} placeholder="Description (optional)" className="w-full rounded-lg border border-[#cdd6d2] p-3 text-sm" />
                <label className="block text-[14px] font-bold text-[#0b2635]">
                  DATE CAPTURED (OPTIONAL)
                  <input name="capturedAt" type="datetime-local" className="mt-2 h-10 w-full rounded-lg border border-[#cdd6d2] px-3 text-sm font-normal" />
                </label>
                <input name="file" type="file" required accept=".pdf,.txt,.doc,.docx,image/*" className="block w-full text-xs" />
                <p className="text-[14px] text-[#7d8b8f]">PDF, Word, image or text · max 15 MB.</p>
                <button disabled={busy} className="w-full rounded-lg bg-[#0b2635] py-3 text-xs font-bold text-white">
                  {busy ? 'Uploading…' : 'Attach evidence'}
                </button>
              </form>
            )}
          </section>
        )}

        {tab === 'timeline' && (
          <section className="mt-5 rounded-xl border border-[#dce3df] bg-white p-6">
            <h2 className="font-serif text-3xl text-[#0b2635]">Case timeline</h2>
            <div className="mt-6 space-y-0">
              {events.map((event) => (
                <article key={event.id} className="relative border-l border-[#b9cbc6] pb-7 pl-6 last:pb-0">
                  <span className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-[#d7a84a] ring-4 ring-[#fff8ea]" />
                  <div className="flex flex-wrap gap-3">
                    <b className="text-sm text-[#0b2635]">{event.title}</b>
                    <span className="text-[14px] font-bold text-[#a67722]">{event.source.toUpperCase()}</span>
                    <time className="ml-auto text-[14px] text-[#829095]">{dateTime(event.eventDate)}</time>
                  </div>
                  {event.details && <p className="mt-2 text-xs leading-5 text-[#65767b]">{event.details}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'lawyer' && (
          <section className="mt-5 grid gap-5 rounded-xl border border-[#dce3df] bg-white p-6 lg:grid-cols-[1fr_360px]">
            <div>
              <span className="text-[14px] font-bold text-[#a67722]">LEGAL SUPPORT</span>
              <h2 className="mt-2 font-serif text-3xl text-[#0b2635]">Find a lawyer for the next step.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#65767b]">
                Browse verified South African legal practitioners, or post your matter anonymously and compare fee estimates. Share case details only after
                reviewing and accepting a lawyer’s mandate and privacy terms.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/lawyers?area=Criminal+law" className="rounded-lg bg-[#0b2635] px-5 py-3 text-xs font-bold text-white">
                  Browse criminal-law practitioners
                </Link>
                <Link to="/client?post=1" className="rounded-lg border border-[#0b2635] px-5 py-3 text-xs font-bold text-[#0b2635]">
                  Post a matter
                </Link>
              </div>
            </div>
            <div className="rounded-xl bg-[#f3f6f4] p-5">
              <b className="text-xs text-[#0b2635]">Bring to your consultation</b>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-[#65767b]">
                <li>• Platform and SAPS references</li>
                <li>• Every statement version</li>
                <li>• Court dates and notices</li>
                <li>• Evidence inventory</li>
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export function StationDirectory() {
  const [data] = useApi('/police-stations')
  const stations = useMemo(() => data?.stations ?? [], [data])
  const [query, setQuery] = useState('')
  const [district, setDistrict] = useState('All districts')
  const districts = useMemo(() => ['All districts', ...Array.from(new Set(stations.map((s) => s.district))).sort()], [stations])
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return stations.filter(
      (s) =>
        (district === 'All districts' || s.district === district) &&
        (!needle || [s.name, s.district, s.address, s.commander].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle))),
    )
  }, [district, query, stations])

  return (
    <div className="min-h-screen bg-[#f3f6f4] text-[#17242b]">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <span className="text-[14px] font-bold tracking-[.16em] text-[#a67722]">PROVINCIAL DIRECTORY · {data?.source?.toUpperCase() ?? ''}</span>
            <h1 className="mt-3 font-serif text-5xl tracking-[-.045em] text-[#0b2635]">Find a Western Cape police station.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#65767b]">
              Search {stations.length || ''} SAPS stations by place, cluster, commander or address. Commanders and numbers change — phone the station before
              travelling where possible.
            </p>
          </div>
          <div className="rounded-xl border border-[#e3cba0] bg-[#fff8ea] p-4 text-xs leading-5 text-[#77591e]">
            <b>Emergency?</b> Call 10111. For gender-based violence support, call the GBV Command Centre on 0800 428 428. This directory is informational and
            does not submit a case.
          </div>
        </div>
        <div className="sticky top-0 z-10 mt-8 grid gap-3 rounded-xl border border-[#dce3df] bg-white/95 p-4 shadow-lg backdrop-blur md:grid-cols-[1fr_280px]">
          <label className="relative">
            <span className="sr-only">Search police stations</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search station, address or commander…"
              className="h-12 w-full rounded-lg border border-[#cdd6d2] px-4 text-sm outline-none focus:border-[#1f6e6a]"
            />
          </label>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="h-12 rounded-lg border border-[#cdd6d2] bg-white px-4 text-sm">
            {districts.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14px] font-bold text-[#65767b]">{visible.length} STATIONS SHOWN</p>
          <p className="text-[14px] text-[#829095]">Source: Department of Police Oversight and Community Safety, Western Cape</p>
        </div>
        {!data && <Loading />}
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <article key={s.id} className="flex flex-col rounded-xl border border-[#dce3df] bg-white p-5 shadow-[0_8px_25px_rgba(8,34,47,.04)]">
              <span className="text-[14px] font-bold text-[#a67722]">{s.district.toUpperCase()}</span>
              <h2 className="mt-2 font-serif text-2xl text-[#0b2635]">{s.name} SAPS</h2>
              {s.commander && <p className="mt-2 text-xs text-[#65767b]">Station commander · {s.commander}</p>}
              <address className="mt-4 border-t border-[#e7ebe9] pt-4 text-xs not-italic leading-5 text-[#52646a]">{s.address}</address>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                {s.phoneNumbers?.map((phone) => (
                  <a key={phone.number} href={`tel:${phone.number.replace(/\s/g, '')}`} className="rounded-lg bg-[#e9f2ef] px-3 py-2 text-[14px] font-bold text-[#1f6e6a]">
                    {phone.number}
                  </a>
                ))}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} Police Station, ${s.address}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[#dce3df] px-3 py-2 text-[14px] font-bold text-[#52646a]"
                >
                  Directions
                </a>
              </div>
            </article>
          ))}
        </div>
        {data && visible.length === 0 && (
          <div className="mt-5 rounded-xl border border-dashed border-[#bdc8c4] bg-white p-10 text-center">
            <h2 className="font-serif text-2xl text-[#0b2635]">No matching station found.</h2>
            <p className="mt-2 text-sm text-[#65767b]">Try a nearby suburb, town or cluster.</p>
          </div>
        )}
      </main>
    </div>
  )
}
