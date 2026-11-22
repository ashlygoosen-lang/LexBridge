import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { PublicHeader } from '../components/PublicHeader'
import { PortalLayout } from '../components/PortalLayout'
import { PageTitle, Status } from '../components/ui'
import { Counter } from '../motion/Counter'
import { useAuth } from '../lib/auth'
import { courts } from '../data/courts'
import { magisterialAreas, magisterialAreaSource, magisterialDistricts, magisterialSeats } from '../data/magistrateData'

export function CourtDirectory() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [courtType, setCourtType] = useState('All courts')
  const [province, setProvince] = useState('All provinces')
  const [copied, setCopied] = useState('')
  const provinces = [...new Set(courts.map((c) => c.province))].sort()
  const filtered = courts.filter((court) => {
    const haystack = `${court.name} ${court.province} ${court.registrar} ${court.street}`.toLowerCase()
    return (
      haystack.includes(query.toLowerCase()) &&
      (courtType === 'All courts' || court.type === courtType) &&
      (province === 'All provinces' || court.province === province)
    )
  })
  const clearFilters = () => {
    setQuery('')
    setCourtType('All courts')
    setProvince('All provinces')
  }
  const copyAddress = (name, address) => {
    navigator.clipboard?.writeText(address)
    setCopied(name)
    window.setTimeout(() => setCopied(''), 1800)
  }

  return (
    <div className="court-page">
      <PublicHeader court />
      <section className="court-hero">
        <div className="court-hero-copy">
          <span className="eyebrow light">SOUTH AFRICAN COURT DIRECTORY</span>
          <h1>
            Find the right court,
            <br />
            <em>without the uncertainty.</em>
          </h1>
          <p>Registrar information, official contact details and physical addresses for superior and specialist courts across South Africa.</p>
        </div>
        <div className="court-hero-stat">
          <div>
            <b>
              <Counter value={courts.length} />
            </b>
            <span>COURTS LISTED</span>
          </div>
          <div>
            <b>9</b>
            <span>PROVINCES & NATIONAL</span>
          </div>
          <p>
            <Icon name="shield" size={16} /> Confirm details with the Office of the Chief Justice before travel or filing.
          </p>
          <button className="court-switch-link" onClick={() => navigate('/magistrates')}>
            Find my Magistrate Court <Icon name="arrow" size={15} />
          </button>
        </div>
      </section>

      <main className="court-main">
        <section className="court-search-panel">
          <div className="court-search-input">
            <Icon name="search" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by court, city, province or registrar" />
          </div>
          <label>
            COURT TYPE
            <select value={courtType} onChange={(e) => setCourtType(e.target.value)}>
              <option>All courts</option>
              <option>National court</option>
              <option>High Court</option>
              <option>Specialist court</option>
            </select>
          </label>
          <label>
            PROVINCE
            <select value={province} onChange={(e) => setProvince(e.target.value)}>
              <option>All provinces</option>
              {provinces.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        </section>

        <div className="court-result-bar">
          <div>
            <span className="eyebrow">COURT CONTACTS</span>
            <b>
              {filtered.length} {filtered.length === 1 ? 'court' : 'courts'} found
            </b>
          </div>
          {(query || courtType !== 'All courts' || province !== 'All provinces') && <button onClick={clearFilters}>Clear filters</button>}
        </div>

        {filtered.length ? (
          <section className="court-grid">
            {filtered.map((court, index) => (
              <article className="court-card" key={court.name}>
                <div className="court-card-top">
                  <span className="court-number">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <Status tone={court.type === 'National court' ? 'gold' : 'teal'}>{court.type.toUpperCase()}</Status>
                    <h2>{court.name}</h2>
                    <p>{court.province}</p>
                  </div>
                </div>
                <div className="registrar-block">
                  <span>REGISTRAR</span>
                  <b>{court.registrar}</b>
                  <small>{court.role}</small>
                </div>
                <div className="court-addresses">
                  <div>
                    <Icon name="pin" size={17} />
                    <span>
                      <small>STREET ADDRESS</small>
                      <b>{court.street}</b>
                    </span>
                  </div>
                  <div>
                    <Icon name="document" size={17} />
                    <span>
                      <small>POSTAL ADDRESS</small>
                      <b>{court.postal}</b>
                    </span>
                  </div>
                </div>
                <div className="court-contact-list">
                  <div>
                    <small>PHONE</small>
                    <span>
                      {court.phones.map((phone) => (
                        <a href={`tel:${phone.replace(/\s/g, '')}`} key={phone}>
                          {phone}
                        </a>
                      ))}
                    </span>
                  </div>
                  <div>
                    <small>FAX</small>
                    <span>{court.fax || 'Not listed'}</span>
                  </div>
                  <div className="email-row">
                    <small>EMAIL</small>
                    <span>{court.email ? <a href={`mailto:${court.email}`}>{court.email}</a> : 'Not listed'}</span>
                  </div>
                </div>
                <div className="court-card-actions">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(court.street)}`} target="_blank" rel="noreferrer">
                    <Icon name="pin" size={15} /> Get directions
                  </a>
                  <button onClick={() => copyAddress(court.name, court.street)}>
                    <Icon name={copied === court.name ? 'check' : 'document'} size={15} />
                    {copied === court.name ? 'Address copied' : 'Copy address'}
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="court-empty">
            <span>0</span>
            <h2>No courts match those filters.</h2>
            <p>Try another court type, province or search term.</p>
            <button className="btn btn-primary" onClick={clearFilters}>
              Reset directory
            </button>
          </section>
        )}

        <section className="court-note">
          <Icon name="shield" />
          <div>
            <b>Before you visit or file documents</b>
            <p>
              Court contact details and registrar appointments can change. Confirm operating hours, filing requirements and contact details
              directly with the relevant court or the Office of the Chief Justice.
            </p>
          </div>
          <button onClick={() => navigate('/fees')}>
            View court rules <Icon name="arrow" size={15} />
          </button>
        </section>
      </main>
    </div>
  )
}

export function MagistrateDirectory() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [district, setDistrict] = useState('All districts')
  const [seat, setSeat] = useState('All seats')
  const [visible, setVisible] = useState(40)
  const filtered = useMemo(
    () =>
      magisterialAreas.filter((item) => {
        const terms = `${item.area} ${item.district} ${item.seat} ${item.courts.join(' ')}`.toLowerCase()
        return (
          terms.includes(query.toLowerCase()) &&
          (district === 'All districts' || item.district === district) &&
          (seat === 'All seats' || item.seat === seat)
        )
      }),
    [query, district, seat],
  )
  const clearFilters = () => {
    setQuery('')
    setDistrict('All districts')
    setSeat('All seats')
    setVisible(40)
  }

  return (
    <div className="court-page magistrate-page">
      <PublicHeader magistrate />
      <section className="magistrate-hero">
        <div>
          <span className="eyebrow light">PROCLAIMED MAGISTERIAL DISTRICTS · WESTERN CAPE</span>
          <h1>
            Find the court
            <br />
            <em>for your area.</em>
          </h1>
          <p>Search a suburb, town or area to identify its Magisterial District, Main Seat or Sub District, and the courts that serve it.</p>
        </div>
        <aside>
          <Icon name="pin" size={24} />
          <b>How to use this directory</b>
          <p>Start with the area where the incident happened or where the parties live. Confirm jurisdiction with the relevant court before filing.</p>
          <span className="source-count">
            <Counter value={magisterialAreaSource.recordCount} /> official area records
          </span>
          <button onClick={() => navigate('/courts')}>
            View court contact details <Icon name="arrow" size={14} />
          </button>
        </aside>
      </section>

      <main className="magistrate-main">
        <section className="magistrate-search">
          <div className="court-search-input">
            <Icon name="search" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setVisible(40)
              }}
              placeholder="Search for an area, district or court name…"
            />
          </div>
          <label>
            MAGISTERIAL DISTRICT
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value)
                setVisible(40)
              }}
            >
              <option>All districts</option>
              {magisterialDistricts.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            MAIN SEAT / SUB DISTRICT
            <select
              value={seat}
              onChange={(e) => {
                setSeat(e.target.value)
                setVisible(40)
              }}
            >
              <option>All seats</option>
              {magisterialSeats.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </section>

        <div className="magistrate-result-head">
          <div>
            <span className="eyebrow">WESTERN CAPE AREAS</span>
            <h2>{filtered.length} proclaimed areas found</h2>
          </div>
          {(query || district !== 'All districts' || seat !== 'All seats') && <button onClick={clearFilters}>Clear all filters</button>}
        </div>

        {filtered.length ? (
          <>
            <section className="magistrate-table" aria-label="Western Cape magisterial areas">
              <div className="magistrate-table-head">
                <span>AREA</span>
                <span>MAGISTERIAL DISTRICT</span>
                <span>MAIN SEAT / SUB DISTRICT</span>
                <span>COURTS</span>
              </div>
              {filtered.slice(0, visible).map((item, index) => (
                <article className="magistrate-row" key={`${item.area}-${item.seat}-${index}`}>
                  <div data-label="Area">
                    <span className="area-pin">
                      <Icon name="pin" size={13} />
                    </span>
                    <b>{item.area}</b>
                  </div>
                  <div data-label="Magisterial District">
                    <span>{item.district}</span>
                  </div>
                  <div data-label="Main Seat / Sub District">
                    <span>{item.seat}</span>
                  </div>
                  <div data-label="Courts">
                    <span className="court-chips">
                      {item.courts.map((court) => (
                        <button
                          key={court}
                          title="Search for directions"
                          onClick={() =>
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${court}, Western Cape`)}`, '_blank', 'noopener')
                          }
                        >
                          {court}
                        </button>
                      ))}
                    </span>
                  </div>
                </article>
              ))}
            </section>
            {visible < filtered.length && (
              <div className="load-areas">
                <p>
                  Showing {Math.min(visible, filtered.length)} of {filtered.length} areas
                </p>
                <button className="btn btn-outline" onClick={() => setVisible(visible + 40)}>
                  Show 40 more areas
                </button>
              </div>
            )}
          </>
        ) : (
          <section className="court-empty">
            <span>0</span>
            <h2>No proclaimed areas found.</h2>
            <p>Check the spelling or broaden your district filters.</p>
            <button className="btn btn-primary" onClick={clearFilters}>
              Reset area search
            </button>
          </section>
        )}

        <section className="enquiry-card">
          <div className="enquiry-icon">
            <Icon name="user" />
          </div>
          <div>
            <span>COURT ESTABLISHMENT ENQUIRIES</span>
            <h2>Mr Makena Z Moagi</h2>
            <p>Deputy Director · Court Establishment</p>
          </div>
          <a href="tel:0123151767">
            <small>TELEPHONE</small>
            <b>012 315 1767</b>
          </a>
          <div className="enquiry-note">
            <Icon name="shield" size={16} />
            <p>Boundaries and court references can change through proclamation. Confirm jurisdiction before issuing or filing documents.</p>
          </div>
        </section>
        <div className="court-data-source">
          <span>DATA SOURCE</span>
          <p>Department of Justice and Constitutional Development · Proclaimed Magisterial Districts · Western Cape</p>
          <a href={magisterialAreaSource.sourceUrl} target="_blank" rel="noreferrer">
            View official source <Icon name="arrow" size={13} />
          </a>
        </div>
      </main>
    </div>
  )
}

// ---------- Fees & court rules ----------
const PROCESS = {
  'Magistrates’ Court': {
    civil: ['Letter of demand', 'Summons', 'Notice to defend', 'Plea', 'Discovery', 'Pre-trial', 'Trial', 'Judgment'],
    criminal: ['Arrest or summons', 'First appearance (48 hrs)', 'Bail', 'Further investigation', 'Plea', 'Trial', 'Verdict', 'Sentence'],
  },
  'High Court': {
    civil: ['Summons', 'Notice to defend', 'Pleadings', 'Discovery', 'Pre-trial', 'Trial', 'Judgment'],
    criminal: ['Transfer from lower court', 'Indictment served', 'Pre-trial', 'Plea', 'Trial', 'Verdict', 'Sentence'],
  },
  'Supreme Court of Appeal': {
    civil: ['Leave to appeal', 'Notice of appeal', 'Record filed', 'Heads of argument', 'Hearing', 'Judgment'],
    criminal: ['Leave to appeal', 'Notice of appeal', 'Record filed', 'Heads of argument', 'Hearing', 'Judgment'],
  },
  'Constitutional Court': {
    civil: ['Application for leave', 'Directions issued', 'Written submissions', 'Hearing', 'Judgment'],
    criminal: ['Application for leave', 'Directions issued', 'Written submissions', 'Hearing', 'Judgment'],
  },
}
const SERVICES = [
  ['Application proceedings', 'Notices, affidavits, filing and court appearance', 'Motion proceedings decided on affidavits — used when the facts are not seriously disputed, such as eviction, urgent relief or compelling performance.'],
  ['Action proceedings', 'Summons, pleadings, discovery, preparation and trial', 'Trial proceedings where facts are disputed and witnesses give evidence. Usually the longest and most expensive route.'],
  ['Urgent interdict', 'Urgent papers and expedited court appearance', 'An order to stop or compel conduct immediately. You must show urgency and that you cannot get adequate relief later.'],
  ['Appeal or review', 'Record preparation, research and heads of argument', 'An appeal argues the court was wrong; a review argues the process was irregular. Strict time limits apply.'],
  ['Bail application', 'Consultation, affidavit and appearance', 'The accused must usually be brought before court within 48 hours of arrest. Schedule 5 and 6 offences carry a heavier burden for the accused.'],
  ['Maintenance & protection orders', 'Applications in the Maintenance or Domestic Violence court', 'These courts are designed to be used without a lawyer. Court clerks help complete forms at no charge.'],
  ['Debt recovery', 'Letter of demand, summons and default judgment', 'Claims up to R20 000 can be brought in the Small Claims Court without a lawyer. Prescription for most debts is three years.'],
]

function MaybePortal({ children }) {
  const { user } = useAuth()
  if (user) return <PortalLayout>{children}</PortalLayout>
  return (
    <div className="public-subpage">
      <PublicHeader />
      <main className="mx-auto max-w-[1180px] px-5 py-10">{children}</main>
    </div>
  )
}

export function Rules() {
  const navigate = useNavigate()
  const [court, setCourt] = useState('High Court')
  const [kind, setKind] = useState('civil')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const [guide, setGuide] = useState(false)
  const steps = PROCESS[court][kind]
  const services = SERVICES.filter(([a, b, c]) => `${a} ${b} ${c}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <MaybePortal>
      <PageTitle
        eyebrow="FEES, SERVICES & COURT RULES"
        title="Understand the process and the costs."
        copy="Plain-language guidance for South African courts. Guidance is not legal advice or a binding quote."
        action={
          <button className="btn btn-outline" onClick={() => navigate('/courts')}>
            <Icon name="pin" size={16} /> Find court addresses
          </button>
        }
      />
      <form className="rules-search" onSubmit={(e) => e.preventDefault()}>
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rules, services or legal terms" />
        <button type="submit">Search library</button>
      </form>
      <div className="court-selector">
        {Object.keys(PROCESS).map((c) => (
          <button className={court === c ? 'active' : ''} onClick={() => setCourt(c)} key={c}>
            {c}
            <small>{c === 'High Court' ? 'Divisions nationwide' : c === 'Magistrates’ Court' ? 'District & regional' : 'National court'}</small>
          </button>
        ))}
      </div>
      <div className="rules-layout">
        <section>
          <div className="panel rules-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="eyebrow">PROCESS MAP</span>
              <div className="flex gap-1 rounded-lg border border-[#d8ddd9] p-1 text-[11px] font-bold">
                {['civil', 'criminal'].map((k) => (
                  <button key={k} onClick={() => setKind(k)} className={`rounded-md px-3 py-1.5 ${kind === k ? 'bg-[#0b2635] text-white' : 'text-[#607078]'}`}>
                    {k === 'civil' ? 'Civil' : 'Criminal'}
                  </button>
                ))}
              </div>
            </div>
            <h2>
              {court} {kind === 'civil' ? 'civil matter' : 'criminal matter'}
            </h2>
            <p>A simplified view of common stages. Your matter may follow a different path.</p>
            <div className="milestones">
              {steps.map((m, i) => (
                <div key={m}>
                  <span>{i + 1}</span>
                  <b>{m}</b>
                  <small>{i === 0 ? 'Case begins' : i === steps.length - 1 ? 'Outcome' : 'Preparation'}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="panel services-catalogue">
            <div className="panel-head">
              <div>
                <span>COMMON SERVICES</span>
                <h2>What lawyers may charge for</h2>
              </div>
            </div>
            {services.map(([a, b, c]) => (
              <div key={a}>
                <button onClick={() => setOpen(open === a ? null : a)} aria-expanded={open === a}>
                  <span className="doc-icon">§</span>
                  <div>
                    <b>{a}</b>
                    <p>{b}</p>
                  </div>
                  <Icon name="chevron" size={16} />
                </button>
                {open === a && <p className="px-5 pb-4 text-xs leading-6 text-[#52646a]">{c}</p>}
              </div>
            ))}
            {services.length === 0 && <p className="p-5 text-xs text-[#65767b]">No services match “{q}”.</p>}
          </div>
        </section>
        <aside>
          <div className="panel guidance-card">
            <span className="eyebrow">FEE GUIDANCE</span>
            <h2>How legal costs work</h2>
            <p>A lawyer’s fee and the amount recoverable from another party are not always the same.</p>
            <ul>
              <li>
                <b>Attorney-and-client fees</b>
                <span>What you agree to pay in the mandate.</span>
              </li>
              <li>
                <b>Party-and-party costs</b>
                <span>Costs potentially recoverable under court tariffs.</span>
              </li>
              <li>
                <b>Disbursements</b>
                <span>Filing, sheriff, travel and expert costs.</span>
              </li>
              {guide && (
                <>
                  <li>
                    <b>Contingency fees</b>
                    <span>Allowed under the Contingency Fees Act — capped at double the normal fee and 25% of the amount recovered.</span>
                  </li>
                  <li>
                    <b>VAT</b>
                    <span>VAT-registered practitioners add 15%. Fee estimates on LexBridge include VAT.</span>
                  </li>
                  <li>
                    <b>Disputing a bill</b>
                    <span>You may ask for an itemised account and have it assessed (taxed). Complaints can go to the Legal Practice Council.</span>
                  </li>
                </>
              )}
            </ul>
            <button onClick={() => setGuide(!guide)}>{guide ? 'Show less' : 'Read the full guide'}</button>
          </div>
          <div className="panel reviewed-card">
            <Icon name="shield" />
            <div>
              <b>Plain-language guidance</b>
              <p>Always confirm rules and time limits with a practitioner.</p>
            </div>
          </div>
          <Link to="/lawyers" className="btn btn-gold mt-4 w-full">
            Find a lawyer <Icon name="arrow" size={16} />
          </Link>
        </aside>
      </div>
    </MaybePortal>
  )
}
