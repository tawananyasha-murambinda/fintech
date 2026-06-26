import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = process.env.EMAIL_FROM || 'noreply@fintrack.app'

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const link = `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`

  await transporter.sendMail({
    from: FROM,
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

  await transporter.sendMail({
    from: FROM,
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

  await transporter.sendMail({
    from: FROM,
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
