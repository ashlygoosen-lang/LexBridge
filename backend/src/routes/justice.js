import { Router } from 'express'
import { db, now, tx } from '../db.js'
import { publicUser, requireAuth, requireRole } from '../auth.js'
import { fail, fileHash, int, isoDate, notify, randRef, removeUpload, sendStoredFile, text, upload, wrap } from '../util.js'

const router = Router()
router.use('/justice', requireAuth)

const STAGES = ['intake', 'docket', 'prosecutor-review', 'enrolled', 'hearing', 'judgment', 'sentence', 'appeal', 'closed']
const DOCKET_TYPES = ['statement', 'arrest', 'investigation', 'warrant-request', 'summons', 'bail', 'detention', 'prosecutor-handover']
const FILE_TYPES = ['evidence', 'pleading', 'summons', 'affidavit', 'bail-application', 'notice', 'judgment', 'appeal', 'other']
const HEARING_TYPES = ['first-appearance', 'bail', 'motion', 'trial', 'sentencing', 'appeal']
const DECISION_TYPES = ['order', 'judgment', 'sentence', 'warrant', 'appeal-outcome']
// Which team a user joins a case in, by their role.
export const TEAM_FOR_ROLE = {
  client: 'clients',
  lawyer: 'legalTeam',
  'legal-aid': 'legalTeam',
  saps: 'assignedPolice',
  prosecutor: 'courtTeam',
  clerk: 'courtTeam',
  'judicial-officer': 'courtTeam',
}

const getCase = db.prepare('SELECT * FROM justice_cases WHERE id = ?')
const participantsOf = db.prepare(`SELECT cp.team, u.id, u.name, u.role FROM case_participants cp
  JOIN users u ON u.id = cp.user_id WHERE cp.case_id = ?`)
const isParticipant = db.prepare('SELECT 1 FROM case_participants WHERE case_id = ? AND user_id = ?')

export const canSeeCase = (user, c) =>
  !!c && (user.role === 'admin' || c.created_by === user.id || !!isParticipant.get(c.id, user.id))

function loadCase(req, res, idValue) {
  const c = getCase.get(int(idValue))
  if (!canSeeCase(req.user, c)) {
    fail(res, 404, 'This case was not found or is not assigned to you.')
    return null
  }
  return c
}

const permittedUserIds = (caseId) => [...new Set(participantsOf.all(caseId).map((p) => p.id))]

// Every workflow action writes an immutable audit entry and notifies the other participants.
export function activity(caseId, user, action, entityType, entityId, details) {
  db.prepare(`INSERT INTO justice_audit_logs (case_id, owner_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`).run(
    caseId,
    user.id,
    action,
    entityType,
    entityId != null ? String(entityId) : null,
    details || null,
  )
  db.prepare('UPDATE justice_cases SET updated_at = ? WHERE id = ?').run(now(), caseId)
  const c = getCase.get(caseId)
  const recipients = new Set([...permittedUserIds(caseId), c.created_by])
  recipients.delete(user.id)
  for (const owner of recipients)
    notify(owner, { title: action, message: details || `There is a new ${entityType} update on your case.`, caseId, link: '/dashboard' })
}

function addParticipant(caseId, userId, team, addedBy) {
  db.prepare('INSERT OR IGNORE INTO case_participants (case_id, user_id, team, added_by) VALUES (?, ?, ?, ?)').run(caseId, userId, team, addedBy)
}

const caseOut = (c, viewerId) => ({
  id: c.id,
  title: c.title,
  platformReference: c.reference,
  officialCaseNumber: c.official_case_number,
  caseType: c.case_type,
  stage: c.stage,
  summary: c.summary,
  jurisdiction: c.jurisdiction,
  courtName: c.court_name,
  nextDeadline: c.next_deadline,
  detentionDeadline: c.detention_deadline,
  rightsConfirmed: !!c.rights_confirmed,
  sourceReportId: c.source_report_id,
  createdAt: c.created_at,
  updatedAt: c.updated_at,
  participants: participantsOf
    .all(c.id)
    .filter((p) => p.id !== viewerId)
    .map((p) => ({ id: p.id, name: p.name, role: p.role, team: p.team })),
})

function visibleCaseIds(user) {
  if (user.role === 'admin') return db.prepare('SELECT id FROM justice_cases').all().map((r) => r.id)
  return db
    .prepare(`SELECT id FROM justice_cases WHERE created_by = ?
      UNION SELECT case_id FROM case_participants WHERE user_id = ?`)
    .all(user.id, user.id)
    .map((r) => r.id)
}
const inList = (ids) => (ids.length ? ids.join(',') : 'NULL')

