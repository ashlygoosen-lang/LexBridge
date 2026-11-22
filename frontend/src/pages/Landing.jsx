import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon, Logo } from '../components/Icon'
import { MatterModal } from '../components/MatterModal'
import { useAuth } from '../lib/auth'
import { homeFor, responseLabel } from '../lib/format'
import { Counter } from '../motion/Counter'
import { courts } from '../data/courts'
import { FAQ } from '../data/faq'

const categories = [
  { key: 'criminal', title: 'Criminal matters', text: 'Bail, arrests, assault, fraud, theft and criminal appeals.', accent: 'CR' },
  { key: 'civil', title: 'Civil disputes', text: 'Contracts, debt recovery, property, damages and interdicts.', accent: 'CV' },
  { key: 'family', title: 'Family matters', text: 'Divorce, maintenance, custody and protection orders.', accent: 'FM' },
  { key: 'appeal', title: 'Appeals & reviews', text: 'High Court, Supreme Court of Appeal and Constitutional Court.', accent: 'AR' },
]

export function SiteFooter() {
  return (
    <footer>
      <div className="shell footer-main">
        <div className="footer-brand">
          <Logo />
          <p>Helping South Africans find verified legal help with clarity and confidence.</p>
          <span>
            <Icon name="shield" size={16} /> Privacy-first marketplace
          </span>
        </div>
        <div>
          <b>For clients</b>
          <Link to="/#process">How it works</Link>
          <Link to="/#categories">Matter types</Link>
          <Link to="/lawyers">Find a lawyer</Link>
          <Link to="/fees">Fees guide</Link>
          <Link to="/courts">Court directory</Link>
          <Link to="/magistrates">Magistrate court finder</Link>
          <Link to="/police-stations">Police station directory</Link>
          <Link to="/police-report">Police report & case tracker</Link>
          <Link to="/dashboard">Digital justice dashboard</Link>
        </div>
        <div>
          <b>For lawyers</b>
          <Link to="/login?mode=signup&role=lawyer">Join the platform</Link>
          <Link to="/help#lawyers">How it works for lawyers</Link>
          <Link to="/legal/practitioners">Practitioner terms</Link>
          <Link to="/fees">Fee schedule tools</Link>
          <Link to="/login">Lawyer sign in</Link>
        </div>
        <div>
          <b>Support</b>
          <Link to="/help">Help centre & FAQ</Link>
          <Link to="/help#police">Police report guide</Link>
          <Link to="/legal/refunds">Refunds & cancellations</Link>
          <Link to="/help#contact">Contact us</Link>
          <Link to="/help#complaints">Complaints</Link>
        </div>
      </div>
      <div className="shell disclaimer">
        <p>
          LexBridge is a division of VINK Group (Pty) Ltd, registration number 2018/079316/07. LexBridge is an independent legal
          marketplace, not a law firm, and does not provide legal advice. Lawyer information
          and fee estimates should be confirmed in a signed mandate.
        </p>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} LexBridge · VINK Group (Pty) Ltd · Cape Town</span>
        <div>
          <Link to="/legal/terms">Terms of Use</Link>
          <Link to="/legal/refunds">Refunds</Link>
          <Link to="/legal/privacy">Privacy & POPIA</Link>
          <Link to="/legal/paia">PAIA</Link>
          <Link to="/legal/cookies">Cookies</Link>
          <Link to="/legal/company">Company info</Link>
        </div>
        <span>South Africa · English</span>
      </div>
    </footer>
  )
}

const HOME_FAQ = [
  'Is LexBridge a law firm?',
  'Does it cost anything to post a matter?',
  'Can lawyers see who I am?',
  'How do you verify lawyers?',
  'Can I get a refund?',
  'Does a LexBridge report open a case with SAPS?',
]

