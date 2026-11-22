// End-to-end API test: walks every role through its workflow against a running server.
const BASE = process.env.BASE || 'http://localhost:4100'
const PW = 'Demo@2025!'
const D = 'demo.lexbridge.co.za'
let failures = 0
const ok = (cond, label, extra = '') => {
  if (cond) console.log('  ✓', label)
  else {
    failures++
    console.log('  ✗', label, extra)
  }
}

function client() {
  let cookie = ''
  const call = async (method, path, body, form) => {
    const headers = { Origin: BASE }
    if (cookie) headers.Cookie = cookie
    let payload
    if (form) payload = form
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
    const r = await fetch(BASE + '/api' + path, { method, headers, body: payload })
    const sc = r.headers.get('set-cookie')
    if (sc) cookie = sc.split(';')[0]
    const ct = r.headers.get('content-type') || ''
    const data = ct.includes('json') ? await r.json() : await r.text()
    return { status: r.status, ...(typeof data === 'object' ? data : { text: data }) }
  }
  return {
    get: (p) => call('GET', p),
    post: (p, b = {}) => call('POST', p, b),
    put: (p, b = {}) => call('PUT', p, b),
    patch: (p, b = {}) => call('PATCH', p, b),
    del: (p) => call('DELETE', p),
    upload: (p, fd) => call('POST', p, undefined, fd),
    login: (who) => call('POST', '/auth/login', { email: `${who}@${D}`, password: PW }),
  }
}
const file = (name, text, type = 'text/plain') => new Blob([text], { type })

console.log('\n== Public')
const anon = client()
let r = await anon.get('/lawyers')
ok(r.lawyers?.length === 4, 'directory lists 4 approved lawyers (pending applicant hidden)')
r = await anon.get('/lawyers?area=Family%20law')
ok(r.lawyers?.length === 1 && r.lawyers[0].name === 'Leanne van Wyk', 'area filter works')
r = await anon.get('/police-stations')
ok(r.stations?.length === 151, '151 police stations')
r = await anon.post('/matters', { title: 'x' })
ok(r.status === 401, 'anonymous cannot post a matter')
r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}' })
ok(r.status === 403, 'cross-origin POST is rejected')

console.log('\n== Signup & roles')
const newbie = client()
r = await newbie.post('/auth/signup', { name: 'Test Person', email: `t${Date.now()}@example.co.za`, password: 'password123', role: 'admin', consent: true })
ok(r.ok && r.user.role === 'client', 'self-signup cannot choose admin (falls back to client)')
r = await newbie.get('/admin/overview')
ok(r.status === 403, 'client cannot reach admin API')

console.log('\n== Client posts a matter → lawyer offers → client accepts')
const naledi = client()
await naledi.login('naledi')
r = await naledi.post('/matters', {
  category: 'criminal', side: 'I am a complainant', title: 'Assault outside a tavern', description: 'I was assaulted and want help following up the case.',
  urgency: 'Within 48 hours', province: 'Gauteng', courtLevel: "Magistrates' Court", consent: true,
})
ok(r.ok, 'matter created', r.error)
const matterId = r.matter?.id
const thabo = client()
await thabo.login('thabo')
r = await thabo.get('/lawyer/feed')
const feedItem = r.matters?.find((m) => m.id === matterId)
ok(feedItem && !('clientId' in feedItem) && feedItem.matchScore >= 80, 'matter appears anonymised in lawyer feed with a high match')
r = await thabo.get(`/matters/${matterId}`)
ok(r.ok && r.matter && !JSON.stringify(r).includes('Naledi'), 'lawyer view of open matter hides client identity')
r = await thabo.post(`/matters/${matterId}/offers`, { consultFee: 90000, note: 'I can help with this today.', breakdown: [{ label: 'Court follow-up', amount: 300000 }], inclusions: ['Consultation'] })
ok(r.ok, 'verified lawyer sends offer', r.error)
r = await thabo.post(`/matters/${matterId}/offers`, { consultFee: 90000, note: 'Duplicate offer attempt' })
ok(r.status === 409, 'duplicate offer rejected')
const lerato = client()
await lerato.login('lerato')
r = await lerato.post(`/matters/${matterId}/offers`, { consultFee: 50000, note: 'Pending lawyer trying to offer' })
ok(r.status === 403, 'unverified lawyer cannot send offers')
r = await naledi.get(`/matters/${matterId}/offers`)
ok(r.offers?.length === 1 && r.offers[0].totalFee === 390000, 'client sees offer with computed total')
const offerId = r.offers[0].id
r = await naledi.get(`/matters/${matterId}/workspace`)
ok(r.status === 409, 'workspace not available before acceptance')
r = await naledi.post(`/matters/${matterId}/offers/${offerId}/accept`)
ok(r.ok, 'client accepts offer')
r = await naledi.post(`/matters/${matterId}/offers/${offerId}/accept`)
ok(r.status === 409, 'cannot accept twice')

