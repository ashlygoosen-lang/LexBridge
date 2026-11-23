import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { db, now } from '../db.js'
import { clearSession, publicUser, requireAuth, setSession } from '../auth.js'
import crypto from 'node:crypto'
import { fail, sha256, text, wrap } from '../util.js'
import { sendMail } from '../mail.js'

const router = Router()
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false })

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LANGUAGES = ['en', 'af', 'xh', 'zu', 'st']

router.post(
  '/signup',
  authLimiter,
  wrap(async (req, res) => {
    const name = text(req.body.name, 100)
    const email = text(req.body.email, 180).toLowerCase()
    const phone = text(req.body.phone, 30)
    const password = typeof req.body.password === 'string' ? req.body.password.slice(0, 128) : ''
    // Only clients and lawyers may self-register. Officials are created by an administrator.
    const role = req.body.role === 'lawyer' ? 'lawyer' : 'client'
    if (!name || !EMAIL.test(email) || password.length < 8)
      return fail(res, 400, 'Enter your name, a valid email and a password of at least 8 characters.')
    if (!req.body.consent) return fail(res, 400, 'Please accept the Terms and POPIA privacy notice.')
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email))
      return fail(res, 409, 'An account may already exist for that email.')

    const hash = await bcrypt.hash(password, 12)
    const info = db
      .prepare('INSERT INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, ?)')
      .run(email, hash, name, phone || null, role)
    if (role === 'lawyer') {
      db.prepare(
        `INSERT INTO lawyer_profiles (user_id, checks, verification_status) VALUES (?, ?, 'incomplete')`,
      ).run(info.lastInsertRowid, JSON.stringify({}))
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
    setSession(res, user)
    res.status(201).json({ ok: true, user: publicUser(user) })
  }),
)

router.post(
  '/login',
  authLimiter,
  wrap(async (req, res) => {
    const email = text(req.body.email, 180).toLowerCase()
    const password = typeof req.body.password === 'string' ? req.body.password.slice(0, 128) : ''
    if (!email || !password) return fail(res, 400, 'Enter both your email and password.')
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false
    if (!user || !valid) return fail(res, 401, 'Check your email and password and try again.')
    if (user.account_status !== 'active')
      return fail(res, 403, 'This account is suspended. Contact support for help.')
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now(), user.id)
    setSession(res, user)
    res.json({ ok: true, user: publicUser(user) })
  }),
)

// ---------- forgotten password ----------
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false })
router.post(
  '/forgot',
  resetLimiter,
  wrap(async (req, res) => {
    const email = text(req.body.email, 180).toLowerCase()
    if (!EMAIL.test(email)) return fail(res, 400, 'Enter a valid email address.')
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    // Same answer whether or not the account exists, so emails cannot be enumerated.
    const answer = { ok: true, message: 'If an account exists for that email, we have sent a reset link. It expires in 1 hour.' }
    if (!user || user.account_status !== 'active') return res.json(answer)
    const token = crypto.randomBytes(32).toString('base64url')
    db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(now(), user.id)
    db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
      user.id,
      sha256(token),
      new Date(Date.now() + 3600_000).toISOString(),
      now(),
    )
    await sendMail({
      to: user.email,
      subject: 'Reset your LexBridge password',
      heading: 'Reset your password',
      text: `Hi ${user.name.split(' ')[0]},\n\nSomeone asked to reset the password for your LexBridge account. Use the button below within 1 hour. If this wasn't you, ignore this email — your password stays the same.`,
      link: `/reset-password?token=${token}`,
      cta: 'Choose a new password',
    })
    // Test hook: lets automated tests complete the flow without an inbox. Never enabled in production.
    if (process.env.NODE_ENV !== 'production' && process.env.EXPOSE_RESET_TOKENS === '1') answer.devToken = token
    res.json(answer)
  }),
)