function HomeFaq() {
  const [open, setOpen] = useState(HOME_FAQ[0])
  const items = HOME_FAQ.map((q) => FAQ.find(([, question]) => question === q)).filter(Boolean)
  return (
    <section className="section home-faq" id="faq">
      <div className="shell home-faq-grid">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">QUESTIONS, ANSWERED</span>
            <h2>Before you start.</h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#607078]">
              Everything about fees, privacy, refunds and police reports is explained in plain language in our Help Centre.
            </p>
            <Link className="text-link dark mt-6" to="/help#faq">
              All questions <Icon name="arrow" size={17} />
            </Link>
          </div>
        </div>
        <div className="faq-list">
          {items.map(([t, question, a]) => (
            <div key={question} className={`faq-item ${open === question ? 'open' : ''}`}>
              <button aria-expanded={open === question} onClick={() => setOpen(open === question ? null : question)}>
                <span>
                  <small>{t}</small>
                  {question}
                </span>
                <i aria-hidden="true">+</i>
              </button>
              <div className="faq-answer">
                <p>{a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Landing() {
  const { user, meta } = useAuth()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const [mobileNav, setMobileNav] = useState(false)
  const openMatter = (category) => {
    setModal({ category })
    setMobileNav(false)
  }
  const lawyers = meta?.featured ?? []

  return (
    <div className="app">
      <header>
        <div className="topbar">
          <span>
            <Icon name="shield" size={15} /> South Africa’s legal marketplace
          </span>
          <span>
            Need urgent help? <a href="#urgent">View emergency options</a>
          </span>
        </div>
        <nav className="nav shell">
          <Logo />
          <div className={`nav-links ${mobileNav ? 'open' : ''}`}>
            <a href="#process">How it works</a>
            <Link to="/lawyers">Find a lawyer</Link>
            <a href="#categories">Legal matters</a>
            <Link to="/police-stations">Police stations</Link>
            <Link to="/dashboard">Justice dashboard</Link>
            <Link className="nav-page-link" to="/courts">
              Court directory
            </Link>
            <div className="mobile-actions">
              <Link className="btn btn-gold" to="/police-report">
                Report a police matter
              </Link>
              {user ? (
                <Link className="btn btn-ghost" to={homeFor(user)}>
                  My dashboard
                </Link>
              ) : (
                <Link className="btn btn-ghost" to="/login">
                  Log in
                </Link>
              )}
              <button className="btn btn-primary" onClick={() => openMatter()}>
                Post my matter
              </button>
            </div>
          </div>
          <div className="nav-actions">
            {user ? (
              <button className="login" onClick={() => navigate(homeFor(user))}>
                <Icon name="user" size={18} /> {user.name.split(' ')[0]}
              </button>
            ) : (
              <button className="login" onClick={() => navigate('/login')}>
                <Icon name="user" size={18} /> Log in
              </button>
            )}
            <button className="btn btn-primary" onClick={() => openMatter()}>
              Post my matter
            </button>
          </div>
          <button className="menu-btn" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu">
            <Icon name={mobileNav ? 'close' : 'menu'} />
          </button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-aurora" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="hero-orbit" aria-hidden="true" />
          <div className="shell hero-grid">
            <div className="hero-copy">
              <span className="eyebrow light">CONFIDENTIAL · VERIFIED · SOUTH AFRICAN</span>
              <h1 aria-label="Legal help, when it matters.">
                <span className="line" aria-hidden="true">
                  <span className="word" style={{ '--w': 0 }}>
                    Legal
                  </span>{' '}
                  <span className="word" style={{ '--w': 1 }}>
                    help,
                  </span>
                </span>
                <span className="line" aria-hidden="true">
                  <em>
                    <span className="word" style={{ '--w': 2 }}>
                      when
                    </span>{' '}
                    <span className="word" style={{ '--w': 3 }}>
                      it
                    </span>{' '}
                    <span className="word" style={{ '--w': 4 }}>
                      matters.
                    </span>
                  </em>
                </span>
              </h1>
              <p>
                Tell us what happened. Compare responses from verified South African lawyers and choose who feels right for you.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-gold btn-large" to="/police-report">
                  Report a police matter <Icon name="arrow" />
                </Link>
                <Link className="text-link link-button" to="/lawyers">
                  Browse lawyers <Icon name="arrow" size={17} />
                </Link>
              </div>
              <div className="privacy-line">
                <Icon name="lock" size={17} /> Your identity stays private until you choose a lawyer.
              </div>
            </div>
            <div className="hero-panel">
              <span className="panel-label">GET STARTED</span>
              <h2>What kind of help do you need?</h2>
              <button onClick={() => openMatter('criminal')}>
                <span className="panel-icon">01</span>
                <span>
                  <b>Criminal matter</b>
                  <small>Arrest, bail, charge or appeal</small>
                </span>
                <Icon name="chevron" />
              </button>
              <button onClick={() => openMatter('civil')}>
                <span className="panel-icon">02</span>
                <span>
                  <b>Civil matter</b>
                  <small>Dispute, summons, debt or property</small>
                </span>
                <Icon name="chevron" />
              </button>
              <button onClick={() => openMatter('unsure')}>
                <span className="panel-icon">03</span>
                <span>
                  <b>I'm not sure</b>
                  <small>We’ll help you choose the right path</small>
                </span>
                <Icon name="chevron" />
              </button>
              <p>
                <Icon name="clock" size={17} /> Takes about 5 minutes · Save and return anytime
              </p>
            </div>
          </div>
        </section>

        <section className="trust-strip" id="trust">
          <div className="shell trust-grid">
            <div>
              <Icon name="shield" />
              <span>
                <b>LPC-verified</b>
                <small>Legal practitioners</small>
              </span>
            </div>
            <div>
              <Icon name="lock" />
              <span>
                <b>Confidential by design</b>
                <small>Your details stay protected</small>
              </span>
            </div>
            <div>
              <span className="rand">R</span>
              <span>
                <b>Clear fee estimates</b>
                <small>No surprise consultation fees</small>
              </span>
            </div>
            <div>
              <Icon name="document" />
              <span>
                <b>Secure mandates</b>
                <small>Review before you sign</small>
              </span>
            </div>
          </div>
        </section>

        <section className="stats-band" aria-label="LexBridge in numbers">
          <div className="shell stats-grid">
            <div className="stat">
              <b>
                <Counter value={meta?.lawyers ?? 0} />
              </b>
              <span>Verified legal practitioners</span>
            </div>
            <div className="stat">
              <b>
                <Counter value={meta?.stations ?? 151} />
              </b>
              <span>Western Cape SAPS stations</span>
            </div>
            <div className="stat">
              <b>
                <Counter value={1800} />
              </b>
              <span>Magisterial areas mapped to courts</span>
            </div>
            <div className="stat">
              <b>
                <Counter value={courts.length} />
              </b>
              <span>Superior & specialist courts listed</span>
            </div>
          </div>
        </section>

        <section className="section process" id="process">
          <div className="shell">
            <div className="section-heading">
              <div>
                <span className="eyebrow">HOW IT WORKS</span>
                <h2>A clear path forward.</h2>
              </div>
              <p>Finding the right lawyer shouldn’t add to your stress. We make each step understandable and keep you in control.</p>
            </div>
            <div className="steps">
              {[
                ['01', 'Tell us what happened', 'Share the essentials in plain language. Your post is anonymised by default.'],
                ['02', 'Receive lawyer responses', 'Matched, verified lawyers can accept your budget or send a clear fee estimate.'],
                ['03', 'Compare with confidence', 'Review experience, fees, ratings and what each lawyer includes.'],
                ['04', 'Choose and get started', 'Pay securely, book your consultation and sign the mandate online.'],
              ].map(([num, title, text]) => (
                <article key={num}>
                  <span>{num}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section category-section" id="categories">
          <div className="shell">
            <div className="section-heading compact">
              <div>
                <span className="eyebrow">FIND THE RIGHT EXPERTISE</span>
                <h2>Help for life’s difficult moments.</h2>
              </div>
              <Link className="text-link dark" to="/fees">
                View all matter types <Icon name="arrow" size={17} />
              </Link>
            </div>
            <div className="category-grid">
              {categories.map((item) => (
                <button key={item.title} onClick={() => openMatter(item.key)} className="category-card">
                  <span className="category-monogram">{item.accent}</span>
                  <span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <i>
                      Explore this area <Icon name="arrow" size={16} />
                    </i>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="section lawyer-section" id="lawyers">
          <div className="shell">
            <div className="section-heading compact">
              <div>
                <span className="eyebrow">VERIFIED PROFESSIONALS</span>
                <h2>Lawyers you can trust.</h2>
              </div>
              <p>Every listed practitioner is checked against professional registration details.</p>
            </div>
            {meta && lawyers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#c8d2ce] bg-white p-10 text-center">
                <b className="font-serif text-2xl text-[#0b2635]">Verified practitioners are joining now.</b>
                <p className="mt-2 text-sm text-[#607078]">Post your matter and we’ll notify matching lawyers as soon as they’re verified.</p>
                <Link className="btn btn-outline mt-5" to="/login?mode=signup&role=lawyer">
                  Are you a legal practitioner? Join the platform
                </Link>
              </div>
            )}
            <div className="lawyer-grid">
              {lawyers.map((lawyer) => (
                <article className="lawyer-card" key={lawyer.id}>
                  <div className="lawyer-photo">
                    {lawyer.photoUrl ? (
                      <img src={lawyer.photoUrl} alt={`Portrait of ${lawyer.name}`} />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-[#12394b] font-serif text-5xl text-[#d7a84a]">
                        {lawyer.name[0]}
                      </div>
                    )}
                    <span className="verified">
                      <Icon name="check" size={13} /> VERIFIED
                    </span>
                  </div>
                  <div className="lawyer-body">
                    <h3>{lawyer.name}</h3>
                    <p className="role">
                      {lawyer.practitionerType} · {lawyer.city}
                    </p>
                    <div className="tags">
                      {lawyer.areas.slice(0, 2).map((area) => (
                        <span key={area}>{area}</span>
                      ))}
                    </div>
                    <div className="lawyer-meta">
                      <span>
                        <Icon name="star" size={16} /> <b>{lawyer.rating.toFixed(1)}</b> · {lawyer.reviewCount} reviews
                      </span>
                      <span>
                        <Icon name="clock" size={16} /> {responseLabel(lawyer.responseMinutes)}
                      </span>
                    </div>
                    <button className="profile-link" onClick={() => navigate(`/lawyers/${lawyer.id}`)}>
                      View profile <Icon name="arrow" size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="center">
              <button className="btn btn-outline" onClick={() => navigate('/lawyers')}>
                <Icon name="search" size={18} /> Browse all {meta?.lawyers ? `${meta.lawyers} ` : ''}lawyers
              </button>
            </div>
          </div>
        </section>

        <HomeFaq />

        <section className="urgent shell" id="urgent">
          <div className="urgent-icon">!</div>
          <div>
            <span className="eyebrow light">URGENT LEGAL HELP</span>
            <h2>Arrested or due in court soon?</h2>
            <p>
              You have the right to choose a legal practitioner. If you cannot afford one, Legal Aid South Africa may be available
              (Advice Line 0800 110 110). In an emergency, call SAPS on 10111.
            </p>
          </div>
          <div className="urgent-actions">
            <button className="btn btn-gold" onClick={() => openMatter('criminal')}>
              Get urgent help <Icon name="arrow" size={18} />
            </button>
            <a href="https://legal-aid.co.za/" target="_blank" rel="noreferrer">
              Legal Aid information
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
      {modal && <MatterModal initialCategory={modal.category} onClose={() => setModal(null)} />}
    </div>
  )
}
