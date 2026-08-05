import { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="August 5, 2026">
      <p>
        By creating a FinTrack account you agree to these terms. Please read them carefully. If you
        do not agree, do not use the service.
      </p>

      <h2>1. The service</h2>
      <p>
        FinTrack is a personal finance tool that links your bank accounts (read-only, via Plaid),
        lets you track budgets, bills, goals and investments, and provides spending insights. It is
        a planning tool, not a bank or a financial adviser.
      </p>

      <h2>2. Eligibility</h2>
      <p>You must be at least 18 years old to use FinTrack. You are responsible for keeping your login credentials and any biometric unlock secure.</p>

      <h2>3. Your accounts</h2>
      <ul>
        <li>You must provide accurate information when registering.</li>
        <li>You must not share your password or allow others to use your account.</li>
        <li>You are responsible for activity that happens on your account.</li>
      </ul>

      <h2>4. Bank connections</h2>
      <ul>
        <li>Bank connections are <strong>read-only</strong>. FinTrack cannot move or withdraw money.</li>
        <li>You authorise Plaid to access your financial data on your behalf.</li>
        <li>You can disconnect a bank or delete your account at any time.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You agree not to misuse the service, including: attempting to access another user's data, scraping, interfering with the service, submitting unlawful content, or attempting to break the security of the service.</p>

      <h2>6. No professional advice</h2>
      <p>
        FinTrack and its AI assistant provide information and insights for personal planning only.
        They do not constitute financial, investment, tax, or legal advice. See the{" "}
        <a href="/legal/disclosures" className="text-teal-700 underline dark:text-teal-400">Disclosures</a> page. You should consult a qualified professional before making financial decisions.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        The service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
        that data from your bank is always complete or up to date. Syncing may be delayed by your
        bank or by third-party outages.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, FinTrack is not liable for indirect or consequential
        losses, or for decisions you make based on the information in the app.
      </p>

      <h2>9. Intellectual property</h2>
      <p>FinTrack's software, design, and branding belong to us. You may not copy or resell the service.</p>

      <h2>10. Suspension and termination</h2>
      <p>We may suspend or close accounts that violate these terms or that are used fraudulently. You can delete your account at any time from Settings.</p>

      <h2>11. Changes to these terms</h2>
      <p>We may update these terms from time to time and will post the revision date at the top. Continued use after changes means you accept the new terms.</p>

      <h2>12. Contact</h2>
      <p>Questions about these terms: <strong>legal@fintrack.app</strong>.</p>
    </LegalLayout>
  )
}