console.log('\n== Checkout: pay → schedule → sign')
r = await naledi.get(`/matters/${matterId}/checkout`)
ok(r.step === 'payment' && r.payment.amount === 90000, 'checkout starts at payment for consultation fee')
r = await naledi.post(`/matters/${matterId}/consultation`, { startsAt: new Date().toISOString() })
ok(r.status === 409, 'cannot schedule before paying')
const payId = (await naledi.get(`/matters/${matterId}/checkout`)).payment.id
r = await thabo.post(`/payments/${payId}/pay`)
ok(r.status === 404, 'lawyer cannot pay client’s payment')
r = await naledi.post(`/payments/${payId}/pay`, { method: 'Card' })
ok(r.ok && r.payment.status === 'paid' && r.testMode, 'test-mode payment marks paid')
r = await naledi.get(`/matters/${matterId}/checkout`)
ok(r.step === 'schedule' && r.slots.length === 5, 'schedule step offers 5 weekdays')
const slot = r.slots[0].times.find((t) => t.available).startsAt
r = await naledi.post(`/matters/${matterId}/consultation`, { startsAt: '2020-01-01T07:00:00.000Z', format: 'video' })
ok(r.status === 409, 'invalid slot rejected')
r = await naledi.post(`/matters/${matterId}/consultation`, { startsAt: slot, format: 'video' })
ok(r.ok, 'consultation booked', r.error)
r = await thabo.get(`/matters/${matterId}/workspace`)
ok(r.ok && !r.client.phone && !r.client.email, 'lawyer cannot see client contact details before mandate')
r = await naledi.post(`/matters/${matterId}/mandate/sign`, { agree: true, signedName: 'Na' })
ok(r.status === 400, 'mandate requires full name')
r = await naledi.post(`/matters/${matterId}/mandate/sign`, { agree: true, signedName: 'Naledi Lekota' })
ok(r.ok, 'mandate signed')
r = await thabo.get(`/matters/${matterId}/workspace`)
ok(r.client.email === `naledi@${D}` && r.mandate.contentHash.length === 64, 'contact details revealed after mandate; mandate hashed')

console.log('\n== Workspace')
r = await thabo.post(`/matters/${matterId}/messages`, { body: 'Hello Naledi, I have your file.' })
ok(r.ok, 'lawyer sends message')
const fd = new FormData()
fd.append('title', 'J88 medical report')
fd.append('file', file('j88.txt', 'medical report contents'), 'j88.txt')
r = await naledi.upload(`/matters/${matterId}/documents`, fd)
ok(r.ok, 'client uploads document', r.error)
const bad = new FormData()
bad.append('file', file('x.exe', 'MZ', 'application/x-msdownload'), 'x.exe')
r = await naledi.upload(`/matters/${matterId}/documents`, bad)
ok(r.status === 400, 'executable upload rejected')
r = await thabo.post(`/matters/${matterId}/events`, { kind: 'hearing', title: 'Bail hearing', eventDate: new Date(Date.now() + 5 * 864e5).toISOString(), details: 'Court 4' })
ok(r.ok, 'lawyer adds hearing')
r = await naledi.post(`/matters/${matterId}/events`, { kind: 'update', title: 'client tries' })
ok(r.status === 403, 'client cannot post lawyer updates')
r = await thabo.post(`/matters/${matterId}/invoices`, { description: 'Court appearance', amount: 320000 })
ok(r.ok, 'lawyer raises invoice')
r = await naledi.get(`/matters/${matterId}/workspace`)
ok(r.messages.length === 1 && r.documents.length === 1 && r.payments.length === 2 && r.nextEvent, 'workspace aggregates messages, documents, payments, next event')
const docId = r.documents[0].id
const dl = await fetch(`${BASE}/api/documents/${docId}/download`, { headers: { Cookie: '' } })
ok(dl.status === 401, 'document download requires auth')
const sipho = client()
await sipho.login('sipho')
r = await sipho.get(`/documents/${docId}/download`)
ok(r.status === 404, 'other client cannot download document')
r = await sipho.get(`/matters/${matterId}/workspace`)
ok(r.status === 404, 'other client cannot open workspace')
r = await naledi.get('/payments')
const inv = r.payments.find((p) => p.kind === 'invoice' && p.matterId === matterId)
r = await naledi.post(`/payments/${inv.id}/pay`)
ok(r.ok, 'client pays invoice')
r = await naledi.post(`/payments/${inv.id}/dispute`, { note: 'Appearance did not happen as described.' })
ok(r.ok, 'client disputes payment')

