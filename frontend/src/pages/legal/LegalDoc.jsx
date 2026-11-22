import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicHeader } from '../../components/PublicHeader'
import { Icon } from '../../components/Icon'
import { SiteFooter } from '../Landing'
import { company } from '../../data/company'

export const LEGAL_NAV = [
  ['terms', 'Terms of Use'],
  ['refunds', 'Refund & Cancellation Policy'],
  ['privacy', 'Privacy Policy (POPIA)'],
  ['cookies', 'Cookie Notice'],
  ['practitioners', 'Practitioner Terms'],
  ['paia', 'Access to Information (PAIA)'],
  ['disclaimer', 'Disclaimer'],
  ['company', 'Company Information'],
]

// Shared layout for every policy: plain-language summary, sticky contents, numbered sections.
export function LegalDoc({ slug, title, intro, summary, sections }) {
  const [active, setActive] = useState(sections[0]?.id)
  useEffect(() => {
    document.title = `${title} · LexBridge`
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-20% 0px -70% 0px' },
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [sections, title])

  return (
    <div className="public-subpage legal-page">
      <PublicHeader />
      <header className="legal-hero">
        <div className="mx-auto max-w-[1180px] px-5">
          <span className="eyebrow light">LEGAL · {company.brand.toUpperCase()}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
          <div className="legal-meta">
            <span>Last updated {company.policiesUpdated}</span>
            <span>Governed by the laws of the Republic of South Africa</span>
            <button onClick={() => window.print()}>
              <Icon name="document" size={14} /> Print or save as PDF
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-12 lg:grid-cols-[260px_1fr]">
        <aside className="legal-toc">
          <nav aria-label="Legal documents">
            <b>Policies</b>
            {LEGAL_NAV.map(([s, label]) => (
              <Link key={s} to={`/legal/${s}`} className={s === slug ? 'is-current' : ''}>
                {label}
              </Link>
            ))}
          </nav>
          <nav aria-label="On this page">
            <b>On this page</b>
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'is-active' : ''}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </a>
            ))}
          </nav>
        </aside>
        <main className="legal-body">
          {summary && (
            <section className="legal-summary" aria-label="Summary in plain language">
              <b>In plain language</b>
              <ul>
                {summary.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <p>This summary helps you understand the document. The full text below is what applies.</p>
            </section>
          )}
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="legal-section">
              <h2>
                <span>{i + 1}.</span> {s.title}
              </h2>
              {s.body}
            </section>
          ))}
          <section className="legal-contact">
            <b>Questions about this document?</b>
            <p>
              Email <a href={`mailto:${company.legalEmail}`}>{company.legalEmail}</a> or{' '}
              <a href={`mailto:${company.email}`}>{company.email}</a> ({company.supportHours}).
            </p>
          </section>
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}

// Small building blocks used inside the documents.
export const Callout = ({ tone = 'info', children }) => <div className={`legal-callout legal-callout-${tone}`}>{children}</div>
export const Table = ({ head, rows }) => (
  <div className="legal-table">
    <table>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
export const Def = ({ term, children }) => (
  <p>
    <b>“{term}”</b> {children}
  </p>
)
