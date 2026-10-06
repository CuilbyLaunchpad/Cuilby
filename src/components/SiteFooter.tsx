"use client";

import Link from "next/link";
import { BRAND, CHAIN, hasGithub } from "@/config/brand";
import { CopyCaBlock } from "@/components/CopyCa";
import { Mark } from "@/components/Mark";
import { useStats } from "@/components/providers/hooks";
import { peth, usd } from "@/lib/format";

function LiveStrip() {
  const { data, failed } = useStats();
  const items: { k: string; v: string; tone?: string }[] = [
    { k: "ETH", v: usd(data?.ethUsd ?? null, false) },
    { k: "Block", v: data?.block ? data.block.toLocaleString("en-US") : "–" },
    { k: "Gas", v: data?.gasGwei !== null && data?.gasGwei !== undefined ? `${data.gasGwei.toFixed(3)} gwei` : "–" },
    { k: "Live coins", v: data ? String(data.liveCoins) : "–" },
    { k: "Launched today", v: data ? String(data.launchedToday) : "–" },
    { k: "Practice pots", v: data ? `${peth(data.practicePots)} pETH` : "–", tone: "text-pot" },
  ];
  return (
    <div className="border-b border-chalk/15">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 font-mono text-[12px] sm:px-6">
        <span className="flex items-center gap-2 text-chalk">
          <span className={`size-2 rounded-full ${failed && !data ? "bg-down" : "bg-up"}`} style={{ animation: "pulse-dot 1.8s ease-in-out infinite" }} />
          {CHAIN.name} · {CHAIN.id}
        </span>
        {items.map((i) => (
          <span key={i.k} className="whitespace-nowrap text-chalk/60">
            {i.k} <span className={i.tone ?? "text-chalk"}>{i.v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-board text-chalk">
      <LiveStrip />
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Mark size={40} />
            <span className="h-display text-[34px]">cuilby</span>
          </div>
          <p className="h-display mt-4 max-w-md text-[26px] text-amber">{BRAND.slogan}</p>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-chalk/70">{BRAND.tagline}</p>
          <div className="mt-6 max-w-xl text-ink">
            <CopyCaBlock />
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-8 sm:grid-cols-3">
          <FooterCol
            title="Play"
            links={[
              { href: "/", label: "Coins" },
              { href: "/launch", label: "Launch a coin" },
              { href: "/winners", label: "Winners" },
              { href: "/me", label: "Portfolio" },
              { href: "/swap", label: `Swap ${BRAND.symbol}` },
            ]}
          />
          <FooterCol
            title="Learn"
            links={[
              { href: "/docs", label: "What is Cuilby" },
              { href: "/docs/raffle", label: "Raffle rounds" },
              { href: "/docs/hot-seat", label: "Hot seat" },
              { href: "/docs/fees", label: "Fees & pots" },
              { href: "/docs/safety", label: "Safety" },
              { href: "/docs/brand", label: "Brand kit" },
            ]}
          />
          <FooterCol
            title="Elsewhere"
            links={[
              { href: BRAND.x, label: `X ${BRAND.xHandle}`, external: true },
              { href: CHAIN.explorer, label: "Blockscout", external: true },
              ...(hasGithub ? [{ href: BRAND.github, label: "Source code", external: true }] : []),
              { href: "/terms", label: "Terms" },
            ]}
          />
        </div>
      </div>
      <div className="border-t border-chalk/15">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-5 text-[12.5px] leading-relaxed text-chalk/55 sm:px-6 md:flex-row md:justify-between">
          <p>
            18+ only. Pots are chance-based: play only with what you can afford to lose. Pots, rounds and draws run in practice mode
            (pETH, no value) until the Cuilby contracts ship.
          </p>
          <p className="shrink-0">Live coins and prices: Pons launchpad on {CHAIN.name}.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string; external?: boolean }[] }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[11px] tracking-[0.06em] text-chalk/45">{title}</p>
      <ul className="mt-3 space-y-2 text-[14.5px]">
        {links.map((l) => (
          <li key={l.href + l.label}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noreferrer" className="text-chalk/85 hover:text-amber">
                {l.label} ↗
              </a>
            ) : (
              <Link href={l.href} className="text-chalk/85 hover:text-amber">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
