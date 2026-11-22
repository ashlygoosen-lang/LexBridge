import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PortalLayout } from '../components/PortalLayout'
import { PublicHeader } from '../components/PublicHeader'
import { Notice, PageTitle, field, labelCls } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { ROLE_LABEL } from '../lib/format'
import { SiteFooter } from './Landing'

const SUPPORT_EMAIL = 'support@callmylawyer.co.za'

export function Account() {
  const { user, refresh } = useAuth()
  const [msg, setMsg] = useState({ kind: '', text: '' })
  const save = async (e) => {
    e.preventDefault()
    const r = await api.patch('/auth/me', Object.fromEntries(new FormData(e.currentTarget)))
    setMsg(r.ok ? { kind: 'success', text: 'Profile updated.' } : { kind: 'error', text: r.error })
    refresh()
  }
  const password = async (e) => {
    e.preventDefault()
    const el = e.currentTarget
    const r = await api.post('/auth/me/password', Object.fromEntries(new FormData(el)))
    setMsg(r.ok ? { kind: 'success', text: 'Password changed.' } : { kind: 'error', text: r.error })
    if (r.ok) el.reset()
  }
  return (
    <PortalLayout>
      <PageTitle eyebrow="ACCOUNT" title="Profile & settings." copy={`${ROLE_LABEL[user.role]} · ${user.email}`} />
      <Notice kind={msg.kind || 'error'} className="mb-4">
        {msg.text}
      </Notice>
      <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={save} className="panel space-y-3">
          <span className="eyebrow">PERSONAL DETAILS</span>
          <label className={labelCls}>
            FULL NAME
            <input name="name" defaultValue={user.name} className={field} required />
          </label>
          <label className={labelCls}>
            MOBILE NUMBER
            <input name="phone" defaultValue={user.phone || ''} className={field} />
          </label>
          <label className={labelCls}>
            PREFERRED LANGUAGE
            <select name="preferredLanguage" defaultValue={user.preferredLanguage} className={field}>
              <option value="en">English</option>
              <option value="af">Afrikaans</option>
              <option value="xh">isiXhosa</option>
              <option value="zu">isiZulu</option>
              <option value="st">Sesotho</option>
            </select>
          </label>
          <button className="btn btn-primary">Save details</button>
        </form>
        <form onSubmit={password} className="panel space-y-3">
          <span className="eyebrow">SECURITY</span>
          <label className={labelCls}>
            CURRENT PASSWORD
            <input name="currentPassword" type="password" required className={field} autoComplete="current-password" />
          </label>
          <label className={labelCls}>
            NEW PASSWORD
            <input name="newPassword" type="password" minLength={8} required className={field} autoComplete="new-password" />
          </label>
          <button className="btn btn-primary">Change password</button>
        </form>
        <section id="privacy" className="panel xl:col-span-2">
          <span className="eyebrow">PRIVACY CENTRE · POPIA</span>
          <h2 className="mt-2 font-serif text-2xl text-[#0b2635]">Your information and your rights</h2>
          <ul className="mt-4 grid gap-3 text-xs leading-6 text-[#52646a] md:grid-cols-2">
            <li>
              <b className="text-[#0b2635]">Matters are anonymised.</b> Lawyers see your matter summary, never your name or contact details, until you accept an
              offer and sign a mandate.
            </li>
            <li>
              <b className="text-[#0b2635]">ID numbers are not stored.</b> Your South African ID is checked in memory; only the last four digits are kept for
              verification.
            </li>
            <li>
              <b className="text-[#0b2635]">Statements are append-only.</b> Police statements and justice audit records cannot be edited or deleted, to
              protect their evidential value.
            </li>
            <li>
              <b className="text-[#0b2635]">Your rights.</b> You may ask for a copy of your personal information, request correction, or object to processing
              under the Protection of Personal Information Act. Email{' '}
              <a className="font-bold text-[#1f6e6a]" href={`mailto:${SUPPORT_EMAIL}?subject=POPIA request`}>
                {SUPPORT_EMAIL}
              </a>
              . You may also complain to the Information Regulator.
            </li>
          </ul>
        </section>
      </div>
    </PortalLayout>
  )
}

function PublicShell({ children }) {
  return (
    <div className="public-subpage">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-5 py-12">{children}</main>
      <SiteFooter />
    </div>
  )
}

