"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { MagnifyingGlass, X, XLogo } from "@phosphor-icons/react";
import { BRAND } from "@/config/brand";
import { CopyCaTag } from "@/components/CopyCa";
import { CoinLogo } from "@/components/coin/CoinLogo";
import { usePoll } from "@/components/providers/hooks";
import { ModeBadge, Wordmark } from "@/components/ui";
import { NavWallet } from "@/components/wallet/WalletButton";
import type { Board } from "@/lib/board";
import { usd } from "@/lib/format";

export const NAV = [
  { href: "/", label: "Coins" },
  { href: "/winners", label: "Winners" },
  { href: "/me", label: "Portfolio" },
  { href: "/docs", label: "Docs" },
] as const;

export const isActive = (path: string, href: string) => (href === "/" ? path === "/" || path.startsWith("/t/") : path.startsWith(href));

export function SiteHeader() {
  const path = usePathname() ?? "/";
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 md:gap-6 md:px-6">
        <Link href="/" className="shrink-0" aria-label={`${BRAND.name} home`}>
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => {
            const on = isActive(path, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`relative rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors ${on ? "text-fg" : "text-fg-2 hover:text-fg"}`}
              >
                {on ? <span className="absolute inset-0 rounded-full bg-card-2" /> : null}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <div className="w-full max-w-[460px]">
            <CoinSearch />
          </div>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 md:ml-0">
          <button
            type="button"
            onClick={() => setMobileSearch(true)}
            className="btn-ghost grid size-9 shrink-0 place-items-center rounded-full md:hidden"
            aria-label="Search coins"
          >
            <MagnifyingGlass size={16} />
          </button>
          <a
            href={BRAND.x}
            target="_blank"
            rel="noreferrer"
            aria-label={`${BRAND.name} on X`}
            className="btn-ghost hidden size-9 shrink-0 place-items-center rounded-full xl:grid"
          >
            <XLogo size={16} />
          </a>
          <CopyCaTag />
          <Link
            href="/launch"
            className="btn-surge hidden h-9 shrink-0 items-center rounded-full px-4 text-[14px] font-bold whitespace-nowrap md:inline-flex"
          >
            Launch a coin
          </Link>
          <NavWallet compact />
        </div>
      </div>

      {mobileSearch
        ? createPortal(
            <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Search coins">
              <div className="absolute inset-0 bg-black/60" onClick={() => setMobileSearch(false)} />
              <div className="relative border-b border-line bg-ink px-4 pt-3 pb-4">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <CoinSearch autoFocus onDone={() => setMobileSearch(false)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileSearch(false)}
                    className="btn-ghost grid size-9 shrink-0 place-items-center rounded-full"
                    aria-label="Close search"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}

/**
 * Search box with a results dropdown. Matches names and tickers on the board;
 * a pasted 0x address opens that coin directly. The board is only fetched once
 * the box is used.
 */
function CoinSearch({ autoFocus = false, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(autoFocus);
  const [hi, setHi] = useState(0);
  const { data } = usePoll<Board>(used ? "/api/coins" : null, 30_000);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && t && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [autoFocus]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || !data) return [];
    return data.coins
      .filter((c) => c.name.toLowerCase().includes(term) || c.symbol.toLowerCase().includes(term) || c.key === term)
      .slice(0, 6);
  }, [q, data]);

  const go = (key: string) => {
    setOpen(false);
    setQ("");
    onDone?.();
    router.push(`/t/${key}`);
  };

  const submit = () => {
    const term = q.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(term)) return go(term.toLowerCase());
    if (results[hi]) return go(results[hi].key);
  };

  return (
    <div className="relative w-full">
      <MagnifyingGlass size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-3" />
      <input
        ref={input}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => {
          setUsed(true);
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          else if (e.key === "ArrowDown") setHi((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
          else if (e.key === "ArrowUp") setHi((h) => Math.max(h - 1, 0));
          else if (e.key === "Escape") input.current?.blur();
        }}
        placeholder="Search coins or paste an address"
        aria-label="Search coins"
        className="h-10 w-full rounded-full bg-card-2 pr-10 pl-10 text-[14px] text-fg shadow-[inset_0_0_0_1px_var(--color-line)] outline-none placeholder:text-fg-3 focus:shadow-[inset_0_0_0_1px_var(--color-line-2)]"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md bg-card-3 px-1.5 text-[11px] text-fg-3 md:block">
        /
      </kbd>
      {open && q.trim() ? (
        <div className="surface absolute inset-x-0 top-12 z-50 overflow-hidden p-1.5">
          {!data ? (
            <p className="px-3 py-2.5 text-[13px] text-fg-3">Reading the board…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-[13px] text-fg-3">
              {/^0x[0-9a-fA-F]{40}$/.test(q.trim()) ? "Press Enter to open this address." : "No coin on the board matches that."}
            </p>
          ) : (
            results.map((c, i) => (
              <button
                key={c.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(c.key)}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left ${i === hi ? "bg-card-2" : ""}`}
              >
                <CoinLogo src={c.logo} symbol={c.symbol} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{c.name}</span>
                  <span className="block truncate text-[12px] text-fg-3">{c.symbol}</span>
                </span>
                <ModeBadge mode={c.game.mode} size="sm" />
                <span className="num w-16 shrink-0 text-right text-[13px] text-fg-2">{usd(c.mcapUsd)}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
