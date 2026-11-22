import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { Notice } from './ui'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { CATEGORY_LABEL } from '../lib/format'

const DRAFT_KEY = 'lexbridge_matter_draft'
const OPTIONS = [
  { key: 'criminal|I am arrested or accused', category: 'criminal', label: 'Criminal', sub: 'I am arrested or accused' },
  { key: 'criminal|I am a complainant', category: 'criminal', label: 'Criminal', sub: 'I am a complainant' },
  { key: 'civil|I want to start a case', category: 'civil', label: 'Civil', sub: 'I want to start a case' },
  { key: 'civil|I am being sued', category: 'civil', label: 'Civil', sub: 'I am being sued' },
  { key: 'family|Family matter', category: 'family', label: 'Family', sub: 'Divorce, maintenance, custody or protection order' },
  { key: 'appeal|Appeal or review', category: 'appeal', label: 'Appeals & reviews', sub: 'Challenge a decision in a higher court' },
  { key: 'unsure|I’m not sure', category: 'unsure', label: 'I’m not sure', sub: 'We’ll help you choose the right path' },
]
const PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape']
const COURTS = ["Magistrates' Court", 'Regional Court', 'High Court', 'Supreme Court of Appeal', 'Constitutional Court', 'Labour Court', 'Not sure']
const BUDGETS = ['Under R 2 500', 'R 2 500 – R 7 500', 'R 7 500 – R 15 000', 'R 15 000+']

export const loadDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null')
  } catch {
    return null
  }
}
const saveDraft = (d) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  } catch {
    /* storage unavailable */
  }
}
const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function MatterModal({ onClose, initialCategory }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const draft = loadDraft()
  const [step, setStep] = useState(draft?.step && draft.step <= 3 ? draft.step : 1)
  const [d, setD] = useState(
    draft?.data ?? {
      option: initialCategory ? OPTIONS.find((o) => o.category === initialCategory)?.key ?? '' : '',
      title: '',
      description: '',
      urgency: 'Soon',
      budget: '',
      province: '',
      courtLevel: '',
      city: '',
    },
  )
  const [consent, setConsent] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value })
  const option = OPTIONS.find((o) => o.key === d.option)

  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const canContinue =
    (step === 1 && option) || (step === 2 && d.title.trim() && d.description.trim().length >= 20 && d.province) || step === 3

  const submit = async () => {
    setError('')
    if (!user || user.role !== 'client') {
      saveDraft({ step: 3, data: d })
      if (user) return setError('Only client accounts can post matters. Sign in with a client account to continue.')
      return navigate('/login?mode=signup&next=/client?post=1')
    }
    setBusy(true)
    const r = await api.post('/matters', {
      category: option.category,
      side: option.sub,
      title: d.title,
      description: d.description,
      urgency: d.urgency,
      budget: d.budget,
      province: d.province,
      courtLevel: d.courtLevel,
      city: d.city,
      consent,
    })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    clearDraft()
    onClose()
    navigate(`/matters/${r.matter.id}?posted=1`)
  }

  const next = () => (step < 3 ? setStep(step + 1) : submit())

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="matter-modal" role="dialog" aria-modal="true" aria-labelledby="matter-title">
        <div className="modal-head">
          <div>
            <span className="eyebrow">Post a matter</span>
            <h2 id="matter-title">
              {step === 1 ? 'What do you need help with?' : step === 2 ? 'Tell us a little more' : 'Review your matter'}
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="progress">
          <span style={{ width: `${step * 33.33}%` }} />
        </div>
        <div className="step-copy">
          Step {step} of 3 <span>· Your details stay private</span>
        </div>

        {step === 1 && (
          <div className="matter-options">
            {OPTIONS.map((item) => (
              <button
                key={item.key}
                className={`matter-option ${d.option === item.key ? 'selected' : ''}`}
                onClick={() => setD({ ...d, option: item.key })}
              >
                <span className="radio">{d.option === item.key && <i />}</span>
                <span>
                  <b>{item.label}</b>
                  <small>{item.sub}</small>
                </span>
              </button>
            ))}
            <p className="aid-note">
              <Icon name="shield" size={18} />
              <span>
                If you cannot afford a lawyer,{' '}
                <a href="https://legal-aid.co.za/" target="_blank" rel="noreferrer">
                  Legal Aid South Africa
                </a>{' '}
                may be able to help (Advice Line 0800 110 110).
              </span>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="form-stack">
            <label>
              Short title
              <input value={d.title} onChange={set('title')} maxLength={140} placeholder="e.g. Urgent bail assistance needed" />
            </label>
            <label>
              Briefly describe what happened
              <textarea
                value={d.description}
                onChange={set('description')}
                maxLength={5000}
                placeholder="Please avoid names, ID numbers or private contact details at this stage."
                rows={4}
              />
            </label>
            <fieldset>
              <legend>How urgent is this?</legend>
              <div className="choice-row">
                {['Within 48 hours', 'Soon', 'Flexible'].map((item) => (
                  <button type="button" key={item} onClick={() => setD({ ...d, urgency: item })} className={d.urgency === item ? 'active' : ''}>
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Province
                <select value={d.province} onChange={set('province')}>
                  <option value="">Select province</option>
                  {PROVINCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                Town or city (optional)
                <input value={d.city} onChange={set('city')} maxLength={80} placeholder="e.g. Johannesburg" />
              </label>
              <label>
                Court (if known)
                <select value={d.courtLevel} onChange={set('courtLevel')}>
                  <option value="">Not sure</option>
                  {COURTS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Budget range (optional)
                <select value={d.budget} onChange={set('budget')}>
                  <option value="">Select an affordable range</option>
                  {BUDGETS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="review-card">
            <div>
              <span>Matter type</span>
              <b>
                {option ? `${CATEGORY_LABEL[option.category]} — ${option.sub}` : 'Not selected'}
              </b>
            </div>
            <div>
              <span>Title</span>
              <b>{d.title}</b>
            </div>
            <div>
              <span>Urgency · Province</span>
              <b>
                {d.urgency} · {d.province}
              </b>
            </div>
            <div>
              <span>Who can see this?</span>
              <b>Verified matching lawyers</b>
            </div>
            <p>
              <Icon name="lock" size={18} /> Your name and contact details remain hidden until you accept an offer.
            </p>
            <label className="consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I understand LexBridge is a
              marketplace and does not provide legal advice.
            </label>
          </div>
        )}

        <Notice className="mt-4">{error}</Notice>

        <div className="modal-actions">
          {step > 1 ? (
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={() => {
                saveDraft({ step, data: d })
                onClose()
              }}
            >
              Save for later
            </button>
          )}
          <button className="btn btn-gold" onClick={next} disabled={!canContinue || busy || (step === 3 && !consent)}>
            {step === 3 ? (busy ? 'Posting…' : user?.role === 'client' ? 'Post my matter' : 'Create account & post') : 'Continue'}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}
