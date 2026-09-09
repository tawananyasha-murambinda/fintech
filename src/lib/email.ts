import nodemailer from 'nodemailer'
import { logger } from './logger'

// Email delivery.
//
// Password resets and verification links are the two flows where a message
// landing in spam locks someone out of their own financial data, so the
// default is a transactional provider (Resend) with authenticated sending on
// your own domain. Consumer SMTP — the previous default of smtp.gmail.com —
// caps at a few hundred messages a day and is widely spam-filtered when used
// for bulk transactional mail; it stays available for local development and
// for anyone who would rather run their own relay.

const FROM = process.env.EMAIL_FROM || 'noreply@fintrack.app'
const RESEND_KEY = process.env.RESEND_API_KEY

// Derived from createTransport rather than a `nodemailer.Transporter`
// namespace reference, which does not survive the jump to nodemailer 10.
type SmtpTransport = ReturnType<typeof nodemailer.createTransport>

let _transporter: SmtpTransport | null = null
function smtpTransporter(): SmtpTransport {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return _transporter
}

export type Message = { to: string; subject: string; html: string }

async function sendViaResend(message: Message): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    // The body carries the reason (unverified domain, invalid from address).
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend rejected the message (${res.status}): ${detail.slice(0, 300)}`)
  }
}

// Throws on failure. Callers decide whether a send failure should surface to
// the user — for a password reset it must, or they wait for mail that will
// never arrive.
export async function deliver(message: Message): Promise<void> {
  const provider = RESEND_KEY ? 'resend' : 'smtp'
  try {
    if (RESEND_KEY) await sendViaResend(message)
    else await smtpTransporter().sendMail({ from: FROM, ...message })

    logger.info('Email sent', { provider, subject: message.subject })
  } catch (err) {
    logger.error('Email delivery failed', { provider, subject: message.subject, error: err })
    throw err
  }
}

export async function sendVerificationEmail(email: string, token: string, redirectTo?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectParam = redirectTo ? `&callbackUrl=${encodeURIComponent(redirectTo)}` : ''
  const link = `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}${redirectParam}`

  await deliver({
    to: email,
    subject: 'Verify your email — FinTrack',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Verify your email</h2>
        <p style="color: #475569;">Click the button below to verify your email address and get full access to FinTrack.</p>
        <a href="${link}" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Verify email
        </a>
        <p style="color: #94a3b8; font-size: 14px;">Or paste this link in your browser:</p>
        <p style="color: #64748b; font-size: 14px; word-break: break-all;">${link}</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This link expires in 24 hours.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const link = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`

  await deliver({
    to: email,
    subject: 'Reset your password — FinTrack',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Reset your password</h2>
        <p style="color: #475569;">You requested a password reset. Click the button below to set a new password.</p>
        <a href="${link}" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Reset password
        </a>
        <p style="color: #94a3b8; font-size: 14px;">Or paste this link in your browser:</p>
        <p style="color: #64748b; font-size: 14px; word-break: break-all;">${link}</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  })
}

export async function sendEmailChangeVerification(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const link = `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}&type=email_change`

  await deliver({
    to: email,
    subject: 'Confirm your new email — FinTrack',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Confirm your new email</h2>
        <p style="color: #475569;">Click the button below to confirm this email address for your FinTrack account.</p>
        <a href="${link}" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Confirm email
        </a>
        <p style="color: #94a3b8; font-size: 14px;">Or paste this link in your browser:</p>
        <p style="color: #64748b; font-size: 14px; word-break: break-all;">${link}</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This link expires in 24 hours.</p>
      </div>
    `,
  })
}
