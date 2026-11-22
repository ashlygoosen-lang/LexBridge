import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { db, now, UPLOAD_DIR } from '../db.js'
import { randRef, sha256, vatPortion } from '../util.js'
import { stations, stationSource } from './police-stations.js'

const DEMO_DOMAIN = 'demo.callmylawyer.co.za'
const day = 864e5
const at = (offsetDays, hourSAST = 9, minute = 0) => {
  const d = new Date(Date.now() + offsetDays * day)
  d.setUTCHours(hourSAST - 2, minute, 0, 0)
  return d.toISOString()
}

function seedStations() {
  if (db.prepare('SELECT COUNT(*) n FROM police_stations').get().n > 0) return
  const insert = db.prepare(`INSERT INTO police_stations (name, province, district, commander, phone_numbers, address, source_label, updated_from_source)
    VALUES (?, 'Western Cape', ?, ?, ?, ?, ?, ?)`)
  db.transaction(() => {
    for (const [cluster, name, commander, phones, address] of stations)
      insert.run(name, `${cluster} cluster`, commander, JSON.stringify(phones), address, stationSource, '2022-02-22T00:00:00.000Z')
  })()
  console.log(`[seed] ${stations.length} Western Cape police stations loaded`)
}

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (email && password) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (!existing) {
      db.prepare(`INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'admin')`).run(
        email,
        await bcrypt.hash(password, 12),
        process.env.ADMIN_NAME || 'Platform Admin',
      )
      console.log(`[seed] admin account created for ${email}`)
    }
  }
}

