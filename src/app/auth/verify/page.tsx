"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyRequiredPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const { data: session, update } = useSession();
  const email = session?.user?.email;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Process verification token from email link
  useEffect(() => {
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");
    if (!token || !emailParam) {
      setVerifying(false);
      return;
    }

    async function verify() {
      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token!)}&email=${encodeURIComponent(emailParam!)}`
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setVerified(true);
          // Refresh session so JWT picks up emailVerified
          await update();
          // Redirect to dashboard after a brief moment for the session to update
          setTimeout(() => router.push("/dashboard"), 500);
        } else {
          setError(data.error || "Verification failed");
        }
      } catch {
        setError("Something went wrong. Try again.");
      } finally {
        setVerifying(false);
      }
    }
    verify();
  }, [searchParams, router, update]);

  // Verified state — show success before redirect
  if (verified) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center mx-auto mb-6">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 4L12 14 2 4" />
              <path d="M2 4h20v16H2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2 dark:text-slate-100">
            Email verified!
          </h1>
          <p className="text-sm text-slate-500 mb-8 dark:text-slate-400">
            Redirecting to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  // Verifying state — processing token from email link
  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center mx-auto mb-6">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2 dark:text-slate-100">
            Verifying your email…
          </h1>
        </div>
      </div>
    );
  }

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

  // Error from token verification
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6 dark:bg-red-950">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2 dark:text-slate-100">
            Verification failed
          </h1>
          <p className="text-sm text-slate-500 mb-8 dark:text-slate-400">
            {error}
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => router.push("/auth/login")} className="btn-primary w-full">
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
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
          {email || searchParams.get("email") || "your email"}
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
