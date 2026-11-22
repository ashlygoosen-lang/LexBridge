import { Router } from 'express'
import { db, json, now, tx } from '../db.js'
import { requireAuth } from '../auth.js'
import { fail, fileHash, int, isoDate, randRef, removeUpload, sendStoredFile, sha256, text, upload, wrap } from '../util.js'

const router = Router()

export const INCIDENT_TYPES = [
  'Assault',
  'Theft or robbery',
  'Fraud',
  'Domestic violence',
  'Property damage',
  'Harassment or intimidation',
  'Missing person',
  'Other',
]
const EVIDENCE_CATEGORIES = ['photo', 'video', 'document', 'medical', 'communication', 'other']

const stationOut = (s) =>
  s && {
    id: s.id,
    name: s.name,
    province: s.province,
    district: s.district,
    commander: s.commander,
    phoneNumbers: json(s.phone_numbers).map((number) => ({ number })),
    address: s.address,
    sourceLabel: s.source_label,
    updatedFromSource: s.updated_from_source,
  }

router.get('/police-stations', (_req, res) => {
  const rows = db.prepare('SELECT * FROM police_stations ORDER BY name').all()
  res.set('Cache-Control', 'public, max-age=300')
  res.json({ ok: true, stations: rows.map(stationOut), source: rows[0]?.source_label ?? null })
})

// Reports are visible to their owner and to an assigned lawyer.
const canSeeReport = (user, r) => user.role === 'admin' || r.owner_id === user.id || r.assigned_lawyer_id === user.id
const getReport = db.prepare('SELECT * FROM police_reports WHERE id = ?')

function loadReport(req, res, { ownerOnly = false } = {}) {
  const r = getReport.get(int(req.params.id))
  if (!r || !canSeeReport(req.user, r)) {
    fail(res, 404, 'This report was not found.')
    return null
  }
  if (ownerOnly && r.owner_id !== req.user.id) {
    fail(res, 403, 'Only the report owner can make this change.')
    return null
  }
  return r
}

const addEvent = db.prepare(`INSERT INTO case_timeline_events (report_id, owner_id, title, details, event_date, source)
  VALUES (?, ?, ?, ?, ?, ?)`)