console.log('\n== Admin')
const admin = client()
await admin.login('admin')
r = await admin.get('/admin/overview')
ok(r.metrics?.pending === 1 && r.metrics.disputes === 1, 'overview metrics (1 pending applicant, 1 dispute)')
r = await admin.get('/admin/verifications')
const app = r.applicants?.find((a) => a.name === 'Lerato Molefe')
ok(!!app, 'Lerato in verification queue')
r = await admin.post(`/admin/verifications/${app.id}`, { action: 'approve', checks: app.checks })
ok(r.status === 400, 'cannot approve with a check still in review')
r = await admin.post(`/admin/verifications/${app.id}`, { action: 'approve', checks: { identity: 'passed', lpc: 'passed', practising: 'passed', fidelity: 'passed', firm: 'passed' } })
ok(r.ok && r.status === 'approved', 'approve after all checks pass')
r = await anon.get('/lawyers')
ok(r.lawyers.length === 5, 'approved lawyer now listed publicly')
r = await admin.post(`/admin/payments/${inv.id}/resolve`, { outcome: 'refund', note: 'Partial work only.' })
ok(r.ok, 'dispute resolved with refund')
r = await admin.post(`/admin/matters/${matterId}/moderate`, { status: 'hidden' })
ok(r.status === 400, 'hiding a matter requires a reason')
r = await admin.post('/admin/users', { name: 'New Clerk', email: `clerk${Date.now()}@example.gov.za`, role: 'clerk', password: 'TempPass123!' })
ok(r.ok, 'admin creates official account')

console.log('\n== Police report + statement versions')
r = await naledi.post('/police-reports', { title: 'Car broken into', incidentType: 'Property damage', incidentDate: new Date(Date.now() - 864e5).toISOString(), incidentLocation: 'Main Rd, Wynberg', summary: 'My car window was smashed overnight.', statement: 'I parked at 22:00 and found the window smashed at 06:30 with my laptop bag missing.', sapsHandover: true, lawyerMatching: true, sensitiveDataProcessing: true, policeStation: 151 })
ok(r.ok && /^LXR-/.test(r.reference), 'report created with platform reference', r.error)
const repId = r.reportId
r = await naledi.post(`/police-reports/${repId}/amend`, { content: 'I parked at 22:00 and found the window smashed at 06:30 with my laptop bag missing. A neighbour heard glass break at 03:00.', changeSummary: 'Added neighbour detail' })
ok(r.ok, 'amendment recorded')
r = await naledi.get(`/police-reports/${repId}`)
ok(r.revisions.length === 2 && r.revisions[0].changeType === 'original' && r.revisions.every((v) => v.integrity), 'two versions, original preserved, hashes verify')
r = await sipho.get(`/police-reports/${repId}`)
ok(r.status === 404, 'other user cannot read report')
r = await naledi.post(`/police-reports/${repId}/saps-reference`, { reference: "DROP TABLE;--" })
ok(r.status === 400, 'invalid CAS reference rejected')
r = await naledi.post(`/police-reports/${repId}/saps-reference`, { reference: 'CAS 88/11/2026', officerName: 'Smith', officerRank: 'Sgt' })
ok(r.ok, 'CAS reference recorded')
const ev = new FormData()
ev.append('title', 'Photo of window')
ev.append('category', 'photo')
ev.append('file', file('w.png', 'PNGDATA', 'image/png'), 'w.png')
r = await naledi.upload(`/police-reports/${repId}/evidence`, ev)
ok(r.ok, 'evidence attached', r.error)
r = await naledi.post('/justice/cases', { title: 'Car break-in', caseType: 'criminal', summary: 'Linked from my police report about the car break-in on Main Rd.', sourceReportId: repId, rightsConfirmed: true })
ok(r.ok, 'justice intake created from report')
const caseId = r.id
r = await naledi.post('/justice/cases', { title: 'dup', caseType: 'criminal', summary: 'Second intake attempt for the same report should fail.', sourceReportId: repId, rightsConfirmed: true })
ok(r.status === 409, 'only one intake per report')

