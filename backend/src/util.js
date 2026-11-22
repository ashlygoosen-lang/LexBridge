import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { UPLOAD_DIR, db, now } from './db.js'

export const text = (value, max = 2000) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
export const int = (value) => {
  const n = Number(value)
  return Number.isInteger(n) ? n : null
}
export const bool = (value) => value === true || value === 'true' || value === 'on' || value === 1 || value === '1'
export const isoDate = (value) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.valueOf()) ? null : d.toISOString()
}
export const randRef = (prefix) =>
  `${prefix}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

export const fail = (res, status, error) => res.status(status).json({ ok: false, error })

// Wraps async route handlers so thrown errors become JSON 500s.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

const ALLOWED_MIME = (mime) =>
  mime === 'application/pdf' ||
  mime === 'text/plain' ||
  mime.startsWith('image/') ||
  mime === 'application/msword' ||
  mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.bin`),
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME(file.mimetype)) cb(null, true)
    else cb(Object.assign(new Error('Upload a PDF, Word document, image or plain-text file.'), { status: 400 }))
  },
})

export const fileHash = (storedName) =>
  crypto.createHash('sha256').update(fs.readFileSync(path.join(UPLOAD_DIR, storedName))).digest('hex')

export const removeUpload = (storedName) => {
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, storedName))
  } catch {
    /* already gone */
  }
}

export function sendStoredFile(res, row) {
  const filePath = path.join(UPLOAD_DIR, row.stored_name)
  if (!fs.existsSync(filePath)) return fail(res, 404, 'File not found.')
  res.setHeader('Content-Type', row.mime)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(row.original_name).replace(/%20/g, ' ')}"`,
  )
  fs.createReadStream(filePath).pipe(res)
}

const insertNotification = db.prepare(`INSERT INTO notifications
  (owner_id, matter_id, case_id, title, message, link, channel, delivery_status, created_at)
  VALUES (@owner_id, @matter_id, @case_id, @title, @message, @link, 'in-app', 'sent', @created_at)`)

export function notify(ownerId, { title, message, link = null, matterId = null, caseId = null }) {
  if (!ownerId) return
  insertNotification.run({
    owner_id: ownerId,
    matter_id: matterId,
    case_id: caseId,
    title,
    message,
    link,
    created_at: now(),
  })
}

export const VAT_RATE = 0.15
// Prices are stored in cents, VAT-inclusive.
export const vatPortion = (inclusiveCents) => Math.round(inclusiveCents - inclusiveCents / (1 + VAT_RATE))