router.get('/justice/dashboard', (req, res) => {
  const u = req.user
  const ids = visibleCaseIds(u)
  const list = inList(ids)
  const cases = db.prepare(`SELECT * FROM justice_cases WHERE id IN (${list}) ORDER BY updated_at DESC`).all()
  const hearings = db.prepare(`SELECT * FROM hearings WHERE case_id IN (${list}) ORDER BY starts_at`).all()
  const filings = db
    .prepare(`SELECT f.*, u.name AS owner_name FROM case_files f JOIN users u ON u.id = f.owner_id WHERE case_id IN (${list}) ORDER BY f.created_at DESC`)
    .all()
  const docket = db
    .prepare(`SELECT d.*, u.name AS owner_name FROM docket_entries d JOIN users u ON u.id = d.owner_id WHERE case_id IN (${list}) ORDER BY occurred_at DESC`)
    .all()
  const decisions = db.prepare(`SELECT * FROM court_decisions WHERE case_id IN (${list}) ORDER BY effective_at DESC`).all()
  const audit = db
    .prepare(`SELECT a.*, u.name AS actor FROM justice_audit_logs a JOIN users u ON u.id = a.owner_id WHERE case_id IN (${list}) ORDER BY a.created_at DESC LIMIT 200`)
    .all()
  const messages = db
    .prepare(`SELECT m.*, s.name AS sender_name, r.name AS recipient_name FROM case_messages m
      JOIN users s ON s.id = m.owner_id JOIN users r ON r.id = m.recipient_id
      WHERE (m.owner_id = ? OR m.recipient_id = ?) AND m.case_id IN (${list}) ORDER BY m.created_at DESC LIMIT 100`)
    .all(u.id, u.id)
  const notifications = db.prepare('SELECT * FROM notifications WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100').all(u.id)
  const legalAid =
    u.role === 'legal-aid'
      ? db
          .prepare(`SELECT l.*, c.reference, c.title AS case_title, u.name AS owner_name FROM legal_aid_requests l
            JOIN justice_cases c ON c.id = l.case_id JOIN users u ON u.id = l.owner_id ORDER BY l.created_at DESC`)
          .all()
      : db
          .prepare(`SELECT l.*, c.reference, c.title AS case_title FROM legal_aid_requests l JOIN justice_cases c ON c.id = l.case_id
            WHERE l.owner_id = ? ORDER BY l.created_at DESC`)
          .all(u.id)
  const time = db
    .prepare(`SELECT t.*, c.reference FROM time_records t JOIN justice_cases c ON c.id = t.case_id WHERE t.owner_id = ? ORDER BY worked_at DESC`)
    .all(u.id)
  // Legal Aid screeners need to see the case behind a request before approving it.
  const screenCases =
    u.role === 'legal-aid'
      ? legalAid.filter((l) => !ids.includes(l.case_id)).map((l) => ({ id: l.case_id, reference: l.reference, title: l.case_title }))
      : []

  res.json({
    ok: true,
    user: publicUser(u),
    cases: cases.map((c) => caseOut(c, u.id)),
    hearings: hearings.map((h) => ({ id: h.id, caseId: h.case_id, hearingType: h.hearing_type, startsAt: h.starts_at, courtroom: h.courtroom, status: h.status, outcome: h.outcome })),
    filings: filings.map((f) => ({
      id: f.id,
      caseId: f.case_id,
      title: f.title,
      fileType: f.file_type,
      filingStatus: f.filing_status,
      originalName: f.original_name,
      size: f.size,
      sha256: f.sha256,
      ownerName: f.owner_name,
      createdAt: f.created_at,
    })),
    docket: docket.map((d) => ({ id: d.id, caseId: d.case_id, title: d.title, entryType: d.entry_type, details: d.details, occurredAt: d.occurred_at, ownerName: d.owner_name })),
    decisions: decisions.map((d) => ({ id: d.id, caseId: d.case_id, title: d.title, decisionType: d.decision_type, summary: d.summary, effectiveAt: d.effective_at, appealable: !!d.appealable })),
    messages: messages.map((m) => ({
      id: m.id,
      caseId: m.case_id,
      subject: m.subject,
      message: m.message,
      senderId: m.owner_id,
      senderName: m.sender_name,
      recipientName: m.recipient_name,
      incoming: m.recipient_id === u.id,
      readAt: m.read_at,
      createdAt: m.created_at,
    })),
    notifications: notifications.map((n) => ({ id: n.id, title: n.title, message: n.message, deliveryStatus: n.read_at ? 'read' : n.delivery_status, createdAt: n.created_at, link: n.link })),
    audit: audit.map((a) => ({ id: a.id, caseId: a.case_id, action: a.action, details: a.details, actor: a.actor, createdAt: a.created_at })),
    legalAid: legalAid.map((l) => ({
      id: l.id,
      caseId: l.case_id,
      caseReference: l.reference,
      caseTitle: l.case_title,
      status: l.status,
      motivation: l.motivation,
      ownerName: l.owner_name,
      assignedPractitionerId: l.assigned_practitioner_id,
      createdAt: l.created_at,
    })),
    timeRecords: time.map((t) => ({ id: t.id, caseId: t.case_id, caseReference: t.reference, description: t.description, minutes: t.minutes, billable: !!t.billable, hourlyRate: t.hourly_rate, workedAt: t.worked_at })),
    screenCases,
  })
})

