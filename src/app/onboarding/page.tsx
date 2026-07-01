"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LinkBankButton } from "@/components/bank/LinkBankButton";
import { detectUserLocation, saveUserLocation } from "@/lib/location";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"bank" | "location">("bank");
  const [locating, setLocating] = useState(false);
  const [locationDone, setLocationDone] = useState(false);

  async function handleSetLocation() {
    setLocating(true);
    const loc = await detectUserLocation();
    if (loc) {
      await saveUserLocation(loc);
      setLocationDone(true);
    }
    setLocating(false);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center animate-fade-up">
        {/* Logo */}
        <img src="/icon-192.png" alt="" width={48} height={48} className="rounded-xl mx-auto mb-6" />

        {step === "bank" ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
              Welcome to FinTrack
            </h1>
            <p className="text-sm text-slate-500 mb-10 leading-relaxed">
              Connect your bank account to get started. We'll pull your transactions
              and analyse your spending with AI.
            </p>

            <div className="text-left space-y-3 mb-8">
              {[
                { label: "Connect your bank via Plaid", note: "Read-only access — we never see your password" },
                { label: "We sync your transactions", note: "Up to 90 days of history imported automatically" },
                { label: "Get AI-powered insights", note: "Category breakdowns, savings tips, and local alternatives" },
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
              <LinkBankButton variant="onboarding" />
              <button
                onClick={() => setStep("location")}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip for now — I'll connect later
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-600/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>

            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
              Enable location insights
            </h1>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-xs mx-auto">
              Allow your location to get personalised merchant alternatives, local savings tips, and area-specific spending insights.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleSetLocation}
                disabled={locating}
                className="w-full py-3 text-sm font-medium text-white bg-teal-700 rounded-xl hover:bg-teal-800 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {locating ? "Detecting location…" : "Use my location"}
              </button>

              <button
                onClick={() => router.push("/dashboard")}
                className="w-full py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-100 active:scale-[0.98] transition-all"
              >
                Skip — I'll set it later in Settings
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-6 leading-relaxed">
              Location data is used only to find nearby merchants and alternatives.
              You can change this anytime in Settings.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
