// FinTrack brand mark.
//
// The idea: an "F" whose two arms are the bars of a horizontal chart, and
// whose stem is the axis they sit on. It reads as a letter first and a
// comparison second — two bars of different lengths is the smallest possible
// picture of "this month against last".
//
// Drawn on a 32-unit grid with 4-unit strokes so it stays crisp at 16px, where
// most of these actually get seen. No gradients, no arrow, no coin, no globe.

export function LogoMark({
  size = 32,
  className = '',
  accent = true,
}: {
  size?: number
  className?: string
  /** Renders the short bar in the accent colour. */
  accent?: boolean
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="FinTrack"
    >
      {/* The stem: the axis the bars are measured from. Squared at the top
          where it meets the long bar, rounded at the foot so the whole mark
          sits rather than floats. */}
      <path
        d="M6 4h6v22a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        fill="currentColor"
      />
      {/* Long bar — the baseline period. */}
      <path
        d="M12 4h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H12V4Z"
        fill="currentColor"
      />
      {/* Short bar — the comparison. Shorter on purpose: the gap between the
          two bar ends is the whole point of the mark. */}
      <path
        d="M12 15h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-8v-8Z"
        fill={accent ? 'var(--accent)' : 'currentColor'}
      />
    </svg>
  )
}

/** Mark in a rounded tile — for app icons, avatars and tight headers. */
export function LogoTile({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[28%] bg-[var(--ink)] text-white ${className}`}
      style={{ width: size, height: size }}
    >
      <LogoMark size={size * 0.62} />
    </span>
  )
}

/** Full lockup. The wordmark sets tighter than body text so it reads as a unit. */
export function Logo({
  size = 28,
  className = '',
  showWordmark = true,
}: {
  size?: number
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className="font-display font-semibold tracking-[-0.03em] text-[var(--ink)] dark:text-white"
          style={{ fontSize: size * 0.72 }}
        >
          FinTrack
        </span>
      )}
    </span>
  )
}