const Section = ({ id, title, children }) => (
  <section id={id} className="mt-8 scroll-mt-24 rounded-2xl border border-[#dce3df] bg-white p-7">
    <h2 className="font-serif text-2xl text-[#0b2635]">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-7 text-[#52646a]">{children}</div>
  </section>
)

export function Help() {
  return (
    <PublicShell>
      <span className="eyebrow">HELP CENTRE</span>
      <h1 className="mt-2 font-serif text-5xl tracking-[-.04em] text-[#0b2635]">How can we help?</h1>
      <Section id="matching" title="How matching works">
        <p>
          When you post a matter, it is shared anonymously with verified lawyers whose practice areas, province and court experience fit. They can send an offer
          with a consultation fee, a staged estimate and what is included. You compare offers and choose — nobody sees your identity until you accept.
        </p>
        <p>After you accept, you pay the consultation fee, book a time and sign an electronic mandate. Your workspace then holds messages, documents, dates and invoices.</p>
      </Section>
      <Section id="trust" title="Trust & safety">
        <p>
          Every practitioner is checked against their Legal Practice Council enrolment, practising certificate and (for attorneys) Fidelity Fund certificate before
          they can respond to matters. Matters containing personal identifiers or abuse are paused by our moderation team.
        </p>
        <p>
          Police reports prepared here are <b>not</b> official SAPS cases. Only SAPS can open a case and issue a CAS number. In an emergency call 10111; for
          gender-based violence call the GBV Command Centre on 0800 428 428.
        </p>
      </Section>
      <Section id="legal-aid" title="If you cannot afford a lawyer">
        <p>
          Legal Aid South Africa provides free legal services to people who qualify. Call the Legal Aid Advice Line on 0800 110 110 or visit{' '}
          <a className="font-bold text-[#1f6e6a]" href="https://legal-aid.co.za/" target="_blank" rel="noreferrer">
            legal-aid.co.za
          </a>
          . Inside a justice case you can also request Legal Aid screening from the Messages tab.
        </p>
      </Section>
      <Section id="contact" title="Contact us">
        <p>
          Email{' '}
          <a className="font-bold text-[#1f6e6a]" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          . Our support team is available weekdays, 08:00–17:00. We cannot give legal advice.
        </p>
      </Section>
      <Section id="complaints" title="Complaints">
        <p>
          Complaints about the platform can be sent to our support team and are acknowledged within two business days. Complaints about a legal practitioner’s
          conduct can also be lodged with the Legal Practice Council. Payment problems can be disputed directly from your Payments page.
        </p>
      </Section>
    </PublicShell>
  )
}

const LEGAL = {
  terms: [
    'Terms of use',
    [
      'Call My Lawyer (Pty) Ltd operates an online marketplace that connects people with independent legal practitioners. We are not a law firm and do not provide legal advice.',
      'Agreements for legal services are concluded directly between you and the practitioner in the mandate you sign. The practitioner is responsible for the services they provide.',
      'You must give accurate information, keep your password confidential and not post content that is unlawful, abusive or that identifies other people without need.',
      'Consultation fees and invoices are paid through our payment provider. Disputes can be raised from your Payments page and are reviewed by our team.',
    ],
  ],
  privacy: [
    'Privacy notice (POPIA)',
    [
      'We process personal information to operate the marketplace, verify practitioners, match matters, process payments and maintain case records, in line with the Protection of Personal Information Act 4 of 2013.',
      'Matters are anonymised until you accept an offer. Full South African ID numbers are not stored. Statements, filings and audit logs are retained as append-only records.',
      'Special personal information in police reports and justice cases is processed only with your explicit consent and only shared with participants assigned to the case.',
      `You may request access to, correction of, or deletion of your information (subject to legal retention duties) by emailing ${SUPPORT_EMAIL}. You may complain to the Information Regulator.`,
    ],
  ],
  disclaimer: [
    'Disclaimer',
    [
      'Information on this platform — including court rules, fee guidance and directories — is general information, not legal advice, and may change.',
      'Court, magistrate and police station details come from official public sources. Always confirm details with the relevant office before travelling or filing.',
      'A platform police report or digital justice reference is not an official SAPS or court record.',
    ],
  ],
  cookies: [
    'Cookies',
    [
      'We use one essential, secure cookie to keep you signed in. It expires after seven days or when you sign out.',
      'We do not use advertising or cross-site tracking cookies.',
    ],
  ],
}

export function Legal() {
  const { page } = useParams()
  const [title, paras] = LEGAL[page] || LEGAL.terms
  return (
    <PublicShell>
      <span className="eyebrow">LEGAL</span>
      <h1 className="mt-2 font-serif text-5xl tracking-[-.04em] text-[#0b2635]">{title}</h1>
      <Section title={title}>
        {paras.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </Section>
    </PublicShell>
  )
}

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-8 py-16 text-center">
      <h1 className="font-serif text-4xl tracking-tight text-[#0b2635]">Page not found</h1>
      <p className="mt-4 text-[#607078]">The page you’re looking for doesn’t exist or has been moved.</p>
      <Link className="mt-6 font-bold text-[#1f6e6a]" to="/">
        ← Back to home
      </Link>
    </main>
  )
}
