"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { Menu, Plus, X } from "lucide-react";
import { BRAND } from "@/config/brand";
import { CopyCaTag } from "@/components/CopyCa";
import { XIcon } from "@/components/icons";
import { Mark } from "@/components/Mark";
import { NavWallet } from "@/components/wallet/WalletButton";

export const NAV = [
  { href: "/", label: "Coins" },
  { href: "/winners", label: "Winners" },
  { href: "/me", label: "Portfolio" },
  { href: "/docs", label: "Docs" },
] as const;

const active = (path: string, href: string) => (href === "/" ? path === "/" || path.startsWith("/t/") : path.startsWith(href));

export function SiteHeader() {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b-[1.5px] border-ink bg-paper">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={`${BRAND.name} home`}>
          <Mark size={34} />
          <span className="h-display hidden text-[25px] leading-none min-[400px]:inline">cuilby</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3 py-1.5 text-[15px] font-semibold transition-colors ${
                active(path, item.href) ? "bg-ink text-chalk" : "text-ink-2 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <CopyCaTag />
          <a
            href={BRAND.x}
            target="_blank"
            rel="noreferrer"
            aria-label={`${BRAND.name} on X`}
            className="hidden size-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line-2 text-ink transition-colors hover:border-ink lg:flex"
          >
            <XIcon className="size-3.5" />
          </a>
          <Link href="/launch" className="btn btn-brand hidden h-9 px-4 text-sm sm:inline-flex md:hidden lg:inline-flex">
            <Plus className="size-4" strokeWidth={2.6} />
            Launch a coin
          </Link>
          <NavWallet compact />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-ink md:hidden"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </div>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
              <div className="absolute inset-0 bg-board/60" onClick={() => setOpen(false)} />
              <div className="absolute inset-x-3 top-3 rounded-2xl border-[1.5px] border-ink bg-card p-4 shadow-[4px_4px_0_var(--color-ink)]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Mark size={28} />
                    <span className="h-display text-[22px]">cuilby</span>
                  </span>
                  <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="cursor-pointer p-1">
                    <X className="size-5" />
                  </button>
                </div>
                <nav className="mt-4 flex flex-col" aria-label="Mobile">
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`border-b border-line py-3 text-lg font-semibold ${active(path, item.href) ? "text-brand" : "text-ink"}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link href="/swap" onClick={() => setOpen(false)} className="border-b border-line py-3 text-lg font-semibold">
                    Swap {BRAND.symbol}
                  </Link>
                </nav>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/launch" onClick={() => setOpen(false)} className="btn btn-brand h-11 flex-1 px-4">
                    <Plus className="size-4" strokeWidth={2.6} /> Launch a coin
                  </Link>
                  <a href={BRAND.x} target="_blank" rel="noreferrer" className="btn btn-ghost h-11 px-4" aria-label={`${BRAND.name} on X`}>
                    <XIcon className="size-4" /> {BRAND.xHandle}
                  </a>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
