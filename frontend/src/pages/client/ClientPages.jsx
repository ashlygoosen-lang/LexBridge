import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { PortalLayout } from '../../components/PortalLayout'
import { MatterModal } from '../../components/MatterModal'
import { Empty, Loading, Modal, Notice, PageTitle, Status } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi, useAuth } from '../../lib/auth'
import { CATEGORY_LABEL, CATEGORY_MARK, ago, date, dateTime, dayNum, monthShort, rand, time } from '../../lib/format'
import { LawyerOfferForm } from '../lawyer/LawyerPages'

const greeting = () => {
  const h = Number(new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', hour12: false }))
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
const today = () =>
  new Date().toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()

export function statusTone(m) {
  if (m.status === 'open') return m.urgency === 'Within 48 hours' ? ['red', 'URGENT'] : ['gold', 'AWAITING OFFERS']
  if (m.status === 'assigned') return ['teal', 'ACTIVE']
  if (m.status === 'closed') return ['teal', 'CLOSED']
  return ['red', m.status.toUpperCase()]
}

export function ClientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [data, { loading }] = useApi('/client/overview')
  const [modal, setModal] = useState(params.get('post') === '1')
  useEffect(() => {
    if (params.get('post')) setParams({}, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data)
    return (
      <PortalLayout>
        <Loading />
      </PortalLayout>
    )
  const m = data?.metrics
  return (
    <PortalLayout>
      <PageTitle
        eyebrow={today()}
        title={`${greeting()}, ${user.name.split(' ')[0]}.`}
        copy="Here’s what is happening with your legal matters."
        action={
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            Post a new matter <Icon name="arrow" size={17} />
          </button>
        }
      />
      {data?.action && (
        <section className="alert-card">
          <div className="alert-mark">!</div>
          <div>
            <Status tone="gold">ACTION NEEDED</Status>
            <h2>{data.action.title}</h2>
            <p>{data.action.text}</p>
          </div>
          <button className="btn btn-gold" onClick={() => navigate(data.action.link)}>
            Continue <Icon name="arrow" size={17} />
          </button>
        </section>
      )}
      <div className="metric-grid">
        <article>
          <span>OPEN MATTERS</span>
          <b>{m.openMatters}</b>
          <small>{m.needsAttention ? '1 needs your attention' : 'Nothing needs attention'}</small>
        </article>
        <article>
          <span>NEW OFFERS</span>
          <b>{m.newOffers}</b>
          <small>
            Across {m.offerMatters} matter{m.offerMatters === 1 ? '' : 's'}
          </small>
        </article>
        <article>
          <span>NEXT COURT DATE</span>
          <b className="metric-date">{m.nextCourtDate ? date(m.nextCourtDate, { year: undefined }) : '—'}</b>
          <small>{m.nextCourtDetail || 'No court dates yet'}</small>
        </article>
        <article>
          <span>OUTSTANDING</span>
          <b>{rand(m.outstanding, { decimals: false })}</b>
          <small>{m.outstandingLabel}</small>
        </article>
      </div>
      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <span>ACTIVE MATTERS</span>
              <h2>Your matters</h2>
            </div>
            <button onClick={() => navigate('/matters')}>View all</button>
          </div>
          {data.matters.length === 0 && (
            <Empty
              title="No open matters"
              text="Post a matter to receive responses from verified lawyers."
              action={
                <button className="btn btn-primary" onClick={() => setModal(true)}>
                  Post my matter
                </button>
              }
            />
          )}
          {data.matters.map((x) => {
            const [tone, label] = statusTone(x)
            return (
              <div
                key={x.id}
                className="matter-row"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(x.status === 'assigned' ? `/matters/${x.id}/workspace` : `/matters/${x.id}`)}
                onClick={() => navigate(x.status === 'assigned' ? `/matters/${x.id}/workspace` : `/matters/${x.id}`)}
              >
                <div className={`case-mark ${x.urgency === 'Within 48 hours' && x.status === 'open' ? 'urgent-case' : ''}`}>{CATEGORY_MARK[x.category]}</div>
                <div>
                  <Status tone={tone}>{label}</Status>
                  <h3>{x.title}</h3>
                  <p>
                    {CATEGORY_LABEL[x.category]} · {x.courtName || x.courtLevel || x.province}
                  </p>
                </div>
                <div className="matter-count">
                  <b>{x.status === 'assigned' ? 1 : x.offerCount}</b>
                  <small>{x.status === 'assigned' ? 'lawyer' : 'offers'}</small>
                </div>
                <Icon name="chevron" />
              </div>
            )
          })}
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <span>UP NEXT</span>
              <h2>Timeline</h2>
            </div>
          </div>
          <div className="timeline-list">
            {data.timeline.length === 0 && <p className="text-xs text-[#65767b]">Hearings, consultations and deadlines will appear here.</p>}
            {data.timeline.map((e, i) => (
              <div key={e.id} className={i === 0 ? 'current' : ''}>
                <span>
                  {dayNum(e.eventDate)}
                  <small>{monthShort(e.eventDate)}</small>
                </span>
                <div>
                  <b>{e.title}</b>
                  <p>
                    {time(e.eventDate)} · {e.details || e.matterTitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="privacy-banner">
        <Icon name="lock" />
        <div>
          <b>Your information is protected</b>
          <p>Only your chosen lawyer can see your personal details, and only after you sign the mandate. Manage your POPIA preferences in the Privacy Centre.</p>
        </div>
        <button onClick={() => navigate('/account#privacy')}>Privacy centre</button>
      </section>
      {modal && <MatterModal onClose={() => setModal(false)} />}
    </PortalLayout>
  )
}

export function MattersList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, { loading }] = useApi('/matters/mine')
  const [modal, setModal] = useState(false)
  const lawyer = user.role === 'lawyer'
  return (
    <PortalLayout>
      <PageTitle
        eyebrow={lawyer ? 'ACTIVE MATTERS' : 'MY MATTERS'}
        title={lawyer ? 'Matters you are handling.' : 'Your legal matters.'}
        copy={lawyer ? 'Matters where a client accepted your offer.' : 'Track offers, active work and closed matters.'}
        action={
          !lawyer && (
            <button className="btn btn-primary" onClick={() => setModal(true)}>
              Post a new matter <Icon name="arrow" size={17} />
            </button>
          )
        }
      />
      {loading && !data && <Loading />}
      {data?.matters.length === 0 && (
        <Empty
          title={lawyer ? 'No active matters yet' : 'You have not posted a matter yet'}
          text={lawyer ? 'Send offers from the matter feed. Accepted matters appear here.' : 'Describe your situation and receive offers from verified lawyers.'}
          action={
            lawyer ? (
              <Link to="/lawyer" className="btn btn-primary">
                Open matter feed
              </Link>
            ) : (
              <button className="btn btn-primary" onClick={() => setModal(true)}>
                Post my matter
              </button>
            )
          }
        />
      )}
      <div className="panel">
        {data?.matters.map((x) => {
          const [tone, label] = statusTone(x)
          const to = x.status === 'assigned' || x.status === 'closed' ? `/matters/${x.id}/workspace` : `/matters/${x.id}`
          return (
            <div key={x.id} className="matter-row" role="button" tabIndex={0} onClick={() => navigate(to)} onKeyDown={(e) => e.key === 'Enter' && navigate(to)}>
              <div className="case-mark">{CATEGORY_MARK[x.category]}</div>
              <div>
                <Status tone={tone}>{label}</Status>
                <h3>{x.title}</h3>
                <p>
                  {x.reference} · {CATEGORY_LABEL[x.category]} · {x.province}
                  {lawyer ? ` · Client: ${x.clientName}` : x.lawyer ? ` · ${x.lawyer.name}` : ''}
                </p>
              </div>
              <div className="matter-count">
                <b>{x.status === 'open' ? x.offerCount : '✓'}</b>
                <small>{x.status === 'open' ? 'offers' : x.status}</small>
              </div>
              <Icon name="chevron" />
            </div>
          )
        })}
      </div>
      {modal && <MatterModal onClose={() => setModal(false)} />}
    </PortalLayout>
  )
}

export function WorkspaceIndex({ target = 'workspace' }) {
  const [data] = useApi('/matters/mine')
  if (!data)
    return (
      <PortalLayout>
        <Loading />
      </PortalLayout>
    )
  const active = data.matters.find((m) => m.status === 'assigned') || data.matters.find((m) => m.status === 'closed')
  if (active) return <Navigate replace to={`/matters/${active.id}/${target}`} />
  return (
    <PortalLayout>
      <PageTitle eyebrow="CASE WORKSPACE" title="No active matter yet." copy="Once you accept a lawyer’s offer, your secure workspace opens here." />
      <Empty title="Nothing to show yet" text="Compare offers on your open matters to get started." action={<Link className="btn btn-primary" to="/matters">My matters</Link>} />
    </PortalLayout>
  )
}

// /matters/:id — the client compares offers; a lawyer sees the anonymised matter and can respond.
export function MatterPage() {
  const { id } = useParams()
  const { user } = useAuth()
  if (user.role === 'lawyer') return <LawyerMatterView id={id} />
  return <OffersView id={id} />
}

function LawyerMatterView({ id }) {
  const [data, { loading, error, reload }] = useApi(`/matters/${id}`)
  const navigate = useNavigate()
  if (loading && !data)
    return (
      <PortalLayout>
        <Loading />
      </PortalLayout>
    )
  if (error || !data)
    return (
      <PortalLayout>
        <Empty title="Matter unavailable" text={error} action={<Link className="btn btn-primary" to="/lawyer">Back to feed</Link>} />
      </PortalLayout>
    )
  const m = data.matter
  if (m.lawyerId) return <Navigate replace to={`/matters/${m.id}/workspace`} />
  return (
    <PortalLayout>
      <div className="breadcrumb">
        <button onClick={() => navigate('/lawyer')}>Matter feed</button>
        <span>/</span>
        <span>{m.title}</span>
      </div>
      <PageTitle eyebrow={`${CATEGORY_LABEL[m.category].toUpperCase()} · ${data.matchScore}% MATCH`} title={m.title} copy={`${m.courtLevel || 'Court not specified'} · ${m.city ? `${m.city}, ` : ''}${m.province} · posted ${ago(m.createdAt)}`} />
      <div className="offers-layout">
        <section className="panel">
          <span className="eyebrow">CLIENT’S SUMMARY</span>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#3f5056]">{m.description}</p>
          <div className="feed-details mt-5">
            <span>
              <small>BUDGET</small>
              <b>{m.budget || 'Open to estimates'}</b>
            </span>
            <span>
              <small>URGENCY</small>
              <b>{m.urgency}</b>
            </span>
            <span>
              <small>SIDE</small>
              <b>{m.side || '—'}</b>
            </span>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-[#65767b]">
            <Icon name="lock" size={15} /> The client’s identity is protected until they accept your offer and sign a mandate.
          </p>
        </section>
        <aside className="offer-detail">
          {data.myOffer && data.myOffer.status !== 'withdrawn' ? (
            <>
              <span className="eyebrow">YOUR OFFER</span>
              <h2>{rand(data.myOffer.totalFee)}</h2>
              <p className="text-xs text-[#65767b]">Consultation {rand(data.myOffer.consultFee)} · {data.myOffer.feeStructure}</p>
              <Status tone={data.myOffer.status === 'accepted' ? 'teal' : data.myOffer.status === 'declined' ? 'red' : 'gold'}>
                {data.myOffer.status.toUpperCase()}
              </Status>
              {data.myOffer.status === 'pending' && (
                <button
                  className="btn btn-ghost mt-4"
                  onClick={async () => {
                    await api.post(`/offers/${data.myOffer.id}/withdraw`)
                    reload()
                  }}
                >
                  Withdraw offer
                </button>
              )}
            </>
          ) : (
            <LawyerOfferForm matter={m} onSent={reload} />
          )}
        </aside>
      </div>
    </PortalLayout>
  )
}

function OffersView({ id }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [data, { loading, error, reload }] = useApi(`/matters/${id}/offers`)
  const [selected, setSelected] = useState(0)
  const [compare, setCompare] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  const [details, setDetails] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (data?.offers?.length) setCompare(data.offers.slice(0, 2).map((o) => o.id))
  }, [data?.offers?.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data)
    return (
      <PortalLayout>
        <Loading />
      </PortalLayout>
    )
  if (error || !data)
    return (
      <PortalLayout>
        <Empty title="Matter unavailable" text={error} action={<Link className="btn btn-primary" to="/matters">My matters</Link>} />
      </PortalLayout>
    )
  const m = data.matter
  const offers = data.offers
  const sel = offers[selected]
  const accepted = offers.find((o) => o.status === 'accepted')

  const accept = async (offer) => {
    if (!window.confirm(`Accept ${offer.lawyer.name}'s offer? Other offers will be declined.`)) return
    setBusy(true)
    const r = await api.post(`/matters/${m.id}/offers/${offer.id}/accept`)
    setBusy(false)
    if (!r.ok) return setMsg(r.error)
    navigate(`/matters/${m.id}/checkout`)
  }
  const withdraw = async () => {
    if (!window.confirm('Withdraw this matter? Lawyers will no longer be able to respond.')) return
    const r = await api.post(`/matters/${m.id}/cancel`)
    if (!r.ok) return setMsg(r.error)
    reload()
  }

  return (
    <PortalLayout>
      <div className="breadcrumb">
        <button onClick={() => navigate('/matters')}>My matters</button>
        <span>/</span>
        <span>{m.title}</span>
      </div>
      <PageTitle
        eyebrow={`${offers.length} VERIFIED RESPONSE${offers.length === 1 ? '' : 'S'}`}
        title={accepted ? 'Your lawyer is confirmed.' : 'Compare lawyer offers.'}
        copy={accepted ? `You chose ${accepted.lawyer.name}.` : 'Review fees, experience and availability before you decide.'}
        action={
          accepted && (
            <button className="btn btn-gold" onClick={() => navigate(`/matters/${m.id}/checkout`)}>
              Continue <Icon name="arrow" size={16} />
            </button>
          )
        }
      />
      {params.get('posted') && (
        <Notice kind="success" className="mb-4">
          Your matter {m.reference} is live. Verified lawyers who practise in this area have been notified — offers will appear here.
        </Notice>
      )}
      {m.moderationStatus === 'hidden' && (
        <Notice kind="warn" className="mb-4">
          This matter is paused by our moderation team and hidden from lawyers. Check your notifications for details.
        </Notice>
      )}
      <Notice className="mb-4">{msg}</Notice>
      <section className="matter-summary-bar">
        <div>
          <Status tone={statusTone(m)[0]}>{statusTone(m)[1]}</Status>
          <b>{m.title}</b>
          <span>
            {m.courtLevel || CATEGORY_LABEL[m.category]} · {m.province} · {m.urgency}
          </span>
        </div>
        <button onClick={() => setDetails(true)}>View matter details</button>
      </section>
      {offers.length === 0 ? (
        <Empty
          title={m.status === 'open' ? 'Waiting for offers' : 'No offers'}
          text={m.status === 'open' ? 'Matching lawyers usually respond within a few hours. We’ll notify you as soon as an offer arrives.' : 'This matter is no longer open.'}
          action={
            m.status === 'open' && (
              <button className="btn btn-ghost" onClick={withdraw}>
                Withdraw matter
              </button>
            )
          }
        />
      ) : (
        <div className="offers-layout">
          <div className="offers-list">
            <div className="compare-head">
              <span>Select up to 4 offers to compare</span>
              <button disabled={compare.length < 2} onClick={() => setShowCompare(true)}>
                Compare {compare.length} offers
              </button>
            </div>
            {offers.map((offer, index) => (
              <article key={offer.id} className={`offer-card ${selected === index ? 'selected' : ''}`} onClick={() => setSelected(index)}>
                <label className="compare-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={compare.includes(offer.id)}
                    onChange={() =>
                      setCompare(compare.includes(offer.id) ? compare.filter((i) => i !== offer.id) : compare.length < 4 ? [...compare, offer.id] : compare)
                    }
                  />{' '}
                  Compare
                </label>
                <div className="offer-person">
                  {offer.lawyer.photoUrl ? <img src={offer.lawyer.photoUrl} alt="" /> : <span className="avatar-initials">{offer.lawyer.name[0]}</span>}
                  <div>
                    <span className="verified-inline">
                      <Icon name="check" size={11} /> VERIFIED
                    </span>
                    <h2>{offer.lawyer.name}</h2>
                    <p>
                      {offer.lawyer.practitionerType} · {offer.lawyer.firm}
                    </p>
                    <span>
                      <Icon name="star" size={14} /> {offer.lawyer.rating.toFixed(1)} · {offer.lawyer.yearsExperience} years experience
                    </span>
                  </div>
                  <Status tone={offer.status === 'accepted' ? 'teal' : offer.status === 'declined' ? 'red' : 'gold'}>
                    {offer.status === 'pending' ? `${offer.matchScore}% match` : offer.status.toUpperCase()}
                  </Status>
                </div>
                <blockquote>“{offer.note}”</blockquote>
                <div className="offer-fees">
                  <span>
                    <small>CONSULTATION</small>
                    <b>{rand(offer.consultFee)}</b>
                  </span>
                  <span>
                    <small>TOTAL ESTIMATE</small>
                    <b>{rand(offer.totalFee)}</b>
                  </span>
                  <span>
                    <small>FEE STRUCTURE</small>
                    <b>{offer.feeStructure}</b>
                  </span>
                </div>
                <div className="offer-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/lawyers/${offer.lawyerId}`)
                    }}
                  >
                    View profile
                  </button>
                  {m.status === 'open' && offer.status === 'pending' && (
                    <button
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation()
                        accept(offer)
                      }}
                    >
                      Accept offer
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {sel && (
            <aside className="offer-detail">
              <span className="eyebrow">FEE BREAKDOWN</span>
              <h2>{sel.lawyer.name}</h2>
              <div className="fee-lines">
                <p>
                  <span>Consultation fee</span>
                  <b>{rand(sel.consultFee)}</b>
                </p>
                {sel.breakdown.map((b) => (
                  <p key={b.label}>
                    <span>{b.label}</span>
                    <b>{rand(b.amount)}</b>
                  </p>
                ))}
                <p>
                  <span>VAT included (15%)</span>
                  <b>{rand(Math.round(sel.totalFee - sel.totalFee / 1.15))}</b>
                </p>
              </div>
              <div className="fee-total">
                <span>ESTIMATED TOTAL</span>
                <b>{rand(sel.totalFee)}</b>
                <small>Final terms are set out in the signed mandate.</small>
              </div>
              <h3>What’s included</h3>
              <ul>
                {sel.inclusions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              {m.status === 'open' && sel.status === 'pending' && (
                <button className="btn btn-gold" disabled={busy} onClick={() => accept(sel)}>
                  Choose this lawyer <Icon name="arrow" size={16} />
                </button>
              )}
            </aside>
          )}
        </div>
      )}
      {showCompare && (
        <Modal title="Compare offers" eyebrow="SIDE BY SIDE" wide onClose={() => setShowCompare(false)}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#dce3df] text-[10px] text-[#7f8d91]">
                  <th className="py-2" />
                  {offers
                    .filter((o) => compare.includes(o.id))
                    .map((o) => (
                      <th key={o.id} className="py-2 font-serif text-base text-[#0b2635]">
                        {o.lawyer.name}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Consultation', (o) => rand(o.consultFee)],
                  ['Total estimate', (o) => rand(o.totalFee)],
                  ['Fee structure', (o) => o.feeStructure],
                  ['Experience', (o) => `${o.lawyer.yearsExperience} years`],
                  ['Rating', (o) => `${o.lawyer.rating.toFixed(1)} (${o.lawyer.reviewCount})`],
                  ['Languages', (o) => o.lawyer.languages.join(', ')],
                  ['Match', (o) => `${o.matchScore}%`],
                  ['Includes', (o) => o.inclusions.join(' · ')],
                ].map(([label, fn]) => (
                  <tr key={label} className="border-b border-[#edf0ee] align-top">
                    <td className="py-3 pr-3 font-bold text-[#607078]">{label}</td>
                    {offers
                      .filter((o) => compare.includes(o.id))
                      .map((o) => (
                        <td key={o.id} className="py-3 pr-3">
                          {fn(o)}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
      {details && (
        <Modal title={m.title} eyebrow={m.reference} onClose={() => setDetails(false)}>
          <p className="whitespace-pre-wrap text-sm leading-7 text-[#3f5056]">{m.description}</p>
          <div className="review-card mt-4">
            <div>
              <span>Type</span>
              <b>
                {CATEGORY_LABEL[m.category]} — {m.side}
              </b>
            </div>
            <div>
              <span>Budget</span>
              <b>{m.budget || 'Not specified'}</b>
            </div>
            <div>
              <span>Posted</span>
              <b>{dateTime(m.createdAt)}</b>
            </div>
          </div>
          {m.status === 'open' && (
            <button className="btn btn-ghost mt-4" onClick={withdraw}>
              Withdraw matter
            </button>
          )}
        </Modal>
      )}
    </PortalLayout>
  )
}

