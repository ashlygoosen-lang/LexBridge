import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db, json, now, tx } from '../db.js'
import { publicUser, requireRole } from '../auth.js'
import { fail, int, isoDate, notify, text, wrap } from '../util.js'
import { lawyerCard, paymentOut } from './marketplace.js'

const router = Router()
router.use('/admin', requireRole('admin'))

const ROLES = ['client', 'lawyer', 'legal-aid', 'saps', 'prosecutor', 'clerk', 'judicial-officer', 'admin']
const CHECK_KEYS = ['identity', 'lpc', 'practising', 'fidelity', 'firm']

router.get('/admin/overview', (_req, res) => {
  const count = (sql, ...a) => db.prepare(sql).get(...a).n
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const soon = new Date(Date.now() + 60 * 864e5).toISOString()
  const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
  const approvedWeek = count(`SELECT COUNT(*) n FROM lawyer_profiles WHERE verification_status = 'approved' AND reviewed_at >= ?`, weekAgo)
  const reviewedWeek = count(`SELECT COUNT(*) n FROM lawyer_profiles WHERE verification_status IN ('approved','rejected') AND reviewed_at >= ?`, weekAgo)
  const moreInfo = db.prepare(`SELECT submitted_at FROM lawyer_profiles WHERE verification_status = 'more-info'`).all()
  res.json({
    ok: true,
    metrics: {
      pending: count(`SELECT COUNT(*) n FROM lawyer_profiles WHERE verification_status = 'pending'`),
      submittedToday: count(`SELECT COUNT(*) n FROM lawyer_profiles WHERE verification_status = 'pending' AND submitted_at >= ?`, today),
      moreInfo: moreInfo.length,
      moreInfoAgeDays: moreInfo.length
        ? +(moreInfo.reduce((s, r) => s + (Date.now() - new Date(r.submitted_at || Date.now())) / 864e5, 0) / moreInfo.length).toFixed(1)
        : 0,
      approvedWeek,
      passRate: reviewedWeek ? Math.round((approvedWeek / reviewedWeek) * 100) : 100,
      expiringSoon: count(`SELECT COUNT(*) n FROM lawyer_profiles WHERE verification_status = 'approved' AND practising_cert_expiry <= ?`, soon),
      identityPending: count(`SELECT COUNT(*) n FROM users WHERE identity_status = 'pending'`),
      disputes: count(`SELECT COUNT(*) n FROM payments WHERE status = 'disputed'`),
      refundsPending: count(`SELECT COUNT(*) n FROM payments WHERE refund_status = 'pending'`),
      unassignedCases: count(`SELECT COUNT(*) n FROM justice_cases c WHERE NOT EXISTS (SELECT 1 FROM case_participants p WHERE p.case_id = c.id AND p.team != 'clients')`),
      users: count('SELECT COUNT(*) n FROM users'),
      openMatters: count(`SELECT COUNT(*) n FROM matters WHERE status = 'open'`),
      hiddenPosts: count(`SELECT COUNT(*) n FROM matters WHERE moderation_status = 'hidden'`),
    },
    platform: platformStats(),
  })
})

