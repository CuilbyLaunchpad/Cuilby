"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Crown, RocketLaunch, Ticket } from "@phosphor-icons/react";
import { BRAND } from "@/config/brand";
import { RollingClock } from "@/components/RollingClock";
import { CoinLogo } from "@/components/coin/CoinLogo";
import { useBoard, useNow, usePoll, useStats } from "@/components/providers/hooks";
import { EthGlyph } from "@/components/ui";
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
  logo?: string | null;
};

const SORTS = [
  { id: "trending", label: "Trending" },
  { id: "ending", label: "Closing soon" },
  { id: "pots", label: "Biggest pots" },
  { id: "new", label: "Newest" },
  { id: "mcap", label: "Market cap" },
] as const;
type Sort = (typeof SORTS)[number]["id"];

/** Board half of the home page: pots closing next, the sortable coin grid and the live tape. */
export function Board() {
  const { data, failed } = useBoard();
  const now = useNow();
  const params = useSearchParams();
  const router = useRouter();
  const sort = (SORTS.some((s) => s.id === params.get("sort")) ? params.get("sort") : "trending") as Sort;

  const coins = useMemo(() => data?.coins ?? [], [data]);
  const running = useMemo(
    () => coins.filter((c) => c.game.endsAt && c.game.endsAt > now).sort((a, b) => (a.game.endsAt ?? 0) - (b.game.endsAt ?? 0)),
    [coins, now],
  );

  const list = useMemo(() => {
    let out = [...coins];
    switch (sort) {
      case "ending":
        out = out.filter((c) => c.game.endsAt && c.game.endsAt > now).sort((a, b) => (a.game.endsAt ?? 0) - (b.game.endsAt ?? 0));
        break;
      case "pots":
        out = out.filter((c) => c.game.pot > 0).sort((a, b) => b.game.pot - a.game.pot);
        break;
      case "new":
        out.sort((a, b) => b.launchedAt - a.launchedAt);
        break;
      case "mcap":
        out.sort((a, b) => (b.mcapUsd ?? 0) - (a.mcapUsd ?? 0));
        break;
      default:
        // Rounds in play first, then the board's own order (latest buy on the launchpad).
        out.sort((a, b) => Number(Boolean(b.game.endsAt && b.game.endsAt > now)) - Number(Boolean(a.game.endsAt && a.game.endsAt > now)));
    }
    return out.slice(0, 60);
  }, [coins, sort, now]);

  const setSort = (id: Sort) => router.replace(id === "trending" ? "/#coins" : `/?sort=${id}#coins`, { scroll: false });

  return (
    <>
      <div className="mb-8">
        <ClosingNext coins={running.slice(0, 3)} now={now} loading={!data && !failed} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section id="coins" aria-labelledby="coins-heading" className="min-w-0 scroll-mt-20">
          <h2 id="coins-heading" className="sr-only">
            Live coins and practice pots on the board
          </h2>
          <div className="mb-4 flex items-center gap-3">
            <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Sort coins">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={sort === s.id}
                  onClick={() => setSort(s.id)}
                  className={`relative h-9 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors ${
                    sort === s.id ? "text-ink" : "bg-card-2 text-fg-2 hover:text-fg"
                  }`}
                >
                  {sort === s.id ? <span className="absolute inset-0 rounded-full bg-fg" /> : null}
                  <span className="relative">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
          {!data ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="surface h-[171px] animate-shimmer bg-[linear-gradient(90deg,transparent,#ffffff08,transparent)] bg-[length:200%_100%]"
                />
              ))}
              {failed ? <p className="text-[13px] text-fg-3 sm:col-span-2 xl:col-span-3">The board could not be read. Retrying…</p> : null}
            </div>
          ) : list.length === 0 ? (
            <EmptyBoard sort={sort} />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="board">
              {list.map((c, i) => (
                <CoinCard key={c.key} coin={c} now={now} delay={Math.min(i, 12) * 30} />
              ))}
            </div>
          )}
          {data && !data.live.ok ? (
            <p className="mt-4 text-[13px] text-down">Live coins could not be read from the launchpad right now. Retrying.</p>
          ) : null}
          <BoardNote />
        </section>
        <Tape />
      </div>
    </>
  );
}

