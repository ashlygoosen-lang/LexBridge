import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicHeader } from '../components/PublicHeader'
import { Icon } from '../components/Icon'
import { SiteFooter } from './Landing'
import { company } from '../data/company'
import { FAQ } from '../data/faq'

const GUIDES = [
  {
    id: 'clients',
    tag: 'For clients',
    title: 'Finding and hiring a lawyer',
    intro: 'From describing your problem to your first consultation, usually in under a day for urgent matters.',
    steps: [
      ['Create a free account', 'Sign up as “I need a lawyer”. You need an email address and mobile number. Nothing is charged.'],
      [
        'Post your matter',
        'Choose the type of matter (criminal, civil, family, appeal or “not sure”), how urgent it is, your province and, if you like, a budget range. Describe what happened in plain language. Leave out names, ID numbers and addresses — lawyers see your matter without knowing who you are.',
      ],
      [
        'Receive offers',
        'Verified lawyers whose practice fits your matter are notified. Each offer shows a consultation fee, an estimate for further stages, the fee structure and what is included. You get a notification for every new offer.',
      ],
      ['Compare', 'Tick up to four offers and press “Compare” to see fees, experience, ratings and languages side by side. Open a lawyer’s profile for more detail.'],
      [
        'Accept one offer',
        'When you accept, the other offers are declined politely. Your name is now shared with the lawyer you chose, but not your contact details yet.',
      ],
      [
        'Pay, book and sign',
        'Pay the consultation fee securely, pick a time (video, phone or in person) and read and sign the mandate — the agreement that sets out the lawyer’s scope of work and fees. Your contact details are shared once you sign.',
      ],
      [
        'Work together in your workspace',
        'Message your lawyer, share documents, see court dates and deadlines (and add them to your calendar), follow progress and pay invoices — all in one secure place.',
      ],
    ],
  },
  {
    id: 'police',
    tag: 'Police reports',
    title: 'Preparing a police report and tracking your case',
    intro: 'LexBridge helps you prepare and preserve your account. It does not replace reporting to SAPS.',
    steps: [
      ['If anyone is in danger, call 10111 first', 'Or 112 from a cell phone. For gender-based violence, call the GBV Command Centre on 0800 428 428.'],
      ['Record what happened', 'Add the type of incident, date, time, place and a short summary. Then choose the nearest SAPS station from all Western Cape stations.'],
      [
        'Write your statement',
        'Describe what you personally saw, heard and experienced, in the order it happened. Your original statement is locked and fingerprinted when you save.',
      ],
      ['Take it to SAPS', 'Visit or contact the station. SAPS opens the official case and gives you a CAS or occurrence-book (OB) number.'],
      ['Record the SAPS reference', 'Enter the CAS or OB number and the investigating officer’s details in your case tracker, so you have everything in one place.'],
      [
        'Correct or add information',
        'Choose “Add amendment” to record a new version with a reason. Every version stays visible with its date and fingerprint, and you can compare them.',
      ],
      ['Attach evidence and follow the case', 'Upload photos or documents, record court dates, open a justice case intake, or find a lawyer for the next step.'],
    ],
  },
  {
    id: 'lawyers',
    tag: 'For lawyers',
    title: 'Joining as a legal practitioner',
    intro: 'Free to join. No referral fees and no share of your fees.',
    steps: [
      ['Sign up as a legal practitioner', 'Choose “I’m a legal practitioner” when you create your account.'],
      [
        'Complete your practice profile',
        'Add your firm, province, areas of practice, courts, languages, years of experience, standard consultation fee and a short biography.',
      ],
      [
        'Submit your credentials',
        'Enter your Legal Practice Council enrolment number, practising certificate expiry date and Fidelity Fund certificate number, then submit for verification.',
      ],
      ['Get verified', 'Our team checks each credential. You will be notified when you are approved, or if we need more information.'],
      [
        'Respond to matters',
        'Browse the matter feed, filter by type, court, province, urgency and budget, and send clear offers with a staged fee breakdown.',
      ],
      ['Act for your client', 'When a client accepts, pays and signs, you can see their contact details, share updates and dates, and send invoices.'],
    ],
  },
  {
    id: 'justice',
    tag: 'Justice workspace',
    title: 'How the digital justice workspace works',
    intro: 'A shared, role-based record for a case, from intake to court.',
    steps: [
      ['Open an intake', 'Clients can open a digital intake directly, or from a police report. It gets a “JUST-” platform reference — not an official case number.'],
      ['Officials are assigned', 'LexBridge assigns verified SAPS, prosecution and court officials. Court clerks and Legal Aid practitioners can add the right people to a case.'],
      [
        'Each role does its part',
        'SAPS register the official reference and add docket entries, prosecutors decide whether to prosecute, clerks schedule hearings and accept filings, and magistrates record sealed decisions.',
      ],
      ['Everyone stays informed', 'Participants are notified of every step, can e-file documents, and can send secure messages to each other.'],
      ['Request Legal Aid', 'If you cannot afford a lawyer, request Legal Aid screening from the case. Approval depends on Legal Aid South Africa’s criteria.'],
    ],
  },
]

