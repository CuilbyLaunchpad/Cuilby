"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, Crown, Info } from "@phosphor-icons/react";
import { BRAND, CHAIN, PONS, explorerAddress, explorerToken } from "@/config/brand";
import { RollingClock } from "@/components/RollingClock";
import { CoinLogo } from "@/components/coin/CoinLogo";
import { PlayPanel } from "@/components/coin/PlayPanel";
import { PriceChart, type ChartPoint } from "@/components/coin/PriceChart";
import { RoundsTab } from "@/components/coin/RoundsTab";
import { usePractice } from "@/components/providers/PracticeProvider";
import { useCoin, useNow, usePoll } from "@/components/providers/hooks";
import { ChainTrade } from "@/components/trade/ChainTrade";
import { EthGlyph, ModeBadge } from "@/components/ui";
import { useWallet } from "@/components/wallet/WalletProvider";
import type { CoinDetail } from "@/lib/board";
import { ago, clock, durationLabel, peth, price, short, tokens, usd } from "@/lib/format";

type Market = {
  live: boolean;
  chart: ChartPoint[];
  trades: { side: "buy" | "sell"; account: string; eth: number; tokens: number; at: number; tx: string }[];
  holders: { address: string; share: number; tokens: number }[];
  practice: { side: "buy" | "sell"; wallet: string; eth: number; tokens: number; play: boolean; at: number }[];
  practiceHolders: { address: string; tokens: number }[];
  error: string | null;
};

const RANGES = ["5m", "1h", "6h", "1d", "all"] as const;
const TABS = ["Trades", "Practice plays", "Holders", "Rounds", "About"] as const;
type Tab = (typeof TABS)[number];