function addRevision(report, user, content, changeSummary) {
  const prev = db
    .prepare('SELECT * FROM statement_revisions WHERE report_id = ? ORDER BY version_number DESC LIMIT 1')
    .get(report.id)
  const info = db
    .prepare(`INSERT INTO statement_revisions
      (report_id, owner_id, version_number, content, content_hash, change_type, change_summary, previous_revision_id, changed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      report.id,
      report.owner_id,
      prev ? prev.version_number + 1 : 1,
      content,
      sha256(content),
      prev ? 'amendment' : 'original',
      changeSummary,
      prev?.id ?? null,
      user.id,
    )
  db.prepare('UPDATE police_reports SET current_statement_id = ?, updated_at = ? WHERE id = ?').run(info.lastInsertRowid, now(), report.id)
}

const reportOut = (r) => ({
  id: r.id,
  title: r.title,
  platformReference: r.reference,
  officialStatus: r.official_status,
  casNumber: r.cas_number,
  incidentType: r.incident_type,
  incidentDate: r.incident_date,
  incidentLocation: r.incident_location,
  summary: r.summary,
  isEmergency: !!r.is_emergency,
  linkedCourt: r.linked_court,
  nextCourtDate: r.next_court_date,
  investigatingOfficer: r.io_name ? { name: r.io_name, rank: r.io_rank, contactNumber: r.io_contact } : null,
  updatedAt: r.updated_at,
  createdAt: r.created_at,
})

router.get('/police-reports', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM police_reports WHERE owner_id = ? OR assigned_lawyer_id = ? ORDER BY updated_at DESC LIMIT 50')
    .all(req.user.id, req.user.id)
  res.json({ ok: true, reports: rows.map(reportOut) })
})

router.post('/police-reports', requireAuth, (req, res) => {
  const b = req.body
  const title = text(b.title, 140)
  const incidentType = INCIDENT_TYPES.includes(b.incidentType) ? b.incidentType : null
  const incidentDate = isoDate(b.incidentDate)
  const incidentLocation = text(b.incidentLocation, 240)
  const summary = text(b.summary, 2500)
  const statement = text(b.statement, 12000)
  const consent = b.sapsHandover === true && b.lawyerMatching === true && b.sensitiveDataProcessing === true
  if (!title || !incidentType || !incidentDate || !incidentLocation || summary.length < 20 || statement.length < 40 || !consent)
    return fail(res, 400, 'Complete every required field and confirm all consent items.')
  if (new Date(incidentDate) > new Date(Date.now() + 3600_000)) return fail(res, 400, 'The incident date cannot be in the future.')
  let stationId = null
  if (b.policeStation) {
    const s = db.prepare('SELECT id FROM police_stations WHERE id = ?').get(int(b.policeStation))
    if (!s) return fail(res, 400, 'Select a valid police station from the directory.')
    stationId = s.id
  }
  const created = tx(() => {
    const info = db
      .prepare(`INSERT INTO police_reports (reference, owner_id, title, incident_type, incident_date, incident_location, summary,
        is_emergency, station_id, consent_saps, consent_lawyer, consent_sensitive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)`)
      .run(randRef('CMR'), req.user.id, title, incidentType, incidentDate, incidentLocation, summary, b.isEmergency ? 1 : 0, stationId)
    const report = getReport.get(info.lastInsertRowid)
    addRevision(report, req.user, statement, 'Original statement recorded by the client.')
    addEvent.run(
      report.id,
      req.user.id,
      'Platform report created',
      'The report and original statement were saved securely. This is not yet an official SAPS case.',
      now(),
      'platform',
    )
    return report
  })()
  res.status(201).json({ ok: true, reportId: created.id, reference: created.reference })
})

router.get('/police-reports/:id', requireAuth, (req, res) => {
  const r = loadReport(req, res)
  if (!r) return
  const revisions = db.prepare('SELECT * FROM statement_revisions WHERE report_id = ? ORDER BY version_number').all(r.id)
  const events = db.prepare('SELECT * FROM case_timeline_events WHERE report_id = ? ORDER BY event_date DESC, id DESC').all(r.id)
  const evidence = db.prepare('SELECT * FROM case_evidence WHERE report_id = ? ORDER BY created_at DESC').all(r.id)
  const station = r.station_id ? db.prepare('SELECT * FROM police_stations WHERE id = ?').get(r.station_id) : null
  const linkedCase = db.prepare('SELECT id, reference FROM justice_cases WHERE source_report_id = ?').get(r.id)
  res.json({
    ok: true,
    isOwner: r.owner_id === req.user.id,
    report: { ...reportOut(r), policeStation: stationOut(station) },
    revisions: revisions.map((v) => ({
      id: v.id,
      versionNumber: v.version_number,
      content: v.content,
      contentHash: v.content_hash,
      changeType: v.change_type,
      changeSummary: v.change_summary,
      createdAt: v.created_at,
      // Re-hash on read so tampering at the storage layer would be visible.
      integrity: sha256(v.content) === v.content_hash,
    })),
    events: events.map((e) => ({ id: e.id, title: e.title, details: e.details, eventDate: e.event_date, source: e.source })),
    evidence: evidence.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      originalName: e.original_name,
      size: e.size,
      sha256: e.sha256,
      capturedAt: e.captured_at,
      createdAt: e.created_at,
    })),
    linkedCase: linkedCase ? { id: linkedCase.id, reference: linkedCase.reference } : null,
  })
})

router.post('/police-reports/:id/amend', requireAuth, (req, res) => {
  const r = loadReport(req, res, { ownerOnly: true })
  if (!r) return
  const content = text(req.body.content, 12000)
  const summary = text(req.body.changeSummary, 500)
  if (content.length < 40 || summary.length < 5)
    return fail(res, 400, 'Describe the change and provide the complete revised statement.')
  const current = db.prepare('SELECT content FROM statement_revisions WHERE id = ?').get(r.current_statement_id)
  if (current && current.content === content) return fail(res, 400, 'The revised statement is identical to the current version.')
  tx(() => {
    addRevision(r, req.user, content, summary)
    addEvent.run(r.id, req.user.id, 'Statement amendment recorded', summary, now(), 'client')
  })()
  res.json({ ok: true })
})

router.post('/police-reports/:id/saps-reference', requireAuth, (req, res) => {
  const r = loadReport(req, res, { ownerOnly: true })
  if (!r) return
  const ref = text(req.body.reference, 80).toUpperCase()
  if (ref.length < 3 || !/^[A-Z0-9/(). -]+$/.test(ref))
    return fail(res, 400, 'Enter the CAS or occurrence-book reference exactly as SAPS supplied it.')
  const io = {
    name: text(req.body.officerName, 100) || null,
    rank: text(req.body.officerRank, 60) || null,
    contact: text(req.body.officerContact, 30) || null,
  }
  tx(() => {
    db.prepare(`UPDATE police_reports SET cas_number = ?, official_status = 'reported-to-saps',
      io_name = COALESCE(?, io_name), io_rank = COALESCE(?, io_rank), io_contact = COALESCE(?, io_contact), updated_at = ? WHERE id = ?`).run(
      ref,
      io.name,
      io.rank,
      io.contact,
      now(),
      r.id,
    )
    addEvent.run(
      r.id,
      req.user.id,
      'SAPS reference recorded',
      `The client recorded SAPS reference ${ref}. This reference has not been independently verified by Call My Lawyer.`,
      now(),
      'saps',
    )
  })()
  res.json({ ok: true, reference: ref })
})

router.post('/police-reports/:id/status', requireAuth, (req, res) => {
  const r = loadReport(req, res, { ownerOnly: true })
  if (!r) return
  // Owners may only move a reported matter forward to "under investigation" or close it themselves.
  const allowed = { 'under-investigation': ['reported-to-saps'], closed: ['platform-draft', 'reported-to-saps', 'under-investigation', 'court-enrolled'] }
  const next = req.body.status
  if (!allowed[next] || !allowed[next].includes(r.official_status)) return fail(res, 400, 'That status change is not available.')
  tx(() => {
    db.prepare('UPDATE police_reports SET official_status = ?, updated_at = ? WHERE id = ?').run(next, now(), r.id)
    addEvent.run(r.id, req.user.id, next === 'closed' ? 'Report closed' : 'Investigation confirmed', text(req.body.note, 500) || null, now(), 'client')
  })()
  res.json({ ok: true })
})

router.post('/police-reports/:id/court', requireAuth, (req, res) => {
  const r = loadReport(req, res, { ownerOnly: true })
  if (!r) return
  const court = text(req.body.court, 180)
  const date = isoDate(req.body.courtDate)
  if (court.length < 3 || !date) return fail(res, 400, 'Enter the court name and a valid court date.')
  tx(() => {
    db.prepare(`UPDATE police_reports SET linked_court = ?, next_court_date = ?, official_status = 'court-enrolled', updated_at = ? WHERE id = ?`).run(
      court,
      date,
      now(),
      r.id,
    )
    addEvent.run(
      r.id,
      req.user.id,
      'Court date recorded',
      `${court} · ${new Date(date).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`,
      now(),
      'court',
    )
  })()
  res.json({ ok: true })
})

router.post(
  '/police-reports/:id/evidence',
  requireAuth,
  upload.single('file'),
  wrap(async (req, res) => {
    const r = loadReport(req, res, { ownerOnly: true })
    if (!r) return req.file && removeUpload(req.file.filename)
    if (!req.file) return fail(res, 400, 'Choose a file to attach.')
    const title = text(req.body.title, 160)
    const category = EVIDENCE_CATEGORIES.includes(req.body.category) ? req.body.category : null
    if (!title || !category) {
      removeUpload(req.file.filename)
      return fail(res, 400, 'Add a title and category for this evidence.')
    }
    const hash = fileHash(req.file.filename)
    tx(() => {
      db.prepare(`INSERT INTO case_evidence (report_id, owner_id, title, description, category, original_name, stored_name, mime, size, sha256, captured_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        r.id,
        req.user.id,
        title,
        text(req.body.description, 1000) || null,
        category,
        req.file.originalname.slice(0, 200),
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        hash,
        isoDate(req.body.capturedAt),
      )
      addEvent.run(r.id, req.user.id, 'Evidence added', `${title} · SHA-256 ${hash.slice(0, 16)}…`, now(), 'client')
    })()
    res.status(201).json({ ok: true })
  }),
)

router.get('/evidence/:id/download', requireAuth, (req, res) => {
  const e = db.prepare('SELECT * FROM case_evidence WHERE id = ?').get(int(req.params.id))
  const r = e && getReport.get(e.report_id)
  if (!e || !canSeeReport(req.user, r)) return fail(res, 404, 'Evidence not found.')
  sendStoredFile(res, e)
})

export default router
