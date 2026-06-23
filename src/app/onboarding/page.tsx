'use client'

import { useRouter } from 'next/navigation'
import { LinkBankButton } from '@/components/bank/LinkBankButton'

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="w-12 h-12 bg-teal-700 rounded-xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-lg">F</span>
        </div>

        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
          Welcome to FinTrack
        </h1>
        <p className="text-sm text-slate-500 mb-10 leading-relaxed">
          Connect your bank account to get started. We'll pull your transactions
          and analyse your spending with AI — it takes about 30 seconds.
        </p>

        {/* Steps */}
        <div className="text-left space-y-3 mb-8">
          {[
            { label: 'Connect your bank via Teller', note: 'Read-only access — we never see your password' },
            { label: 'We sync your transactions', note: 'Up to 90 days of history imported automatically' },
            { label: 'Get AI-powered insights', note: 'Category breakdowns, savings tips, and alternatives' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{step.note}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <LinkBankButton />
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip for now — I'll connect later
          </button>
        </div>
      </div>
    </div>
  )
}
