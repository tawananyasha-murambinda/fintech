"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function VerifyRequiredPage() {
  const { data: session } = useSession();
  const email = session?.user?.email;
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    if (!email) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage("Verification email sent. Check your inbox.");
      } else {
        setMessage(data.error || "Could not send verification email.");
      }
    } catch {
      setMessage("Something went wrong. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center mx-auto mb-6">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 4L12 14 2 4" />
            <path d="M2 4h20v16H2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2 dark:text-slate-100">
          Verify your email
        </h1>
        <p className="text-sm text-slate-500 mb-2 leading-relaxed dark:text-slate-400">
          We sent a verification link to:
        </p>
        <p className="text-sm font-medium text-slate-900 mb-8 dark:text-slate-200">
          {email}
        </p>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed dark:text-slate-400">
          Click the link in that email to continue. Once verified, you can set
          up your account.
        </p>

        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={resend}
            disabled={sending || !email}
            className="btn-primary w-full disabled:opacity-60"
          >
            {sending ? "Sending…" : "Resend verification email"}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="btn-secondary w-full"
          >
            I've verified — continue
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors mt-2 dark:text-slate-500"
          >
            Sign out
          </button>
        </div>

        {message && (
          <p className="mt-6 text-sm text-teal-700 dark:text-teal-400">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
