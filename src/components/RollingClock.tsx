"use client";

/**
 * Countdown text whose digits roll like an odometer when they change.
 * Non-digit characters (":" and spaces) render as they are.
 */
export function RollingClock({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`num inline-flex leading-none ${className}`} aria-label={text} role="timer">
      {text.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={`${text.length}-${i}`} className="relative inline-block h-[1em] overflow-hidden" aria-hidden="true">
            <span
              className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{ transform: `translateY(-${Number(ch)}em)` }}
            >
              {"0123456789".split("").map((d) => (
                <span key={d} className="block h-[1em] leading-none">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={`${text.length}-${i}`} aria-hidden="true">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
