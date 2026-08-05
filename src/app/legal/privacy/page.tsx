import { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="August 5, 2026">
      <p>
        This policy explains what personal data FinTrack processes, why we process it, and the
        rights you have. We only collect what is needed to provide the service, we never sell your
        data, and you can export or delete your data at any time from Settings.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data.</strong> Name, email address, and a password hash when you register with email. If you sign in with Google, we store your email and the provider identifiers needed to keep you signed in.</li>
        <li><strong>Financial data.</strong> When you link a bank through Plaid, we receive transaction, account, and institution information. Access tokens are encrypted at rest and used only to sync your transactions.</li>
        <li><strong>Data you enter.</strong> Manual transactions, budgets, goals, bills, receipts, and other information you add in the app.</li>
        <li><strong>Location.</strong> City/country you provide (used for local shopping suggestions and price comparisons). Precise geolocation is never collected.</li>
        <li><strong>Technical data.</strong> IP address, user-agent, and error reports used for security, rate limiting, and reliability.</li>
      </ul>

      <h2>2. How we use data</h2>
      <ul>
        <li>To provide, secure, and improve FinTrack.</li>
        <li>To sync and categorize transactions from linked banks via Plaid.</li>
        <li>To generate spending insights. When the AI assistant is used, conversation text and transaction summaries are sent to an AI provider only with personal identifiers (emails, card numbers, IBANs) removed.</li>
        <li>To send you email you explicitly request (verification, password reset).</li>
      </ul>

      <h2>3. Who we share data with</h2>
      <ul>
        <li><strong>Plaid</strong> — to connect to your bank. FinTrack only receives a read-only view.</li>
        <li><strong>Our AI provider (Anthropic)</strong> — for chat and analysis, with PII redacted.</li>
        <li><strong>Email provider (SMTP)</strong> — to deliver verification and reset emails.</li>
        <li>We do <strong>not</strong> sell or rent personal data to anyone.</li>
      </ul>

      <h2>4. Security</h2>
      <p>
        Passwords are hashed with bcrypt (cost factor 12). Plaid access tokens are encrypted with
        AES-256-GCM. Sessions use signed, HttpOnly JWT cookies. All traffic is served over HTTPS and
        protected by CSP and HSTS headers. Access to account data is scoped to your user id on the
        server; no cross-user access paths are exposed.
      </p>

      <h2>5. Retention</h2>
      <p>
        We keep your data for as long as your account is active. Chat conversations and AI insights
        are retained so the assistant can answer follow-ups. You can delete your account at any
        time, which permanently removes your data within 30 days. Offsite backups, where used, are
        deleted within 60 days of account deletion.
      </p>

      <h2>6. Your rights</h2>
      <ul>
        <li><strong>Export.</strong> Download a complete copy of your data: Settings → Data → Export data.</li>
        <li><strong>Deletion.</strong> Permanently delete your account and all associated data: Settings → Security → Delete account.</li>
        <li><strong>Consent.</strong> Withdraw marketing/analytics consent at any time from Settings → Privacy, or via the cookie banner.</li>
        <li>Under GDPR you also have the right to rectification, restriction, and portability. Email us using the contact in Section 8 to exercise these rights.</li>
      </ul>

      <h2>7. Cookies</h2>
      <p>
        We use only strictly necessary cookies for authentication and security preferences. No
        advertising cookies are used. See our <a href="/legal/cookies" className="text-teal-700 underline dark:text-teal-400">Cookie Policy</a>.
      </p>

      <h2>8. Contact</h2>
      <p>
        For privacy questions, contact <strong>privacy@fintrack.app</strong>. We respond within 30 days.
      </p>

      <h2>9. Changes</h2>
      <p>
        We will update this policy as the service evolves and post the date of the latest revision
        at the top. Material changes affecting your rights will be highlighted in the app.
      </p>
    </LegalLayout>
  )
}
