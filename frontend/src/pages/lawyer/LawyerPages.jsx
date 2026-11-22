import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { PortalLayout } from '../../components/PortalLayout'
import { Empty, Loading, Notice, PageTitle, Status, area, field, labelCls } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi, useAuth } from '../../lib/auth'
import { CATEGORY_LABEL, ago, date, rand, toCents } from '../../lib/format'

const FILTERS = {
  category: ['Matter type', [['criminal', 'Criminal'], ['civil', 'Civil'], ['family', 'Family'], ['appeal', 'Appeals'], ['unsure', 'Not sure']]],
  courtLevel: ['Court level', ["Magistrates' Court", 'Regional Court', 'High Court', 'Supreme Court of Appeal', 'Constitutional Court', 'Labour Court'].map((x) => [x, x])],
  province: ['Province', ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'].map((x) => [x, x])],
  urgency: ['Urgency', ['Within 48 hours', 'Soon', 'Flexible'].map((x) => [x, x])],
  budget: ['Budget', ['Under R 2 500', 'R 2 500 – R 7 500', 'R 7 500 – R 15 000', 'R 15 000+'].map((x) => [x, x])],
}

function VerificationBanner({ status }) {
  if (status === 'approved') return null
  const copy = {
    incomplete: ['Complete your practice profile', 'Add your LPC and certificate details, then submit them for verification before responding to matters.'],
    pending: ['Verification in progress', 'Our team is checking your credentials. You can browse matters but cannot send offers yet.'],
    'more-info': ['More information needed', 'The verification team asked for more information. Open your profile to see the note.'],
    rejected: ['Verification unsuccessful', 'Your application was not approved. Review the note on your profile and resubmit.'],
  }[status] || ['Verification required', '']
  return (
    <section className="alert-card">
      <div className="alert-mark">!</div>
      <div>
        <Status tone="gold">{status === 'pending' ? 'IN REVIEW' : 'ACTION NEEDED'}</Status>
        <h2>{copy[0]}</h2>
        <p>{copy[1]}</p>
      </div>
      <Link className="btn btn-gold" to="/lawyer/profile">
        Practice profile <Icon name="arrow" size={17} />
      </Link>
    </section>
  )
}

export function LawyerFeed() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [q, setQ] = useState(params.get('q') || '')
  const [openFilter, setOpenFilter] = useState(null)
  const qs = params.toString()
  const [data, { loading, reload }] = useApi(`/lawyer/feed?${qs}`)
  const active = Object.keys(FILTERS).filter((k) => params.get(k)).length + (params.get('saved') ? 1 : 0)
  const setFilter = (k, v) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p)
    setOpenFilter(null)
  }
  useEffect(() => {
    setQ(params.get('q') || '')
  }, [params])
  const toggleSave = async (id) => {
    await api.post(`/lawyer/feed/${id}/save`)
    reload()
  }
  const toggleAvailable = async () => {
    await api.post('/lawyer/availability', { available: !data.available })
    reload()
  }

  return (
    <PortalLayout>
      <PageTitle
        eyebrow="MATTER MARKETPLACE"
        title="Find matters that fit your practice."
        copy="Anonymised matters matched to your verified areas and court experience."
        action={
          data && (
            <button className="availability" onClick={toggleAvailable} title="Toggle availability">
              <span style={data.available ? undefined : { background: '#b9c3bf' }} /> {data.available ? 'Available for new matters' : 'Not taking new matters'}
            </button>
          )
        }
      />
      {data && <VerificationBanner status={data.verificationStatus} />}
      <div className="feed-toolbar">
        <form
          className="filter-search"
          onSubmit={(e) => {
            e.preventDefault()
            setFilter('q', q.trim())
          }}
        >
          <Icon name="search" size={17} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search matter summaries" />
        </form>
        {Object.entries(FILTERS).map(([key, [label, options]]) => (
          <div key={key} className="relative">
            <button onClick={() => setOpenFilter(openFilter === key ? null : key)} className={params.get(key) ? 'border-[#0b2635]! font-bold' : ''}>
              {params.get(key) ? options.find(([v]) => v === params.get(key))?.[1] : label} <Icon name="chevron" size={13} />
            </button>
            {openFilter === key && (
              <div className="absolute left-0 top-11 z-30 min-w-[190px] rounded-lg border border-[#d8ddd9] bg-white p-1 shadow-xl">
                <button className="block w-full rounded px-3 py-2 text-left text-xs hover:bg-[#f1f3f0]" onClick={() => setFilter(key, '')}>
                  Any
                </button>
                {options.map(([v, l]) => (
                  <button key={v} className="block w-full rounded px-3 py-2 text-left text-xs hover:bg-[#f1f3f0]" onClick={() => setFilter(key, v)}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <button className="filters" onClick={() => setParams({})}>
          {active ? 'Clear filters' : 'All filters'} <b>{active}</b>
        </button>
      </div>
      <div className="feed-summary">
        <span>
          <b>{data?.matters.length ?? 0} matters</b> {params.get('saved') ? 'saved' : 'match your filters'}
        </span>
        <span>
          Sort by:{' '}
          <button className="font-bold" onClick={() => setFilter('sort', params.get('sort') === 'newest' ? '' : 'newest')}>
            {params.get('sort') === 'newest' ? 'Newest' : 'Best match'}
          </button>
        </span>
      </div>
      {loading && !data && <Loading />}
      {data && (
        <div className="feed-layout">
          <div className="matter-feed">
            {data.matters.length === 0 && <Empty title="No matching matters right now" text="We’ll notify you when a new matter matches your practice areas." />}
            {data.matters.map((matter) => (
              <article className="feed-card" key={matter.id}>
                <div className="feed-card-top">
                  <div>
                    {matter.urgency === 'Within 48 hours' ? <Status tone="red">URGENT</Status> : <Status>NEW</Status>}
                    <span className="match-score">{matter.matchScore}% match</span>
                  </div>
                  <button className={matter.saved ? 'saved' : ''} onClick={() => toggleSave(matter.id)}>
                    {matter.saved ? 'Saved' : 'Save'}
                  </button>
                </div>
                <h2>{matter.title}</h2>
                <p>
                  {CATEGORY_LABEL[matter.category]} · {matter.courtLevel || 'Court not specified'} · {matter.city || matter.province}
                </p>
                <div className="feed-details">
                  <span>
                    <small>BUDGET</small>
                    <b>{matter.budget || 'Open to estimates'}</b>
                  </span>
                  <span>
                    <small>URGENCY</small>
                    <b>{matter.urgency}</b>
                  </span>
                  <span>
                    <small>POSTED</small>
                    <b>{ago(matter.createdAt)}</b>
                  </span>
                </div>
                <div className="feed-card-bottom">
                  <span>
                    <Icon name="lock" size={15} /> Client identity protected
                  </span>
                  <span>
                    {matter.myOffer && matter.myOffer !== 'withdrawn' ? 'You responded · ' : ''}
                    {matter.offerCount} offer{matter.offerCount === 1 ? '' : 's'} sent
                  </span>
                  <button onClick={() => navigate(`/matters/${matter.id}`)}>
                    View matter <Icon name="arrow" size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <aside className="feed-aside">
            <div>
              <span className="eyebrow">YOUR WEEK</span>
              <h3>Practice snapshot</h3>
              <p>
                <b>{data.snapshot.offersSent}</b> offers sent
              </p>
              <p>
                <b>{data.snapshot.offersViewed}</b> offers viewed
              </p>
              <p>
                <b>{data.snapshot.mattersWon}</b> matters won
              </p>
            </div>
            <div>
              <span className="eyebrow">SAVED MATTERS</span>
              <h3>{data.snapshot.saved} saved</h3>
              <p>Shortlist matters to respond to later.</p>
              <button onClick={() => setFilter('saved', params.get('saved') ? '' : '1')}>{params.get('saved') ? 'Show all matters' : 'View saved'}</button>
            </div>
          </aside>
        </div>
      )}
    </PortalLayout>
  )
}

export function LawyerOfferForm({ matter, onSent }) {
  const [lines, setLines] = useState([{ label: '', amount: '' }])
  const [consult, setConsult] = useState('')
  const [inclusions, setInclusions] = useState('60-minute consultation\nClient updates')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    const r = await api.post(`/matters/${matter.id}/offers`, {
      consultFee: toCents(consult),
      feeStructure: f.get('feeStructure'),
      note: f.get('note'),
      breakdown: lines.filter((l) => l.label && l.amount).map((l) => ({ label: l.label, amount: toCents(l.amount) })),
      inclusions: inclusions.split('\n').map((x) => x.trim()).filter(Boolean),
    })
    setBusy(false)
    if (!r.ok) return setErr(r.error)
    onSent?.()
  }
  const total = lines.reduce((s, l) => s + toCents(l.amount || 0), 0) + toCents(consult || 0)
  return (
    <form onSubmit={submit} className="space-y-3">
      <span className="eyebrow">SEND AN OFFER</span>
      <h2 className="font-serif text-2xl text-[#0b2635]">Your fee estimate</h2>
      <label className={labelCls}>
        CONSULTATION FEE (R, INCL. VAT)
        <input name="consultFee" required inputMode="decimal" className={field} placeholder="850" value={consult} onChange={(e) => setConsult(e.target.value)} />
      </label>
      <div>
        <b className={labelCls}>FURTHER STAGES (OPTIONAL)</b>
        {lines.map((l, i) => (
          <div key={i} className="mt-2 grid grid-cols-[1fr_110px] gap-2">
            <input
              className={field.replace('mt-2 ', '')}
              placeholder="e.g. Court appearance"
              value={l.label}
              onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            />
            <input
              className={field.replace('mt-2 ', '')}
              placeholder="R"
              inputMode="decimal"
              value={l.amount}
              onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
            />
          </div>
        ))}
        {lines.length < 8 && (
          <button type="button" className="mt-2 text-[14px] font-bold text-[#1f6e6a]" onClick={() => setLines([...lines, { label: '', amount: '' }])}>
            + Add stage
          </button>
        )}
      </div>
      <label className={labelCls}>
        FEE STRUCTURE
        <select name="feeStructure" className={field}>
          <option>Staged fee</option>
          <option>Fixed fee</option>
          <option>Hourly</option>
          <option>Accept client budget</option>
        </select>
      </label>
      <label className={labelCls}>
        WHAT’S INCLUDED (ONE PER LINE)
        <textarea rows={3} className={area} value={inclusions} onChange={(e) => setInclusions(e.target.value)} />
      </label>
      <label className={labelCls}>
        NOTE TO THE CLIENT
        <textarea name="note" required minLength={10} maxLength={600} rows={3} className={area} placeholder="Why you’re a good fit and when you’re available." />
      </label>
      {total > 0 && <p className="text-xs text-[#52646a]">Estimated total shown to client: {rand(total)}</p>}
      <Notice>{err}</Notice>
      <button className="btn btn-gold w-full" disabled={busy}>
        {busy ? 'Sending…' : 'Send offer'} <Icon name="arrow" size={16} />
      </button>
    </form>
  )
}

export function LawyerOffers() {
  const navigate = useNavigate()
  const [data, { loading, reload }] = useApi('/lawyer/offers')
  const withdraw = async (id) => {
    if (!window.confirm('Withdraw this offer?')) return
    await api.post(`/offers/${id}/withdraw`)
    reload()
  }
  return (
    <PortalLayout>
      <PageTitle eyebrow="MY OFFERS" title="Offers you have sent." copy="Track which clients viewed, accepted or declined your offers." />
      {loading && !data && <Loading />}
      {data?.offers.length === 0 && <Empty title="No offers yet" text="Respond to matters from your feed." action={<Link className="btn btn-primary" to="/lawyer">Open matter feed</Link>} />}
      <div className="panel">
        {data?.offers.map((o) => (
          <div key={o.id} className="matter-row" role="button" tabIndex={0} onClick={() => navigate(o.status === 'accepted' ? `/matters/${o.matter.id}/workspace` : `/matters/${o.matter.id}`)}>
            <div className="case-mark">{o.matter.category.slice(0, 2).toUpperCase()}</div>
            <div>
              <Status tone={o.status === 'accepted' ? 'teal' : o.status === 'pending' ? 'gold' : 'red'}>{o.status.toUpperCase()}</Status>
              <h3>{o.matter.title}</h3>
              <p>
                {o.matter.reference} · {o.matter.province} · sent {date(o.createdAt)} · {o.viewed ? 'Viewed by client' : 'Not yet viewed'}
              </p>
            </div>
            <div className="matter-count">
              <b>{rand(o.totalFee, { decimals: false })}</b>
              <small>estimate</small>
            </div>
            {o.status === 'pending' ? (
              <button
                className="btn btn-ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  withdraw(o.id)
                }}
              >
                Withdraw
              </button>
            ) : (
              <Icon name="chevron" />
            )}
          </div>
        ))}
      </div>
    </PortalLayout>
  )
}

const CHECK_LABEL = {
  identity: 'Identity verification',
  lpc: 'LPC enrolment',
  practising: 'Practising certificate',
  fidelity: 'Fidelity Fund certificate',
  firm: 'Firm information',
}

export function LawyerProfileEdit() {
  const { refresh } = useAuth()
  const [params] = useSearchParams()
  const [data, { loading, reload }] = useApi('/lawyer/profile')
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState({ kind: '', text: '' })
  useEffect(() => {
    if (data?.profile) {
      const p = data.profile
      setForm({
        practitionerType: p.practitionerType,
        firm: p.firm || '',
        city: p.city || '',
        province: p.province || '',
        areas: p.areas.join(', '),
        courts: p.courts.join(', '),
        languages: p.languages.join(', '),
        yearsExperience: p.yearsExperience,
        consultFee: (p.consultFee / 100).toString(),
        bio: p.bio || '',
        photoUrl: p.photoUrl || '',
        lpcNumber: p.lpcNumber || '',
        practisingCertExpiry: p.practisingCertExpiry ? p.practisingCertExpiry.slice(0, 10) : '',
        fidelityCert: p.fidelityCert || '',
        available: p.available,
      })
    }
  }, [data])
  if ((loading && !data) || !form)
    return (
      <PortalLayout>
        <Loading />
      </PortalLayout>
    )
  const p = data.profile
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)
  const save = async () => {
    const r = await api.put('/lawyer/profile', {
      ...form,
      areas: list(form.areas),
      courts: list(form.courts),
      languages: list(form.languages),
      consultFee: toCents(form.consultFee),
      yearsExperience: Number(form.yearsExperience),
    })
    if (!r.ok) {
      setMsg({ kind: 'error', text: r.error })
      return false
    }
    return true
  }
  const onSave = async (e) => {
    e.preventDefault()
    if (await save()) {
      setMsg({ kind: 'success', text: 'Profile saved.' })
      reload()
    }
  }
  const submit = async () => {
    if (!(await save())) return
    const r = await api.post('/lawyer/profile/submit')
    if (!r.ok) return setMsg({ kind: 'error', text: r.error })
    setMsg({ kind: 'success', text: 'Submitted for verification. We’ll notify you once the review is complete.' })
    reload()
    refresh()
  }
  const statusTone = { approved: 'teal', pending: 'gold', 'more-info': 'gold', rejected: 'red', incomplete: 'gold' }[p.verificationStatus]

  return (
    <PortalLayout>
      <PageTitle
        eyebrow="PRACTICE PROFILE"
        title={params.get('welcome') ? 'Welcome — let’s verify your practice.' : 'Your practice profile.'}
        copy="Clients see your public profile once our team has verified your LPC enrolment and certificates."
        action={<Status tone={statusTone}>{p.verificationStatus.replace('-', ' ').toUpperCase()}</Status>}
      />
      {p.reviewNote && p.verificationStatus !== 'approved' && (
        <Notice kind="warn" className="mb-4">
          <b>Note from the verification team:</b> {p.reviewNote}
        </Notice>
      )}
      <Notice kind={msg.kind || 'error'} className="mb-4">
        {msg.text}
      </Notice>
      <form onSubmit={onSave} className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="panel grid gap-4 md:grid-cols-2">
          <label className={labelCls}>
            PRACTITIONER TYPE
            <select className={field} value={form.practitionerType} onChange={set('practitionerType')}>
              <option>Attorney</option>
              <option>Advocate</option>
            </select>
          </label>
          <label className={labelCls}>
            FIRM / CHAMBERS
            <input className={field} value={form.firm} onChange={set('firm')} maxLength={120} />
          </label>
          <label className={labelCls}>
            CITY
            <input className={field} value={form.city} onChange={set('city')} maxLength={80} />
          </label>
          <label className={labelCls}>
            PROVINCE
            <select className={field} value={form.province} onChange={set('province')}>
              <option value="">Select province</option>
              {FILTERS.province[1].map(([v]) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className={`${labelCls} md:col-span-2`}>
            PRACTICE AREAS (COMMA SEPARATED)
            <input className={field} value={form.areas} onChange={set('areas')} placeholder="Criminal law, Bail, Civil litigation, Family law" />
          </label>
          <label className={labelCls}>
            COURTS YOU APPEAR IN
            <input className={field} value={form.courts} onChange={set('courts')} placeholder="Magistrates' Court, High Court" />
          </label>
          <label className={labelCls}>
            LANGUAGES
            <input className={field} value={form.languages} onChange={set('languages')} placeholder="English, isiZulu" />
          </label>
          <label className={labelCls}>
            YEARS OF EXPERIENCE
            <input className={field} type="number" min="0" max="60" value={form.yearsExperience} onChange={set('yearsExperience')} />
          </label>
          <label className={labelCls}>
            STANDARD CONSULTATION FEE (R, INCL. VAT)
            <input className={field} inputMode="decimal" value={form.consultFee} onChange={set('consultFee')} />
          </label>
          <label className={`${labelCls} md:col-span-2`}>
            PROFILE PHOTO URL (HTTPS)
            <input className={field} value={form.photoUrl} onChange={set('photoUrl')} placeholder="https://…" />
          </label>
          <label className={`${labelCls} md:col-span-2`}>
            BIOGRAPHY
            <textarea rows={4} className={area} value={form.bio} onChange={set('bio')} maxLength={1200} />
          </label>
          <label className="flex items-center gap-2 text-xs text-[#52646a] md:col-span-2">
            <input type="checkbox" checked={form.available} onChange={set('available')} /> I am available for new matters
          </label>
        </section>
        <aside className="space-y-4">
          <section className="panel space-y-3">
            <span className="eyebrow">CREDENTIALS</span>
            <label className={labelCls}>
              LPC ENROLMENT NUMBER
              <input className={field} value={form.lpcNumber} onChange={set('lpcNumber')} maxLength={40} />
            </label>
            <label className={labelCls}>
              PRACTISING CERTIFICATE VALID UNTIL
              <input className={field} type="date" value={form.practisingCertExpiry} onChange={set('practisingCertExpiry')} />
            </label>
            <label className={labelCls}>
              FIDELITY FUND CERTIFICATE NUMBER
              <input className={field} value={form.fidelityCert} onChange={set('fidelityCert')} maxLength={60} />
            </label>
            <p className="text-[14px] leading-5 text-[#65767b]">Changing credentials on a verified profile sends it back for review.</p>
          </section>
          <section className="panel">
            <span className="eyebrow">VERIFICATION CHECKS</span>
            <div className="mt-3 space-y-2">
              {Object.entries(CHECK_LABEL).map(([k, l]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span>{l}</span>
                  <Status tone={p.checks[k] === 'passed' ? 'teal' : p.checks[k] === 'failed' ? 'red' : 'gold'}>
                    {(p.checks[k] || 'not submitted').toUpperCase()}
                  </Status>
                </div>
              ))}
            </div>
          </section>
          <button className="btn btn-primary w-full">Save profile</button>
          {['incomplete', 'more-info', 'rejected'].includes(p.verificationStatus) && (
            <button type="button" className="btn btn-gold w-full" onClick={submit}>
              Submit for verification <Icon name="arrow" size={16} />
            </button>
          )}
          {p.verificationStatus === 'approved' && (
            <Link className="btn btn-outline w-full" to={`/lawyers/${p.id}`}>
              View public profile
            </Link>
          )}
        </aside>
      </form>
    </PortalLayout>
  )
}