async function seedDemo() {
  if (process.env.SEED_DEMO === 'false') return
  if (db.prepare('SELECT COUNT(*) n FROM users').get().n > 0 && !db.prepare('SELECT 1 FROM users WHERE email LIKE ?').get(`%@${DEMO_DOMAIN}`)) return
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(`naledi@${DEMO_DOMAIN}`)) return

  const password = process.env.DEMO_PASSWORD || 'Demo@2025!'
  const hash = await bcrypt.hash(password, 10)
  const user = (key, name, role, extra = {}) =>
    db
      .prepare(`INSERT INTO users (email, password_hash, name, phone, role, identity_status, id_last4) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(`${key}@${DEMO_DOMAIN}`, hash, name, extra.phone ?? null, role, extra.identity ?? 'not-started', extra.last4 ?? null).lastInsertRowid

  const lawyer = (key, name, p) => {
    const id = user(key, name, 'lawyer', { identity: 'verified' })
    db.prepare(`INSERT INTO lawyer_profiles (user_id, practitioner_type, firm, city, province, areas, courts, languages, years_experience,
        consult_fee, bio, photo_url, lpc_number, practising_cert_expiry, fidelity_cert, checks, verification_status, submitted_at, reviewed_at,
        rating, review_count, response_minutes, available) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`).run(
      id,
      p.type,
      p.firm,
      p.city,
      p.province,
      JSON.stringify(p.areas),
      JSON.stringify(p.courts),
      JSON.stringify(p.languages),
      p.years,
      p.fee,
      p.bio,
      p.photo,
      p.lpc,
      p.cert ?? '2027-12-31T00:00:00.000Z',
      p.ffc,
      JSON.stringify(p.checks ?? { identity: 'passed', lpc: 'passed', practising: 'passed', fidelity: 'passed', firm: 'passed' }),
      p.status ?? 'approved',
      new Date(Date.now() - (p.submittedAgo ?? 30) * day).toISOString(),
      p.status && p.status !== 'approved' ? null : new Date(Date.now() - 20 * day).toISOString(),
      p.rating ?? 0,
      p.reviews ?? 0,
      p.response ?? 60,
    )
    return id
  }

  const admin = user('admin', 'Amahle Mthembu', 'admin')
  const naledi = user('naledi', 'Naledi Lekota', 'client', { phone: '+27 82 000 0101' })
  const sipho = user('sipho', 'Sipho Ndlovu', 'client', { phone: '+27 82 000 0102' })
  const anele = user('anele', 'Anele Jacobs', 'client')

  const thabo = lawyer('thabo', 'Thabo Mokoena', {
    type: 'Attorney', firm: 'Mokoena Legal Inc.', city: 'Pretoria', province: 'Gauteng',
    areas: ['Criminal law', 'Bail', 'Civil litigation', 'Appeals'], courts: ["Magistrates' Court", 'High Court'],
    languages: ['English', 'Sesotho', 'isiZulu'], years: 12, fee: 85000, rating: 4.8, reviews: 36, response: 60,
    bio: 'Litigation attorney focused on urgent criminal matters and commercial disputes in Gauteng courts.',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=faces&fit=crop&w=600&h=720&q=85',
    lpc: 'LPC-38104', ffc: 'FFC-2025-10492',
  })
  const nomsa = lawyer('nomsa', 'Adv. Nomsa Khumalo', {
    type: 'Advocate', firm: 'Johannesburg Bar', city: 'Johannesburg', province: 'Gauteng',
    areas: ['Criminal law', 'Bail', 'Appeals', 'High Court'], courts: ["Magistrates' Court", 'High Court', 'Supreme Court of Appeal'],
    languages: ['English', 'isiZulu'], years: 15, fee: 100000, rating: 4.9, reviews: 42, response: 20,
    bio: 'Senior advocate with extensive urgent bail and criminal appeal experience. Attorney briefing may be required.',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=faces&fit=crop&w=600&h=720&q=85',
    lpc: 'LPC-22871', ffc: 'N/A — advocate (referral)',
  })
  const leanne = lawyer('leanne', 'Leanne van Wyk', {
    type: 'Attorney', firm: 'Van Wyk Attorneys', city: 'Cape Town', province: 'Western Cape',
    areas: ['Family law', 'Property', 'Divorce', 'Maintenance'], courts: ["Magistrates' Court", 'High Court'],
    languages: ['English', 'Afrikaans'], years: 10, fee: 90000, rating: 5.0, reviews: 28, response: 35,
    bio: 'Family and property attorney helping clients through divorce, maintenance and conveyancing disputes.',
    photo: 'https://images.unsplash.com/photo-1733348137479-2e726d326d9b?crop=faces&fit=crop&w=600&h=720&q=85',
    lpc: 'LPC-41290', ffc: 'FFC-2025-11873',
  })
  const karabo = lawyer('karabo', 'Karabo Dlamini', {
    type: 'Attorney', firm: 'Dlamini & Partners', city: 'Durban', province: 'KwaZulu-Natal',
    areas: ['Criminal law', 'Bail', 'Debt recovery', 'Contracts'], courts: ["Magistrates' Court", 'Regional Court'],
    languages: ['English', 'isiZulu', 'isiXhosa'], years: 8, fee: 75000, rating: 4.7, reviews: 19, response: 45,
    bio: 'Responsive criminal defence and civil recovery attorney. Remote consultations available within the hour.',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=faces&fit=crop&w=600&h=720&q=85',
    lpc: 'LPC-50318', ffc: 'FFC-2025-13377',
  })
  const lerato = lawyer('lerato', 'Lerato Molefe', {
    type: 'Attorney', firm: 'Molefe Attorneys Inc.', city: 'Johannesburg', province: 'Gauteng',
    areas: ['Civil litigation', 'Contracts'], courts: ["Magistrates' Court", 'High Court'], languages: ['English', 'Setswana'],
    years: 6, fee: 70000, bio: 'Commercial litigation attorney.', photo: null, lpc: 'LPC-48291', ffc: 'FFC-2025-14928',
    status: 'pending', submittedAgo: 0.05,
    checks: { identity: 'passed', lpc: 'passed', practising: 'passed', fidelity: 'review', firm: 'passed' },
  })
  const saps = user('saps', 'W/O Johan Botha', 'saps')
  const prosecutor = user('prosecutor', 'Adv. Zanele Mahlangu', 'prosecutor')
  const clerk = user('clerk', 'Riaan Pillay', 'clerk')
  const magistrate = user('magistrate', 'Magistrate F. Daniels', 'judicial-officer')
  const legalAid = user('legalaid', 'Bongani Zulu', 'legal-aid')

  // ---- marketplace matters ----
  const matter = (client, p) =>
    db
      .prepare(`INSERT INTO matters (reference, client_id, category, side, title, description, urgency, budget, court_level, province, city, status, lawyer_id, court_name, next_court_date, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(randRef('CML'), client, p.category, p.side, p.title, p.description, p.urgency, p.budget, p.court, p.province, p.city, p.status ?? 'open', p.lawyer ?? null, p.courtName ?? null, p.nextCourt ?? null, p.created, p.created).lastInsertRowid
  const offer = (m, l, p) =>
    db
      .prepare(`INSERT INTO offers (matter_id, lawyer_id, consult_fee, total_fee, fee_structure, note, breakdown, inclusions, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(m, l, p.consult, p.consult + p.breakdown.reduce((s, b) => s + b.amount, 0), p.structure ?? 'Staged fee', p.note, JSON.stringify(p.breakdown), JSON.stringify(p.inclusions), p.status ?? 'pending', p.created).lastInsertRowid
  const event = db.prepare('INSERT INTO matter_events (matter_id, created_by, kind, title, details, event_date) VALUES (?,?,?,?,?,?)')

  const bail = matter(naledi, {
    category: 'criminal', side: 'I am arrested or accused', title: 'Urgent bail assistance needed',
    description: 'A family member was arrested on Friday and is due for a first appearance. We need someone to bring a bail application and explain the process to the family.',
    urgency: 'Within 48 hours', budget: 'R 2 500 – R 7 500', court: "Magistrates' Court", province: 'Gauteng', city: 'Johannesburg',
    created: new Date(Date.now() - 0.3 * day).toISOString(),
  })
  const bailBreakdown = [
    { label: 'Bail preparation', amount: 250000 },
    { label: 'Court appearance', amount: 320000 },
    { label: 'Estimated disbursements', amount: 35000 },
  ]
  offer(bail, thabo, { consult: 85000, breakdown: bailBreakdown, note: 'I can attend the bail hearing and consult with your family today.', inclusions: ['60-minute consultation', 'Bail application preparation', 'One court appearance', 'Client and family updates'], created: new Date(Date.now() - 0.2 * day).toISOString() })
  offer(bail, nomsa, { consult: 100000, breakdown: [{ label: 'Bail application & appearance', amount: 650000 }], structure: 'Fixed fee', note: 'Extensive urgent bail experience. Attorney briefing may be required.', inclusions: ['Consultation', 'Drafting of bail affidavit', 'Appearance at bail hearing'], created: new Date(Date.now() - 0.15 * day).toISOString() })
  offer(bail, karabo, { consult: 75000, breakdown: [{ label: 'Bail preparation & appearance', amount: 505000 }], note: 'Available for a remote consultation within the next hour.', inclusions: ['Remote consultation', 'Bail application', 'One court appearance'], created: new Date(Date.now() - 0.1 * day).toISOString() })
  event.run(bail, naledi, 'milestone', 'Matter posted', 'Shared anonymously with verified, matching lawyers.', new Date(Date.now() - 0.3 * day).toISOString())

  // An active matter, already paid, booked and signed.
  const contract = matter(naledi, {
    category: 'civil', side: 'I want to start a case', title: 'Contract payment dispute',
    description: 'A supplier has not paid three invoices totalling R180 000 despite delivery. I want to recover the debt and understand my options.',
    urgency: 'Soon', budget: 'R 15 000+', court: 'High Court', province: 'Gauteng', city: 'Pretoria', status: 'assigned', lawyer: thabo,
    courtName: 'Gauteng High Court, Pretoria', created: new Date(Date.now() - 12 * day).toISOString(),
  })
  const cBreak = [{ label: 'Letter of demand', amount: 350000 }, { label: 'Summons and pleadings', amount: 950000 }, { label: 'Estimated disbursements', amount: 120000 }]
  const cOffer = offer(contract, thabo, { consult: 85000, breakdown: cBreak, note: 'I recover commercial debts regularly and can start with a letter of demand this week.', inclusions: ['Consultation', 'Letter of demand', 'Issue of summons', 'Client updates'], status: 'accepted', created: new Date(Date.now() - 11 * day).toISOString() })
  db.prepare('UPDATE matters SET accepted_offer_id = ? WHERE id = ?').run(cOffer, contract)
  db.prepare(`INSERT INTO payments (matter_id, offer_id, client_id, lawyer_id, kind, description, amount, vat, status, method, provider, provider_ref, created_at, paid_at)
    VALUES (?,?,?,?, 'consultation', ?, 85000, ?, 'paid', 'Card', 'test', 'TEST-SEED', ?, ?)`).run(contract, cOffer, naledi, thabo, 'Consultation · Contract payment dispute', vatPortion(85000), new Date(Date.now() - 10 * day).toISOString(), new Date(Date.now() - 10 * day).toISOString())
  db.prepare(`INSERT INTO payments (matter_id, offer_id, client_id, lawyer_id, kind, description, amount, vat) VALUES (?,?,?,?, 'invoice', 'Letter of demand', 350000, ?)`).run(contract, cOffer, naledi, thabo, vatPortion(350000))
  db.prepare(`INSERT INTO consultations (matter_id, lawyer_id, client_id, starts_at, format, status) VALUES (?,?,?,?, 'video', 'completed')`).run(contract, thabo, naledi, at(-9, 14, 30))
  const mandateText = `Mandate between Naledi Lekota and Mokoena Legal Inc. for: Contract payment dispute.`
  db.prepare(`INSERT INTO mandates (matter_id, offer_id, version, content, content_hash, signed_name, signed_at, signer_ip, client_id) VALUES (?,?, '1.2', ?, ?, 'Naledi Lekota', ?, '127.0.0.1', ?)`).run(contract, cOffer, mandateText, sha256(mandateText), new Date(Date.now() - 9 * day).toISOString(), naledi)
  event.run(contract, naledi, 'milestone', 'Matter accepted', 'Client accepted the lawyer’s offer.', new Date(Date.now() - 11 * day).toISOString())
  event.run(contract, naledi, 'milestone', 'Consultation fee paid', 'Consultation · Contract payment dispute', new Date(Date.now() - 10 * day).toISOString())
  event.run(contract, naledi, 'consultation', 'Consultation', 'Secure video call', at(-9, 14, 30))
  event.run(contract, naledi, 'milestone', 'Mandate signed', 'Electronically signed by Naledi Lekota.', new Date(Date.now() - 9 * day).toISOString())
  event.run(contract, thabo, 'update', 'Letter of demand sent', 'The letter of demand was delivered by sheriff. The supplier has 10 business days to respond.', new Date(Date.now() - 2 * day).toISOString())
  event.run(contract, thabo, 'deadline', 'Response deadline', 'Supplier’s deadline to respond to the letter of demand', at(8, 17))
  event.run(contract, thabo, 'hearing', 'Pre-trial conference', 'Gauteng High Court, Pretoria · Courtroom 4B', at(21, 9))
  db.prepare('UPDATE matters SET next_court_date = ? WHERE id = ?').run(at(21, 9), contract)
  const msg = db.prepare('INSERT INTO matter_messages (matter_id, sender_id, body, created_at, read_at) VALUES (?,?,?,?,?)')
  msg.run(contract, thabo, 'Good morning Naledi. The letter of demand has been served. I will let you know as soon as the supplier responds.', new Date(Date.now() - 2 * day).toISOString(), new Date().toISOString())
  msg.run(contract, naledi, 'Thank you. I have uploaded the three unpaid invoices and the delivery notes.', new Date(Date.now() - 1.9 * day).toISOString(), new Date().toISOString())
  const stored = `${crypto.randomUUID()}.bin`
  fs.writeFileSync(path.join(UPLOAD_DIR, stored), 'Invoices INV-1042, INV-1057 and INV-1063 — summary prepared for the demo account.\n')
  db.prepare(`INSERT INTO matter_documents (matter_id, uploader_id, title, original_name, stored_name, mime, size) VALUES (?,?,?,?,?, 'text/plain', 82)`).run(contract, naledi, 'Unpaid invoices summary', 'invoices-summary.txt', stored)

  // Open matters from other clients for the lawyer feed.
  matter(sipho, {
    category: 'civil', side: 'I am being sued', title: 'Response to High Court summons',
    description: 'I received a summons for alleged breach of a lease agreement on commercial premises. I need to file a notice of intention to defend.',
    urgency: 'Soon', budget: 'R 15 000+', court: 'High Court', province: 'Gauteng', city: 'Pretoria', created: new Date(Date.now() - 0.04 * day).toISOString(),
  })
  matter(anele, {
    category: 'civil', side: 'I want to start a case', title: 'Property sale agreement dispute',
    description: 'The buyer cancelled the sale of my house after the suspensive conditions were met and refuses to pay the agreed damages.',
    urgency: 'Flexible', budget: 'R 7 500 – R 15 000', court: 'High Court', province: 'Western Cape', city: 'Cape Town', created: new Date(Date.now() - 0.1 * day).toISOString(),
  })
  matter(anele, {
    category: 'family', side: 'Maintenance', title: 'Maintenance order variation',
    description: 'My child’s school fees have increased and I want to apply to vary the existing maintenance order in the Maintenance Court.',
    urgency: 'Flexible', budget: 'Under R 2 500', court: "Magistrates' Court", province: 'Western Cape', city: 'Bellville', created: new Date(Date.now() - 1.5 * day).toISOString(),
  })

  // ---- police report with statement history ----
  const station = db.prepare(`SELECT id FROM police_stations WHERE name = 'Cape Town Central'`).get()
  const rep = db
    .prepare(`INSERT INTO police_reports (reference, owner_id, title, incident_type, incident_date, incident_location, summary, station_id, official_status, cas_number, consent_saps, consent_lawyer, consent_sensitive, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?, 'reported-to-saps', 'CAS 214/10/2025', 1,1,1, ?, ?)`)
    .run(randRef('CMR'), naledi, 'Phone snatched outside station', 'Theft or robbery', new Date(Date.now() - 6 * day).toISOString(), 'Strand Street, Cape Town CBD', 'My phone was grabbed out of my hand by a man on a bicycle while I waited for a taxi at about 17:40.', station?.id ?? null, new Date(Date.now() - 6 * day).toISOString(), new Date(Date.now() - 4 * day).toISOString()).lastInsertRowid
  const s1 = 'At about 17:40 I was standing on Strand Street waiting for a taxi. A man on a black bicycle rode past, grabbed my phone out of my right hand and rode towards Adderley Street. He wore a grey hoodie.'
  const s2 = `${s1} A street vendor, who gave her name as Mrs Abrahams, saw what happened and is willing to give a statement.`
  const v1 = db.prepare(`INSERT INTO statement_revisions (report_id, owner_id, version_number, content, content_hash, change_type, change_summary, changed_by, created_at) VALUES (?,?,1,?,?, 'original', 'Original statement recorded by the client.', ?, ?)`).run(rep, naledi, s1, sha256(s1), naledi, new Date(Date.now() - 6 * day).toISOString()).lastInsertRowid
  const v2 = db.prepare(`INSERT INTO statement_revisions (report_id, owner_id, version_number, content, content_hash, change_type, change_summary, previous_revision_id, changed_by, created_at) VALUES (?,?,2,?,?, 'amendment', 'Added details of an eyewitness.', ?, ?, ?)`).run(rep, naledi, s2, sha256(s2), v1, naledi, new Date(Date.now() - 5 * day).toISOString()).lastInsertRowid
  db.prepare('UPDATE police_reports SET current_statement_id = ? WHERE id = ?').run(v2, rep)
  const tl = db.prepare('INSERT INTO case_timeline_events (report_id, owner_id, title, details, event_date, source) VALUES (?,?,?,?,?,?)')
  tl.run(rep, naledi, 'Platform report created', 'The report and original statement were saved securely. This is not yet an official SAPS case.', new Date(Date.now() - 6 * day).toISOString(), 'platform')
  tl.run(rep, naledi, 'Statement amendment recorded', 'Added details of an eyewitness.', new Date(Date.now() - 5 * day).toISOString(), 'client')
  tl.run(rep, naledi, 'SAPS reference recorded', 'The client recorded SAPS reference CAS 214/10/2025. This reference has not been independently verified by Call My Lawyer.', new Date(Date.now() - 4 * day).toISOString(), 'saps')

  // ---- digital justice case with a full team ----
  const jc = db
    .prepare(`INSERT INTO justice_cases (reference, official_case_number, created_by, title, case_type, stage, summary, jurisdiction, source_report_id, court_name, next_deadline, rights_confirmed, created_at, updated_at)
      VALUES (?, 'CAS 214/10/2025', ?, 'State v. unknown — theft of cellphone', 'criminal', 'docket', ?, 'Cape Town Central', ?, 'Cape Town Magistrate Court', ?, 1, ?, ?)`)
    .run(randRef('JUST'), naledi, 'Theft of a cellphone on Strand Street. Eyewitness available. CCTV may be available from a nearby business.', rep, at(14, 9), new Date(Date.now() - 4 * day).toISOString(), new Date(Date.now() - 1 * day).toISOString()).lastInsertRowid
  const part = db.prepare('INSERT INTO case_participants (case_id, user_id, team, added_by) VALUES (?,?,?,?)')
  part.run(jc, naledi, 'clients', naledi)
  part.run(jc, saps, 'assignedPolice', admin)
  part.run(jc, prosecutor, 'courtTeam', admin)
  part.run(jc, clerk, 'courtTeam', admin)
  part.run(jc, magistrate, 'courtTeam', admin)
  db.prepare(`INSERT INTO docket_entries (case_id, owner_id, title, entry_type, details, occurred_at) VALUES (?,?,?,?,?,?)`).run(jc, saps, 'Complainant statement taken', 'statement', 'Statement of the complainant commissioned at Cape Town Central SAPS.', new Date(Date.now() - 4 * day).toISOString())
  db.prepare(`INSERT INTO docket_entries (case_id, owner_id, title, entry_type, details, occurred_at) VALUES (?,?,?,?,?,?)`).run(jc, saps, 'CCTV footage requested', 'investigation', 'Footage requested from two businesses on Strand Street.', new Date(Date.now() - 2 * day).toISOString())
  db.prepare(`INSERT INTO hearings (case_id, owner_id, hearing_type, starts_at, courtroom) VALUES (?,?, 'first-appearance', ?, 'Cape Town Magistrate Court · Court 12')`).run(jc, clerk, at(14, 9))
  const audit = db.prepare('INSERT INTO justice_audit_logs (case_id, owner_id, action, entity_type, details, created_at) VALUES (?,?,?,?,?,?)')
  audit.run(jc, naledi, 'Digital case intake created', 'justice-case', 'The intake was saved. It is not an official SAPS or court case until an authorised official registers it.', new Date(Date.now() - 4 * day).toISOString())
  audit.run(jc, saps, 'Official case reference registered', 'justice-case', 'CAS 214/10/2025', new Date(Date.now() - 4 * day).toISOString())
  audit.run(jc, saps, 'Docket entry recorded', 'docket-entry', 'CCTV footage requested', new Date(Date.now() - 2 * day).toISOString())
  audit.run(jc, clerk, 'Hearing scheduled', 'hearing', 'Cape Town Magistrate Court · Court 12', new Date(Date.now() - 1 * day).toISOString())

  // A second intake awaiting assignment, with a Legal Aid request.
  const jc2 = db
    .prepare(`INSERT INTO justice_cases (reference, created_by, title, case_type, summary, jurisdiction, rights_confirmed) VALUES (?, ?, 'Unlawful eviction by landlord', 'civil', ?, 'Bellville', 1)`)
    .run(randRef('JUST'), anele, 'My landlord changed the locks and removed my belongings without a court order. I cannot afford a private attorney.').lastInsertRowid
  part.run(jc2, anele, 'clients', anele)
  db.prepare(`INSERT INTO legal_aid_requests (case_id, owner_id, motivation) VALUES (?, ?, ?)`).run(jc2, anele, 'I earn under R5 000 a month and need urgent help to get back into my home.')
  audit.run(jc2, anele, 'Legal Aid screening requested', 'legal-aid-request', 'The request is queued for eligibility screening; approval is not guaranteed.', now())

  const n = db.prepare('INSERT INTO notifications (owner_id, matter_id, title, message, link) VALUES (?,?,?,?,?)')
  n.run(naledi, bail, 'New lawyer offer', 'Karabo Dlamini responded to “Urgent bail assistance needed”.', `/matters/${bail}`)
  n.run(naledi, contract, 'Lawyer update', 'Letter of demand sent', `/matters/${contract}/workspace`)
  n.run(admin, null, 'New practitioner application', 'Lerato Molefe submitted credentials for verification.', '/admin')
  n.run(legalAid, null, 'New Legal Aid screening request', 'Unlawful eviction by landlord', '/dashboard')
  void lerato
  void leanne

  console.log(`[seed] demo data created — sign in with any @${DEMO_DOMAIN} account, password from DEMO_PASSWORD (default ${password === 'Demo@2025!' ? 'Demo@2025!' : 'set'})`)
}

export async function ensureSeed() {
  seedStations()
  await ensureAdmin()
  await seedDemo()
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ensureSeed()
  process.exit(0)
}