// Platform-wide numbers for the admin overview: totals, 8-week trend and latest activity.
function platformStats() {
  const one = (sql, ...a) => db.prepare(sql).get(...a)
  const weeks = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay() - 7 * 7) // Sunday, 8 weeks back
  for (let i = 0; i < 8; i++) {
    const from = new Date(start.getTime() + i * 7 * 864e5)
    const to = new Date(from.getTime() + 7 * 864e5)
    const [f, t] = [from.toISOString(), to.toISOString()]
    weeks.push({
      week: f.slice(0, 10),
      matters: one(`SELECT COUNT(*) n FROM matters WHERE created_at >= ? AND created_at < ?`, f, t).n,
      signups: one(`SELECT COUNT(*) n FROM users WHERE created_at >= ? AND created_at < ?`, f, t).n,
      revenue: one(
        `SELECT COALESCE(SUM(amount - refund_amount), 0) n FROM payments WHERE status IN ('paid','refunded','disputed') AND paid_at >= ? AND paid_at < ?`,
        f,
        t,
      ).n,
      reports: one(`SELECT COUNT(*) n FROM police_reports WHERE created_at >= ? AND created_at < ?`, f, t).n,
    })
  }
  const totals = {
    clients: one(`SELECT COUNT(*) n FROM users WHERE role = 'client'`).n,
    lawyers: one(`SELECT COUNT(*) n FROM users WHERE role = 'lawyer'`).n,
    verifiedLawyers: one(`SELECT COUNT(*) n FROM lawyer_profiles WHERE verification_status = 'approved'`).n,
    officials: one(`SELECT COUNT(*) n FROM users WHERE role IN ('legal-aid','saps','prosecutor','clerk','judicial-officer')`).n,
    matters: one(`SELECT COUNT(*) n FROM matters`).n,
    assigned: one(`SELECT COUNT(*) n FROM matters WHERE status = 'assigned'`).n,
    reports: one(`SELECT COUNT(*) n FROM police_reports`).n,
    cases: one(`SELECT COUNT(*) n FROM justice_cases`).n,
    revenue: one(`SELECT COALESCE(SUM(amount - refund_amount), 0) n FROM payments WHERE status IN ('paid','refunded','disputed')`).n,
    refunded: one(`SELECT COALESCE(SUM(refund_amount), 0) n FROM payments`).n,
    outstanding: one(`SELECT COALESCE(SUM(amount), 0) n FROM payments WHERE status IN ('pending','processing')`).n,
  }
  const offered = one(`SELECT COUNT(DISTINCT matter_id) n FROM offers`).n
  totals.offerRate = totals.matters ? Math.round((offered / totals.matters) * 100) : 0
  const activity = db
    .prepare(
      `SELECT * FROM (
        SELECT 'signup' kind, u.created_at at, u.name || ' joined as ' || CASE u.role
          WHEN 'client' THEN 'a client' WHEN 'lawyer' THEN 'a legal practitioner' WHEN 'legal-aid' THEN 'a Legal Aid officer'
          WHEN 'saps' THEN 'a SAPS official' WHEN 'prosecutor' THEN 'a prosecutor' WHEN 'clerk' THEN 'a court clerk'
          WHEN 'judicial-officer' THEN 'a judicial officer' ELSE 'an administrator' END detail, '/admin?tab=users' link FROM users u
        UNION ALL SELECT 'matter', m.created_at, 'New matter ' || m.reference || ': ' || m.title, '/admin?tab=moderation' FROM matters m
        UNION ALL SELECT 'payment', p.paid_at, 'Payment received: ' || p.description, '/admin?tab=payments' FROM payments p WHERE p.paid_at IS NOT NULL
        UNION ALL SELECT 'refund', p.refunded_at, 'Refund issued: ' || p.description, '/admin?tab=payments' FROM payments p WHERE p.refunded_at IS NOT NULL
        UNION ALL SELECT 'report', r.created_at, 'Police report ' || r.reference || ': ' || r.title, NULL FROM police_reports r
        UNION ALL SELECT 'verification', l.submitted_at, 'Verification submitted by ' || u.name, '/admin' FROM lawyer_profiles l JOIN users u ON u.id = l.user_id WHERE l.submitted_at IS NOT NULL
      ) WHERE at IS NOT NULL ORDER BY at DESC LIMIT 12`,
    )
    .all()
  return { weeks, totals, activity }
}

