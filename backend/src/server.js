import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import './db.js'
import { loadUser } from './auth.js'
import { ensureSeed } from './seed/index.js'
import authRoutes from './routes/auth.js'
import marketplaceRoutes from './routes/marketplace.js'
import policeRoutes from './routes/police.js'
import justiceRoutes from './routes/justice.js'
import adminRoutes from './routes/admin.js'
import { paymentMode } from './payments.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'form-action': ["'self'", 'https://www.payfast.co.za', 'https://sandbox.payfast.co.za'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: false, limit: '200kb' }))
app.use(cookieParser())
app.use(loadUser)

// Simple CSRF guard: state-changing API calls must come from our own origin.
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/payments/payfast/notify') return next()
  const origin = req.get('origin')
  if (origin) {
    const allowed = [new URL(`${req.protocol}://${req.get('host')}`).origin, ...(process.env.CORS_ORIGINS || '').split(',').filter(Boolean)]
    if (!allowed.includes(origin)) return res.status(403).json({ ok: false, error: 'Request origin not allowed.' })
  }
  next()
})

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'call-my-lawyer', paymentMode }))
app.use('/api/auth', authRoutes)
app.use('/api', marketplaceRoutes)
app.use('/api', policeRoutes)
app.use('/api', justiceRoutes)
app.use('/api', adminRoutes)
app.use('/api', (_req, res) => res.status(404).json({ ok: false, error: 'Not found.' }))

// Serve the built React app (single-service deployment).
const dist = path.resolve(process.env.FRONTEND_DIST || path.join(__dirname, '../../frontend/dist'))
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h', setHeaders: (res, file) => file.includes('/assets/') && res.setHeader('Cache-Control', 'public, max-age=31536000, immutable') }))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ ok: false, error: 'Files must be smaller than 15 MB.' })
  if (err?.status === 400) return res.status(400).json({ ok: false, error: err.message })
  console.error(err)
  res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' })
})

await ensureSeed()
const port = Number(process.env.PORT) || 4000
app.listen(port, () => console.log(`Call My Lawyer API on :${port} · payments: ${paymentMode}`))
