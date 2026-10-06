/**
 * The Cuilby mark: a cobalt coin holding a horseshoe that opens upward (so the
 * luck stays in) with a small star caught between its arms. Drawn inline so it
 * stays sharp at every size; the raster copies in public/brand come from the
 * same drawing (see referensi/tools/make-brand.mjs).
 */
export function Mark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="29.5" fill="#3442e0" stroke="#12152e" strokeWidth="3" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.5" strokeDasharray="2 3" />
      <path
        d="M21 20 C18 29 18.5 37 21.5 42.5 C24 47 28 49 32 49 C36 49 40 47 42.5 42.5 C45.5 37 46 29 43 20"
        fill="none"
        stroke="#12152e"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M21 20 C18 29 18.5 37 21.5 42.5 C24 47 28 49 32 49 C36 49 40 47 42.5 42.5 C45.5 37 46 29 43 20"
        fill="none"
        stroke="#ffc83a"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <g fill="#12152e">
        <circle cx="20.6" cy="28" r="1.3" />
        <circle cx="21.6" cy="37" r="1.3" />
        <circle cx="26.5" cy="45" r="1.3" />
        <circle cx="37.5" cy="45" r="1.3" />
        <circle cx="42.4" cy="37" r="1.3" />
        <circle cx="43.4" cy="28" r="1.3" />
      </g>
      <path
        d="M32 17 L34 24 L41 26 L34 28 L32 35 L30 28 L23 26 L30 24 Z"
        fill="#ffffff"
        stroke="#12152e"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
