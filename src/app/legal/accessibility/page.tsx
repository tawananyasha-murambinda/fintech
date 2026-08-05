import { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata: Metadata = { title: 'Accessibility' }

export default function AccessibilityPage() {
  return (
    <LegalLayout title="Accessibility Statement" updated="August 5, 2026">
      <p>
        FinTrack aims to be usable by everyone, including people with disabilities. We work toward
        the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 AA</strong>.
      </p>

      <h2>What we do</h2>
      <ul>
        <li>Semantic HTML landmarks and heading structure throughout the app.</li>
        <li>A &quot;Skip to content&quot; link on every page.</li>
        <li>Visible keyboard focus indicators and logical tab order.</li>
        <li>Support for <code>prefers-reduced-motion</code>.</li>
        <li>Labels and ARIA attributes on form controls, dialogs, and navigation.</li>
        <li>Color contrast that meets AA targets in both light and dark themes.</li>
        <li>Touch-friendly tap targets in the mobile layout.</li>
      </ul>

      <h2>Known limitations</h2>
      <p>
        Some charts (cash-flow ribbons, category pies) are rendered as visual graphics; we provide
        numeric summaries alongside them. The AI assistant returns text and is keyboard navigable.
        We continue to audit third-party components for accessibility.
      </p>

      <h2>Feedback</h2>
      <p>
        If you encounter a barrier, please tell us at <strong>accessibility@fintrack.app</strong>.
        Include the page or feature, your browser, and what happened so we can fix it promptly.
      </p>
    </LegalLayout>
  )
}
