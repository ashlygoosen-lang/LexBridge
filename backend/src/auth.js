import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { db } from './db.js'

const SESSION_COOKIE = 'cml_session'
const isProd = process.env.NODE_ENV === 'production'

let secret = process.env.JWT_SECRET
if (!secret) {
  if (isProd) console.warn('[auth] JWT_SECRET is not set — generating a temporary secret. Sessions will reset on restart.')
  secret = crypto.randomBytes(48).toString('hex')
}

export const publicUser = (u) =>
  u && {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    preferredLanguage: u.preferred_language,
    identityStatus: u.identity_status,
    idNumberLast4: u.id_last4,
    accountStatus: u.account_status,
    createdAt: u.created_at,
  }

export function setSession(res, user) {
  const token = jwt.sign({ sub: user.id }, secret, { expiresIn: '7d' })
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' })
}

const findUser = db.prepare('SELECT * FROM users WHERE id = ?')

export function loadUser(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (token) {
    try {
      const { sub } = jwt.verify(token, secret)
      const user = findUser.get(sub)
      if (user && user.account_status === 'active') req.user = user
    } catch {
      /* expired or tampered token — treat as signed out */
    }
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ ok: false, error: 'Please sign in to continue.' })
  next()
}

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, error: 'Please sign in to continue.' })
    if (!roles.includes(req.user.role))
      return res.status(403).json({ ok: false, error: 'Your account is not permitted to do this.' })
    next()
  }