console.log('\n== Justice workflow')
const saps = client(); await saps.login('saps')
const clerk = client(); await clerk.login('clerk')
const pros = client(); await pros.login('prosecutor')
const mag = client(); await mag.login('magistrate')
const la = client(); await la.login('legalaid')
r = await saps.post(`/justice/cases/${caseId}/official-number`, { number: 'CAS 88/11/2026' })
ok(r.status === 404, 'unassigned SAPS official cannot see the case')
r = await admin.post(`/justice/cases/${caseId}/participants`, { email: `saps@${D}` })
ok(r.ok, 'admin assigns SAPS')
r = await saps.post(`/justice/cases/${caseId}/official-number`, { number: 'CAS 88/11/2026' })
ok(r.ok, 'SAPS registers official number')
r = await saps.post(`/justice/cases/${caseId}/participants`, { email: `clerk@${D}` })
ok(r.status === 403, 'SAPS cannot assign court officials')
r = await saps.post('/justice/docket', { case: caseId, title: 'Handover to NPA', entryType: 'prosecutor-handover', details: 'Docket handed to the prosecutor for decision.' })
ok(r.ok, 'docket entry (handover)')
r = await naledi.post('/justice/docket', { case: caseId, title: 'x', entryType: 'statement', details: 'client tries to write docket' })
ok(r.status === 403, 'client cannot write docket')
await admin.post(`/justice/cases/${caseId}/participants`, { email: `clerk@${D}` })
r = await clerk.post(`/justice/cases/${caseId}/participants`, { email: `prosecutor@${D}` })
ok(r.ok, 'clerk assigns prosecutor')
await clerk.post(`/justice/cases/${caseId}/participants`, { email: `magistrate@${D}` })
r = await pros.post(`/justice/cases/${caseId}/prosecution`, { decision: 'prosecute', reason: 'Sufficient evidence.' })
ok(r.ok, 'prosecutor authorises prosecution')
r = await clerk.post('/justice/hearings', { case: caseId, hearingType: 'first-appearance', startsAt: new Date(Date.now() + 7 * 864e5).toISOString(), courtroom: 'Wynberg Court 3' })
ok(r.ok, 'clerk schedules hearing')
const hearingId = r.id
r = await mag.patch(`/justice/hearings/${hearingId}`, { status: 'completed', outcome: 'Matter postponed for further investigation.' })
ok(r.ok, 'magistrate updates hearing')
r = await mag.post('/justice/decisions', { case: caseId, title: 'Order for further investigation', decisionType: 'order', summary: 'Matter postponed; SAPS to obtain CCTV.', appealable: false })
ok(r.ok, 'magistrate seals decision')
const jf = new FormData()
jf.append('case', String(caseId)); jf.append('title', 'Affidavit'); jf.append('fileType', 'affidavit')
jf.append('file', file('aff.pdf', '%PDF-1.4 test', 'application/pdf'), 'aff.pdf')
r = await naledi.upload('/justice/files', jf)
ok(r.ok, 'client e-files document', r.error)
r = await clerk.post(`/justice/files/${r.id}/status`, { status: 'accepted' })
ok(r.ok, 'clerk accepts filing')
r = await naledi.get('/justice/dashboard')
const sapsUser = r.cases.find((c) => c.id === caseId).participants.find((p) => p.role === 'saps')
r = await naledi.post('/justice/messages', { case: caseId, recipient: sapsUser.id, subject: 'CCTV', message: 'The shop owner says footage is kept for 30 days.' })
ok(r.ok, 'client messages assigned SAPS official')
r = await naledi.post('/justice/messages', { case: caseId, recipient: 1, subject: 'x', message: 'to admin' })
ok(r.status === 400, 'cannot message non-participant')
r = await naledi.post('/justice/legal-aid', { case: caseId, motivation: 'I am unemployed and cannot afford a lawyer for this matter.' })
ok(r.ok, 'Legal Aid requested')
r = await la.get('/justice/dashboard')
const req = r.legalAid.find((l) => l.caseId === caseId)
ok(!!req, 'Legal Aid practitioner sees request in queue')
r = await la.post(`/justice/legal-aid/${req.id}`, { status: 'assigned' })
ok(r.ok, 'Legal Aid practitioner self-assigns')
r = await la.post('/justice/time', { case: caseId, description: 'Consultation with client', minutes: 45, hourlyRate: 600, billable: true })
ok(r.ok, 'time record after assignment')
r = await saps.get('/justice/dashboard')
ok(r.docket.length >= 1 && r.audit.length >= 8, 'SAPS dashboard shows docket and audit trail')
r = await naledi.post('/justice/identity', { idNumber: '1234567890123' })
ok(r.status === 400, 'invalid SA ID rejected (Luhn)')
r = await naledi.post('/justice/identity', { idNumber: '8001015009087' })
ok(r.ok, 'valid SA ID accepted for review')
r = await admin.get('/admin/identity')
ok(r.users.some((u) => u.idNumberLast4 === '9087'), 'admin sees only last 4 digits')

console.log('\n== Notifications')
r = await naledi.get('/auth/me')
ok(r.user.unreadNotifications > 0, `client has unread notifications (${r.user.unreadNotifications})`)
r = await naledi.post('/auth/notifications/read')
r = await naledi.get('/auth/me')
ok(r.user.unreadNotifications === 0, 'mark all read')

console.log(`\n${failures ? `✗ ${failures} failure(s)` : '✓ all checks passed'}`)
process.exit(failures ? 1 : 0)
