"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Coins, Plus, Trophy, Wallet } from "@phosphor-icons/react";
import { CHAIN } from "@/config/brand";
import { isActive } from "@/components/SiteHeader";
import { useStats } from "@/components/providers/hooks";
import { EthGlyph } from "@/components/ui";
import { peth, usd } from "@/lib/format";

/** Fixed live strip along the bottom edge on tablets and desktops. */
export function StatusBar() {
  const { data, failed } = useStats();
  const down = failed && !data;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 hidden h-9 items-center border-t border-line bg-ink/90 backdrop-blur-xl md:flex">
      <div className="mx-auto flex w-full max-w-[1400px] min-w-0 items-center gap-5 overflow-hidden px-6 text-[12px] whitespace-nowrap text-fg-3">
        <span className="flex items-center gap-1.5">
          <span className={`size-1.5 animate-pulse-dot rounded-full ${down ? "bg-down" : "bg-up"}`} />
          <span className="text-fg-2">{down ? "Reconnecting" : "Live"}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <EthGlyph size={15} /> ETH <span className="num text-fg-2">{usd(data?.ethUsd ?? null, false)}</span>
        </span>
        <span>
          block <span className="num text-fg-2">{data?.block ? data.block.toLocaleString("en-US") : "–"}</span>
        </span>
        <span className="hidden lg:inline">
          <span className="num text-fg-2">{data ? data.liveCoins : "–"}</span> live coins
        </span>
        <span>
          <span className="num text-gold">{data ? `${peth(data.practicePots)} pETH` : "–"}</span> in practice pots
        </span>
        <span className="hidden lg:inline">
          <span className="num text-fg-2">{data?.practice ? `${peth(data.practice.paid)} pETH` : "–"}</span> paid to winners
        </span>
        <span className="hidden xl:inline">
          <span className="num text-fg-2">{data ? data.launchedToday : "–"}</span> launched today
        </span>
        <span className="ml-auto hidden items-center gap-1.5 lg:inline-flex">
          <EthGlyph size={14} /> {CHAIN.name} · live coins trade on Pons V2
        </span>
      </div>
    </div>
  );
}

const TABS = [
  { href: "/", label: "Coins", Icon: Coins },
  { href: "/winners", label: "Winners", Icon: Trophy },
  null,
  { href: "/docs", label: "Docs", Icon: BookOpen },
  { href: "/me", label: "Portfolio", Icon: Wallet },
] as const;

/** Bottom tab bar on phones, with the launch button raised in the middle. */
export function MobileNav() {
  const path = usePathname() ?? "/";
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-md items-end px-2 pt-1.5">
        {TABS.map((t) =>
          t === null ? (
            <div key="launch" className="flex flex-1 justify-center">
              <Link href="/launch" aria-label="Launch a coin" className="btn-surge -mt-6 grid size-14 place-items-center rounded-full">
                <Plus size={26} weight="bold" />
              </Link>
            </div>
          ) : (
            <Link
              key={t.href}
              href={t.href}
              aria-current={isActive(path, t.href) ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium ${isActive(path, t.href) ? "text-fg" : "text-fg-3"}`}
            >
              <t.Icon size={22} weight={isActive(path, t.href) ? "fill" : "regular"} />
              {t.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
