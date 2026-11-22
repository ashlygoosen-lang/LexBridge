// Payment provider integration.
// Set PAYFAST_MERCHANT_ID + PAYFAST_MERCHANT_KEY (and PAYFAST_PASSPHRASE) to take real payments
// through PayFast. Without them the platform runs in clearly-labelled test mode: payments are
// marked paid immediately and no money moves.
import crypto from 'node:crypto'

const merchantId = process.env.PAYFAST_MERCHANT_ID
const merchantKey = process.env.PAYFAST_MERCHANT_KEY
const passphrase = process.env.PAYFAST_PASSPHRASE || ''
const sandbox = process.env.PAYFAST_SANDBOX !== 'false'

export const paymentMode = merchantId && merchantKey ? 'payfast' : 'test'
const host = sandbox ? 'sandbox.payfast.co.za' : 'www.payfast.co.za'

const encode = (v) => encodeURIComponent(String(v).trim()).replace(/%20/g, '+')

function signature(fields) {
  const query = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encode(v)}`)
    .join('&')
  const withPass = passphrase ? `${query}&passphrase=${encode(passphrase)}` : query
  return crypto.createHash('md5').update(withPass).digest('hex')
}

export function payfastCheckout({ payment, user, baseUrl, returnPath }) {
  const fields = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${baseUrl}${returnPath}?paid=${payment.id}`,
    cancel_url: `${baseUrl}${returnPath}?cancelled=${payment.id}`,
    notify_url: `${baseUrl}/api/payments/payfast/notify`,
    name_first: user.name.split(' ')[0],
    email_address: user.email,
    m_payment_id: String(payment.id),
    amount: (payment.amount / 100).toFixed(2),
    item_name: payment.description.slice(0, 100),
  }
  return { action: `https://${host}/eng/process`, fields: { ...fields, signature: signature(fields) } }
}

// Validates an Instant Transaction Notification from PayFast.
export async function verifyPayfastNotification(body, expectedAmountCents) {
  const { signature: received, ...rest } = body
  // PayFast signs the fields in the order they were posted.
  if (signature(rest) !== received) return { ok: false, reason: 'signature' }
  if (Math.abs(Number(body.amount_gross) * 100 - expectedAmountCents) > 1) return { ok: false, reason: 'amount' }
  if (process.env.PAYFAST_VALIDATE !== 'false') {
    try {
      const params = new URLSearchParams(rest)
      const r = await fetch(`https://${host}/eng/query/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      if ((await r.text()).trim() !== 'VALID') return { ok: false, reason: 'validation' }
    } catch {
      return { ok: false, reason: 'validation-unreachable' }
    }
  }
  return { ok: true, complete: body.payment_status === 'COMPLETE', reference: body.pf_payment_id }
}
