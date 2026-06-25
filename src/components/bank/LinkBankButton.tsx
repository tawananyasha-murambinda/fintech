"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useRouter } from "next/navigation";

interface LinkBankButtonProps {
  variant?: "default" | "onboarding";
}

export function LinkBankButton({ variant = "default" }: LinkBankButtonProps) {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingToken, setFetchingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedForToken = useRef<string | null>(null);

  const onSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicToken,
            institutionId: metadata?.institution?.institution_id,
            institutionName: metadata?.institution?.name,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to link account");
        }

        const syncRes = await fetch("/api/plaid/sync", { method: "POST" });
        if (!syncRes.ok) {
          const syncData = await syncRes.json().catch(() => ({}));
          console.warn("Transaction sync warning:", syncData.error || syncRes.statusText);
        }

        router.refresh();
        if (variant === "onboarding") router.push("/dashboard");
      } catch (err: any) {
        setError(err?.message || "Something went wrong while linking");
      } finally {
        setLoading(false);
        setLinkToken(null);
        openedForToken.current = null;
      }
    },
    [router, variant]
  );

  // Keep a single Plaid Link hook mounted so the script is only injected once.
  // Pass an empty string when no token is available; the hook will re-init when
  // a real token is supplied.
  const { open, ready } = usePlaidLink({
    token: linkToken || "",
    onSuccess,
    onExit: () => {
      setLinkToken(null);
      openedForToken.current = null;
    },
  });

  // Auto-open once the hook is ready for the current token
  useEffect(() => {
    if (linkToken && ready && openedForToken.current !== linkToken) {
      openedForToken.current = linkToken;
      open();
    }
  }, [linkToken, ready, open]);

  async function fetchLinkToken() {
    setFetchingToken(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/link-token");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to open bank selector");
      }
      if (!data.linkToken) {
        throw new Error("No link token returned");
      }
      setLinkToken(data.linkToken);
    } catch (err: any) {
      setError(err?.message || "Could not open bank selector");
    } finally {
      setFetchingToken(false);
    }
  }

  function handleClick() {
    if (!linkToken) {
      fetchLinkToken();
    } else if (ready) {
      open();
    }
  }

  const isLoading = loading || fetchingToken;

  return (
    <>
      {variant === "onboarding" ? (
        <button
          onClick={handleClick}
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 py-3"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {loading ? "Linking account…" : "Opening bank selector…"}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect
                  x="1"
                  y="3"
                  width="12"
                  height="8"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path d="M1 6h12" stroke="currentColor" strokeWidth="1.4" />
                <path
                  d="M4 9.5h2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Connect your bank
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleClick}
          disabled={isLoading}
          className="btn-primary flex items-center gap-2 text-xs py-2 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {loading ? "Linking…" : "Opening…"}
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M6.5 1.5v10M1.5 6.5h10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              Link account
            </>
          )}
        </button>
      )}
      {error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}
    </>
  );
}
