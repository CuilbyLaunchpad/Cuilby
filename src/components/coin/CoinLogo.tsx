"use client";

import { useState } from "react";

/** A coin's logo, or a monogram of its ticker when it has none (or it fails to load). */
export function CoinLogo({
  src,
  symbol,
  size = 44,
  className = "",
  alt = "",
}: {
  src: string | null;
  symbol: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.28) };
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`shrink-0 bg-card-3 object-cover outline-1 -outline-offset-1 outline-white/10 ${className}`}
        style={style}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`display grid shrink-0 place-items-center bg-card-3 font-bold text-fg-2 outline-1 -outline-offset-1 outline-white/10 ${className}`}
      style={{ ...style, fontSize: Math.max(10, size * 0.38) }}
    >
      {symbol.slice(0, 2).toUpperCase()}
    </span>
  );
}