// CSV export of payments for finance and reconciliation.
router.get('/admin/payments.csv', (_req, res) => {
  const rows = db
    .prepare(`SELECT p.*, m.reference AS matter_reference, c.name AS client_name, c.email AS client_email, l.name AS lawyer_name
      FROM payments p JOIN matters m ON m.id = p.matter_id JOIN users c ON c.id = p.client_id JOIN users l ON l.id = p.lawyer_id
      ORDER BY p.created_at DESC`)
    .all()
  const cell = (v) => {
    const s = v == null ? '' : String(v)
    // Neutralise spreadsheet formula injection and quote every field.
    return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`
  }
  const head = ['Created', 'Paid', 'Matter', 'Description', 'Kind', 'Client', 'Client email', 'Practitioner', 'Amount (R)', 'VAT (R)', 'Refunded (R)', 'Status', 'Refund status', 'Provider', 'Provider ref']
  const lines = rows.map((p) =>
    [
      p.created_at,
      p.paid_at,
      p.matter_reference,
      p.description,
      p.kind,
      p.client_name,
      p.client_email,
      p.lawyer_name,
      (p.amount / 100).toFixed(2),
      (p.vat / 100).toFixed(2),
      ((p.refund_amount || 0) / 100).toFixed(2),
      p.status,
      p.refund_status,
      p.provider,
      p.provider_ref,
    ]
      .map(cell)
      .join(','),
  )
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="lexbridge-payments-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send('\ufeff' + [head.map(cell).join(','), ...lines].join('\r\n'))
})

// ---------- practitioner verification ----------
router.get('/admin/verifications', (req, res) => {
  const status = ['pending', 'more-info', 'approved', 'rejected', 'incomplete'].includes(req.query.status) ? req.query.status : null
  const q = text(req.query.q, 80).toLowerCase()
  const rows = db
    .prepare(`SELECT u.id AS user_id, u.name, u.email, u.phone, u.identity_status, u.id_last4, u.account_status, lp.* FROM users u
      JOIN lawyer_profiles lp ON lp.user_id = u.id
      ${status ? 'WHERE lp.verification_status = ?' : `WHERE lp.verification_status IN ('pending','more-info')`}
      ORDER BY lp.submitted_at DESC`)
    .all(...(status ? [status] : []))
    .filter((r) => !q || `${r.name} ${r.email} ${r.firm || ''} ${r.lpc_number || ''}`.toLowerCase().includes(q))
  res.json({
    ok: true,
    applicants: rows.map((r) => ({
      ...lawyerCard(r),
      email: r.email,
      phone: r.phone,
      identityStatus: r.identity_status,
      idNumberLast4: r.id_last4,
      lpcNumber: r.lpc_number,
      practisingCertExpiry: r.practising_cert_expiry,
      fidelityCert: r.fidelity_cert,
      verificationStatus: r.verification_status,
      reviewNote: r.review_note,
      checks: json(r.checks, {}),
      submittedAt: r.submitted_at,
      reviewedAt: r.reviewed_at,
    })),
  })
})

router.post('/admin/verifications/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM lawyer_profiles WHERE user_id = ?').get(int(req.params.id))
  if (!p) return fail(res, 404, 'Applicant not found.')
  const action = req.body.action
  const note = text(req.body.note, 1000) || null
  const checks = json(p.checks, {})
  if (req.body.checks && typeof req.body.checks === 'object')
    for (const k of CHECK_KEYS) if (['passed', 'review', 'failed'].includes(req.body.checks[k])) checks[k] = req.body.checks[k]
  let status = p.verification_status
  if (action === 'approve') {
    if (CHECK_KEYS.some((k) => checks[k] !== 'passed')) return fail(res, 400, 'Mark every credential check as passed before approving.')
    status = 'approved'
  } else if (action === 'reject') {
    if (!note) return fail(res, 400, 'Add a note explaining why the application is rejected.')
    status = 'rejected'
  } else if (action === 'more-info') {
    if (!note) return fail(res, 400, 'Tell the applicant what information is needed.')
    status = 'more-info'
  } else if (action !== 'save') return fail(res, 400, 'Unknown action.')
  db.prepare('UPDATE lawyer_profiles SET verification_status = ?, review_note = ?, checks = ?, reviewed_at = ? WHERE user_id = ?').run(
    status,
    note ?? p.review_note,
    JSON.stringify(checks),
    action === 'save' ? p.reviewed_at : now(),
    p.user_id,
  )
  if (action !== 'save') {
    const messages = {
      approve: 'Your practitioner profile is verified. You can now respond to matters.',
      reject: `Your application was not approved. ${note}`,
      'more-info': `More information is needed: ${note}`,
    }
    notify(p.user_id, { title: action === 'approve' ? 'Verification approved' : 'Verification update', message: messages[action], link: '/lawyer/profile' })
  }
  res.json({ ok: true, status })
})

// ---------- post moderation ----------
router.get('/admin/matters', (req, res) => {
  const rows = db
    .prepare(`SELECT m.*, u.name AS client_name, (SELECT COUNT(*) FROM offers o WHERE o.matter_id = m.id) AS offer_count
      FROM matters m JOIN users u ON u.id = m.client_id ORDER BY m.created_at DESC LIMIT 300`)
    .all()
  res.json({
    ok: true,
    matters: rows.map((m) => ({
      id: m.id,
      reference: m.reference,
      title: m.title,
      description: m.description,
      category: m.category,
      province: m.province,
      urgency: m.urgency,
      status: m.status,
      moderationStatus: m.moderation_status,
      moderationNote: m.moderation_note,
      clientName: m.client_name,
      offerCount: m.offer_count,
      createdAt: m.created_at,
    })),
  })
})

router.post('/admin/matters/:id/moderate', (req, res) => {
  const m = db.prepare('SELECT * FROM matters WHERE id = ?').get(int(req.params.id))
  if (!m) return fail(res, 404, 'Matter not found.')
  const status = req.body.status === 'hidden' ? 'hidden' : 'visible'
  const note = text(req.body.note, 500) || null
  if (status === 'hidden' && !note) return fail(res, 400, 'Add a reason so the client knows what to change.')
  db.prepare('UPDATE matters SET moderation_status = ?, moderation_note = ?, updated_at = ? WHERE id = ?').run(status, note, now(), m.id)
  notify(m.client_id, {
    title: status === 'hidden' ? 'Your matter was paused by moderation' : 'Your matter is visible again',
    message: note || m.title,
    link: `/matters/${m.id}`,
    matterId: m.id,
  })
  res.json({ ok: true })
})

// ---------- payments & disputes ----------
router.get('/admin/payments', (_req, res) => {
  const rows = db
    .prepare(`SELECT p.*, m.title AS matter_title, m.reference AS matter_reference, c.name AS client_name, l.name AS lawyer_name
      FROM payments p JOIN matters m ON m.id = p.matter_id JOIN users c ON c.id = p.client_id JOIN users l ON l.id = p.lawyer_id
      ORDER BY CASE WHEN p.status = 'disputed' OR p.refund_status = 'pending' THEN 0 ELSE 1 END, p.created_at DESC LIMIT 300`)
    .all()
  res.json({ ok: true, payments: rows.map((p) => ({ ...paymentOut(p), clientName: p.client_name, lawyerName: p.lawyer_name })) })
})

router.post('/admin/payments/:id/refund-paid', (req, res) => {
  const p = db.prepare(`SELECT * FROM payments WHERE id = ? AND refund_status = 'pending'`).get(int(req.params.id))
  if (!p) return fail(res, 404, 'No pending refund for this payment.')
  const ref = text(req.body.reference, 80)
  db.prepare(`UPDATE payments SET refund_status = 'paid', refunded_at = ?, provider_ref = COALESCE(provider_ref, '') || ? WHERE id = ?`).run(
    now(),
    ref ? ` · refund ${ref}` : '',
    p.id,
  )
  notify(p.client_id, { title: 'Refund processed', message: `R ${(p.refund_amount / 100).toFixed(2)} for “${p.description}” has been refunded to your payment method.`, link: '/payments' })
  res.json({ ok: true })
})

router.post('/admin/payments/:id/resolve', (req, res) => {
  const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(int(req.params.id))
  if (!p || p.status !== 'disputed') return fail(res, 404, 'Only disputed payments can be resolved.')
  const status = req.body.outcome === 'refund' ? 'refunded' : 'paid'
  const note = text(req.body.note, 500)
  if (!note) return fail(res, 400, 'Record the resolution reason.')
  db.prepare('UPDATE payments SET status = ?, dispute_note = ?, refund_amount = ?, refund_reason = ?, refund_status = ?, refunded_at = ? WHERE id = ?').run(
    status,
    `${p.dispute_note || ''}\n— Resolution: ${note}`.trim(),
    status === 'refunded' ? p.amount : p.refund_amount || 0,
    status === 'refunded' ? note : p.refund_reason,
    status === 'refunded' ? 'paid' : p.refund_status,
    status === 'refunded' ? now() : p.refunded_at,
    p.id,
  )
  const msg = status === 'refunded' ? `A refund was approved for “${p.description}”. ${note}` : `The dispute on “${p.description}” was closed. ${note}`
  notify(p.client_id, { title: 'Dispute resolved', message: msg, link: '/payments' })
  notify(p.lawyer_id, { title: 'Dispute resolved', message: msg, link: '/payments' })
  res.json({ ok: true })
})

// ---------- users & roles ----------
router.get('/admin/users', (req, res) => {
  const q = text(req.query.q, 80).toLowerCase()
  const role = ROLES.includes(req.query.role) ? req.query.role : null
  const rows = db
    .prepare(`SELECT * FROM users ${role ? 'WHERE role = ?' : ''} ORDER BY created_at DESC LIMIT 500`)
    .all(...(role ? [role] : []))
    .filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q))
  res.json({ ok: true, users: rows.map(publicUser) })
})

router.post(
  '/admin/users',
  wrap(async (req, res) => {
    const name = text(req.body.name, 100)
    const email = text(req.body.email, 180).toLowerCase()
    const role = ROLES.includes(req.body.role) ? req.body.role : null
    const password = String(req.body.password || '')
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !role || password.length < 10)
      return fail(res, 400, 'Enter a name, valid email, role and a temporary password of at least 10 characters.')
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return fail(res, 409, 'That email is already registered.')
    const info = db
      .prepare('INSERT INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, ?)')
      .run(email, await bcrypt.hash(password, 12), name, text(req.body.phone, 30) || null, role)
    if (role === 'lawyer') db.prepare(`INSERT INTO lawyer_profiles (user_id) VALUES (?)`).run(info.lastInsertRowid)
    res.status(201).json({ ok: true, id: info.lastInsertRowid })
  }),
)

router.patch('/admin/users/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(int(req.params.id))
  if (!u) return fail(res, 404, 'User not found.')
  if (u.id === req.user.id && (req.body.role !== undefined || req.body.accountStatus === 'suspended'))
    return fail(res, 400, 'You cannot change your own role or suspend yourself.')
  const role = ROLES.includes(req.body.role) ? req.body.role : u.role
  const status = ['active', 'suspended'].includes(req.body.accountStatus) ? req.body.accountStatus : u.account_status
  tx(() => {
    db.prepare('UPDATE users SET role = ?, account_status = ?, updated_at = ? WHERE id = ?').run(role, status, now(), u.id)
    if (role === 'lawyer') db.prepare('INSERT OR IGNORE INTO lawyer_profiles (user_id) VALUES (?)').run(u.id)
  })()
  res.json({ ok: true })
})

// ---------- identity reviews ----------
router.get('/admin/identity', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM users WHERE identity_status = 'pending' ORDER BY updated_at`).all()
  res.json({ ok: true, users: rows.map(publicUser) })
})

