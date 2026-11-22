import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon, Logo } from '../components/Icon'
import { Notice } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { homeFor } from '../lib/format'

const DEMO = [
  ['naledi', 'Client'],
  ['thabo', 'Verified attorney'],
  ['admin', 'Platform admin'],
  ['saps', 'SAPS official'],
  ['clerk', 'Court clerk'],
  ['prosecutor', 'Prosecutor'],
  ['magistrate', 'Magistrate'],
  ['legalaid', 'Legal Aid'],
]

export default function Auth() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { setUser, refresh, meta } = useAuth()
  const signup = params.get('mode') === 'signup'
  const [role, setRole] = useState(params.get('role') === 'lawyer' ? 'lawyer' : 'client')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', consent: false })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const next = params.get('next')
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null

  const toggle = () => {
    const p = new URLSearchParams(params)
    if (signup) p.delete('mode')
    else p.set('mode', 'signup')
    setParams(p)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const r = signup ? await api.post('/auth/signup', { ...form, role }) : await api.post('/auth/login', { email: form.email, password: form.password })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    setUser(r.user)
    const fresh = await refresh()
    if (signup && r.user.role === 'lawyer') return navigate('/lawyer/profile?welcome=1')
    navigate(safeNext && (fresh?.role === 'client' || !safeNext.startsWith('/client')) ? safeNext : homeFor(fresh || r.user))
  }

  return (
    <div className="auth-page">
      <section className="auth-aside">
        <button onClick={() => navigate('/')} aria-label="LexBridge home">
          <Logo as="span" />
        </button>
        <div>
          <span className="eyebrow light">LEGAL HELP WITH CLARITY</span>
          <h1>{signup ? 'Join South Africa’s trusted legal marketplace.' : 'Welcome back.'}</h1>
          <p>Manage matters, compare clear fee estimates, prepare police reports and communicate securely in one place.</p>
          <ul>
            <li>
              <Icon name="shield" /> Verified legal practitioners
            </li>
            <li>
              <Icon name="lock" /> POPIA-conscious privacy
            </li>
            <li>
              <Icon name="document" /> Clear mandates and fee terms
            </li>
          </ul>
        </div>
        <small>LexBridge is a marketplace, not a law firm, and is not SAPS.</small>
      </section>
      <main className="auth-main">
        <div className="auth-card">
          <span className="eyebrow">{signup ? 'CREATE YOUR ACCOUNT' : 'SECURE SIGN IN'}</span>
          <h2>{signup ? 'Let’s get you started.' : 'Sign in to your account.'}</h2>
          <p>{signup ? 'Choose how you’ll use LexBridge.' : 'Enter your details to continue.'}</p>
          {signup && (
            <div className="role-choice">
              <button type="button" className={role === 'client' ? 'active' : ''} onClick={() => setRole('client')}>
                <Icon name="user" />
                <b>I need a lawyer</b>
                <small>Post and manage a legal matter</small>
              </button>
              <button type="button" className={role === 'lawyer' ? 'active' : ''} onClick={() => setRole('lawyer')}>
                <Icon name="shield" />
                <b>I’m a legal practitioner</b>
                <small>Verify and find new clients</small>
              </button>
            </div>
          )}
          <form onSubmit={submit}>
            {signup && (
              <label>
                Full name
                <input required maxLength={100} value={form.name} onChange={set('name')} placeholder="Your full legal name" autoComplete="name" />
              </label>
            )}
            <label>
              Email address
              <input type="email" required value={form.email} onChange={set('email')} placeholder="name@example.co.za" autoComplete="email" />
            </label>
            {signup && (
              <label>
                Mobile number
                <input required maxLength={30} value={form.phone} onChange={set('phone')} placeholder="+27 00 000 0000" autoComplete="tel" />
              </label>
            )}
            <label>
              Password
              <div className="password-field">
                <input
                  type={show ? 'text' : 'password'}
                  required
                  minLength={signup ? 8 : undefined}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="At least 8 characters"
                  autoComplete={signup ? 'new-password' : 'current-password'}
                />
                <button type="button" onClick={() => setShow(!show)}>
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            {signup && (
              <label className="consent">
                <input type="checkbox" required checked={form.consent} onChange={set('consent')} />
                <span>
                  I have read and agree to the{' '}
                  <a href="/legal/terms" target="_blank" rel="noreferrer">
                    Terms of Use
                  </a>
                  {role === 'lawyer' && (
                    <>
                      ,{' '}
                      <a href="/legal/practitioners" target="_blank" rel="noreferrer">
                        Practitioner Terms
                      </a>
                    </>
                  )}{' '}
                  and{' '}
                  <a href="/legal/privacy" target="_blank" rel="noreferrer">
                    Privacy Policy (POPIA)
                  </a>
                  , and understand LexBridge is a marketplace, not a law firm.
                </span>
              </label>
            )}
            <Notice>{error}</Notice>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : signup ? (role === 'lawyer' ? 'Start verification' : 'Create client account') : 'Sign in'}
              <Icon name="arrow" size={16} />
            </button>
          </form>
          <div className="auth-switch">
            {signup ? 'Already have an account?' : 'New to LexBridge?'}{' '}
            <button onClick={toggle}>{signup ? 'Sign in' : 'Create an account'}</button>
          </div>
          {!signup && meta?.demo && (
            <details className="mt-5 rounded-lg border border-[#dce3df] bg-[#f8faf8] p-3 text-[11px] text-[#52646a]">
              <summary className="cursor-pointer font-bold text-[#0b2635]">Demo accounts</summary>
              <p className="mt-2">
                Every demo account uses the password <b>{meta.demo.password || 'set in DEMO_PASSWORD'}</b>.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {DEMO.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="rounded-md px-2 py-1.5 text-left hover:bg-white"
                    onClick={() => setForm({ ...form, email: `${key}@${meta.demo.domain}`, password: meta.demo.password || '' })}
                  >
                    <b className="block text-[#0b2635]">{label}</b>
                    <span className="text-[10px]">{key}@…</span>
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      </main>
    </div>
  )
}
