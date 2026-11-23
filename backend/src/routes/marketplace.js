import { Router } from 'express'
import { db, json, now, tx } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'
import {
  bool,
  fail,
  int,
  isoDate,
  notify,
  randRef,
  removeUpload,
  sendStoredFile,
  sha256,
  text,
  upload,
  vatPortion,
  wrap,
} from '../util.js'
import { paymentMode, payfastCheckout, verifyPayfastNotification } from '../payments.js'

const router = Router()

export const CATEGORIES = ['criminal', 'civil', 'family', 'appeal', 'unsure']
const CATEGORY_AREA = {
  criminal: ['Criminal law', 'Bail'],
  civil: ['Civil litigation', 'Contracts', 'Property', 'Debt recovery'],
  family: ['Family law', 'Divorce', 'Maintenance'],
  appeal: ['Appeals', 'High Court'],
  unsure: [],
}
const URGENCY = ['Within 48 hours', 'Soon', 'Flexible']
const BUDGETS = ['Under R 2 500', 'R 2 500 – R 7 500', 'R 7 500 – R 15 000', 'R 15 000+']
export const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
]
const COURT_LEVELS = ["Magistrates' Court", 'Regional Court', 'High Court', 'Supreme Court of Appeal', 'Constitutional Court', 'Labour Court', 'Not sure']

// ---------- serializers ----------
export function lawyerCard(row) {
  if (!row) return null
  return {
    id: row.user_id ?? row.id,
    name: row.name,
    practitionerType: row.practitioner_type,
    firm: row.firm,
    city: row.city,
    province: row.province,
    areas: json(row.areas),
    courts: json(row.courts),
    languages: json(row.languages, ['English']),
    yearsExperience: row.years_experience,
    consultFee: row.consult_fee,
    bio: row.bio,
    photoUrl: row.photo_url,
    rating: row.rating,
    reviewCount: row.review_count,
    responseMinutes: row.response_minutes,
    available: !!row.available,
    verified: row.verification_status === 'approved',
  }
}

const lawyerJoin = `SELECT u.id AS user_id, u.name, u.email, u.account_status, lp.* FROM users u
  JOIN lawyer_profiles lp ON lp.user_id = u.id`
const getLawyer = db.prepare(`${lawyerJoin} WHERE u.id = ?`)

function matterOut(m, { forLawyer = false } = {}) {
  return {
    id: m.id,
    reference: m.reference,
    category: m.category,
    side: m.side,
    title: m.title,
    description: m.description,
    urgency: m.urgency,
    budget: m.budget,
    courtLevel: m.court_level,
    province: m.province,
    city: m.city,
    status: m.status,
    courtName: m.court_name,
    nextCourtDate: m.next_court_date,
    moderationStatus: forLawyer ? undefined : m.moderation_status,
    lawyerId: m.lawyer_id,
    acceptedOfferId: m.accepted_offer_id,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }
}

function offerOut(o, lawyer) {
  return {
    id: o.id,
    matterId: o.matter_id,
    lawyerId: o.lawyer_id,
    consultFee: o.consult_fee,
    totalFee: o.total_fee,
    feeStructure: o.fee_structure,
    note: o.note,
    breakdown: json(o.breakdown),
    inclusions: json(o.inclusions),
    status: o.status,
    createdAt: o.created_at,
    lawyer: lawyer ? lawyerCard(lawyer) : undefined,
  }
}

const paymentOut = (p) => ({
  id: p.id,
  matterId: p.matter_id,
  kind: p.kind,
  description: p.description,
  amount: p.amount,
  vat: p.vat,
  status: p.status,
  method: p.method,
  provider: p.provider,
  providerRef: p.provider_ref,
  disputeNote: p.dispute_note,
  refundAmount: p.refund_amount || 0,
  refundStatus: p.refund_status,
  refundReason: p.refund_reason,
  refundedAt: p.refunded_at,
  createdAt: p.created_at,
  paidAt: p.paid_at,
  matterTitle: p.matter_title,
  matterReference: p.matter_reference,
})

function matchScore(profile, matter) {
  if (!profile) return 0
  const areas = json(profile.areas).map((a) => a.toLowerCase())
  const courts = json(profile.courts).map((c) => c.toLowerCase())
  let score = 55
  if ((CATEGORY_AREA[matter.category] || []).some((a) => areas.includes(a.toLowerCase()))) score += 25
  if (matter.province && matter.province === profile.province) score += 12
  if (matter.court_level && courts.some((c) => matter.court_level.toLowerCase().includes(c.toLowerCase().replace("'", '')))) score += 6
  if (matter.urgency === 'Within 48 hours' && profile.available) score += 2
  return Math.min(99, score)
}

const getMatter = db.prepare('SELECT * FROM matters WHERE id = ?')
const isParty = (user, m) =>
  user && (user.role === 'admin' || m.client_id === user.id || (m.lawyer_id && m.lawyer_id === user.id))

function loadMatterFor(req, res) {
  const id = int(req.params.id)
  const m = id && getMatter.get(id)
  if (!m || !isParty(req.user, m)) {
    fail(res, 404, 'This matter was not found or is not shared with you.')
    return null
  }
  return m
}

const logEvent = db.prepare(`INSERT INTO matter_events (matter_id, created_by, kind, title, details, event_date)
  VALUES (?, ?, ?, ?, ?, ?)`)

// ---------- public directory ----------
router.get('/lawyers', (req, res) => {
  const q = text(req.query.q, 80).toLowerCase()
  const province = text(req.query.province, 40)
  const area = text(req.query.area, 60)
  const court = text(req.query.court, 60)
  const language = text(req.query.language, 30)
  const maxFee = int(req.query.maxFee)
  const sort = text(req.query.sort, 20)
  let rows = db
    .prepare(`${lawyerJoin} WHERE lp.verification_status = 'approved' AND u.account_status = 'active'`)
    .all()
    .map(lawyerCard)
  rows = rows.filter(
    (l) =>
      (!q || [l.name, l.firm, l.city, l.bio, ...l.areas].filter(Boolean).some((v) => v.toLowerCase().includes(q))) &&
      (!province || province === 'All provinces' || l.province === province) &&
      (!area || l.areas.includes(area)) &&
      (!court || l.courts.includes(court)) &&
      (!language || l.languages.includes(language)) &&
      (!maxFee || l.consultFee <= maxFee),
  )
  if (sort === 'rating') rows.sort((a, b) => b.rating - a.rating)
  else if (sort === 'fee') rows.sort((a, b) => a.consultFee - b.consultFee)
  else rows.sort((a, b) => b.rating * Math.log(b.reviewCount + 2) - a.rating * Math.log(a.reviewCount + 2))
  const all = db
    .prepare(`SELECT lp.areas, lp.courts, lp.languages FROM lawyer_profiles lp WHERE verification_status = 'approved'`)
    .all()
  const facet = (key) => [...new Set(all.flatMap((r) => json(r[key])))].sort()
  let saved = []
  if (req.user) saved = db.prepare('SELECT lawyer_id FROM saved_lawyers WHERE client_id = ?').all(req.user.id).map((r) => r.lawyer_id)
  res.json({
    ok: true,
    lawyers: rows.map((l) => ({ ...l, saved: saved.includes(l.id) })),
    facets: { areas: facet('areas'), courts: facet('courts'), languages: facet('languages'), provinces: PROVINCES },
  })
})

router.get('/lawyers/:id', (req, res) => {
  const row = getLawyer.get(int(req.params.id))
  if (!row || row.verification_status !== 'approved' || row.account_status !== 'active')
    return fail(res, 404, 'This practitioner profile is not available.')
  res.json({ ok: true, lawyer: lawyerCard(row) })
})

router.post('/lawyers/:id/save', requireAuth, (req, res) => {
  const id = int(req.params.id)
  const existing = db.prepare('SELECT 1 FROM saved_lawyers WHERE client_id = ? AND lawyer_id = ?').get(req.user.id, id)
  if (existing) db.prepare('DELETE FROM saved_lawyers WHERE client_id = ? AND lawyer_id = ?').run(req.user.id, id)
  else if (getLawyer.get(id)) db.prepare('INSERT INTO saved_lawyers (client_id, lawyer_id) VALUES (?, ?)').run(req.user.id, id)
  res.json({ ok: true, saved: !existing })
})