function ClosingNext({ coins, now, loading }: { coins: BoardCoin[]; now: number; loading: boolean }) {
  return (
    <div className="surface flex flex-col p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold">Pots closing next</h2>
        <Link href="/?sort=ending#coins" className="text-[13px] text-fg-3 hover:text-fg">
          All rounds closing soon
        </Link>
      </div>
      {coins.length === 0 ? (
        <div className="tile flex flex-1 flex-col items-center justify-center px-6 py-10 text-center" data-testid="next-draw">
          <p className="display text-[20px] font-bold">{loading ? "Reading the pots…" : "Every clock is stopped."}</p>
          <p className="mt-1 text-[14px] text-fg-2">A round wakes up with its first playing buy. Pick any coin below to start one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="next-draw">
          {coins.map((c) => (
            <Link key={c.key} href={`/t/${c.key}`} className="tile group flex items-center gap-3 px-3 py-3 hover:bg-card-3">
              <CoinLogo src={c.logo} symbol={c.symbol} size={44} />
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-1.5 text-[13px]">
                  {c.game.mode === "raffle" ? (
                    <Ticket size={14} weight="fill" className="shrink-0 text-gold" />
                  ) : (
                    <Crown size={14} weight="fill" className="shrink-0 text-gold" />
                  )}
                  <span className="truncate font-semibold">{c.symbol}</span>
                  <span className="truncate text-fg-3">
                    {c.game.mode === "raffle"
                      ? `${c.game.players} ${c.game.players === 1 ? "player" : "players"}`
                      : c.game.crown
                        ? `crown ${short(c.game.crown, 3, 3)}`
                        : "crown open"}
                  </span>
                </p>
                <p className="display mt-0.5 flex items-center gap-1.5 text-[22px] leading-none font-extrabold text-gold">
                  {peth(c.game.pot)} <EthGlyph size={16} />
                </p>
              </div>
              <div className="shrink-0 text-right">
                <RollingClock text={clock(c.game.endsAt ?? 0, now)} className="text-[20px] font-medium text-fg" />
                <p className="mt-1 flex items-center justify-end gap-0.5 text-[12px] text-fg-3 group-hover:text-fg">
                  {c.game.mode === "raffle" ? "Get a ticket" : "Take the crown"} <ArrowRight size={12} />
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CoinCard({ coin, now, delay }: { coin: BoardCoin; now: number; delay: number }) {
  const g = coin.game;
  const running = g.endsAt !== null && now > 0 && g.endsAt > now;
  const drawing = g.endsAt !== null && now > 0 && g.endsAt <= now;
  const left = running && g.startedAt ? Math.max(0, Math.min(1, (g.endsAt! - now) / (g.endsAt! - g.startedAt))) : 0;
  const Icon = g.mode === "raffle" ? Ticket : Crown;
  return (
    <Link
      href={`/t/${coin.key}`}
      className="surface card-hover group flex min-w-0 animate-rise flex-col gap-3.5 p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <CoinLogo src={coin.logo} symbol={coin.symbol} size={52} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] leading-tight font-semibold">{coin.name}</h3>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-fg-3">
            <span className="truncate font-medium text-fg-2">{coin.symbol}</span>
            <span className="shrink-0">{now ? `${ago(coin.launchedAt, now)} ago` : ""}</span>
            {coin.kind === "practice" ? <span className="shrink-0 rounded-full bg-card-3 px-1.5 text-[11px]">practice coin</span> : null}
          </p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="num text-[19px] leading-none font-medium text-fg">{usd(coin.mcapUsd)}</span>
            {coin.kind === "live" ? (
              coin.graduated ? (
                <span className="num text-[12.5px] text-up">graduated</span>
              ) : coin.progress !== null ? (
                <span className="num text-[12.5px] text-fg-3">{Math.round(coin.progress)}% to pool</span>
              ) : null
            ) : null}
          </p>
        </div>
      </div>
      <div className="tile relative overflow-hidden px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <Icon size={16} weight="fill" className="shrink-0 text-gold" />
          <div className="min-w-0 flex-1">
            <p className="num flex items-center gap-1.5 text-[14px] leading-tight font-medium">
              <span className="text-gold">{peth(g.pot)}</span> <EthGlyph size={14} /> <span className="text-fg-3">pot</span>
            </p>
            <p className="truncate text-[11.5px] text-fg-3">
              {g.mode === "raffle"
                ? running
                  ? `${g.players} ${g.players === 1 ? "player" : "players"} · ${durationLabel(g.durationSec)} raffle`
                  : `Play ${peth(g.bar)}+ for a ticket`
                : g.crown
                  ? `Crown: ${short(g.crown, 4, 4)}`
                  : `Play ${peth(g.bar)}+ to wear the crown`}
            </p>
          </div>
          {running ? (
            <RollingClock text={clock(g.endsAt!, now)} className="text-[14px] font-medium text-fg" />
          ) : drawing ? (
            <span className="text-[11.5px] text-gold">drawing</span>
          ) : (
            <span className="text-[11.5px] text-fg-3">{g.mode === "raffle" ? "idle" : "crown open"}</span>
          )}
        </div>
        {running ? (
          <span
            className="absolute bottom-0 left-0 h-[2px] bg-surge transition-[width] duration-1000"
            style={{ width: `${left * 100}%` }}
          />
        ) : null}
      </div>
    </Link>
  );
}

function EmptyBoard({ sort }: { sort: Sort }) {
  const text =
    sort === "ending"
      ? "No round is counting down. The first playing buy on any coin sets its clock going."
      : sort === "pots"
        ? "Every pot is still empty. The first practice buy on a coin starts filling it."
        : "Nothing is listed yet.";
  return (
    <div className="tile flex flex-col items-center px-6 py-10 text-center">
      <p className="display text-[20px] font-bold">Quiet board.</p>
      <p className="mt-1 max-w-sm text-[14px] text-fg-2">{text}</p>
    </div>
  );
}

function BoardNote() {
  return (
    <p className="mt-5 text-[12.5px] leading-relaxed text-fg-3">
      Live coins come straight from the Pons V2 launchpad on Robinhood Chain, with real prices and trades. Every pot on the board runs in
      practice mode with pETH until the {BRAND.name} contracts go live.{" "}
      <Link href="/docs/fees" className="text-fg-2 underline-offset-2 hover:underline">
        Read how fees fill a pot
      </Link>
      .
    </p>
  );
}

function Tape() {
  const { data } = usePoll<{ items: TapeItem[] }>("/api/tape", 12_000);
  const now = useNow(5000);
  return (
    <aside className="hidden min-w-0 xl:block" aria-label="Live trades">
      <div className="sticky top-20">
        <div className="surface no-scrollbar flex max-h-[calc(100dvh-8rem)] flex-col overflow-y-auto p-2">
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-up" />
            <h2 className="text-[14px] font-semibold">Live trades</h2>
          </div>
          <ul className="flex flex-col" data-testid="tape">
            {!data ? <li className="px-3 py-2 text-[13px] text-fg-3">Reading trades…</li> : null}
            {data && data.items.length === 0 ? <li className="px-3 py-2 text-[13px] text-fg-3">No trades in view right now.</li> : null}
            {data?.items.map((t, i) => (
              <li key={`${t.source}-${t.tx ?? i}-${t.at}-${i}`} className="animate-rise">
                <Link
                  href={`/t/${t.coin}`}
                  className={`flex items-center gap-2.5 rounded-[12px] px-3 py-2 ${t.kind === "win" ? "bg-gold/10 hover:bg-gold/15" : "hover:bg-card-2"}`}
                >
                  {t.kind === "launch" ? (
                    <span className="grid size-[26px] shrink-0 place-items-center rounded-[7px] bg-card-3 text-surge">
                      <RocketLaunch size={14} />
                    </span>
                  ) : (
                    <CoinLogo src={t.logo ?? null} symbol={t.symbol} size={26} />
                  )}
                  <p className="min-w-0 flex-1 truncate text-[13px]">
                    {t.kind === "launch" ? (
                      <>
                        <span className="font-semibold">{t.symbol}</span> <span className="text-fg-3">went on the board</span>
                      </>
                    ) : t.kind === "win" ? (
                      <>
                        <span className="num text-fg-2">{short(t.wallet, 3, 3)}</span> won{" "}
                        <span className="num font-semibold text-gold">{t.eth.toFixed(4)} pETH</span> on {t.symbol}
                      </>
                    ) : (
                      <>
                        <span className="num text-fg-3">{short(t.wallet, 3, 3)}</span>{" "}
                        <span className={t.kind === "buy" ? "text-up" : "text-down"}>{t.kind === "buy" ? "bought" : "sold"}</span>{" "}
                        <span className="num">{t.eth < 0.001 ? t.eth.toFixed(5) : t.eth.toFixed(3)}</span>{" "}
                        <span className="text-fg-3">of</span> <span className="font-semibold">{t.symbol}</span>
                      </>
                    )}
                  </p>
                  <span
                    className={`shrink-0 text-[10px] ${t.source === "chain" ? "text-up" : "text-gold"}`}
                    title={t.source === "chain" ? "Real trade on Robinhood Chain" : "Practice play"}
                  >
                    {t.source === "chain" ? "chain" : "pETH"}
                  </span>
                  <span className="w-7 shrink-0 text-right text-[11px] text-fg-3">{now ? ago(t.at, now) : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

/** "x pETH paid to practice winners so far", read live. */
export function PaidSoFar() {
  const { data } = useStats();
  return <span className="num text-[15px] text-fg">{data?.practice ? `${peth(data.practice.paid)} pETH` : "–"}</span>;
}