router.post('/justice/messages/read', (req, res) => {
  db.prepare('UPDATE case_messages SET read_at = ? WHERE recipient_id = ? AND read_at IS NULL').run(now(), req.user.id)
  res.json({ ok: true })
})

// ---------- identity ----------
const luhnValid = (input) => {
  let sum = 0
  let alt = false
  for (let i = input.length - 1; i >= 0; i -= 1) {
    let d = Number(input[i])
    if (alt) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}
export const validSAID = (id) => {
  if (!/^\d{13}$/.test(id) || !luhnValid(id)) return false
  const yy = Number(id.slice(0, 2))
  const mm = Number(id.slice(2, 4))
  const dd = Number(id.slice(4, 6))
  const year = yy > new Date().getFullYear() % 100 ? 1900 + yy : 2000 + yy
  const date = new Date(year, mm - 1, dd)
  return date.getFullYear() === year && date.getMonth() === mm - 1 && date.getDate() === dd
}

router.post('/justice/identity', (req, res) => {
  // The full ID is checked in memory only; just the last four digits are kept for manual review.
  const idNumber = text(req.body.idNumber, 13)
  if (!validSAID(idNumber)) return fail(res, 400, 'Enter a valid 13-digit South African ID number.')
  if (req.user.identity_status === 'verified') return fail(res, 409, 'Your identity is already verified.')
  db.prepare(`UPDATE users SET identity_status = 'pending', id_last4 = ?, updated_at = ? WHERE id = ?`).run(idNumber.slice(-4), now(), req.user.id)
  for (const admin of db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all())
    notify(admin.id, { title: 'Identity review requested', message: `${req.user.name} · ID ending ${idNumber.slice(-4)}`, link: '/admin?tab=identity' })
  res.json({ ok: true })
})

// ---------- cases ----------
router.post('/justice/cases', (req, res) => {
  const title = text(req.body.title, 140)
  const summary = text(req.body.summary, 5000)
  const caseType = ['criminal', 'civil'].includes(req.body.caseType) ? req.body.caseType : null
  if (!title || summary.length < 30 || !caseType) return fail(res, 400, 'Add a title, case type and a clear summary (30+ characters).')
  if (!req.body.rightsConfirmed) return fail(res, 400, 'Confirm that you understand this is a digital intake, not an official case.')
  let sourceReportId = null
  if (req.body.sourceReportId) {
    const r = db.prepare('SELECT * FROM police_reports WHERE id = ? AND owner_id = ?').get(int(req.body.sourceReportId), req.user.id)
    if (!r) return fail(res, 400, 'That police report is not yours.')
    if (db.prepare('SELECT 1 FROM justice_cases WHERE source_report_id = ?').get(r.id)) return fail(res, 409, 'A justice intake already exists for this report.')
    sourceReportId = r.id
  }
  const created = tx(() => {
    const info = db
      .prepare(`INSERT INTO justice_cases (reference, created_by, title, case_type, summary, jurisdiction, source_report_id, rights_confirmed)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
      .run(randRef('JUST'), req.user.id, title, caseType, summary, text(req.body.jurisdiction, 180) || null, sourceReportId)
    const team = TEAM_FOR_ROLE[req.user.role]
    if (team) addParticipant(info.lastInsertRowid, req.user.id, team, req.user.id)
    activity(
      info.lastInsertRowid,
      req.user,
      'Digital case intake created',
      'justice-case',
      info.lastInsertRowid,
      'The intake was saved. It is not an official SAPS or court case until an authorised official registers it.',
    )
    return getCase.get(info.lastInsertRowid)
  })()
  for (const admin of db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all())
    notify(admin.id, { title: 'New justice intake awaiting assignment', message: `${created.reference} · ${title}`, link: '/admin?tab=cases' })
  res.status(201).json({ ok: true, id: created.id, reference: created.reference })
})

router.post('/justice/cases/:id/official-number', requireRole('saps', 'clerk'), (req, res) => {
  const c = loadCase(req, res, req.params.id)
  if (!c) return
  const ref = text(req.body.number, 80).toUpperCase()
  if (ref.length < 4 || !/^[A-Z0-9/(). -]+$/.test(ref)) return fail(res, 400, 'Enter the official reference exactly as issued.')
  const stage = req.user.role === 'saps' ? (c.stage === 'intake' ? 'docket' : c.stage) : 'enrolled'
  const courtName = req.user.role === 'clerk' ? text(req.body.courtName, 140) || c.court_name : c.court_name
  db.prepare('UPDATE justice_cases SET official_case_number = ?, stage = ?, court_name = ?, updated_at = ? WHERE id = ?').run(ref, stage, courtName, now(), c.id)
  activity(c.id, req.user, 'Official case reference registered', 'justice-case', c.id, ref)
  res.json({ ok: true, reference: ref })
})

router.post('/justice/cases/:id/deadlines', (req, res) => {
  const c = loadCase(req, res, req.params.id)
  if (!c) return
  const r = req.user.role
  const updates = []
  if (req.body.detentionDeadline !== undefined) {
    if (!['saps', 'prosecutor', 'clerk', 'judicial-officer'].includes(r)) return fail(res, 403, 'You cannot set a detention deadline.')
    updates.push(['detention_deadline', isoDate(req.body.detentionDeadline)])
  }
  if (req.body.nextDeadline !== undefined) {
    if (!['lawyer', 'legal-aid', 'clerk', 'judicial-officer'].includes(r)) return fail(res, 403, 'You cannot set the next deadline.')
    updates.push(['next_deadline', isoDate(req.body.nextDeadline)])
  }
  if (!updates.length) return fail(res, 400, 'Choose a deadline to record.')
  for (const [col, val] of updates) db.prepare(`UPDATE justice_cases SET ${col} = ? WHERE id = ?`).run(val, c.id)
  activity(c.id, req.user, 'Deadline updated', 'justice-case', c.id, updates.map(([k, v]) => `${k.replace('_', ' ')}: ${v ? new Date(v).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) : 'cleared'}`).join(' · '))
  res.json({ ok: true })
})

router.post('/justice/cases/:id/participants', (req, res) => {
  const c = loadCase(req, res, req.params.id)
  if (!c) return
  const email = text(req.body.email, 180).toLowerCase()
  const person = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!person) return fail(res, 404, 'No account was found for that email.')
  const team = TEAM_FOR_ROLE[person.role]
  if (!team) return fail(res, 400, 'Administrators cannot be added as case participants.')
  // Who may add whom, mirroring the court and SAPS authority boundaries.
  const r = req.user.role
  const allowed =
    r === 'admin' ||
    (r === 'clerk' && ['clients', 'legalTeam', 'courtTeam'].includes(team)) ||
    (r === 'saps' && team === 'assignedPolice') ||
    (r === 'legal-aid' && team === 'legalTeam')
  if (!allowed) return fail(res, 403, 'Your role cannot assign this participant.')
  addParticipant(c.id, person.id, team, req.user.id)
  activity(c.id, req.user, 'Participant assigned', 'participant', person.id, `${person.name} (${person.role}) added to the case.`)
  notify(person.id, { title: 'You were assigned to a case', message: `${c.reference} · ${c.title}`, caseId: c.id, link: '/dashboard' })
  res.json({ ok: true })
})

// ---------- docket ----------
router.post('/justice/docket', requireRole('saps', 'prosecutor'), (req, res) => {
  const c = loadCase(req, res, req.body.case)
  if (!c) return
  const title = text(req.body.title, 160)
  const details = text(req.body.details, 6000)
  const entryType = DOCKET_TYPES.includes(req.body.entryType) ? req.body.entryType : null
  if (!title || details.length < 10 || !entryType) return fail(res, 400, 'Complete the docket entry.')
  const info = db
    .prepare('INSERT INTO docket_entries (case_id, owner_id, title, entry_type, details, occurred_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(c.id, req.user.id, title, entryType, details, isoDate(req.body.occurredAt) || now())
  if (entryType === 'prosecutor-handover' && ['intake', 'docket'].includes(c.stage))
    db.prepare(`UPDATE justice_cases SET stage = 'prosecutor-review' WHERE id = ?`).run(c.id)
  activity(c.id, req.user, 'Docket entry recorded', 'docket-entry', info.lastInsertRowid, title)
  res.status(201).json({ ok: true, id: info.lastInsertRowid })
})

// ---------- filings ----------
router.post(
  '/justice/files',
  upload.single('file'),
  wrap(async (req, res) => {
    const c = loadCase(req, res, req.body.case)
    if (!c) return req.file && removeUpload(req.file.filename)
    const title = text(req.body.title, 180)
    const fileType = FILE_TYPES.includes(req.body.fileType) ? req.body.fileType : null
    if (!req.file || !title || !fileType) {
      if (req.file) removeUpload(req.file.filename)
      return fail(res, 400, 'Choose a case, title, filing type and file.')
    }
    const hash = fileHash(req.file.filename)
    const info = db
      .prepare(`INSERT INTO case_files (case_id, owner_id, title, file_type, original_name, stored_name, mime, size, sha256)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(c.id, req.user.id, title, fileType, req.file.originalname.slice(0, 200), req.file.filename, req.file.mimetype, req.file.size, hash)
    activity(c.id, req.user, 'Secure file submitted', 'case-file', info.lastInsertRowid, `${title} · awaiting acceptance`)
    res.status(201).json({ ok: true, id: info.lastInsertRowid })
  }),
)

router.get('/justice/files/:id/download', (req, res) => {
  const f = db.prepare('SELECT * FROM case_files WHERE id = ?').get(int(req.params.id))
  if (!f || !canSeeCase(req.user, getCase.get(f.case_id))) return fail(res, 404, 'File not found.')
  sendStoredFile(res, f)
})

router.post('/justice/files/:id/status', requireRole('clerk'), (req, res) => {
  const f = db.prepare('SELECT * FROM case_files WHERE id = ?').get(int(req.params.id))
  if (!f || !canSeeCase(req.user, getCase.get(f.case_id))) return fail(res, 404, 'File not found.')
  const status = ['accepted', 'rejected', 'sealed'].includes(req.body.status) ? req.body.status : null
  if (!status) return fail(res, 400, 'Choose accepted, rejected or sealed.')
  if (f.filing_status === 'sealed') return fail(res, 409, 'Sealed filings cannot be changed.')
  db.prepare('UPDATE case_files SET filing_status = ? WHERE id = ?').run(status, f.id)
  activity(f.case_id, req.user, `Filing ${status}`, 'case-file', f.id, f.title)
  res.json({ ok: true })
})

// ---------- hearings ----------
router.post('/justice/hearings', requireRole('clerk'), (req, res) => {
  const c = loadCase(req, res, req.body.case)
  if (!c) return
  const hearingType = HEARING_TYPES.includes(req.body.hearingType) ? req.body.hearingType : null
  const startsAt = isoDate(req.body.startsAt)
  const courtroom = text(req.body.courtroom, 120)
  if (!hearingType || !startsAt || !courtroom) return fail(res, 400, 'Complete the hearing type, date and courtroom.')
  const info = db
    .prepare('INSERT INTO hearings (case_id, owner_id, hearing_type, starts_at, courtroom) VALUES (?, ?, ?, ?, ?)')
    .run(c.id, req.user.id, hearingType, startsAt, courtroom)
  const stage = ['intake', 'docket', 'prosecutor-review'].includes(c.stage) ? 'enrolled' : c.stage
  db.prepare('UPDATE justice_cases SET stage = ?, next_deadline = ? WHERE id = ?').run(stage, startsAt, c.id)
  activity(c.id, req.user, 'Hearing scheduled', 'hearing', info.lastInsertRowid, `${courtroom} · ${new Date(startsAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`)
  res.status(201).json({ ok: true, id: info.lastInsertRowid })
})

router.patch('/justice/hearings/:id', requireRole('clerk', 'judicial-officer'), (req, res) => {
  const h = db.prepare('SELECT * FROM hearings WHERE id = ?').get(int(req.params.id))
  if (!h || !canSeeCase(req.user, getCase.get(h.case_id))) return fail(res, 404, 'Hearing not found.')
  const status = ['scheduled', 'in-progress', 'postponed', 'completed', 'cancelled'].includes(req.body.status) ? req.body.status : h.status
  const outcome = text(req.body.outcome, 3000) || h.outcome
  db.prepare('UPDATE hearings SET status = ?, outcome = ? WHERE id = ?').run(status, outcome, h.id)
  if (status === 'in-progress') db.prepare(`UPDATE justice_cases SET stage = 'hearing' WHERE id = ?`).run(h.case_id)
  activity(h.case_id, req.user, `Hearing ${status.replace('-', ' ')}`, 'hearing', h.id, outcome || h.hearing_type)
  res.json({ ok: true })
})

// ---------- decisions ----------
router.post('/justice/decisions', requireRole('judicial-officer'), (req, res) => {
  const c = loadCase(req, res, req.body.case)
  if (!c) return
  const title = text(req.body.title, 180)
  const summary = text(req.body.summary, 8000)
  const decisionType = DECISION_TYPES.includes(req.body.decisionType) ? req.body.decisionType : null
  if (!title || summary.length < 10 || !decisionType) return fail(res, 400, 'Complete the decision record.')
  const info = db
    .prepare('INSERT INTO court_decisions (case_id, owner_id, title, decision_type, summary, effective_at, appealable) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(c.id, req.user.id, title, decisionType, summary, now(), req.body.appealable ? 1 : 0)
  const stage = decisionType === 'sentence' ? 'sentence' : decisionType === 'appeal-outcome' ? 'appeal' : decisionType === 'warrant' ? c.stage : 'judgment'
  db.prepare('UPDATE justice_cases SET stage = ? WHERE id = ?').run(stage, c.id)
  activity(c.id, req.user, 'Court decision recorded', 'court-decision', info.lastInsertRowid, title)
  res.status(201).json({ ok: true, id: info.lastInsertRowid })
})

router.post('/justice/cases/:id/prosecution', requireRole('prosecutor'), (req, res) => {
  const c = loadCase(req, res, req.params.id)
  if (!c) return
  const decision = req.body.decision === 'prosecute' ? 'prosecute' : req.body.decision === 'decline' ? 'decline' : null
  if (!decision) return fail(res, 400, 'Choose to prosecute or decline.')
  if (c.stage === 'closed') return fail(res, 409, 'This case is closed.')
  db.prepare('UPDATE justice_cases SET stage = ? WHERE id = ?').run(decision === 'prosecute' ? 'enrolled' : 'closed', c.id)
  activity(
    c.id,
    req.user,
    decision === 'prosecute' ? 'Prosecution authorised' : 'Prosecution declined',
    'prosecutor-decision',
    null,
    text(req.body.reason, 1000) || 'Decision recorded by the assigned prosecutor.',
  )
  res.json({ ok: true })
})

// ---------- messages ----------
router.post('/justice/messages', (req, res) => {
  const c = loadCase(req, res, req.body.case)
  if (!c) return
  const recipient = int(req.body.recipient)
  const subject = text(req.body.subject, 160)
  const message = text(req.body.message, 4000)
  if (!recipient || !subject || message.length < 2) return fail(res, 400, 'Complete the message.')
  if (!permittedUserIds(c.id).includes(recipient) && recipient !== c.created_by)
    return fail(res, 400, 'The recipient must be an assigned participant in this case.')
  if (recipient === req.user.id) return fail(res, 400, 'Choose another participant.')
  const info = db.prepare('INSERT INTO case_messages (case_id, owner_id, recipient_id, subject, message) VALUES (?, ?, ?, ?, ?)').run(c.id, req.user.id, recipient, subject, message)
  db.prepare(`INSERT INTO justice_audit_logs (case_id, owner_id, action, entity_type, entity_id, details) VALUES (?, ?, 'Secure message sent', 'case-message', ?, ?)`).run(
    c.id,
    req.user.id,
    String(info.lastInsertRowid),
    subject,
  )
  notify(recipient, { title: `Secure message: ${subject}`, message: message.slice(0, 160), caseId: c.id, link: '/dashboard' })
  res.status(201).json({ ok: true, id: info.lastInsertRowid })
})

// ---------- Legal Aid ----------
router.post('/justice/legal-aid', (req, res) => {
  const c = loadCase(req, res, req.body.case)
  if (!c) return
  const motivation = text(req.body.motivation, 3000)
  if (motivation.length < 20) return fail(res, 400, 'Explain why legal assistance is needed.')
  if (db.prepare(`SELECT 1 FROM legal_aid_requests WHERE case_id = ? AND owner_id = ? AND status IN ('requested','screening')`).get(c.id, req.user.id))
    return fail(res, 409, 'A Legal Aid request for this case is already being screened.')
  const info = db.prepare('INSERT INTO legal_aid_requests (case_id, owner_id, motivation) VALUES (?, ?, ?)').run(c.id, req.user.id, motivation)
  activity(c.id, req.user, 'Legal Aid screening requested', 'legal-aid-request', info.lastInsertRowid, 'The request is queued for eligibility screening; approval is not guaranteed.')
  for (const la of db.prepare(`SELECT id FROM users WHERE role = 'legal-aid' AND account_status = 'active'`).all())
    notify(la.id, { title: 'New Legal Aid screening request', message: `${c.reference} · ${c.title}`, caseId: c.id, link: '/dashboard' })
  res.status(201).json({ ok: true, id: info.lastInsertRowid })
})

router.post('/justice/legal-aid/:id', requireRole('legal-aid'), (req, res) => {
  const l = db.prepare('SELECT * FROM legal_aid_requests WHERE id = ?').get(int(req.params.id))
  if (!l) return fail(res, 404, 'Request not found.')
  const status = ['screening', 'approved', 'declined', 'assigned'].includes(req.body.status) ? req.body.status : null
  if (!status) return fail(res, 400, 'Choose a screening outcome.')
  tx(() => {
    db.prepare('UPDATE legal_aid_requests SET status = ?, assigned_practitioner_id = ?, updated_at = ? WHERE id = ?').run(
      status,
      status === 'assigned' ? req.user.id : l.assigned_practitioner_id,
      now(),
      l.id,
    )
    if (status === 'assigned') addParticipant(l.case_id, req.user.id, 'legalTeam', req.user.id)
    activity(l.case_id, req.user, `Legal Aid request ${status}`, 'legal-aid-request', l.id, text(req.body.note, 500) || null)
  })()
  notify(l.owner_id, { title: `Legal Aid request ${status}`, message: text(req.body.note, 300) || 'Your screening status changed.', caseId: l.case_id, link: '/dashboard' })
  res.json({ ok: true })
})

// ---------- time records ----------
router.post('/justice/time', requireRole('lawyer', 'legal-aid'), (req, res) => {
  const c = loadCase(req, res, req.body.case)
  if (!c) return
  const description = text(req.body.description, 240)
  const minutes = int(req.body.minutes)
  const rate = req.body.hourlyRate === '' || req.body.hourlyRate == null ? null : Number(req.body.hourlyRate)
  if (!description || !minutes || minutes < 1 || minutes > 24 * 60) return fail(res, 400, 'Enter a description and valid minutes.')
  if (rate !== null && (!Number.isFinite(rate) || rate < 0)) return fail(res, 400, 'Enter a valid hourly rate.')
  const info = db
    .prepare('INSERT INTO time_records (case_id, owner_id, description, worked_at, minutes, billable, hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(c.id, req.user.id, description, isoDate(req.body.workedAt) || now(), minutes, req.body.billable ? 1 : 0, rate)
  db.prepare(`INSERT INTO justice_audit_logs (case_id, owner_id, action, entity_type, entity_id, details) VALUES (?, ?, 'Practitioner time recorded', 'time-record', ?, ?)`).run(
    c.id,
    req.user.id,
    String(info.lastInsertRowid),
    `${minutes} minutes · ${description}`,
  )
  res.status(201).json({ ok: true, id: info.lastInsertRowid })
})

router.delete('/justice/time/:id', requireRole('lawyer', 'legal-aid'), (req, res) => {
  const r = db.prepare('SELECT * FROM time_records WHERE id = ? AND owner_id = ?').get(int(req.params.id), req.user.id)
  if (!r) return fail(res, 404, 'Time record not found.')
  db.prepare('DELETE FROM time_records WHERE id = ?').run(r.id)
  res.json({ ok: true })
})

export { STAGES }
export default router
