"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { BRAND, TOKEN, shortAddress } from "@/config/brand";
import { CopyCaTag } from "@/components/CopyCa";
import { Mark } from "@/components/Mark";
import { CoinLogo } from "@/components/coin/CoinLogo";
import { useBoard, useNow, usePoll } from "@/components/providers/hooks";
import type { BoardCoin } from "@/lib/board";
import { ago, clock, durationLabel, peth, short, usd } from "@/lib/format";

type TapeItem = {
  source: "chain" | "practice";
  kind: "buy" | "sell" | "win" | "launch";
  coin: string;
  symbol: string;
  wallet: string;
  eth: number;
  at: number;
  tx: string | null;
};

const SORTS = [
  { id: "trending", label: "Busy now" },
  { id: "ending", label: "Closing soon" },
  { id: "pots", label: "Fattest pots" },
  { id: "new", label: "Newest" },
  { id: "mcap", label: "Largest" },
] as const;
type Sort = (typeof SORTS)[number]["id"];

export function Home() {
  const { data, failed } = useBoard();
  const now = useNow();
  const params = useSearchParams();
  const router = useRouter();
  const sort = (SORTS.some((s) => s.id === params.get("sort")) ? params.get("sort") : "trending") as Sort;
  const [query, setQuery] = useState("");

  const coins = useMemo(() => data?.coins ?? [], [data]);
  const running = coins.filter((c) => c.game.endsAt && c.game.endsAt > now);
  const next = [...running].sort((a, b) => (a.game.endsAt ?? 0) - (b.game.endsAt ?? 0))[0] ?? null;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = coins.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q) || c.key === q,
    );
    switch (sort) {
      case "ending":
        out = out.filter((c) => c.game.endsAt && c.game.endsAt > now).sort((a, b) => (a.game.endsAt ?? 0) - (b.game.endsAt ?? 0));
        break;
      case "pots":
        out = out.filter((c) => c.game.pot > 0).sort((a, b) => b.game.pot - a.game.pot);
        break;
      case "new":
        out = [...out].sort((a, b) => b.launchedAt - a.launchedAt);
        break;
      case "mcap":
        out = [...out].sort((a, b) => (b.mcapUsd ?? 0) - (a.mcapUsd ?? 0));
        break;
      default:
        // Board order: practice games in play first, then live coins by latest buy.
        out = [...out].sort((a, b) => Number(Boolean(b.game.endsAt && b.game.endsAt > now)) - Number(Boolean(a.game.endsAt && a.game.endsAt > now)));
    }
    return out.slice(0, 60);
  }, [coins, sort, query, now]);

  const setSort = (id: Sort) => router.replace(id === "trending" ? "/#coins" : `/?sort=${id}#coins`, { scroll: false });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(q)) router.push(`/t/${q.toLowerCase()}`);
  };

  return (
    <main>
      <OfficialStrip />

      <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-4 pt-10 pb-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-16">
        <div className="min-w-0">
          <p className="chip chip-brand">Launchpad with a pot · {"Robinhood Chain"}</p>
          <h1 className="h-display mt-5 text-[52px] sm:text-[76px] lg:text-[88px]">
            Where coins
            <br />
            get <span className="relative inline-block text-brand">lucky.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-2">
            Launch a coin. Every buy feeds the pot. Someone always wins. Each coin carries its own pot, filled by a slice of
            every buy fee, and every round hands it to one of the people playing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/launch" className="btn btn-brand h-12 px-6 text-base">
              Launch a coin <ArrowRight className="size-4" />
            </Link>
            <Link href="/docs" className="btn btn-ghost h-12 px-6 text-base">
              How a round works
            </Link>
          </div>
          <FeeReceipt />
        </div>
        <NextDraw coin={next} now={now} loading={!data && !failed} />
      </section>

      <section id="coins" className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-[1.5px] border-ink pb-4">
          <div>
            <h2 className="h-display text-[40px] sm:text-[48px]">The board</h2>
            <p className="mt-1 text-[14px] text-ink-2">
              Live coins from the Pons launchpad, priced on chain. Pots run in practice until the Cuilby contracts ship.
            </p>
          </div>
          <form onSubmit={onSearch} className="relative w-full sm:w-[320px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coins or paste an address"
              aria-label="Search coins"
              className="field h-11 pl-9 text-[14px]"
            />
          </form>
        </div>

        <div className="scroll-x mt-4 flex gap-2" role="tablist" aria-label="Sort coins">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={sort === s.id}
              onClick={() => setSort(s.id)}
              className={`shrink-0 cursor-pointer rounded-full border-[1.5px] px-4 py-1.5 text-[14px] font-semibold transition-colors ${
                sort === s.id ? "border-ink bg-ink text-chalk" : "border-line-2 bg-card text-ink-2 hover:border-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {!data ? (
              <p className="panel p-6 text-ink-2">{failed ? "The board could not be read. Retrying…" : "Reading the board…"}</p>
            ) : list.length === 0 ? (
              <EmptyBoard sort={sort} query={query} />
            ) : (
              <ol className="flex flex-col gap-3" data-testid="board">
                {list.map((c, i) => (
                  <CoinRow key={c.key} coin={c} now={now} rank={i + 1} />
                ))}
              </ol>
            )}
            {data && !data.live.ok ? (
              <p className="mt-4 text-[13px] text-down">Live coins could not be read from the launchpad right now. Retrying.</p>
            ) : null}
          </div>
          <Tape />
        </div>
      </section>
    </main>
  );
}

function OfficialStrip() {
  return (
    <div className="border-b border-line-2 bg-card">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <span className="flex items-center gap-2">
          <Mark size={22} />
          <span className="text-[14px] font-semibold">Official token</span>
          <span className="font-mono text-[13px] text-brand">{BRAND.symbol}</span>
        </span>
        <span className="hidden font-mono text-[12px] text-ink-3 sm:inline">
          {TOKEN.isLive ? `CA ${shortAddress(BRAND.ca, 6, 6)}` : "Contract address published at launch"}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <CopyCaTag />
          <Link href="/swap" className="btn btn-accent h-9 px-4 text-[13px]">
            {TOKEN.isLive ? `Buy ${BRAND.symbol}` : `${BRAND.symbol} swap`}
          </Link>
        </span>
      </div>
    </div>
  );
}

function FeeReceipt() {
  const rows = [
    { k: "Into the coin's pot", v: "60%", tone: "text-pot" },
    { k: "To the coin's creator", v: "20%", tone: "text-brand" },
    { k: "To Cuilby", v: "20%", tone: "text-ink" },
  ];
  return (
    <div className="mt-10 max-w-md">
      <p className="label">Where a 1% buy fee goes</p>
      <dl className="mt-2 divide-y divide-dashed divide-line-2 border-y border-dashed border-line-2 font-mono text-[14px]">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between py-2">
            <dt className="text-ink-2">{r.k}</dt>
            <dd className={`font-medium ${r.tone}`}>{r.v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[12.5px] text-ink-3">A round pays 80% of its pot to the winner. 20% stays to start the next one.</p>
    </div>
  );
}

function NextDraw({ coin, now, loading }: { coin: BoardCoin | null; now: number; loading: boolean }) {
  if (!coin) {
    return (
      <div className="ticket flex min-w-0 flex-col overflow-hidden sm:flex-row" data-testid="next-draw">
        <div className="min-w-0 flex-1 p-6">
          <p className="chip chip-amber">Closing next</p>
          <p className="h-display mt-4 text-[34px]">{loading ? "Reading the pots…" : "No round is running."}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            Clocks stay off until somebody enters. Choose a coin below, make a practice play, and the countdown begins for
            everyone.
          </p>
          <a href="#coins" className="btn btn-ink mt-6 h-11 px-5 text-sm">
            Find a coin
          </a>
        </div>
        <div className="perf perf-y hidden w-[150px] shrink-0 flex-col items-center justify-center gap-2 bg-amber p-5 sm:flex">
          <span className="label text-ink">example</span>
          <span className="h-display text-[44px]">15:00</span>
          <span className="text-center text-[12px] font-semibold">starts on the first ticket</span>
        </div>
      </div>
    );
  }
  return (
    <Link href={`/t/${coin.key}`} className="ticket group flex min-w-0 flex-col overflow-hidden sm:flex-row" data-testid="next-draw">
      <div className="min-w-0 flex-1 p-6">
        <p className="chip chip-amber">Closing next · practice</p>
        <div className="mt-4 flex items-center gap-3">
          <CoinLogo src={coin.logo} symbol={coin.symbol} size={48} />
          <div className="min-w-0">
            <p className="truncate text-[18px] font-bold">{coin.name}</p>
            <p className="font-mono text-[13px] text-ink-3">
              {coin.symbol} · {coin.game.mode === "raffle" ? "Raffle" : "Hot seat"} · round {coin.game.round}
            </p>
          </div>
        </div>
        <p className="mt-5 label">In the pot</p>
        <p className="h-display text-[48px] text-pot">
          {peth(coin.game.pot)} <span className="text-[22px] text-ink-3">pETH</span>
        </p>
        <p className="mt-2 text-[14px] text-ink-2">
          {coin.game.mode === "raffle"
            ? `${coin.game.players} ${coin.game.players === 1 ? "player" : "players"} holding tickets`
            : coin.game.crown
              ? `Crown: ${short(coin.game.crown)}`
              : "No crown yet"}
        </p>
      </div>
      <div className="perf perf-y flex w-full shrink-0 flex-row items-center justify-between gap-2 bg-amber p-5 sm:w-[160px] sm:flex-col sm:justify-center">
        <span className="label text-ink">left</span>
        <span className="h-display num text-[40px]">{now ? clock(coin.game.endsAt ?? 0, now) : "–:–"}</span>
        <span className="flex items-center gap-1 text-[13px] font-bold group-hover:underline">
          Play <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

function CoinRow({ coin, now, rank }: { coin: BoardCoin; now: number; rank: number }) {
  const live = coin.game.endsAt !== null && coin.game.endsAt > now;
  const drawing = coin.game.endsAt !== null && coin.game.endsAt <= now;
  return (
    <li>
      <Link
        href={`/t/${coin.key}`}
        className="panel grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 p-3.5 transition-shadow hover:shadow-[3px_3px_0_var(--color-ink)] sm:grid-cols-[28px_auto_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:p-4"
      >
        <span className="hidden font-mono text-[12px] text-ink-3 sm:block">{String(rank).padStart(2, "0")}</span>
        <CoinLogo src={coin.logo} symbol={coin.symbol} size={46} />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold">{coin.name}</p>
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[12.5px] text-ink-3">
            <span className="truncate font-mono">{coin.symbol}</span>
            <span className={`chip ${coin.kind === "live" ? "chip-up" : "chip-brand"}`}>{coin.kind === "live" ? "Live" : "Practice coin"}</span>
          </p>
        </div>
        <div className="col-span-3 grid min-w-0 grid-cols-3 gap-3 border-t border-dashed border-line-2 pt-3 sm:col-span-1 sm:contents sm:border-0 sm:pt-0">
          <div className="min-w-0">
            <p className="label">Market cap</p>
            <p className="num truncate text-[15px] font-medium">{usd(coin.mcapUsd)}</p>
            {coin.progress !== null && !coin.graduated ? (
              <div className="mt-1 h-1.5 w-full max-w-[110px] overflow-hidden rounded-full bg-paper-2" title={`${Math.round(coin.progress)}% to graduation`}>
                <div className="h-full bg-up" style={{ width: `${Math.min(100, coin.progress)}%` }} />
              </div>
            ) : coin.graduated ? (
              <p className="text-[11px] text-up">graduated</p>
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="label">Practice pot</p>
            <p className={`num truncate text-[15px] font-medium ${coin.game.pot > 0 ? "text-pot" : "text-ink-3"}`}>{peth(coin.game.pot)}</p>
            <p className="truncate text-[11px] text-ink-3">
              {coin.game.mode === "raffle" ? "Raffle" : "Hot seat"} · {durationLabel(coin.game.durationSec)}
            </p>
          </div>
          <div className="min-w-0 sm:hidden">
            <p className="label">Clock</p>
            <p className="num truncate text-[15px] font-medium">{live ? clock(coin.game.endsAt!, now) : drawing ? "drawing" : "idle"}</p>
          </div>
        </div>
        <div className="hidden min-w-[92px] text-right sm:block">
          {live ? (
            <span className="num rounded-full bg-amber px-3 py-1 text-[14px] font-medium">{clock(coin.game.endsAt!, now)}</span>
          ) : drawing ? (
            <span className="chip chip-pot">drawing</span>
          ) : (
            <span className="text-[12px] text-ink-3">{coin.latestBuyAt ? `bought ${ago(coin.latestBuyAt, now || undefined)} ago` : "waiting"}</span>
          )}
        </div>
      </Link>
    </li>
  );
}

function EmptyBoard({ sort, query }: { sort: Sort; query: string }) {
  const text = query
    ? "No coin matches that search. Paste a full 0x address to open any coin."
    : sort === "ending"
      ? "No practice round is live. The first entry on any coin sets its timer going."
      : sort === "pots"
        ? "Every pot is empty so far. The first practice buy on a coin starts filling it."
        : "Nothing here yet.";
  return <p className="panel p-6 text-[15px] text-ink-2">{text}</p>;
}

function Tape() {
  const { data } = usePoll<{ items: TapeItem[] }>("/api/tape", 12_000);
  const now = useNow(5000);
  return (
    <aside className="min-w-0" aria-label="Tape">
      <div className="board p-4 xl:sticky xl:top-24">
        <div className="flex items-center justify-between">
          <p className="h-display text-[24px]">Tape</p>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-chalk/60">
            <span className="size-1.5 rounded-full bg-up" style={{ animation: "pulse-dot 1.8s ease-in-out infinite" }} /> live
          </span>
        </div>
        <ul className="mt-3 max-h-[560px] space-y-1 overflow-y-auto pr-1 text-[13px]" data-testid="tape">
          {!data ? <li className="text-chalk/60">Reading trades…</li> : null}
          {data && data.items.length === 0 ? <li className="text-chalk/60">No trades in view right now.</li> : null}
          {data?.items.map((t, i) => (
            <li key={`${t.source}-${t.tx ?? i}-${t.at}-${i}`}>
              <Link href={`/t/${t.coin}`} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-board-2">
                <span
                  className={`w-[3px] self-stretch rounded-full ${t.kind === "sell" ? "bg-down" : t.kind === "win" ? "bg-amber" : t.kind === "launch" ? "bg-brand" : "bg-up"}`}
                />
                <span className="min-w-0 flex-1 truncate text-chalk/85">
                  <span className="font-mono text-chalk/55">{short(t.wallet, 3, 3)}</span>{" "}
                  {t.kind === "launch"
                    ? `launched ${t.symbol}`
                    : t.kind === "win"
                      ? `won ${t.eth.toFixed(4)} on ${t.symbol}`
                      : `${t.kind === "buy" ? "bought" : "sold"} ${t.eth < 0.001 ? t.eth.toFixed(5) : t.eth.toFixed(3)} of ${t.symbol}`}
                </span>
                <span className={`shrink-0 font-mono text-[10px] ${t.source === "chain" ? "text-up" : "text-amber"}`}>
                  {t.source === "chain" ? "chain" : "practice"}
                </span>
                <span className="w-7 shrink-0 text-right font-mono text-[11px] text-chalk/45">{now ? ago(t.at, now) : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-chalk/15 pt-3 text-[11.5px] leading-relaxed text-chalk/50">
          Chain rows are real ETH trades on Robinhood Chain. Practice rows are pETH plays on Cuilby.
        </p>
      </div>
    </aside>
  );
}
