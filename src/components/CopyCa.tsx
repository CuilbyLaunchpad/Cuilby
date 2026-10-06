"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
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
 * "CA" chip. One tap copies the full address. Disabled ("at launch") until a
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
      className={`num inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-card-2 px-3 text-[13px] text-fg-2 shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors enabled:hover:bg-card-3 enabled:hover:text-fg disabled:cursor-default ${className}`}
    >
      <span className="font-medium text-fg lg:hidden">CA</span>
      <span className="hidden font-medium text-fg lg:inline">{BRAND.symbol}</span>
      <span className="hidden xl:inline">{!live ? "at launch" : copied ? "copied" : shortAddress(BRAND.ca, 4, 4)}</span>
      {!live ? null : copied ? <Check size={13} className="text-up" weight="bold" /> : <Copy size={13} />}
    </button>
  );
}

/** Pill used inside the official token card: "CA 0x12…abcd" with a copy icon. */
export function CopyCaInline() {
  const { copied, copy, live } = useCopyCa();
  return (
    <button
      type="button"
      onClick={copy}
      disabled={!live}
      aria-label={live ? "Copy contract address" : "Contract address not published yet"}
      className="num mt-2 inline-flex items-center gap-1.5 rounded-full bg-card-2 px-3 py-1 text-[13px] text-fg-2 enabled:hover:text-fg disabled:cursor-default"
    >
      CA {live ? shortAddress(BRAND.ca, 8, 6) : "published at launch"}
      {live ? copied ? <Check size={13} className="text-up" weight="bold" /> : <Copy size={13} /> : null}
    </button>
  );
}

/** Full contract block: chain, the whole address and a copy button. */
export function CopyCaBlock({ className = "" }: { className?: string }) {
  const { copied, copy, live } = useCopyCa();
  return (
    <div className={`tile px-4 py-3.5 ${className}`}>
      <p className="text-[12px] text-fg-3">
        {BRAND.symbol} contract on {CHAIN.name}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <code className={`num min-w-0 flex-1 text-[13px] leading-snug text-fg ${live ? "break-all" : "break-words"}`} data-testid="ca-full">
          {live ? BRAND.ca : "Published at launch. Only trust the address shown on this site."}
        </code>
        <button
          type="button"
          onClick={copy}
          disabled={!live}
          className="btn-ghost inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold"
          data-testid="ca-copy"
        >
          {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
          {!live ? "Not live yet" : copied ? "Copied" : "Copy CA"}
        </button>
      </div>
    </div>
  );
}