router.post('/admin/identity/:id', (req, res) => {
  const u = db.prepare(`SELECT * FROM users WHERE id = ? AND identity_status = 'pending'`).get(int(req.params.id))
  if (!u) return fail(res, 404, 'No pending identity review for this user.')
  const verified = req.body.decision === 'verify'
  db.prepare('UPDATE users SET identity_status = ?, identity_verified_at = ?, updated_at = ? WHERE id = ?').run(
    verified ? 'verified' : 'rejected',
    verified ? now() : null,
    now(),
    u.id,
  )
  notify(u.id, {
    title: verified ? 'Identity verified' : 'Identity review unsuccessful',
    message: verified ? 'Your South African ID was verified.' : text(req.body.note, 300) || 'Please resubmit your ID details.',
    link: '/dashboard',
  })
  res.json({ ok: true })
})

// ---------- justice case assignment ----------
router.get('/admin/cases', (_req, res) => {
  const rows = db.prepare(`SELECT c.*, u.name AS creator FROM justice_cases c JOIN users u ON u.id = c.created_by ORDER BY c.created_at DESC`).all()
  const parts = db.prepare(`SELECT cp.team, u.id, u.name, u.role, u.email FROM case_participants cp JOIN users u ON u.id = cp.user_id WHERE cp.case_id = ?`)
  res.json({
    ok: true,
    cases: rows.map((c) => ({
      id: c.id,
      reference: c.reference,
      officialCaseNumber: c.official_case_number,
      title: c.title,
      caseType: c.case_type,
      stage: c.stage,
      creator: c.creator,
      createdAt: c.created_at,
      participants: parts.all(c.id),
    })),
    officials: db
      .prepare(`SELECT id, name, email, role FROM users WHERE role IN ('lawyer','legal-aid','saps','prosecutor','clerk','judicial-officer') AND account_status = 'active' ORDER BY role, name`)
      .all(),
  })
})

