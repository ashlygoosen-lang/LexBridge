// Outgoing email. Sends through SMTP when SMTP_HOST is set (e.g. Brevo, Mailgun, SendGrid,
// Microsoft 365, Gmail Workspace). Without SMTP, emails are written to the server log so the
// platform still works in development and admins can see what would have been sent.
import nodemailer from 'nodemailer'

const {
  SMTP_HOST,
  SMTP_PORT = '587',
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  MAIL_FROM = 'LexBridge <no-reply@lexbridge.co.za>',
  PUBLIC_URL = 'http://localhost:4100',
} = process.env

export const mailMode = SMTP_HOST ? 'smtp' : 'log'
export const publicUrl = PUBLIC_URL.replace(/\/$/, '')

const transport = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE ? SMTP_SECURE === 'true' : Number(SMTP_PORT) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function layout({ heading, body, cta, link }) {
  const url = link ? (link.startsWith('http') ? link : `${publicUrl}${link}`) : null
  return `<!doctype html><html><body style="margin:0;background:#f3f5f3;font-family:Arial,Helvetica,sans-serif;color:#22343b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#0b2635;padding:22px 28px;color:#fff;font-family:Georgia,serif;font-size:22px">Lex<b style="color:#e0b253">Bridge</b></td></tr>
  <tr><td style="padding:28px">
    <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-weight:400;font-size:24px;color:#0b2635">${esc(heading)}</h1>
    <div style="font-size:15px;line-height:1.65">${body}</div>
    ${url ? `<p style="margin:26px 0 6px"><a href="${esc(url)}" style="display:inline-block;background:#0b2635;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${esc(cta || 'Open LexBridge')}</a></p>` : ''}
  </td></tr>
  <tr><td style="padding:18px 28px;background:#f7f8f6;font-size:12px;color:#6b7b80;line-height:1.6">
    LexBridge is a division of VINK Group (Pty) Ltd, registration number 2018/079316/07. LexBridge is a marketplace and does not give legal advice.
    You can change email notifications under Account settings. <a href="${publicUrl}/legal/privacy" style="color:#1f6e6a">Privacy Policy</a>
  </td></tr></table></td></tr></table></body></html>`
}

export async function sendMail({ to, subject, heading, text, html, cta, link }) {
  if (!to) return { ok: false }
  const body = html || esc(text).replace(/\n/g, '<br>')
  const message = {
    from: MAIL_FROM,
    to,
    subject,
    text: `${heading || subject}\n\n${text || ''}${link ? `\n\n${link.startsWith('http') ? link : publicUrl + link}` : ''}`,
    html: layout({ heading: heading || subject, body, cta, link }),
  }
  if (!transport) {
    console.log(`[mail:log] to=${to} subject="${subject}"${link ? ` link=${link.startsWith('http') ? link : publicUrl + link}` : ''}`)
    return { ok: true, mode: 'log' }
  }
  try {
    await transport.sendMail(message)
    return { ok: true, mode: 'smtp' }
  } catch (err) {
    console.error('[mail] send failed:', err.message)
    return { ok: false, error: err.message }
  }
}