router.post(
  '/reset',
  resetLimiter,
  wrap(async (req, res) => {
    const token = text(req.body.token, 200)
    const password = typeof req.body.password === 'string' ? req.body.password.slice(0, 128) : ''
    if (password.length < 8) return fail(res, 400, 'Your new password must be at least 8 characters.')
    const row = token && db.prepare('SELECT * FROM password_resets WHERE token_hash = ?').get(sha256(token))
    if (!row || row.used_at || new Date(row.expires_at) < new Date())
      return fail(res, 400, 'This reset link has expired or was already used. Request a new one.')
    const hash = await bcrypt.hash(password, 12)
    db.prepare('UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = ? WHERE id = ?').run(hash, now(), row.user_id)
    db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').run(now(), row.id)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id)
    sendMail({
      to: user.email,
      subject: 'Your LexBridge password was changed',
      heading: 'Password changed',
      text: `Hi ${user.name.split(' ')[0]},\n\nYour password was just changed and other devices were signed out. If this wasn't you, contact support@lexbridge.co.za immediately.`,
    }).catch(() => {})
    setSession(res, user)
    res.json({ ok: true, user: publicUser(user) })
  }),
)

router.post('/logout', (_req, res) => {
  clearSession(res)
  res.json({ ok: true })
})

router.get('/me', (req, res) => {
  if (!req.user) return res.json({ ok: true, user: null })
  const unread = db
    .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE owner_id = ? AND read_at IS NULL`)
    .get(req.user.id).n
  let lawyer = null
  if (req.user.role === 'lawyer') {
    const p = db.prepare('SELECT verification_status FROM lawyer_profiles WHERE user_id = ?').get(req.user.id)
    lawyer = { verificationStatus: p?.verification_status ?? 'incomplete' }
  }
  res.json({ ok: true, user: { ...publicUser(req.user), unreadNotifications: unread, lawyer } })
})

router.patch('/me', requireAuth, (req, res) => {
  const name = text(req.body.name, 100) || req.user.name
  const phone = text(req.body.phone, 30) || null
  const lang = LANGUAGES.includes(req.body.preferredLanguage) ? req.body.preferredLanguage : req.user.preferred_language
  const notifyEmail = typeof req.body.notifyEmail === 'boolean' ? (req.body.notifyEmail ? 1 : 0) : req.user.notify_email
  db.prepare('UPDATE users SET name = ?, phone = ?, preferred_language = ?, notify_email = ?, updated_at = ? WHERE id = ?').run(
    name,
    phone,
    lang,
    notifyEmail,
    now(),
    req.user.id,
  )
  res.json({ ok: true, user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
})

router.post(
  '/me/password',
  requireAuth,
  wrap(async (req, res) => {
    const current = String(req.body.currentPassword || '')
    const next = String(req.body.newPassword || '')
    if (next.length < 8) return fail(res, 400, 'Your new password must be at least 8 characters.')
    if (!(await bcrypt.compare(current, req.user.password_hash))) return fail(res, 400, 'Your current password is incorrect.')
    db.prepare('UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = ? WHERE id = ?').run(
      await bcrypt.hash(next, 12),
      now(),
      req.user.id,
    )
    setSession(res, db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id))
    res.json({ ok: true })
  }),
)

router.get('/notifications', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE owner_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user.id)
  res.json({
    ok: true,
    notifications: rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      link: n.link,
      caseId: n.case_id,
      matterId: n.matter_id,
      deliveryStatus: n.read_at ? 'read' : n.delivery_status,
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
  })
})

router.post('/notifications/read', requireAuth, (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : null
  if (ids && ids.length) {
    const stmt = db.prepare(
      `UPDATE notifications SET read_at = ?, delivery_status = 'read' WHERE id = ? AND owner_id = ? AND read_at IS NULL`,
    )
    const t = now()
    for (const id of ids) stmt.run(t, id, req.user.id)
  } else {
    db.prepare(
      `UPDATE notifications SET read_at = ?, delivery_status = 'read' WHERE owner_id = ? AND read_at IS NULL`,
    ).run(now(), req.user.id)
  }
  res.json({ ok: true })
})

export default router