router.get('/marketplace/meta', (_req, res) => {
  const lawyers = db.prepare(`SELECT COUNT(*) n FROM lawyer_profiles WHERE verification_status = 'approved'`).get().n
  const featured = db
    .prepare(`${lawyerJoin} WHERE lp.verification_status = 'approved' AND u.account_status = 'active'
      ORDER BY lp.rating DESC, lp.review_count DESC LIMIT 3`)
    .all()
    .map(lawyerCard)
  res.json({
    ok: true,
    paymentMode,
    // Demo sign-in hints are only exposed while demo data is enabled.
    demo:
      process.env.SEED_DEMO === 'false'
        ? null
        : { domain: 'demo.lexbridge.co.za', password: process.env.DEMO_PASSWORD ? null : 'Demo@2025!' },
    lawyers,
    stations: db.prepare('SELECT COUNT(*) n FROM police_stations').get().n,
    featured,
    options: { categories: CATEGORIES, urgency: URGENCY, budgets: BUDGETS, provinces: PROVINCES, courtLevels: COURT_LEVELS },
  })
})

// ---------- client: matters ----------
router.post('/matters', requireRole('client'), (req, res) => {
  const category = CATEGORIES.includes(req.body.category) ? req.body.category : null
  const title = text(req.body.title, 140)
  const description = text(req.body.description, 5000)
  const urgency = URGENCY.includes(req.body.urgency) ? req.body.urgency : 'Soon'
  const budget = BUDGETS.includes(req.body.budget) ? req.body.budget : null
  const province = PROVINCES.includes(req.body.province) ? req.body.province : null
  const courtLevel = COURT_LEVELS.includes(req.body.courtLevel) ? req.body.courtLevel : null
  if (!category || !title || description.length < 20 || !province)
    return fail(res, 400, 'Choose a matter type and province, add a short title and describe what happened (20+ characters).')
  if (!req.body.consent) return fail(res, 400, 'Please confirm you understand the marketplace disclaimer.')
  const info = db
    .prepare(`INSERT INTO matters (reference, client_id, category, side, title, description, urgency, budget, court_level, province, city)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      randRef('LXB'),
      req.user.id,
      category,
      text(req.body.side, 80) || null,
      title,
      description,
      urgency,
      budget,
      courtLevel,
      province,
      text(req.body.city, 80) || null,
    )
  const matter = getMatter.get(info.lastInsertRowid)
  logEvent.run(matter.id, req.user.id, 'milestone', 'Matter posted', 'Shared anonymously with verified, matching lawyers.', now())
  // Alert verified lawyers who practise in this area.
  const lawyers = db.prepare(`SELECT user_id, areas, province FROM lawyer_profiles WHERE verification_status = 'approved' AND available = 1`).all()
  for (const l of lawyers) {
    if (matchScore(l, matter) >= 80)
      notify(l.user_id, {
        title: 'New matching matter',
        message: `${title} · ${province}`,
        link: '/lawyer',
        matterId: matter.id,
      })
  }
  res.status(201).json({ ok: true, matter: matterOut(matter) })
})

router.get('/matters/mine', requireAuth, (req, res) => {
  const field = req.user.role === 'lawyer' ? 'lawyer_id' : 'client_id'
  const rows = db
    .prepare(`SELECT m.*,
        (SELECT COUNT(*) FROM offers o WHERE o.matter_id = m.id AND o.status IN ('pending','accepted')) AS offer_count
      FROM matters m WHERE m.${field} = ? ORDER BY m.updated_at DESC`)
    .all(req.user.id)
  res.json({
    ok: true,
    matters: rows.map((m) => {
      const lawyer = m.lawyer_id ? getLawyer.get(m.lawyer_id) : null
      const client = req.user.role === 'lawyer' ? db.prepare('SELECT name FROM users WHERE id = ?').get(m.client_id) : null
      return { ...matterOut(m), offerCount: m.offer_count, lawyer: lawyerCard(lawyer), clientName: client?.name }
    }),
  })
})

router.get('/client/overview', requireRole('client'), (req, res) => {
  const uid = req.user.id
  const matters = db.prepare(`SELECT * FROM matters WHERE client_id = ? AND status IN ('open','assigned') ORDER BY updated_at DESC`).all(uid)
  const newOffers = db
    .prepare(`SELECT COUNT(*) n FROM offers o JOIN matters m ON m.id = o.matter_id WHERE m.client_id = ? AND o.status = 'pending'`)
    .get(uid).n
  const offerMatters = db
    .prepare(`SELECT COUNT(DISTINCT o.matter_id) n FROM offers o JOIN matters m ON m.id = o.matter_id WHERE m.client_id = ? AND o.status = 'pending'`)
    .get(uid).n
  const outstanding = db.prepare(`SELECT * FROM payments WHERE client_id = ? AND status = 'pending' ORDER BY created_at`).all(uid)
  const upcoming = db
    .prepare(`SELECT e.*, m.title AS matter_title FROM matter_events e JOIN matters m ON m.id = e.matter_id
      WHERE m.client_id = ? AND e.kind IN ('hearing','consultation','deadline') AND e.event_date >= ? ORDER BY e.event_date LIMIT 6`)
    .all(uid, new Date(Date.now() - 3600_000).toISOString())
  const nextCourt = upcoming.find((e) => e.kind === 'hearing')
  // The single most useful next step for the client.
  let action = null
  for (const m of matters) {
    if (m.status === 'assigned') {
      const s = checkoutState(m)
      if (s.step !== 'done') {
        const lawyer = getLawyer.get(m.lawyer_id)
        action = {
          matterId: m.id,
          title: s.step === 'payment' ? 'Your consultation is ready to schedule' : s.step === 'schedule' ? 'Choose a consultation time' : 'Review and sign your mandate',
          text:
            s.step === 'payment'
              ? `${lawyer?.name} accepted your matter. Pay the consultation fee and select a time.`
              : s.step === 'schedule'
                ? `Your payment is complete. Pick a time with ${lawyer?.name}.`
                : `Sign the mandate so ${lawyer?.name} can start work.`,
          link: `/matters/${m.id}/checkout`,
        }
        break
      }
    } else {
      const pending = db.prepare(`SELECT COUNT(*) n FROM offers WHERE matter_id = ? AND status = 'pending'`).get(m.id).n
      if (pending) {
        action = { matterId: m.id, title: `${pending} lawyer offer${pending > 1 ? 's' : ''} to review`, text: `Compare fees and experience for “${m.title}”.`, link: `/matters/${m.id}` }
        break
      }
    }
  }
  if (!action && outstanding.length) {
    action = { matterId: outstanding[0].matter_id, title: 'An invoice is awaiting payment', text: outstanding[0].description, link: '/payments' }
  }
  res.json({
    ok: true,
    metrics: {
      openMatters: matters.length,
      needsAttention: action ? 1 : 0,
      newOffers,
      offerMatters,
      nextCourtDate: nextCourt?.event_date ?? null,
      nextCourtDetail: nextCourt ? nextCourt.details || nextCourt.matter_title : null,
      outstanding: outstanding.reduce((s, p) => s + p.amount, 0),
      outstandingLabel: outstanding[0]?.description ?? 'Nothing due',
    },
    action,
    matters: matters.map((m) => ({
      ...matterOut(m),
      offerCount: db.prepare(`SELECT COUNT(*) n FROM offers WHERE matter_id = ? AND status IN ('pending','accepted')`).get(m.id).n,
    })),
    timeline: upcoming.map((e) => ({ id: e.id, kind: e.kind, title: e.title, details: e.details, eventDate: e.event_date, matterTitle: e.matter_title, matterId: e.matter_id })),
    ...clientExtras(uid),
  })
})

// Extra dashboard panels: money, unread messages, police reports and recent activity.
function clientExtras(uid) {
  const money = db
    .prepare(`SELECT
        COALESCE(SUM(CASE WHEN status IN ('paid','refunded','disputed') THEN amount - refund_amount ELSE 0 END), 0) AS paid,
        COALESCE(SUM(refund_amount), 0) AS refunded,
        COALESCE(SUM(CASE WHEN refund_status = 'pending' THEN refund_amount ELSE 0 END), 0) AS refundPending
      FROM payments WHERE client_id = ?`)
    .get(uid)
  const unreadMessages = db
    .prepare(`SELECT COUNT(*) n FROM matter_messages mm JOIN matters m ON m.id = mm.matter_id
      WHERE m.client_id = ? AND mm.sender_id != ? AND mm.read_at IS NULL`)
    .get(uid, uid).n
  const reports = db.prepare(`SELECT id, reference, title, official_status, updated_at FROM police_reports WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 3`).all(uid)
  const closed = db.prepare(`SELECT COUNT(*) n FROM matters WHERE client_id = ? AND status IN ('closed','cancelled')`).get(uid).n
  const activity = db.prepare(`SELECT id, title, message, link, read_at, created_at FROM notifications WHERE owner_id = ? ORDER BY created_at DESC LIMIT 6`).all(uid)
  return {
    money,
    unreadMessages,
    closedMatters: closed,
    reports: reports.map((r) => ({ id: r.id, reference: r.reference, title: r.title, status: r.official_status, updatedAt: r.updated_at })),
    activity: activity.map((a) => ({ id: a.id, title: a.title, message: a.message, link: a.link, unread: !a.read_at, createdAt: a.created_at })),
  }
}

// ---------- lawyer practice summary (dashboard sidebar + earnings) ----------
router.get('/lawyer/summary', requireRole('lawyer'), (req, res) => {
  const uid = req.user.id
  const nowIso = new Date().toISOString()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const consultations = db
    .prepare(`SELECT c.*, m.title, m.reference, u.name AS client_name FROM consultations c
      JOIN matters m ON m.id = c.matter_id JOIN users u ON u.id = m.client_id
      WHERE c.lawyer_id = ? AND c.status = 'booked' AND c.starts_at >= ? ORDER BY c.starts_at LIMIT 6`)
    .all(uid, new Date(Date.now() - 3600_000).toISOString())
  const money = db
    .prepare(`SELECT
        COALESCE(SUM(CASE WHEN status IN ('paid','refunded','disputed') THEN amount - refund_amount ELSE 0 END), 0) AS earned,
        COALESCE(SUM(CASE WHEN status IN ('paid','refunded','disputed') AND paid_at >= ? THEN amount - refund_amount ELSE 0 END), 0) AS month,
        COALESCE(SUM(CASE WHEN status IN ('pending','processing') THEN amount ELSE 0 END), 0) AS invoiced
      FROM payments WHERE lawyer_id = ?`)
    .get(monthStart, uid)
  const offers = db
    .prepare(`SELECT COUNT(*) total, SUM(status = 'pending') pending, SUM(status = 'accepted') won, SUM(status = 'declined') declined FROM offers WHERE lawyer_id = ?`)
    .get(uid)
  const decided = (offers.won || 0) + (offers.declined || 0)
  const active = db.prepare(`SELECT COUNT(*) n FROM matters WHERE lawyer_id = ? AND status = 'assigned'`).get(uid).n
  const unreadMessages = db
    .prepare(`SELECT COUNT(*) n FROM matter_messages mm JOIN matters m ON m.id = mm.matter_id
      WHERE m.lawyer_id = ? AND mm.sender_id != ? AND mm.read_at IS NULL`)
    .get(uid, uid).n
  const rating = db.prepare('SELECT rating, review_count FROM lawyer_profiles WHERE user_id = ?').get(uid)
  res.json({
    ok: true,
    now: nowIso,
    consultations: consultations.map((c) => ({
      id: c.id,
      matterId: c.matter_id,
      title: c.title,
      reference: c.reference,
      clientName: c.client_name,
      startsAt: c.starts_at,
      format: c.format,
    })),
    money,
    offers: { total: offers.total || 0, pending: offers.pending || 0, won: offers.won || 0, winRate: decided ? Math.round(((offers.won || 0) / decided) * 100) : null },
    activeMatters: active,
    unreadMessages,
    rating: rating?.rating ?? null,
    reviewCount: rating?.review_count ?? 0,
  })
})

router.get('/matters/:id', requireAuth, (req, res) => {
  const id = int(req.params.id)
  const m = id && getMatter.get(id)
  if (!m) return fail(res, 404, 'Matter not found.')
  if (isParty(req.user, m)) return res.json({ ok: true, matter: matterOut(m) })
  // Verified lawyers can see open, visible matters — anonymised.
  if (req.user.role === 'lawyer' && m.status === 'open' && m.moderation_status === 'visible') {
    const p = db.prepare('SELECT * FROM lawyer_profiles WHERE user_id = ?').get(req.user.id)
    if (p?.verification_status === 'approved') {
      const mine = db.prepare('SELECT * FROM offers WHERE matter_id = ? AND lawyer_id = ?').get(m.id, req.user.id)
      return res.json({ ok: true, matter: matterOut(m, { forLawyer: true }), matchScore: matchScore(p, m), myOffer: mine ? offerOut(mine) : null })
    }
  }
  fail(res, 404, 'This matter was not found or is not shared with you.')
})

router.get('/matters/:id/offers', requireAuth, (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  if (req.user.role === 'lawyer' && m.client_id !== req.user.id) return fail(res, 403, 'Only the client can view all offers.')
  const offers = db.prepare(`SELECT * FROM offers WHERE matter_id = ? AND status != 'withdrawn' ORDER BY created_at`).all(m.id)
  if (req.user.id === m.client_id)
    db.prepare(`UPDATE offers SET viewed_at = ? WHERE matter_id = ? AND viewed_at IS NULL`).run(now(), m.id)
  const profile = { areas: '[]', courts: '[]' }
  res.json({
    ok: true,
    matter: matterOut(m),
    offers: offers.map((o) => {
      const lawyer = getLawyer.get(o.lawyer_id)
      return { ...offerOut(o, lawyer), matchScore: matchScore(lawyer || profile, m) }
    }),
  })
})

router.post('/matters/:id/offers/:offerId/accept', requireRole('client'), (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  if (m.client_id !== req.user.id) return fail(res, 403, 'Only the client can accept an offer.')
  if (m.status !== 'open') return fail(res, 409, 'An offer has already been accepted for this matter.')
  const offer = db.prepare(`SELECT * FROM offers WHERE id = ? AND matter_id = ? AND status = 'pending'`).get(int(req.params.offerId), m.id)
  if (!offer) return fail(res, 404, 'That offer is no longer available.')
  tx(() => {
    const t = now()
    db.prepare(`UPDATE offers SET status = 'accepted' WHERE id = ?`).run(offer.id)
    db.prepare(`UPDATE offers SET status = 'declined' WHERE matter_id = ? AND id != ? AND status = 'pending'`).run(m.id, offer.id)
    db.prepare(`UPDATE matters SET status = 'assigned', lawyer_id = ?, accepted_offer_id = ?, updated_at = ? WHERE id = ?`).run(
      offer.lawyer_id,
      offer.id,
      t,
      m.id,
    )
    db.prepare(`INSERT INTO payments (matter_id, offer_id, client_id, lawyer_id, kind, description, amount, vat)
      VALUES (?, ?, ?, ?, 'consultation', ?, ?, ?)`).run(
      m.id,
      offer.id,
      m.client_id,
      offer.lawyer_id,
      `Consultation · ${m.title}`,
      offer.consult_fee,
      vatPortion(offer.consult_fee),
    )
    logEvent.run(m.id, req.user.id, 'milestone', 'Matter accepted', 'Client accepted the lawyer’s offer.', t)
    for (const other of db.prepare(`SELECT lawyer_id FROM offers WHERE matter_id = ? AND status = 'declined'`).all(m.id))
      notify(other.lawyer_id, { title: 'Offer not selected', message: `The client chose another lawyer for “${m.title}”.`, link: '/lawyer/offers', matterId: m.id })
    notify(offer.lawyer_id, { title: 'Your offer was accepted', message: `${req.user.name} accepted your offer for “${m.title}”.`, link: `/matters/${m.id}/workspace`, matterId: m.id })
  })()
  res.json({ ok: true, matterId: m.id })
})

router.post('/matters/:id/cancel', requireRole('client'), (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  if (m.status !== 'open') return fail(res, 409, 'Only open matters can be withdrawn.')
  db.prepare(`UPDATE matters SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(now(), m.id)
  db.prepare(`UPDATE offers SET status = 'declined' WHERE matter_id = ? AND status = 'pending'`).run(m.id)
  res.json({ ok: true })
})

router.post('/matters/:id/close', requireAuth, (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  if (m.status !== 'assigned') return fail(res, 409, 'Only active matters can be closed.')
  db.prepare(`UPDATE matters SET status = 'closed', updated_at = ? WHERE id = ?`).run(now(), m.id)
  logEvent.run(m.id, req.user.id, 'milestone', 'Matter closed', `Closed by ${req.user.name}.`, now())
  notify(req.user.id === m.client_id ? m.lawyer_id : m.client_id, { title: 'Matter closed', message: m.title, link: `/matters/${m.id}/workspace`, matterId: m.id })
  res.json({ ok: true })
})

// ---------- lawyer: profile, feed and offers ----------
const PROFILE_CHECKS = ['identity', 'lpc', 'practising', 'fidelity', 'firm']

router.get('/lawyer/profile', requireRole('lawyer'), (req, res) => {
  const p = getLawyer.get(req.user.id)
  res.json({
    ok: true,
    profile: {
      ...lawyerCard(p),
      lpcNumber: p.lpc_number,
      practisingCertExpiry: p.practising_cert_expiry,
      fidelityCert: p.fidelity_cert,
      verificationStatus: p.verification_status,
      reviewNote: p.review_note,
      checks: json(p.checks, {}),
      submittedAt: p.submitted_at,
    },
  })
})

router.put('/lawyer/profile', requireRole('lawyer'), (req, res) => {
  const p = getLawyer.get(req.user.id)
  const list = (v, max = 12) => (Array.isArray(v) ? v.map((x) => text(x, 60)).filter(Boolean).slice(0, max) : [])
  const fee = int(req.body.consultFee)
  const data = {
    practitioner_type: req.body.practitionerType === 'Advocate' ? 'Advocate' : 'Attorney',
    firm: text(req.body.firm, 120) || null,
    city: text(req.body.city, 80) || null,
    province: PROVINCES.includes(req.body.province) ? req.body.province : null,
    areas: JSON.stringify(list(req.body.areas)),
    courts: JSON.stringify(list(req.body.courts)),
    languages: JSON.stringify(list(req.body.languages).length ? list(req.body.languages) : ['English']),
    years_experience: Math.max(0, Math.min(60, int(req.body.yearsExperience) ?? 0)),
    consult_fee: fee && fee > 0 ? Math.min(fee, 10_000_00) : p.consult_fee,
    bio: text(req.body.bio, 1200) || null,
    photo_url: /^https:\/\//.test(text(req.body.photoUrl, 400)) ? text(req.body.photoUrl, 400) : p.photo_url,
    available: bool(req.body.available) ? 1 : 0,
  }
  // Credential changes after approval send the profile back for review.
  const lpc = text(req.body.lpcNumber, 40) || null
  const cert = isoDate(req.body.practisingCertExpiry)
  const ffc = text(req.body.fidelityCert, 60) || null
  const credentialsChanged = lpc !== p.lpc_number || (cert || null) !== (p.practising_cert_expiry || null) || ffc !== p.fidelity_cert
  db.prepare(`UPDATE lawyer_profiles SET practitioner_type=@practitioner_type, firm=@firm, city=@city, province=@province,
      areas=@areas, courts=@courts, languages=@languages, years_experience=@years_experience, consult_fee=@consult_fee,
      bio=@bio, photo_url=@photo_url, available=@available, lpc_number=@lpc, practising_cert_expiry=@cert, fidelity_cert=@ffc,
      verification_status = CASE WHEN @credentialsChanged = 1 AND verification_status = 'approved' THEN 'pending' ELSE verification_status END
    WHERE user_id = @id`).run({ ...data, lpc, cert, ffc, credentialsChanged: credentialsChanged ? 1 : 0, id: req.user.id })
  res.json({ ok: true })
})

router.post('/lawyer/profile/submit', requireRole('lawyer'), (req, res) => {
  const p = getLawyer.get(req.user.id)
  if (!p.lpc_number || !p.practising_cert_expiry || !p.fidelity_cert || !p.firm || !p.province || json(p.areas).length === 0)
    return fail(res, 400, 'Complete your LPC number, practising and Fidelity Fund certificates, firm, province and practice areas first.')
  if (!['incomplete', 'more-info', 'rejected', 'pending'].includes(p.verification_status))
    return fail(res, 409, 'Your profile is already verified.')
  const checks = Object.fromEntries(PROFILE_CHECKS.map((k) => [k, 'review']))
  db.prepare(`UPDATE lawyer_profiles SET verification_status = 'pending', submitted_at = ?, checks = ? WHERE user_id = ?`).run(
    now(),
    JSON.stringify(checks),
    req.user.id,
  )
  for (const admin of db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all())
    notify(admin.id, { title: 'New practitioner application', message: `${req.user.name} submitted credentials for verification.`, link: '/admin' })
  res.json({ ok: true })
})

const requireVerifiedLawyer = (req, res, next) => {
  if (!req.user || req.user.role !== 'lawyer') return fail(res, 403, 'This area is for legal practitioners.')
  const p = db.prepare('SELECT verification_status FROM lawyer_profiles WHERE user_id = ?').get(req.user.id)
  if (p?.verification_status !== 'approved') return fail(res, 403, 'Your practitioner profile must be verified before you can respond to matters.')
  next()
}

router.get('/lawyer/feed', requireRole('lawyer'), (req, res) => {
  const p = getLawyer.get(req.user.id)
  const q = text(req.query.q, 80).toLowerCase()
  const filters = {
    category: CATEGORIES.includes(req.query.category) ? req.query.category : null,
    province: PROVINCES.includes(req.query.province) ? req.query.province : null,
    urgency: URGENCY.includes(req.query.urgency) ? req.query.urgency : null,
    courtLevel: COURT_LEVELS.includes(req.query.courtLevel) ? req.query.courtLevel : null,
    budget: BUDGETS.includes(req.query.budget) ? req.query.budget : null,
  }
  const savedOnly = req.query.saved === '1'
  const saved = new Set(db.prepare('SELECT matter_id FROM saved_matters WHERE lawyer_id = ?').all(req.user.id).map((r) => r.matter_id))
  let rows = db
    .prepare(`SELECT m.*, (SELECT COUNT(*) FROM offers o WHERE o.matter_id = m.id AND o.status != 'withdrawn') AS offer_count,
        (SELECT status FROM offers o WHERE o.matter_id = m.id AND o.lawyer_id = ?) AS my_offer
      FROM matters m WHERE m.status = 'open' AND m.moderation_status = 'visible' ORDER BY m.created_at DESC LIMIT 200`)
    .all(req.user.id)
  rows = rows
    .filter(
      (m) =>
        (!q || `${m.title} ${m.description} ${m.city || ''}`.toLowerCase().includes(q)) &&
        (!filters.category || m.category === filters.category) &&
        (!filters.province || m.province === filters.province) &&
        (!filters.urgency || m.urgency === filters.urgency) &&
        (!filters.courtLevel || m.court_level === filters.courtLevel) &&
        (!filters.budget || m.budget === filters.budget) &&
        (!savedOnly || saved.has(m.id)),
    )
    .map((m) => ({ ...matterOut(m, { forLawyer: true }), offerCount: m.offer_count, myOffer: m.my_offer, saved: saved.has(m.id), matchScore: matchScore(p, m) }))
  if (req.query.sort !== 'newest') rows.sort((a, b) => b.matchScore - a.matchScore)
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const stats = db
    .prepare(`SELECT COUNT(*) AS sent, SUM(CASE WHEN viewed_at IS NOT NULL THEN 1 ELSE 0 END) AS viewed,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS won FROM offers WHERE lawyer_id = ? AND created_at >= ?`)
    .get(req.user.id, weekAgo)
  res.json({
    ok: true,
    verificationStatus: p.verification_status,
    available: !!p.available,
    matters: rows,
    snapshot: { offersSent: stats.sent || 0, offersViewed: stats.viewed || 0, mattersWon: stats.won || 0, saved: saved.size },
  })
})

router.post('/lawyer/feed/:id/save', requireRole('lawyer'), (req, res) => {
  const id = int(req.params.id)
  const existing = db.prepare('SELECT 1 FROM saved_matters WHERE lawyer_id = ? AND matter_id = ?').get(req.user.id, id)
  if (existing) db.prepare('DELETE FROM saved_matters WHERE lawyer_id = ? AND matter_id = ?').run(req.user.id, id)
  else if (getMatter.get(id)) db.prepare('INSERT INTO saved_matters (lawyer_id, matter_id) VALUES (?, ?)').run(req.user.id, id)
  res.json({ ok: true, saved: !existing })
})

router.post('/lawyer/availability', requireRole('lawyer'), (req, res) => {
  db.prepare('UPDATE lawyer_profiles SET available = ? WHERE user_id = ?').run(bool(req.body.available) ? 1 : 0, req.user.id)
  res.json({ ok: true })
})

router.post('/matters/:id/offers', requireVerifiedLawyer, (req, res) => {
  const m = getMatter.get(int(req.params.id))
  if (!m || m.status !== 'open' || m.moderation_status !== 'visible') return fail(res, 404, 'This matter is no longer accepting offers.')
  const consultFee = int(req.body.consultFee)
  const breakdown = (Array.isArray(req.body.breakdown) ? req.body.breakdown : [])
    .map((b) => ({ label: text(b?.label, 80), amount: int(b?.amount) }))
    .filter((b) => b.label && b.amount && b.amount > 0)
    .slice(0, 10)
  const inclusions = (Array.isArray(req.body.inclusions) ? req.body.inclusions : []).map((x) => text(x, 100)).filter(Boolean).slice(0, 10)
  const note = text(req.body.note, 600)
  const feeStructure = ['Fixed fee', 'Staged fee', 'Hourly', 'Accept client budget'].includes(req.body.feeStructure) ? req.body.feeStructure : 'Staged fee'
  if (!consultFee || consultFee <= 0 || note.length < 10)
    return fail(res, 400, 'Enter a consultation fee and a short note for the client.')
  const totalFee = consultFee + breakdown.reduce((s, b) => s + b.amount, 0)
  const existing = db.prepare('SELECT * FROM offers WHERE matter_id = ? AND lawyer_id = ?').get(m.id, req.user.id)
  if (existing && existing.status !== 'withdrawn') return fail(res, 409, 'You have already sent an offer for this matter.')
  if (existing) db.prepare('DELETE FROM offers WHERE id = ?').run(existing.id)
  const info = db
    .prepare(`INSERT INTO offers (matter_id, lawyer_id, consult_fee, total_fee, fee_structure, note, breakdown, inclusions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(m.id, req.user.id, consultFee, totalFee, feeStructure, note, JSON.stringify(breakdown), JSON.stringify(inclusions))
  db.prepare('UPDATE matters SET updated_at = ? WHERE id = ?').run(now(), m.id)
  notify(m.client_id, { title: 'New lawyer offer', message: `${req.user.name} responded to “${m.title}”.`, link: `/matters/${m.id}`, matterId: m.id })
  res.status(201).json({ ok: true, offerId: info.lastInsertRowid })
})

router.post('/offers/:id/withdraw', requireRole('lawyer'), (req, res) => {
  const o = db.prepare(`SELECT * FROM offers WHERE id = ? AND lawyer_id = ?`).get(int(req.params.id), req.user.id)
  if (!o || o.status !== 'pending') return fail(res, 404, 'Only pending offers can be withdrawn.')
  db.prepare(`UPDATE offers SET status = 'withdrawn' WHERE id = ?`).run(o.id)
  res.json({ ok: true })
})

router.get('/lawyer/offers', requireRole('lawyer'), (req, res) => {
  const rows = db
    .prepare(`SELECT o.*, m.title AS matter_title, m.reference AS matter_reference, m.category, m.province, m.urgency, m.status AS matter_status
      FROM offers o JOIN matters m ON m.id = o.matter_id WHERE o.lawyer_id = ? ORDER BY o.created_at DESC`)
    .all(req.user.id)
  res.json({
    ok: true,
    offers: rows.map((o) => ({
      ...offerOut(o),
      viewed: !!o.viewed_at,
      matter: { id: o.matter_id, title: o.matter_title, reference: o.matter_reference, category: o.category, province: o.province, urgency: o.urgency, status: o.matter_status },
    })),
  })
})

// ---------- workspace ----------
function checkoutState(m) {
  const consult = db.prepare(`SELECT * FROM payments WHERE matter_id = ? AND kind = 'consultation' ORDER BY id LIMIT 1`).get(m.id)
  const booking = db.prepare(`SELECT * FROM consultations WHERE matter_id = ? AND status != 'cancelled' ORDER BY id DESC LIMIT 1`).get(m.id)
  const mandate = db.prepare(`SELECT * FROM mandates WHERE matter_id = ? ORDER BY id DESC LIMIT 1`).get(m.id)
  const step = !consult || consult.status !== 'paid' ? 'payment' : !booking ? 'schedule' : !mandate ? 'mandate' : 'done'
  return { consult, booking, mandate, step }
}

function mandateText(m, offer, client, lawyer) {
  const money = (c) => `R ${(c / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
  const scope = [...json(offer.inclusions), ...json(offer.breakdown).map((b) => b.label)]
  return [
    `1. The parties\nThis mandate is between ${client.name} (“the Client”) and ${lawyer.firm || lawyer.name} represented by ${lawyer.name}, ${lawyer.practitioner_type} (“the Practitioner”) for legal services relating to: ${m.title} (matter ${m.reference}).`,
    `2. Scope of work\n${scope.length ? scope.map((s) => `• ${s}`).join('\n') : 'Consultation and advice on the matter described by the Client.'}\nAny work outside this scope requires the Client’s prior written approval.`,
    `3. Fees and disbursements\nConsultation fee: ${money(offer.consult_fee)}. Estimated total fee: ${money(offer.total_fee)} including VAT and estimated disbursements (${offer.fee_structure.toLowerCase()}). The Practitioner will give written notice before the estimate is exceeded.`,
    `4. Confidentiality and POPIA\nPersonal information will be processed only for this mandate, in accordance with the Protection of Personal Information Act 4 of 2013 and the Practitioner’s professional duties.`,
    `5. Cancellation and refunds\nThe Client may cancel the consultation within 7 days of payment for a full refund if it has not yet started (Electronic Communications and Transactions Act, section 44). After that: cancelling 24 hours or more before the consultation gives a full refund, between 2 and 24 hours gives a 50% refund, and less than 2 hours or not attending gives no refund. No charge applies for death or hospitalisation. If the Practitioner cancels, the Client receives a full refund. Refunds are paid to the original payment method within 30 days. The full policy is at /legal/refunds.`,
    `6. Termination\nEither party may terminate this mandate in writing. Fees for work properly done up to termination remain payable, and money held in trust that has not been earned will be refunded in line with the Legal Practice Act 28 of 2014 and the rules of the Legal Practice Council.`,
    `7. Complaints\nComplaints about the Practitioner's conduct may be made to the Legal Practice Council. Complaints about the platform may be made to LexBridge at ${'disputes@lexbridge.co.za'}.`,
    `8. Marketplace role\nLexBridge, a division of VINK Group (Pty) Ltd, is a marketplace and is not a party to this mandate. It does not provide legal advice.`,
  ].join('\n\n')
}

router.get('/matters/:id/workspace', requireAuth, (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  if (!m.lawyer_id) return fail(res, 409, 'This matter does not have a lawyer yet.')
  const lawyer = getLawyer.get(m.lawyer_id)
  const client = db.prepare('SELECT id, name, phone, email FROM users WHERE id = ?').get(m.client_id)
  const offer = m.accepted_offer_id ? db.prepare('SELECT * FROM offers WHERE id = ?').get(m.accepted_offer_id) : null
  const state = checkoutState(m)
  const messages = db
    .prepare(`SELECT mm.*, u.name AS sender_name FROM matter_messages mm JOIN users u ON u.id = mm.sender_id WHERE matter_id = ? ORDER BY mm.created_at`)
    .all(m.id)
  db.prepare(`UPDATE matter_messages SET read_at = ? WHERE matter_id = ? AND sender_id != ? AND read_at IS NULL`).run(now(), m.id, req.user.id)
  const documents = db
    .prepare(`SELECT d.*, u.name AS uploader_name FROM matter_documents d JOIN users u ON u.id = d.uploader_id WHERE matter_id = ? ORDER BY d.created_at DESC`)
    .all(m.id)
  const events = db.prepare(`SELECT * FROM matter_events WHERE matter_id = ? ORDER BY event_date`).all(m.id)
  const payments = db.prepare(`SELECT * FROM payments WHERE matter_id = ? ORDER BY created_at`).all(m.id)
  const paid = payments
    .filter((p) => ['paid', 'refunded', 'disputed'].includes(p.status))
    .reduce((s, p) => s + p.amount - (p.refund_amount || 0), 0)
  const upcoming = events.filter((e) => ['hearing', 'consultation', 'deadline'].includes(e.kind) && e.event_date >= now())
  const hearing = events.filter((e) => e.kind === 'hearing' && e.event_date >= now())[0]
  const latestUpdate = [...events].reverse().find((e) => e.kind === 'update')
  const progress = [
    { label: 'Matter accepted', done: true, date: events.find((e) => e.title === 'Matter accepted')?.event_date },
    { label: 'Consultation paid', done: state.consult?.status === 'paid', date: state.consult?.paid_at },
    { label: 'Mandate signed', done: !!state.mandate, date: state.mandate?.signed_at },
    { label: 'Work in progress', done: m.status === 'closed', current: !!state.mandate && m.status !== 'closed', date: latestUpdate?.event_date },
    { label: hearing ? 'Court hearing' : 'Matter concluded', done: m.status === 'closed', date: hearing?.event_date },
  ]
  res.json({
    ok: true,
    role: req.user.id === m.lawyer_id ? 'lawyer' : req.user.id === m.client_id ? 'client' : 'admin',
    matter: matterOut(m),
    lawyer: lawyerCard(lawyer),
    // Client contact details are only revealed to the practitioner once the mandate is signed.
    client: { id: client.id, name: client.name, ...(state.mandate || req.user.role === 'admin' ? { phone: client.phone, email: client.email } : {}) },
    offer: offer ? offerOut(offer) : null,
    checkoutStep: state.step,
    consultation: state.booking ? { id: state.booking.id, startsAt: state.booking.starts_at, format: state.booking.format, status: state.booking.status } : null,
    cancellation: state.booking && state.booking.status === 'booked' && m.status === 'assigned' ? req.user.id === m.lawyer_id || req.user.id === m.client_id ? cancellationQuote(state, req.user.id === m.lawyer_id ? 'lawyer' : 'client') : null : null,
    mandate: state.mandate ? { id: state.mandate.id, version: state.mandate.version, signedAt: state.mandate.signed_at, signedName: state.mandate.signed_name, contentHash: state.mandate.content_hash, content: state.mandate.content } : null,
    messages: messages.map((x) => ({ id: x.id, senderId: x.sender_id, senderName: x.sender_name, body: x.body, readAt: x.read_at, createdAt: x.created_at })),
    documents: documents.map((d) => ({ id: d.id, title: d.title, originalName: d.original_name, mime: d.mime, size: d.size, status: d.status, uploaderId: d.uploader_id, uploaderName: d.uploader_name, createdAt: d.created_at })),
    events: events.map((e) => ({ id: e.id, kind: e.kind, title: e.title, details: e.details, eventDate: e.event_date })),
    payments: payments.map(paymentOut),
    fees: { estimate: offer?.total_fee ?? 0, paid },
    nextEvent: upcoming[0] ? { kind: upcoming[0].kind, title: upcoming[0].title, details: upcoming[0].details, eventDate: upcoming[0].event_date } : null,
    latestUpdate: latestUpdate ? { title: latestUpdate.title, details: latestUpdate.details, eventDate: latestUpdate.event_date } : null,
    progress,
  })
})

router.post('/matters/:id/messages', requireAuth, (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  if (![m.client_id, m.lawyer_id].includes(req.user.id)) return fail(res, 403, 'Only the client and their lawyer can message here.')
  const body = text(req.body.body, 4000)
  if (!body) return fail(res, 400, 'Write a message first.')
  const info = db.prepare('INSERT INTO matter_messages (matter_id, sender_id, body) VALUES (?, ?, ?)').run(m.id, req.user.id, body)
  const to = req.user.id === m.client_id ? m.lawyer_id : m.client_id
  notify(to, { title: `New message from ${req.user.name}`, message: body.slice(0, 140), link: `/matters/${m.id}/workspace?tab=Messages`, matterId: m.id })
  res.status(201).json({ ok: true, id: info.lastInsertRowid })
})

router.post(
  '/matters/:id/documents',
  requireAuth,
  upload.single('file'),
  wrap(async (req, res) => {
    const m = loadMatterFor(req, res)
    if (!m) return req.file && removeUpload(req.file.filename)
    if (!req.file) return fail(res, 400, 'Choose a file to upload.')
    if (![m.client_id, m.lawyer_id].includes(req.user.id)) {
      removeUpload(req.file.filename)
      return fail(res, 403, 'Only the client and their lawyer can upload here.')
    }
    const title = text(req.body.title, 160) || req.file.originalname
    const status = req.body.status === 'review' ? 'review' : 'ready'
    db.prepare(`INSERT INTO matter_documents (matter_id, uploader_id, title, original_name, stored_name, mime, size, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(m.id, req.user.id, title, req.file.originalname.slice(0, 200), req.file.filename, req.file.mimetype, req.file.size, status)
    const to = req.user.id === m.client_id ? m.lawyer_id : m.client_id
    notify(to, { title: 'New document shared', message: `${req.user.name} shared “${title}”.`, link: `/matters/${m.id}/workspace?tab=Documents`, matterId: m.id })
    res.status(201).json({ ok: true })
  }),
)

router.get('/documents/:id/download', requireAuth, (req, res) => {
  const d = db.prepare('SELECT * FROM matter_documents WHERE id = ?').get(int(req.params.id))
  const m = d && getMatter.get(d.matter_id)
  if (!d || !isParty(req.user, m)) return fail(res, 404, 'Document not found.')
  sendStoredFile(res, d)
})

router.post('/matters/:id/events', requireAuth, (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  if (req.user.id !== m.lawyer_id) return fail(res, 403, 'Only the assigned lawyer can add case updates and dates.')
  const kind = ['hearing', 'deadline', 'update'].includes(req.body.kind) ? req.body.kind : null
  const title = text(req.body.title, 140)
  const details = text(req.body.details, 2000) || null
  const date = kind === 'update' ? now() : isoDate(req.body.eventDate)
  if (!kind || !title || !date) return fail(res, 400, 'Add a title and, for dates, a valid date and time.')
  logEvent.run(m.id, req.user.id, kind, title, details, date)
  if (kind === 'hearing') {
    db.prepare(`UPDATE matters SET next_court_date = ?, court_name = COALESCE(?, court_name), updated_at = ? WHERE id = ?`).run(
      date,
      text(req.body.courtName, 140) || null,
      now(),
      m.id,
    )
  }
  notify(m.client_id, { title: kind === 'update' ? 'Lawyer update' : `New ${kind} date`, message: title, link: `/matters/${m.id}/workspace`, matterId: m.id })
  res.status(201).json({ ok: true })
})

router.post('/matters/:id/invoices', requireAuth, (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  if (req.user.id !== m.lawyer_id) return fail(res, 403, 'Only the assigned lawyer can raise an invoice.')
  const description = text(req.body.description, 160)
  const amount = int(req.body.amount)
  if (!description || !amount || amount < 100) return fail(res, 400, 'Add a description and an amount (including VAT).')
  db.prepare(`INSERT INTO payments (matter_id, offer_id, client_id, lawyer_id, kind, description, amount, vat)
    VALUES (?, ?, ?, ?, 'invoice', ?, ?, ?)`).run(m.id, m.accepted_offer_id, m.client_id, m.lawyer_id, description, amount, vatPortion(amount))
  notify(m.client_id, { title: 'New invoice', message: `${description} · R ${(amount / 100).toFixed(2)}`, link: '/payments', matterId: m.id })
  res.status(201).json({ ok: true })
})

// ---------- cancelling and rescheduling consultations (Refund & Cancellation Policy) ----------
const HOUR = 3600_000
// Returns what the policy allows right now. Mirrors /legal/refunds exactly.
function cancellationQuote(state, by, reason = 'personal') {
  const booking = state.booking
  const pay = state.consult
  if (!booking || booking.status !== 'booked') return null
  const start = new Date(booking.starts_at).getTime()
  const nowMs = Date.now()
  if (nowMs >= start) return { allowed: false, message: 'The consultation has already started. Use “Dispute” on your Payments page if something went wrong.' }
  const paidAmount = pay && pay.status === 'paid' ? pay.amount : 0
  const hoursBefore = (start - nowMs) / HOUR
  const inCoolingOff = pay?.paid_at ? nowMs - new Date(pay.paid_at).getTime() < 7 * 24 * HOUR : false
  let percent
  let rule
  if (by === 'lawyer') {
    percent = 100
    rule = 'The practitioner cancelled, so the client receives a full refund.'
  } else if (reason === 'death-hospitalisation') {
    percent = 100
    rule = 'No cancellation charge applies for death or hospitalisation (Consumer Protection Act, section 17).'
  } else if (inCoolingOff) {
    percent = 100
    rule = 'You are within the 7-day cooling-off period and the consultation has not started (ECTA, section 44).'
  } else if (hoursBefore >= 24) {
    percent = 100
    rule = 'You are cancelling 24 hours or more before the consultation.'
  } else if (hoursBefore >= 2) {
    percent = 50
    rule = 'You are cancelling between 2 and 24 hours before the consultation.'
  } else {
    percent = 0
    rule = 'You are cancelling less than 2 hours before the consultation.'
  }
  return {
    allowed: true,
    percent,
    refundAmount: Math.round((paidAmount * percent) / 100),
    paidAmount,
    rule,
    hoursBefore: Math.round(hoursBefore * 10) / 10,
    inCoolingOff,
    canReschedule: by === 'lawyer' || hoursBefore >= 24,
  }
}

router.get('/matters/:id/consultation/cancel-quote', requireAuth, (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  const by = req.user.id === m.lawyer_id ? 'lawyer' : req.user.id === m.client_id ? 'client' : null
  if (!by) return fail(res, 403, 'Only the client or practitioner can cancel this consultation.')
  const q = cancellationQuote(checkoutState(m), by, req.query.reason === 'death-hospitalisation' ? 'death-hospitalisation' : 'personal')
  if (!q) return fail(res, 404, 'There is no booked consultation to cancel.')
  res.json({ ok: true, quote: q })
})

router.post('/matters/:id/consultation/cancel', requireAuth, (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  const by = req.user.id === m.lawyer_id ? 'lawyer' : req.user.id === m.client_id ? 'client' : null
  if (!by) return fail(res, 403, 'Only the client or practitioner can cancel this consultation.')
  if (m.status !== 'assigned') return fail(res, 409, 'This matter is not active.')
  const reason = req.body.reason === 'death-hospitalisation' ? 'death-hospitalisation' : 'personal'
  const note = text(req.body.note, 500)
  if (by === 'lawyer' && note.length < 5) return fail(res, 400, 'Tell the client briefly why you are cancelling.')
  const state = checkoutState(m)
  const q = cancellationQuote(state, by, reason)
  if (!q) return fail(res, 404, 'There is no booked consultation to cancel.')
  if (!q.allowed) return fail(res, 409, q.message)
  const t = now()
  const refundStatus = q.refundAmount > 0 ? (paymentMode === 'test' ? 'paid' : 'pending') : null
  tx(() => {
    db.prepare(`UPDATE consultations SET status = 'cancelled', cancelled_by = ?, cancel_reason = ? WHERE id = ?`).run(req.user.id, note || reason, state.booking.id)
    if (q.refundAmount > 0) {
      db.prepare(`UPDATE payments SET status = 'refunded', refund_amount = ?, refund_reason = ?, refund_status = ?, refunded_at = ? WHERE id = ?`).run(
        q.refundAmount,
        q.rule,
        refundStatus,
        refundStatus === 'paid' ? t : null,
        state.consult.id,
      )
    }
    db.prepare(`UPDATE matters SET status = 'closed', updated_at = ? WHERE id = ?`).run(t, m.id)
    const who = by === 'lawyer' ? 'the practitioner' : 'the client'
    logEvent.run(
      m.id,
      req.user.id,
      'milestone',
      'Consultation cancelled',
      `Cancelled by ${who}${note ? `: ${note}` : ''}. Refund: ${q.percent}% (R ${(q.refundAmount / 100).toFixed(2)}). ${q.rule}`,
      t,
    )
  })()
  const other = by === 'lawyer' ? m.client_id : m.lawyer_id
  notify(other, {
    title: 'Consultation cancelled',
    message: `${req.user.name} cancelled the consultation for “${m.title}”.${q.refundAmount ? ` A refund of R ${(q.refundAmount / 100).toFixed(2)} is being processed.` : ''}`,
    link: `/matters/${m.id}/workspace`,
    matterId: m.id,
  })
  if (refundStatus === 'pending')
    for (const admin of db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all())
      notify(admin.id, { title: 'Refund to process', message: `${m.reference}: R ${(q.refundAmount / 100).toFixed(2)}`, link: '/admin?tab=payments' })
  res.json({ ok: true, refundAmount: q.refundAmount, percent: q.percent, refundStatus })
})

router.post('/matters/:id/consultation/reschedule', requireAuth, (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  const by = req.user.id === m.lawyer_id ? 'lawyer' : req.user.id === m.client_id ? 'client' : null
  if (!by) return fail(res, 403, 'Only the client or practitioner can reschedule.')
  const state = checkoutState(m)
  const q = cancellationQuote(state, by)
  if (!q) return fail(res, 404, 'There is no booked consultation to reschedule.')
  if (!q.allowed) return fail(res, 409, q.message)
  if (!q.canReschedule) return fail(res, 409, 'Free rescheduling closes 24 hours before the consultation. You can still cancel, or message your practitioner.')
  db.prepare(`UPDATE consultations SET status = 'cancelled', cancelled_by = ?, cancel_reason = 'rescheduled' WHERE id = ?`).run(req.user.id, state.booking.id)
  logEvent.run(m.id, req.user.id, 'milestone', 'Consultation rescheduled', `${by === 'lawyer' ? 'The practitioner' : 'The client'} asked for a new time.`, now())
  notify(by === 'lawyer' ? m.client_id : m.lawyer_id, {
    title: 'Consultation time released',
    message: by === 'lawyer' ? `${req.user.name} asked you to choose a new consultation time.` : `${req.user.name} is choosing a new consultation time.`,
    link: by === 'lawyer' ? `/matters/${m.id}/checkout` : `/matters/${m.id}/workspace`,
    matterId: m.id,
  })
  res.json({ ok: true })
})

// ---------- checkout: pay → schedule → sign ----------
function slotsFor(lawyerId) {
  const taken = new Set(
    db.prepare(`SELECT starts_at FROM consultations WHERE lawyer_id = ? AND status = 'booked'`).all(lawyerId).map((r) => r.starts_at),
  )
  const days = []
  const cursor = new Date()
  cursor.setUTCHours(0, 0, 0, 0)
  while (days.length < 5) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    const dow = cursor.getUTCDay()
    if (dow === 0 || dow === 6) continue
    // South African Standard Time is UTC+2 all year.
    const times = ['09:00', '10:30', '14:30', '16:00'].map((t) => {
      const [h, mi] = t.split(':').map(Number)
      const d = new Date(cursor)
      d.setUTCHours(h - 2, mi, 0, 0)
      return { label: t, startsAt: d.toISOString(), available: !taken.has(d.toISOString()) }
    })
    days.push({ date: cursor.toISOString().slice(0, 10), times })
  }
  return days
}

router.get('/matters/:id/checkout', requireAuth, (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  if (!m.accepted_offer_id) return fail(res, 409, 'Accept an offer before checkout.')
  const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(m.accepted_offer_id)
  const lawyer = getLawyer.get(m.lawyer_id)
  const client = db.prepare('SELECT * FROM users WHERE id = ?').get(m.client_id)
  const state = checkoutState(m)
  const content = mandateText(m, offer, client, lawyer)
  res.json({
    ok: true,
    paymentMode,
    step: state.step,
    matter: matterOut(m),
    lawyer: lawyerCard(lawyer),
    offer: offerOut(offer),
    payment: state.consult ? paymentOut(state.consult) : null,
    consultation: state.booking ? { startsAt: state.booking.starts_at, format: state.booking.format } : null,
    slots: state.step === 'schedule' ? slotsFor(m.lawyer_id) : [],
    mandate: state.mandate
      ? { version: state.mandate.version, content: state.mandate.content, signedAt: state.mandate.signed_at, signedName: state.mandate.signed_name, contentHash: state.mandate.content_hash }
      : { version: '1.2', content, contentHash: sha256(content) },
    clientName: client.name,
  })
})

function markPaid(paymentId, method, provider, ref) {
  const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId)
  if (!p || p.status === 'paid') return p
  const t = now()
  db.prepare(`UPDATE payments SET status = 'paid', method = ?, provider = ?, provider_ref = ?, paid_at = ? WHERE id = ?`).run(method, provider, ref, t, p.id)
  logEvent.run(p.matter_id, p.client_id, 'milestone', p.kind === 'consultation' ? 'Consultation fee paid' : 'Invoice paid', p.description, t)
  notify(p.lawyer_id, { title: 'Payment received', message: `${p.description} · R ${(p.amount / 100).toFixed(2)}`, link: '/payments', matterId: p.matter_id })
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(p.id)
}

router.post('/payments/:id/pay', requireAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(int(req.params.id))
  if (!p || p.client_id !== req.user.id) return fail(res, 404, 'Payment not found.')
  if (p.status === 'paid') return res.json({ ok: true, payment: paymentOut(p) })
  const method = ['Card', 'Instant EFT', 'Digital wallet'].includes(req.body.method) ? req.body.method : 'Card'
  if (paymentMode === 'payfast') {
    db.prepare(`UPDATE payments SET status = 'processing', method = ?, provider = 'payfast' WHERE id = ?`).run(method, p.id)
    const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
    const returnPath = p.kind === 'consultation' ? `/matters/${p.matter_id}/checkout` : '/payments'
    return res.json({ ok: true, redirect: payfastCheckout({ payment: p, user: req.user, baseUrl, returnPath }) })
  }
  const paid = markPaid(p.id, method, 'test', `TEST-${Date.now()}`)
  res.json({ ok: true, payment: paymentOut(paid), testMode: true })
})

router.post(
  '/payments/payfast/notify',
  wrap(async (req, res) => {
    const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(int(req.body.m_payment_id))
    if (!p) return res.status(200).end()
    const result = await verifyPayfastNotification(req.body, p.amount)
    if (!result.ok) {
      console.warn('[payfast] rejected ITN for payment', p.id, result.reason)
      return res.status(200).end()
    }
    if (result.complete) markPaid(p.id, p.method || 'Card', 'payfast', result.reference)
    else db.prepare(`UPDATE payments SET status = 'failed' WHERE id = ? AND status != 'paid'`).run(p.id)
    res.status(200).end()
  }),
)

router.post('/matters/:id/consultation', requireRole('client'), (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  const state = checkoutState(m)
  if (state.step !== 'schedule') return fail(res, 409, state.step === 'payment' ? 'Pay the consultation fee first.' : 'Your consultation is already booked.')
  const startsAt = isoDate(req.body.startsAt)
  const format = ['video', 'phone', 'in-person'].includes(req.body.format) ? req.body.format : 'video'
  const valid = slotsFor(m.lawyer_id).some((d) => d.times.some((t) => t.startsAt === startsAt && t.available))
  if (!startsAt || !valid) return fail(res, 409, 'That time is no longer available. Please choose another slot.')
  try {
    db.prepare(`INSERT INTO consultations (matter_id, lawyer_id, client_id, starts_at, format) VALUES (?, ?, ?, ?, ?)`).run(m.id, m.lawyer_id, m.client_id, startsAt, format)
  } catch {
    return fail(res, 409, 'That time was just booked by someone else. Please choose another slot.')
  }
  const label = { video: 'Secure video call', phone: 'Phone call', 'in-person': 'In person' }[format]
  logEvent.run(m.id, req.user.id, 'consultation', 'Consultation', label, startsAt)
  notify(m.lawyer_id, { title: 'Consultation booked', message: `${m.title} · ${new Date(startsAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`, link: `/matters/${m.id}/workspace`, matterId: m.id })
  res.json({ ok: true })
})

router.post('/matters/:id/mandate/sign', requireRole('client'), (req, res) => {
  const m = loadMatterFor(req, res)
  if (!m) return
  const state = checkoutState(m)
  if (state.step !== 'mandate') return fail(res, 409, state.step === 'done' ? 'The mandate is already signed.' : 'Complete payment and scheduling first.')
  const name = text(req.body.signedName, 120)
  if (!req.body.agree || name.length < 3) return fail(res, 400, 'Confirm the terms and type your full name to sign.')
  const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(m.accepted_offer_id)
  const content = mandateText(m, offer, req.user, getLawyer.get(m.lawyer_id))
  const t = now()
  db.prepare(`INSERT INTO mandates (matter_id, offer_id, version, content, content_hash, signed_name, signed_at, signer_ip, client_id)
    VALUES (?, ?, '1.2', ?, ?, ?, ?, ?, ?)`).run(m.id, offer.id, content, sha256(`${content}\n${name}\n${t}`), name, t, req.ip, req.user.id)
  logEvent.run(m.id, req.user.id, 'milestone', 'Mandate signed', `Electronically signed by ${name}.`, t)
  notify(m.lawyer_id, { title: 'Mandate signed', message: `${req.user.name} signed the mandate for “${m.title}”. Client contact details are now visible.`, link: `/matters/${m.id}/workspace`, matterId: m.id })
  res.json({ ok: true })
})

router.get('/payments', requireAuth, (req, res) => {
  const field = req.user.role === 'lawyer' ? 'p.lawyer_id' : 'p.client_id'
  const rows = db
    .prepare(`SELECT p.*, m.title AS matter_title, m.reference AS matter_reference FROM payments p JOIN matters m ON m.id = p.matter_id
      WHERE ${field} = ? ORDER BY p.created_at DESC`)
    .all(req.user.id)
  const sum = (s) => rows.filter((p) => p.status === s).reduce((a, p) => a + p.amount, 0)
  const refunded = rows.reduce((a, p) => a + (p.refund_amount || 0), 0)
  res.json({
    ok: true,
    paymentMode,
    payments: rows.map(paymentOut),
    totals: { paid: sum('paid') + sum('refunded') - refunded, pending: sum('pending') + sum('processing'), disputed: sum('disputed'), refunded },
  })
})

router.post('/payments/:id/dispute', requireRole('client'), (req, res) => {
  const p = db.prepare('SELECT * FROM payments WHERE id = ? AND client_id = ?').get(int(req.params.id), req.user.id)
  if (!p || p.status !== 'paid') return fail(res, 404, 'Only completed payments can be disputed.')
  const note = text(req.body.note, 1000)
  if (note.length < 10) return fail(res, 400, 'Explain the problem so our team can review it.')
  db.prepare(`UPDATE payments SET status = 'disputed', dispute_note = ? WHERE id = ?`).run(note, p.id)
  for (const admin of db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all())
    notify(admin.id, { title: 'Payment dispute', message: `${req.user.name}: ${note.slice(0, 120)}`, link: '/admin?tab=payments' })
  res.json({ ok: true })
})

export { getLawyer, matterOut, paymentOut, offerOut, matchScore }
export default router
