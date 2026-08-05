import { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata: Metadata = { title: 'Cookie Policy' }

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" updated="August 5, 2026">
      <p>
        This policy explains how FinTrack uses cookies and similar storage. We keep cookies to a
        minimum and never use advertising trackers.
      </p>

      <h2>1. Strictly necessary cookies</h2>
      <ul>
        <li><strong>Session cookie.</strong> A signed, HttpOnly cookie that keeps you signed in (e.g. <code>next-auth.session-token</code>).</li>
        <li><strong>CSRF cookie.</strong> Required by the authentication framework to protect against cross-site request forgery.</li>
        <li><strong>Security preferences.</strong> Small localStorage flags for preferences such as biometric unlock and privacy toggles.</li>
      </ul>
      <p>These are required for the service to work and cannot be disabled.</p>

      <h2>2. Functional storage</h2>
      <ul>
        <li><strong>Consent choice.</strong> We remember the consent choices you make so we don't ask again.</li>
        <li><strong>Theme preference.</strong> Your light/dark theme selection.</li>
      </ul>

      <h2>3. Cookies we do NOT use</h2>
      <p>
        We do not use advertising cookies, third-party marketing cookies, or cross-site tracking.
        Our analytics preference is off by default, and even when enabled only anonymous usage is
        sent with your consent.
      </p>

      <h2>4. Managing consent</h2>
      <p>
        You can update your choices at any time from the consent banner or from Settings → Privacy.
        You can also clear cookies in your browser, which will sign you out.
      </p>

      <h2>5. Contact</h2>
      <p>Questions about cookies: <strong>privacy@fintrack.app</strong>.</p>
    </LegalLayout>
  )
}
