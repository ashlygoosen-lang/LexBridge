const TZ = 'Africa/Johannesburg'

// Cents → "R 6 900,00" (South African formatting).
export const rand = (cents, { decimals = true } = {}) => {
  const value = (Number(cents) || 0) / 100
  const s = value.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })
  return `R ${s}`
}
export const toCents = (randValue) => Math.round(Number(String(randValue).replace(/[^\d.]/g, '')) * 100) || 0

export const date = (iso, opts = {}) =>
  iso ? new Date(iso).toLocaleDateString('en-ZA', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', ...opts }) : '—'
export const dateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-ZA', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
export const time = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-ZA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '')
export const dayNum = (iso) => new Date(iso).toLocaleDateString('en-ZA', { timeZone: TZ, day: '2-digit' })
export const monthShort = (iso) => new Date(iso).toLocaleDateString('en-ZA', { timeZone: TZ, month: 'short' }).toUpperCase()
export const weekday = (iso) => new Date(iso).toLocaleDateString('en-ZA', { timeZone: TZ, weekday: 'short' })

export const ago = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export const until = (iso) => {
  if (!iso) return ''
  const days = Math.ceil((new Date(iso) - Date.now()) / 864e5)
  if (days < 0) return 'Passed'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

export const initials = (name = '') =>
  name
    .replace(/^(Adv\.|Mr|Ms|Mrs|Dr|Magistrate|W\/O)\s+/i, '')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

export const responseLabel = (mins) =>
  mins <= 59 ? `Responds in about ${mins} min` : `Responds in about ${Math.round(mins / 60)} hour${mins >= 120 ? 's' : ''}`

export const CATEGORY_LABEL = {
  criminal: 'Criminal',
  civil: 'Civil',
  family: 'Family',
  appeal: 'Appeal',
  unsure: 'Not sure yet',
}
export const CATEGORY_MARK = { criminal: 'CR', civil: 'CV', family: 'FM', appeal: 'AR', unsure: '?' }
export const ROLE_LABEL = {
  client: 'Client account',
  lawyer: 'Legal practitioner',
  'legal-aid': 'Legal Aid practitioner',
  saps: 'SAPS official',
  prosecutor: 'Prosecutor',
  clerk: 'Court clerk',
  'judicial-officer': 'Magistrate / Judge',
  admin: 'Platform admin',
}
export const homeFor = (user) => {
  if (!user) return '/login'
  if (user.role === 'client') return '/client'
  if (user.role === 'lawyer') return '/lawyer'
  if (user.role === 'admin') return '/admin'
  return '/dashboard'
}