router.delete('/admin/cases/:id/participants/:userId', (req, res) => {
  const info = db
    .prepare(`DELETE FROM case_participants WHERE case_id = ? AND user_id = ? AND team != 'clients'`)
    .run(int(req.params.id), int(req.params.userId))
  if (!info.changes) return fail(res, 404, 'Participant not found (clients cannot be removed).')
  db.prepare(`INSERT INTO justice_audit_logs (case_id, owner_id, action, entity_type, entity_id, details) VALUES (?, ?, 'Participant removed', 'participant', ?, 'Removed by platform administrator.')`).run(
    int(req.params.id),
    req.user.id,
    String(int(req.params.userId)),
  )
  res.json({ ok: true })
})

// ---------- police station directory ----------
router.put('/admin/police-stations/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM police_stations WHERE id = ?').get(int(req.params.id))
  if (!s) return fail(res, 404, 'Station not found.')
  const phones = (Array.isArray(req.body.phoneNumbers) ? req.body.phoneNumbers : []).map((p) => text(p, 30)).filter(Boolean)
  db.prepare('UPDATE police_stations SET commander = ?, phone_numbers = ?, address = ?, district = ?, updated_from_source = ? WHERE id = ?').run(
    text(req.body.commander, 120) || null,
    JSON.stringify(phones.length ? phones : json(s.phone_numbers)),
    text(req.body.address, 300) || s.address,
    text(req.body.district, 80) || s.district,
    isoDate(req.body.updatedFromSource) || now(),
    s.id,
  )
  res.json({ ok: true })
})

