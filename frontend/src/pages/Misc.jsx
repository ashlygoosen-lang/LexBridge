import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PortalLayout } from '../components/PortalLayout'
import { Notice, PageTitle, field, labelCls } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { ROLE_LABEL } from '../lib/format'

import { company } from '../data/company'

const SUPPORT_EMAIL = company.privacyEmail

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