export function CoinPage({ coinKey }: { coinKey: string }) {
  const { data: coin, failed, reload } = useCoin(coinKey);
  const [range, setRange] = useState<(typeof RANGES)[number]>("1h");
  const { data: market, reload: reloadMarket } = usePoll<Market>(`/api/coins/${coinKey}/market?range=${range}`, 15_000);
  const { data: board } = usePoll<{ ethUsd: number | null }>("/api/stats", 60_000);
  const now = useNow();
  const live = coinKey.startsWith("0x");
  const [tab, setTab] = useState<Tab>(live ? "Trades" : "Practice plays");

  if (!coin) {
    return (
      <div className="surface mx-auto flex max-w-lg flex-col items-center px-6 py-14 text-center">
        <h1 className="display text-[28px] font-extrabold">{failed ? "This coin is not on the board" : "Reading the coin…"}</h1>
        {failed ? (
          <>
            <p className="mt-1.5 text-[14px] text-fg-2">
              Live coins come from the Pons V2 launchpad and only launches priced in ETH are listed. Check the address or pick another coin.
            </p>
            <Link href="/" className="btn-surge mt-5 inline-flex h-11 items-center rounded-full px-6 text-[15px] font-bold">
              Back to the coin board
            </Link>
          </>
        ) : null}
      </div>
    );
  }

  const paid = coin.history.reduce((s, h) => s + h.prize, 0);
  const holders = live
    ? market
      ? market.holders.length >= 50
        ? "50+"
        : String(market.holders.length)
      : "–"
    : String(market?.practiceHolders.length ?? "–");

  return (
    <>
      <section className="mb-4 flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <CoinLogo src={coin.logo} symbol={coin.symbol} size={72} alt={`${coin.name} logo`} className="md:size-[84px]" />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="display truncate text-[28px] leading-none font-extrabold md:text-[36px]">{coin.name}</h1>
              <ModeBadge mode={coin.game.mode} />
              {coin.kind === "practice" ? (
                <span className="rounded-full bg-card-3 px-2.5 py-1 text-[12px] text-fg-2">Practice coin</span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-fg-3">
              <span className="font-semibold text-fg-2">{coin.symbol}</span>
              {live ? <AddressCopy address={coin.key} /> : <span className="num rounded-full bg-card-2 px-2 py-0.5">{coin.key}</span>}
              <span>
                by{" "}
                <a href={explorerAddress(coin.creator)} target="_blank" rel="noreferrer" className="num hover:text-fg">
                  {short(coin.creator, 3, 3)}
                </a>
              </span>
              <span>{now ? `${ago(coin.launchedAt, now)} ago` : ""}</span>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-1 md:flex md:gap-8">
          <div>
            <dt className="text-[12px] text-fg-3">Market cap</dt>
            <dd className="num text-[16px] leading-tight md:text-[22px]">{usd(coin.mcapUsd)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-fg-3">Price</dt>
            <dd className="num text-[16px] leading-tight md:text-[22px]">{price(coin.priceUsd)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-fg-3">{live ? "To pool" : "Kind"}</dt>
            <dd className={`num text-[16px] leading-tight md:text-[22px] ${coin.graduated ? "text-up" : ""}`}>
              {live ? (coin.graduated ? "Done" : coin.progress !== null ? `${Math.round(coin.progress)}%` : "–") : "Practice"}
            </dd>
          </div>
          <div className="hidden md:block">
            <dt className="text-[12px] text-fg-3">Holders</dt>
            <dd className="num text-[22px] leading-tight">{holders}</dd>
          </div>
          <div className="hidden lg:block">
            <dt className="text-[12px] text-fg-3">Paid out</dt>
            <dd className="num text-[22px] leading-tight text-gold">{peth(paid)}</dd>
          </div>
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-4 [grid-template-areas:'stage'_'trade'_'chart'_'tabs'] lg:grid-cols-[minmax(0,1fr)_380px] lg:[grid-template-areas:'stage_trade'_'chart_trade'_'tabs_trade']">
        <div className="min-w-0 [grid-area:stage]">
          <PotStage coin={coin} now={now} />
        </div>

        <div className="min-w-0 [grid-area:trade] lg:row-span-3">
          <div className="flex flex-col gap-4 lg:sticky lg:top-20">
            <PlayPanel
              coin={coin}
              onDone={() => {
                reload();
                reloadMarket();
              }}
            />
            {live ? (
              <ChainTrade
                token={coin.key}
                symbol={coin.symbol}
                title="Real trade on Pons"
                note="A real ETH trade on Robinhood Chain through the Pons V2 contracts. It does not enter the practice pot, which stays practice until the Cuilby contracts ship."
              />
            ) : null}
            <p className="px-2 text-center text-[11.5px] leading-relaxed text-fg-3">
              18+ only. Pots pay by chance; play only with what you can afford to lose. Practice pETH has no value and cannot be withdrawn.
            </p>
          </div>
        </div>

        <div className="min-w-0 [grid-area:chart]">
          <section className="surface p-3 md:p-4" aria-label="Market cap chart">
            <div className="mb-2 flex items-center gap-1 px-1">
              {live ? (
                RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`num h-7 rounded-full px-2.5 text-[12px] ${range === r ? "bg-card-3 text-fg" : "text-fg-3 hover:text-fg"}`}
                  >
                    {r}
                  </button>
                ))
              ) : (
                <span className="text-[12px] text-fg-3">Practice curve</span>
              )}
              <span className="ml-2 hidden text-[12px] text-fg-3 sm:inline">{live ? "Market cap, USD" : ""}</span>
              {live ? (
                <div className="ml-auto flex gap-3 text-[12px] text-fg-3">
                  <a href={PONS.page(coin.key)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-fg">
                    Pons <ArrowUpRight size={11} />
                  </a>
                  <a
                    href={explorerToken(coin.key)}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden items-center gap-0.5 hover:text-fg sm:inline-flex"
                  >
                    Explorer <ArrowUpRight size={11} />
                  </a>
                </div>
              ) : null}
            </div>
            {live ? (
              <PriceChart points={market?.chart ?? []} ethUsd={board?.ethUsd ?? null} supply={1_000_000_000} />
            ) : (
              <PracticeCurveNote coin={coin} />
            )}
          </section>
        </div>

        <div className="min-w-0 [grid-area:tabs]">
          <section className="surface p-2 md:p-3" aria-label="Coin activity">
            <div className="no-scrollbar flex gap-1 overflow-x-auto p-1" role="tablist">
              {TABS.filter((t) => live || t !== "Trades").map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`relative h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium ${tab === t ? "text-fg" : "text-fg-3 hover:text-fg"}`}
                >
                  {tab === t ? <span className="absolute inset-0 rounded-full bg-card-3" /> : null}
                  <span className="relative">
                    {t}
                    {t === "Holders" && holders !== "–" ? ` ${holders}` : ""}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-1" data-testid="coin-tab">
              {market?.error && (tab === "Trades" || tab === "Holders") ? (
                <p className="px-3 py-2 text-[13px] text-down">{market.error}</p>
              ) : null}
              {tab === "Trades" ? <ChainTrades market={market} symbol={coin.symbol} now={now} /> : null}
              {tab === "Practice plays" ? <PracticePlays market={market} symbol={coin.symbol} now={now} /> : null}
              {tab === "Holders" ? <Holders market={market} live={live} creator={coin.creator} /> : null}
              {tab === "Rounds" ? <RoundsTab coin={coin} /> : null}
              {tab === "About" ? <About coin={coin} /> : null}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function AddressCopy({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          // The address stays visible for manual copy.
        }
      }}
      className="num inline-flex items-center gap-1 rounded-full bg-card-2 px-2 py-0.5 hover:text-fg"
      title={address}
      aria-label="Copy contract address"
    >
      {short(address, 4, 4)} {copied ? <Check size={12} className="text-up" /> : <Copy size={12} />}
    </button>
  );
}

/** The pot: amount, ring clock, who leads, and the rules on demand. */
function PotStage({ coin, now }: { coin: CoinDetail; now: number }) {
  const { account } = usePractice();
  const { address } = useWallet();
  const { data: stats } = usePoll<{ ethUsd: number | null }>("/api/stats", 60_000);
  const g = coin.game;
  const running = g.endsAt !== null && now > 0 && g.endsAt > now;
  const drawing = g.endsAt !== null && now > 0 && g.endsAt <= now;
  const total = coin.tickets.reduce((s, t) => s + t.weight, 0);
  const mine = address ? (coin.tickets.find((t) => t.wallet === address.toLowerCase())?.weight ?? 0) : 0;
  const locked = account?.positions[coin.key]?.locked ?? 0;
  const [open, setOpen] = useState(false);
  const left = running && g.startedAt ? Math.max(0, Math.min(1, (g.endsAt! - now) / (g.endsAt! - g.startedAt))) : 0;
  const clockText = running ? clock(g.endsAt!, now) : drawing ? "0:00" : durationLabel(g.durationSec);
  const C = 2 * Math.PI * 54;
  return (
    <section className="surface relative isolate overflow-hidden p-5 md:p-7" data-testid="pot-ticket" aria-label="Pot">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(520px_240px_at_100%_0%,rgb(243_189_82/0.10),transparent_70%)]" />
      {}
      <img
        src="/art/clock.webp"
        alt=""
        width={200}
        height={200}
        loading="lazy"
        className="float pointer-events-none absolute right-4 bottom-3 -z-10 hidden w-[92px] lg:block"
      />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <p className="mb-3">
            <ModeBadge mode={g.mode} suffix={`round ${g.round}`} />
          </p>
          <p className="text-[13px] font-medium text-fg-2">
            {g.mode === "raffle" ? "One ticket is drawn to win" : "Whoever holds the crown at zero wins"}
          </p>
          <p className="display mt-1 text-[44px] leading-none font-extrabold md:text-[56px]">
            <span className="text-gold" data-testid="pot-amount">
              {peth(g.pot)}
              <span className="sr-only"> pETH</span>
            </span>
            <span className="ml-2 inline-flex items-center gap-2 align-middle text-[0.42em] font-bold text-fg-3" aria-hidden="true">
              <EthGlyph size={26} /> pETH
            </span>
          </p>
          <p className="mt-1.5 text-[14px] text-fg-3">
            {stats?.ethUsd ? <span className="num">{usd((g.pot / 1_000_000) * stats.ethUsd, false)} if it were ETH, </span> : null}
            winner takes <span className="num text-fg-2">{peth(Math.floor(g.pot * 0.8))} pETH</span>
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="relative grid size-[132px] shrink-0 place-items-center md:size-[148px]">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-card-3)" strokeWidth="6" />
              {running ? (
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="var(--color-surge)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - left)}
                  className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
              ) : null}
            </svg>
            <div className="relative text-center">
              <span className="sr-only" data-testid="pot-clock">
                {clockText}
              </span>
              {running ? (
                <RollingClock text={clockText} className="text-[30px] font-semibold text-fg" />
              ) : (
                <p className="num text-[26px] leading-none font-semibold text-fg-2" aria-hidden="true">
                  {clockText}
                </p>
              )}
              <p className="mt-1 text-[11px] text-fg-3">{running ? "left on the clock" : drawing ? "drawing" : "clock"}</p>
            </div>
          </div>
          <div className="min-w-0 md:w-[200px]">
            {g.mode === "hotseat" ? (
              g.crown ? (
                <>
                  <p className="text-[12px] text-fg-3">Crown holder</p>
                  <p className="num mt-1 text-[15px] text-fg">{short(g.crown, 4, 4)}</p>
                  <p className="mt-1 text-[13px] leading-snug text-fg-2">
                    Buy {peth(g.bar)}+ pETH to take it and wind the clock back to {durationLabel(g.durationSec)}.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[12px] text-fg-3">Nobody holds the crown</p>
                  <p className="mt-1 text-[13px] leading-snug text-fg-2">
                    A {peth(g.bar)}+ pETH play takes it and starts the {durationLabel(g.durationSec)} clock.
                  </p>
                </>
              )
            ) : running ? (
              <>
                <p className="text-[12px] text-fg-3">Tickets in the drum</p>
                <p className="num mt-1 text-[15px] text-fg">
                  {g.players} {g.players === 1 ? "player" : "players"} · {peth(total)} pETH
                </p>
                <p className="mt-1 text-[13px] leading-snug text-fg-2">Each ticket weighs what it spent. More pETH, better odds.</p>
              </>
            ) : (
              <>
                <p className="text-[12px] text-fg-3">No tickets yet</p>
                <p className="mt-1 text-[13px] leading-snug text-fg-2">
                  The first {peth(g.bar)}+ pETH play starts the {durationLabel(g.durationSec)} clock for everyone.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      {address && g.mode === "raffle" && total > 0 ? (
        <p className="tile relative mt-4 px-3 py-2 text-[13px] text-fg-2">
          {mine > 0
            ? `Your tickets: ${peth(mine)} of ${peth(total)} pETH, a ${((mine / total) * 100).toFixed(1)}% chance. ${tokens(locked)} coins wait for the draw.`
            : "You have no ticket in this round yet."}
        </p>
      ) : null}
      {address && g.mode === "hotseat" && g.crown === address.toLowerCase() ? (
        <p className="tile relative mt-4 px-3 py-2 text-[13px] text-gold">You hold the crown. Hold on to it until time is up.</p>
      ) : null}
      <div className="relative mt-5 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg"
        >
          <Info size={14} /> Pot rules
        </button>
        {open ? (
          <div className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-fg-2">
            {g.mode === "raffle" ? (
              <p>
                Every playing buy of {peth(g.bar)} pETH or more becomes a ticket sized by what it spent. The {durationLabel(g.durationSec)}{" "}
                clock starts with the first ticket and never moves. At zero, the hash of the next Robinhood Chain block picks one ticket:
                80% of the pot goes to its owner and 20% seeds the next round. Coins bought as tickets wait until the draw.
              </p>
            ) : (
              <p>
                A buy of {peth(g.bar)} pETH or more takes the crown and winds the {durationLabel(g.durationSec)} clock back to full. Coins
                from the crowning buy wait with the crown and return as soon as another player claims it. At zero, the crown collects 80% of
                the pot.
              </p>
            )}
            <p className="mt-2">
              Every buy and sell pays a 1% fee: 60% to the pot, 20% to the creator, 20% to {BRAND.name}.{" "}
              <Link href={g.mode === "raffle" ? "/docs/raffle" : "/docs/hot-seat"} className="font-semibold text-surge hover:underline">
                Read the full {g.mode === "raffle" ? "raffle" : "hot seat"} rules
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PracticeCurveNote({ coin }: { coin: CoinDetail }) {
  return (
    <div className="tile grid min-h-[220px] place-items-center px-5 py-8 text-center">
      <div className="max-w-md text-[14px] leading-relaxed text-fg-2">
        <p>
          This coin lives only in practice. It trades on a simple curve, 2 virtual ETH against 1,000,000,000 coins, so its price climbs with
          every buy and is not a market price.
        </p>
        <p className="num mt-2 text-[13px] text-fg-3">Current price {coin.priceEth ? `${coin.priceEth.toExponential(3)} pETH` : "–"}</p>
      </div>
    </div>
  );
}

function Table({
  head,
  children,
  empty,
  right = [],
}: {
  head: string[];
  children: React.ReactNode;
  empty: string | null;
  right?: number[];
}) {
  if (empty) return <p className="px-3 py-6 text-center text-[13px] text-fg-3">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-[13px]">
        <thead className="text-left text-[12px] text-fg-3">
          <tr>
            {head.map((h, i) => (
              <th key={h + i} className={`px-3 py-2 font-normal ${right.includes(i) ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const fmtEth = (v: number) => (v < 0.001 ? v.toFixed(6) : v.toFixed(4));

function ChainTrades({ market, symbol, now }: { market: Market | null; symbol: string; now: number }) {
  const rows = market?.trades ?? [];
  return (
    <Table
      head={["Account", "Side", "ETH", symbol, "Age"]}
      right={[2, 3, 4]}
      empty={!market ? "Reading trades…" : rows.length ? null : "No trades read for this coin yet."}
    >
      {rows.map((t, i) => (
        <tr key={`${t.tx}-${i}`} className="animate-rise border-t border-line">
          <td className="px-3 py-2">
            <a href={explorerAddress(t.account)} target="_blank" rel="noreferrer" className="num text-fg-2 hover:text-fg">
              {short(t.account, 3, 4)}
            </a>
          </td>
          <td className={`px-3 py-2 font-medium ${t.side === "buy" ? "text-up" : "text-down"}`}>{t.side === "buy" ? "Buy" : "Sell"}</td>
          <td className="num px-3 py-2 text-right">{fmtEth(t.eth)}</td>
          <td className="num px-3 py-2 text-right text-fg-2">{tokens(t.tokens)}</td>
          <td className="px-3 py-2 text-right">
            {t.tx ? (
              <a
                href={`${CHAIN.explorer}/tx/${t.tx}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-fg-3 hover:text-fg"
              >
                {now ? ago(t.at, now) : ""} <ArrowUpRight size={11} />
              </a>
            ) : (
              <span className="text-fg-3">{now ? ago(t.at, now) : ""}</span>
            )}
          </td>
        </tr>
      ))}
    </Table>
  );
}

function PracticePlays({ market, symbol, now }: { market: Market | null; symbol: string; now: number }) {
  const rows = market?.practice ?? [];
  return (
    <Table
      head={["Wallet", "Side", "pETH", symbol, "Age"]}
      right={[2, 3, 4]}
      empty={!market ? "Reading plays…" : rows.length ? null : "No practice plays on this coin yet. The first ticket starts the round."}
    >
      {rows.map((t, i) => (
        <tr key={i} className="animate-rise border-t border-line">
          <td className="px-3 py-2">
            <span className="num text-fg-2">{short(t.wallet, 3, 4)}</span>
            {t.play ? (
              <span className="ml-1.5 align-middle text-gold" title="Counted for the pot">
                <Crown size={11} weight="fill" className="inline" />
              </span>
            ) : null}
          </td>
          <td className={`px-3 py-2 font-medium ${t.side === "buy" ? "text-up" : "text-down"}`}>{t.side === "buy" ? "Buy" : "Sell"}</td>
          <td className="num px-3 py-2 text-right">{peth(t.eth)}</td>
          <td className="num px-3 py-2 text-right text-fg-2">{tokens(t.tokens)}</td>
          <td className="px-3 py-2 text-right text-fg-3">{now ? ago(t.at, now) : ""}</td>
        </tr>
      ))}
    </Table>
  );
}

function Holders({ market, live, creator }: { market: Market | null; live: boolean; creator: string }) {
  const [view, setView] = useState<"chain" | "practice">(live ? "chain" : "practice");
  const chainRows = market?.holders ?? [];
  const practiceRows = market?.practiceHolders ?? [];
  return (
    <div>
      {live ? (
        <div className="flex gap-1 px-2 pt-1 pb-2">
          {(["chain", "practice"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`h-7 rounded-full px-2.5 text-[12px] ${view === v ? "bg-card-3 text-fg" : "text-fg-3 hover:text-fg"}`}
            >
              {v === "chain" ? "On chain" : "Practice"}
            </button>
          ))}
        </div>
      ) : null}
      {view === "chain" ? (
        <Table
          head={["#", "Holder", "Share", "Coins"]}
          right={[2, 3]}
          empty={!market ? "Reading holders…" : chainRows.length ? null : "No holders read yet."}
        >
          {chainRows.map((h, i) => (
            <tr key={h.address} className="border-t border-line">
              <td className="num px-3 py-2 text-fg-3">{i + 1}</td>
              <td className="px-3 py-2">
                <a href={explorerAddress(h.address)} target="_blank" rel="noreferrer" className="num text-fg-2 hover:text-fg">
                  {short(h.address, 4, 4)}
                </a>
                {i === 0 && h.share > 30 ? (
                  <span className="ml-2 rounded-full bg-card-3 px-2 py-0.5 text-[11px] text-fg-3">curve or pool</span>
                ) : null}
                {h.address === creator ? (
                  <span className="ml-2 rounded-full bg-surge/10 px-2 py-0.5 text-[11px] text-surge">creator</span>
                ) : null}
              </td>
              <td className="num px-3 py-2 text-right">{h.share.toFixed(2)}%</td>
              <td className="num px-3 py-2 text-right text-fg-2">{tokens(h.tokens)}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <Table
          head={["#", "Wallet", "Practice coins"]}
          right={[2]}
          empty={!market ? "Reading holders…" : practiceRows.length ? null : "Nobody holds this coin in practice yet."}
        >
          {practiceRows.map((h, i) => (
            <tr key={h.address} className="border-t border-line">
              <td className="num px-3 py-2 text-fg-3">{i + 1}</td>
              <td className="num px-3 py-2 text-fg-2">{short(h.address, 4, 4)}</td>
              <td className="num px-3 py-2 text-right">{tokens(h.tokens)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function About({ coin }: { coin: CoinDetail }) {
  const live = coin.kind === "live";
  return (
    <div className="space-y-4 px-3 py-3 text-[14px] leading-relaxed text-fg-2">
      <p>{coin.description || "The creator did not add a description."}</p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="tile px-3 py-2.5">
          <dt className="text-[12px] text-fg-3">Game</dt>
          <dd>
            {coin.game.mode === "raffle" ? "Raffle" : "Hot seat"}, {durationLabel(coin.game.durationSec)} rounds (practice)
          </dd>
        </div>
        <div className="tile min-w-0 px-3 py-2.5">
          <dt className="text-[12px] text-fg-3">{live ? "Token contract" : "Practice id"}</dt>
          <dd className="num text-[13px] break-all">
            {live ? (
              <a href={explorerToken(coin.key)} target="_blank" rel="noreferrer" className="hover:text-fg">
                {coin.key}
              </a>
            ) : (
              coin.key
            )}
          </dd>
        </div>
        <div className="tile px-3 py-2.5">
          <dt className="text-[12px] text-fg-3">Launched</dt>
          <dd>{new Date(coin.launchedAt).toLocaleString("en-US")}</dd>
        </div>
        <div className="tile px-3 py-2.5">
          <dt className="text-[12px] text-fg-3">Where it trades</dt>
          <dd>{live ? (coin.graduated ? "Uniswap v4 pool, graduated from Pons" : "Pons V2 bonding curve") : "Practice curve on Cuilby"}</dd>
        </div>
      </dl>
      {coin.links && (coin.links.x || coin.links.telegram || coin.links.website) ? (
        <p className="flex flex-wrap gap-4 text-[13px]">
          {coin.links.x ? (
            <a
              href={coin.links.x}
              target="_blank"
              rel="noreferrer nofollow"
              className="inline-flex items-center gap-0.5 text-surge hover:underline"
            >
              {coin.symbol} on X <ArrowUpRight size={11} />
            </a>
          ) : null}
          {coin.links.telegram ? (
            <a
              href={coin.links.telegram}
              target="_blank"
              rel="noreferrer nofollow"
              className="inline-flex items-center gap-0.5 text-surge hover:underline"
            >
              {coin.symbol} on Telegram <ArrowUpRight size={11} />
            </a>
          ) : null}
          {coin.links.website ? (
            <a
              href={coin.links.website}
              target="_blank"
              rel="noreferrer nofollow"
              className="inline-flex items-center gap-0.5 text-surge hover:underline"
            >
              {coin.symbol} website <ArrowUpRight size={11} />
            </a>
          ) : null}
        </p>
      ) : null}
      {live ? (
        <p className="text-[13px] text-fg-3">
          Someone else launched this coin on the Pons V2 launchpad. {BRAND.name} shows its live data and runs a practice pot beside it; it
          has no control over the coin itself.
        </p>
      ) : null}
    </div>
  );
}
