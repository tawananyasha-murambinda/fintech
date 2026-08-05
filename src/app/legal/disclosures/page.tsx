import { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata: Metadata = { title: 'Disclosures' }

export default function DisclosuresPage() {
  return (
    <LegalLayout title="Disclosures" updated="August 5, 2026">
      <h2>Not a bank or financial adviser</h2>
      <p>
        FinTrack is a personal finance software product. It is <strong>not</strong> a bank, credit
        union, broker-dealer, or investment adviser, and it is not regulated as one. Money shown in
        the app is not deposited with FinTrack.
      </p>

      <h2>No FDIC or similar insurance</h2>
      <p>
        Balances and transactions displayed in FinTrack are mirrored from your real bank accounts
        via read-only connections. FinTrack itself is not FDIC-insured and does not hold customer
        funds. Insurance protection that applies to your deposits is provided by your actual bank.
      </p>

      <h2>No professional financial advice</h2>
      <p>
        Insights, reports, budgets, and the AI assistant are generated from your data for personal
        planning. They are informational and do not constitute financial, investment, tax,
        legal, or accounting advice. Before acting on suggestions (for example, investment, debt,
        or tax decisions), consult a qualified professional.
      </p>

      <h2>Third-party data</h2>
      <p>
        Transaction data comes from your bank through Plaid and may be delayed or incomplete. Price
        comparisons and merchant alternatives are estimates from public sources and may not reflect
        current offers in your area.
      </p>

      <h2>Data security</h2>
      <p>
        We encrypt data in transit (HTTPS), store passwords as bcrypt hashes, and encrypt Plaid
        access tokens at rest. Read our <a href="/legal/privacy" className="text-teal-700 underline dark:text-teal-400">Privacy Policy</a> for details.
      </p>

      <h2>Contact</h2>
      <p>Questions about these disclosures: <strong>legal@fintrack.app</strong>.</p>
    </LegalLayout>
  )
}
