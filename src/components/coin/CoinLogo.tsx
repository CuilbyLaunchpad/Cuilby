"use client";

import { useState } from "react";

const TONES = ["#3442e0", "#e9502a", "#0c8a57", "#12152e", "#b4489b", "#d39e0c"];

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** A coin's logo, or a ticket-stub monogram when it has none (or it fails to load). */
export function CoinLogo({ src, symbol, size = 44, className = "" }: { src: string | null; symbol: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`shrink-0 rounded-xl border-[1.5px] border-ink bg-paper-2 object-cover ${className}`}
        style={style}
      />
    );
  }
  const tone = TONES[hash(symbol) % TONES.length];
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl border-[1.5px] border-ink font-mono font-medium text-white ${className}`}
      style={{ ...style, background: tone, fontSize: Math.max(10, size * 0.3) }}
    >
      {symbol.slice(0, 2).toUpperCase()}
    </span>
  );
}