router.post('/admin/police-stations/import', (req, res) => {
  const rows = Array.isArray(req.body.stations) ? req.body.stations : null
  const source = text(req.body.sourceLabel, 160)
  if (!rows || !rows.length || !source) return fail(res, 400, 'Provide a source label and a JSON array of stations.')
  const upsert = db.prepare(`INSERT INTO police_stations (name, province, district, commander, phone_numbers, address, source_label, updated_from_source)
    VALUES (@name, @province, @district, @commander, @phones, @address, @source, @at)
    ON CONFLICT(name) DO UPDATE SET province = excluded.province, district = excluded.district, commander = excluded.commander,
      phone_numbers = excluded.phone_numbers, address = excluded.address, source_label = excluded.source_label, updated_from_source = excluded.updated_from_source`)
  let count = 0
  tx(() => {
    for (const r of rows) {
      const name = text(r.name, 120).replace(/\s+SAPS$/i, '')
      const address = text(r.address, 300)
      const district = text(r.district, 80)
      if (!name || !address || !district) continue
      upsert.run({
        name,
        province: text(r.province, 40) || 'Western Cape',
        district,
        commander: text(r.commander, 120) || null,
        phones: JSON.stringify((Array.isArray(r.phoneNumbers) ? r.phoneNumbers : []).map((p) => text(typeof p === 'string' ? p : p?.number, 30)).filter(Boolean)),
        address,
        source,
        at: now(),
      })
      count += 1
    }
  })()
  res.json({ ok: true, imported: count })
})

export default router
