import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { PublicHeader } from '../components/PublicHeader'
import { MatterModal } from '../components/MatterModal'
import { Empty, Loading } from '../components/ui'
import { api } from '../lib/api'
import { useApi, useAuth } from '../lib/auth'
import { rand, responseLabel } from '../lib/format'

const FEES = [
  ['', 'Any fee range'],
  ['75000', 'Up to R 750'],
  ['90000', 'Up to R 900'],
  ['120000', 'Up to R 1 200'],
]

function Avatar({ lawyer, className = '' }) {
  return lawyer.photoUrl ? (
    <img src={lawyer.photoUrl} alt="" className={className} />
  ) : (
    <span className={`grid place-items-center bg-[#12394b] font-serif text-3xl text-[#d7a84a] ${className}`}>{lawyer.name[0]}</span>
  )
}

export default function Directory() {
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState(params.get('q') || '')
  const filters = Object.fromEntries(['q', 'province', 'area', 'court', 'language', 'maxFee', 'sort'].map((k) => [k, params.get(k) || '']))
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
  const [data, { loading }] = useApi(`/lawyers?${qs}`)
  const [saved, setSaved] = useState({})
  const setFilter = (k, v) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p)
  }
  useEffect(() => {
    setQ(params.get('q') || '')
  }, [params])

  const toggleSave = async (id) => {
    if (!user) return navigate('/login?next=/lawyers')
    const r = await api.post(`/lawyers/${id}/save`)
    if (r.ok) setSaved((s) => ({ ...s, [id]: r.saved }))
  }
  const facets = data?.facets

  return (
    <div className="public-subpage">
      <PublicHeader />
      <section className="directory-hero">
        <span className="eyebrow light">VERIFIED SOUTH AFRICAN PRACTITIONERS</span>
        <h1>Find a lawyer who fits your matter.</h1>
        <p>Search by location, expertise, language and court experience.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setFilter('q', q.trim())
          }}
        >
          <div>
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Practice area or lawyer name" />
            <select value={filters.province || 'All provinces'} onChange={(e) => setFilter('province', e.target.value === 'All provinces' ? '' : e.target.value)}>
              <option>All provinces</option>
              {(facets?.provinces ?? []).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <button type="submit">Search</button>
          </div>
        </form>
      </section>
      <main className="directory-main">
        <aside className="directory-filters">
          <div>
            <b>FILTER RESULTS</b>
            <button onClick={() => setParams({})}>Clear all</button>
          </div>
          <label>
            Practice area
            <select value={filters.area} onChange={(e) => setFilter('area', e.target.value)}>
              <option value="">All practice areas</option>
              {(facets?.areas ?? []).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Court level
            <select value={filters.court} onChange={(e) => setFilter('court', e.target.value)}>
              <option value="">All courts</option>
              {(facets?.courts ?? []).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Language
            <select value={filters.language} onChange={(e) => setFilter('language', e.target.value)}>
              <option value="">Any language</option>
              {(facets?.languages ?? []).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Consultation fee
            <select value={filters.maxFee} onChange={(e) => setFilter('maxFee', e.target.value)}>
              {FEES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="check-label">
            <input type="checkbox" checked readOnly /> Verified lawyers only
          </label>
        </aside>
        <section className="directory-results">
          <div className="results-head">
            <span>
              <b>
                {data?.lawyers.length ?? 0} lawyer{data?.lawyers.length === 1 ? '' : 's'}
              </b>{' '}
              available
            </span>
            <select value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
              <option value="">Best match</option>
              <option value="rating">Highest rated</option>
              <option value="fee">Lowest consultation fee</option>
            </select>
          </div>
          {loading && !data && <Loading />}
          {data?.lawyers.length === 0 && <Empty title="No lawyers match these filters" text="Try a broader practice area or another province." />}
          {data?.lawyers.map((lawyer) => {
            const isSaved = saved[lawyer.id] ?? lawyer.saved
            return (
              <article className="directory-lawyer" key={lawyer.id}>
                <Avatar lawyer={lawyer} className={lawyer.photoUrl ? '' : 'h-[145px] w-[115px] rounded-[10px]'} />
                <div className="directory-lawyer-info">
                  <span className="verified-inline">
                    <Icon name="check" size={11} /> LPC VERIFIED
                  </span>
                  <h2>{lawyer.name}</h2>
                  <p>
                    {lawyer.practitionerType} · {lawyer.firm} · {lawyer.city}, {lawyer.province}
                  </p>
                  <div className="tags">
                    {lawyer.areas.slice(0, 4).map((a) => (
                      <span key={a}>{a}</span>
                    ))}
                  </div>
                  <p className="lawyer-about">{lawyer.bio}</p>
                  <div>
                    <span>
                      <Icon name="star" size={14} /> {lawyer.rating.toFixed(1)} ({lawyer.reviewCount})
                    </span>
                    <span>{lawyer.yearsExperience} years</span>
                    <span>{lawyer.languages.join(', ')}</span>
                  </div>
                </div>
                <div className="directory-cta">
                  <small>CONSULTATION FROM</small>
                  <b>{rand(lawyer.consultFee)}</b>
                  <span>{responseLabel(lawyer.responseMinutes)}</span>
                  <button className="btn btn-primary" onClick={() => navigate(`/lawyers/${lawyer.id}`)}>
                    View profile
                  </button>
                  <button className="btn btn-ghost" onClick={() => toggleSave(lawyer.id)}>
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      </main>
    </div>
  )
}

export function LawyerProfilePage() {
  const { id } = useParams()
  const [data, { loading, error }] = useApi(`/lawyers/${id}`)
  const [modal, setModal] = useState(false)
  const l = data?.lawyer
  return (
    <div className="public-subpage">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link to="/lawyers" className="text-xs font-bold text-[#1f6e6a]">
          ← All lawyers
        </Link>
        {loading && !data && <Loading />}
        {error && <Empty title="Profile unavailable" text={error} />}
        {l && (
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-2xl border border-[#dce3df] bg-white p-7 shadow-[0_8px_30px_rgba(8,34,47,.07)]">
              <div className="flex flex-wrap items-start gap-5">
                <Avatar lawyer={l} className="h-28 w-28 rounded-xl object-cover" />
                <div>
                  <span className="verified-inline">
                    <Icon name="check" size={11} /> LPC VERIFIED
                  </span>
                  <h1 className="mt-2 font-serif text-4xl tracking-[-.03em] text-[#0b2635]">{l.name}</h1>
                  <p className="mt-1 text-sm text-[#607078]">
                    {l.practitionerType} · {l.firm} · {l.city}, {l.province}
                  </p>
                  <p className="mt-3 flex flex-wrap gap-4 text-xs text-[#52646a]">
                    <span className="flex items-center gap-1">
                      <Icon name="star" size={14} /> <b>{l.rating.toFixed(1)}</b> · {l.reviewCount} reviews
                    </span>
                    <span>{l.yearsExperience} years’ experience</span>
                    <span className="flex items-center gap-1">
                      <Icon name="clock" size={14} /> {responseLabel(l.responseMinutes)}
                    </span>
                  </p>
                </div>
              </div>
              <h2 className="mt-8 font-serif text-2xl text-[#0b2635]">About</h2>
              <p className="mt-2 text-sm leading-7 text-[#52646a]">{l.bio || 'This practitioner has not added a biography yet.'}</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-3">
                {[
                  ['Practice areas', l.areas],
                  ['Courts', l.courts],
                  ['Languages', l.languages],
                ].map(([t, xs]) => (
                  <div key={t}>
                    <b className="text-[14px] tracking-[.12em] text-[#a97618]">{t.toUpperCase()}</b>
                    <div className="tags mt-2">
                      {xs.map((x) => (
                        <span key={x}>{x}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <aside className="h-max rounded-2xl bg-[#0b2635] p-6 text-white">
              <small className="text-[14px] font-bold tracking-[.14em] text-[#e5c477]">CONSULTATION FROM</small>
              <b className="mt-2 block font-serif text-4xl">{rand(l.consultFee)}</b>
              <p className="mt-3 text-xs leading-6 text-[#b7c9cd]">
                Post your matter anonymously. Matching verified lawyers — including {l.name.split(' ')[0] === 'Adv.' ? l.name : l.name.split(' ')[0]} if
                it fits their practice — can respond with a clear fee estimate.
              </p>
              <button className="btn btn-gold mt-5 w-full" onClick={() => setModal(true)}>
                Post my matter <Icon name="arrow" size={16} />
              </button>
              <p className="mt-4 flex gap-2 text-[14px] text-[#9fb5b8]">
                <Icon name="lock" size={15} /> Your identity stays private until you accept an offer.
              </p>
            </aside>
          </div>
        )}
      </main>
      {modal && <MatterModal onClose={() => setModal(false)} />}
    </div>
  )
}