const TOPICS = ['All', ...new Set(FAQ.map(([t]) => t))]

export default function Help() {
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState('All')
  const [open, setOpen] = useState(null)
  useEffect(() => {
    document.title = 'Help Centre · LexBridge'
  }, [])
  const faqs = useMemo(
    () => FAQ.filter(([t, question, a]) => (topic === 'All' || t === topic) && `${question} ${a}`.toLowerCase().includes(q.toLowerCase())),
    [q, topic],
  )

  return (
    <div className="public-subpage">
      <PublicHeader />
      <header className="legal-hero help-hero">
        <div className="mx-auto max-w-[1180px] px-5">
          <span className="eyebrow light">HELP CENTRE</span>
          <h1>How can we help?</h1>
          <p>Step-by-step guides, answers to common questions and how to reach us.</p>
          <div className="help-search">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions, e.g. refund, verified, CAS number" aria-label="Search help" />
          </div>
          <div className="help-jump">
            {GUIDES.map((g) => (
              <a key={g.id} href={`#${g.id}`}>
                {g.tag}
              </a>
            ))}
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 py-12">
        <section className="help-emergency" aria-label="Emergency numbers">
          <b>In an emergency</b>
          <span>
            SAPS <a href="tel:10111">10111</a>
          </span>
          <span>
            From a cell phone <a href="tel:112">112</a>
          </span>
          <span>
            GBV Command Centre <a href="tel:0800428428">0800 428 428</a>
          </span>
          <span>
            Legal Aid Advice Line <a href="tel:0800110110">0800 110 110</a>
          </span>
        </section>

        {GUIDES.map((g) => (
          <section key={g.id} id={g.id} className="help-guide">
            <div className="help-guide-head">
              <span className="eyebrow">{g.tag.toUpperCase()}</span>
              <h2>{g.title}</h2>
              <p>{g.intro}</p>
            </div>
            <ol className="help-steps">
              {g.steps.map(([title, text], i) => (
                <li key={title}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <b>{title}</b>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section id="faq" className="help-faq">
          <div className="help-guide-head">
            <span className="eyebrow">FREQUENTLY ASKED QUESTIONS</span>
            <h2>Answers in plain language.</h2>
          </div>
          <div className="help-topics" role="tablist" aria-label="FAQ topics">
            {TOPICS.map((t) => (
              <button key={t} role="tab" aria-selected={topic === t} className={topic === t ? 'active' : ''} onClick={() => setTopic(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="faq-list">
            {faqs.map(([t, question, a]) => (
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
            {faqs.length === 0 && <p className="text-sm text-[#65767b]">No questions match “{q}”. Try another word, or contact us below.</p>}
          </div>
        </section>

        <section id="contact" className="help-contact-grid">
          <div>
            <span className="eyebrow">CONTACT US</span>
            <h2>We’re here to help.</h2>
            <p>
              {company.supportHours}. We reply to most emails within one business day. We cannot give legal advice — for that, post a matter or contact a
              lawyer.
            </p>
          </div>
          {[
            ['General support', company.email],
            ['Payments, refunds & disputes', company.disputesEmail],
            ['Privacy & POPIA requests', company.privacyEmail],
            ['Legal notices', company.legalEmail],
          ].map(([label, email]) => (
            <a key={email} href={`mailto:${email}`} className="help-contact-card">
              <small>{label}</small>
              <b>{email}</b>
            </a>
          ))}
        </section>

        <section id="complaints" className="help-guide">
          <div className="help-guide-head">
            <span className="eyebrow">COMPLAINTS</span>
            <h2>If something goes wrong</h2>
          </div>
          <ul className="help-list">
            <li>
              <b>About LexBridge, a payment or a refund:</b> use “Dispute” on your Payments page or email {company.disputesEmail}. We acknowledge within 2 business
              days and aim to resolve within 10. You can escalate to the Consumer Goods and Services Ombud or the National Consumer Commission.
            </li>
            <li>
              <b>About a lawyer’s conduct or fees:</b> raise it with the lawyer first and tell us. You can lodge a written complaint with the Legal Practice
              Council office in the province where the lawyer practises.
            </li>
            <li>
              <b>About your personal information:</b> contact our Information Officer at {company.privacyEmail}, or the Information Regulator — see our{' '}
              <Link to="/legal/privacy#complaints">Privacy Policy</Link>.
            </li>
            <li>
              <b>About a police official:</b> speak to the station commander, or use SAPS complaints channels or the Independent Police Investigative Directorate
              (IPID).
            </li>
          </ul>
          <p className="help-policies">
            Read our <Link to="/legal/terms">Terms of Use</Link> · <Link to="/legal/refunds">Refund &amp; Cancellation Policy</Link> ·{' '}
            <Link to="/legal/privacy">Privacy Policy</Link> · <Link to="/legal/practitioners">Practitioner Terms</Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

