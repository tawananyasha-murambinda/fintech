'use client'

import { useState } from 'react'
import { merchantColor, merchantInitials } from '@/lib/merchant'

// Merchant identity.
//
// A transaction list of identical grey rows is hard to scan; a recognisable
// mark next to each one is the cheapest large improvement available. Rather
// than depending on a logo service that will rate-limit, 404 and leak the
// user's merchant history to a third party, the default is generated locally:
// a deterministic colour and monogram derived from the name itself.
//
// The same merchant always gets the same colour, on every device, with no
// network request and nothing to load. A real logo is used when we have one.

export function MerchantMark({
  name,
  logoUrl,
  size = 36,
  className = '',
}: {
  name: string
  logoUrl?: string | null
  size?: number
  className?: string
}) {
  const [logoFailed, setLogoFailed] = useState(false)
  const label = name || 'Unknown'
  const showLogo = logoUrl && !logoFailed

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: showLogo ? 'var(--surface-sunken)' : merchantColor(label),
        color: '#fff',
        fontSize: size * 0.36,
        fontWeight: 600,
        letterSpacing: '-0.02em',
      }}
      aria-hidden="true"
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote logo
        // hosts are not in the image optimiser's allowlist, and a broken one
        // must fall back to the monogram rather than render an empty box.
        <img
          src={logoUrl}
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-contain"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        merchantInitials(label)
      )}
    </span>
  )
}
