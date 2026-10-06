"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { BRAND, CHAIN, TOKEN, shortAddress } from "@/config/brand";

export function useCopyCa() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Until the contract is published there is nothing worth copying.
  const live = TOKEN.isLive;
  const copy = async () => {
    if (!live) return;
    try {
      await navigator.clipboard.writeText(BRAND.ca);
    } catch {
      // Older browsers and some embedded views refuse the async clipboard.
      const area = document.createElement("textarea");
      area.value = BRAND.ca;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return { copied, copy, live };
}

/**
 * Navbar copy pill: "$CUILBY 0x12…abcd" plus a copy icon; on phones a short
 * "CA" chip. One tap copies the full address. Disabled ("At launch") until a
 * real CA is set in src/config/brand.ts.
 */
export function CopyCaTag({ className = "" }: { className?: string }) {
  const { copied, copy, live } = useCopyCa();
  return (
    <button
      type="button"
      onClick={copy}
      disabled={!live}
      title={live ? `Copy ${BRAND.ca}` : "The contract address is published at launch"}
      aria-label={live ? "Copy contract address" : "Contract address not published yet"}
      data-testid="ca-tag"
      className={`flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-amber-soft px-2.5 font-mono text-[12px] font-medium text-ink transition-colors enabled:hover:bg-amber disabled:cursor-default ${className}`}
    >
      <span className="font-semibold lg:hidden">CA</span>
      <span className="hidden font-semibold lg:inline">{BRAND.symbol}</span>
      <span className="hidden text-ink-2 xl:inline">
        {!live ? "at launch" : copied ? "copied" : shortAddress(BRAND.ca, 4, 4)}
      </span>
      {!live ? null : copied ? <Check className="size-3.5 text-up" strokeWidth={3} /> : <Copy className="size-3.5 text-ink-2" />}
    </button>
  );
}

/** Full contract block: chain, the whole address and a copy button. */
export function CopyCaBlock({ className = "" }: { className?: string }) {
  const { copied, copy, live } = useCopyCa();
  return (
    <div className={`ticket p-4 ${className}`}>
      <p className="label">
        {BRAND.symbol} contract · {CHAIN.name}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <code className={`min-w-0 flex-1 font-mono text-[13px] leading-snug ${live ? "break-all" : "break-words"}`} data-testid="ca-full">
          {live ? BRAND.ca : "Published at launch. Only trust the address shown here."}
        </code>
        <button type="button" onClick={copy} disabled={!live} className="btn btn-accent h-10 px-4 text-sm" data-testid="ca-copy">
          {copied ? <Check className="size-4" strokeWidth={3} /> : <Copy className="size-4" />}
          {!live ? "Not live yet" : copied ? "Copied" : "Copy CA"}
        </button>
      </div>
    </div>
  );
}
