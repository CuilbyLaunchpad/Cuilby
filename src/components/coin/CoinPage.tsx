"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Info } from "lucide-react";
import { CHAIN, PONS, explorerAddress, explorerToken } from "@/config/brand";
import { CoinLogo } from "@/components/coin/CoinLogo";
import { PlayPanel } from "@/components/coin/PlayPanel";
import { PriceChart, type ChartPoint } from "@/components/coin/PriceChart";
import { RoundsTab } from "@/components/coin/RoundsTab";
import { usePractice } from "@/components/providers/PracticeProvider";
import { useCoin, useNow, usePoll } from "@/components/providers/hooks";
import { ChainTrade } from "@/components/trade/ChainTrade";
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
      <main className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
        <p className="panel p-6 text-ink-2">
          {failed ? (
            <>
              This coin is not on the board right now. Live coins come from the Pons launchpad; only ETH-priced launches are listed.{" "}
              <Link href="/" className="text-brand underline">
                Back to the board
              </Link>
            </>
          ) : (
            "Reading the coin…"
          )}
        </p>
      </main>
    );
  }

  const paid = coin.history.reduce((s, h) => s + h.prize, 0);
  const stats = [
    { k: "Market cap", v: usd(coin.mcapUsd) },
    { k: "Price", v: price(coin.priceUsd) },
    { k: live ? "Graduation" : "Kind", v: live ? (coin.graduated ? "Done" : coin.progress !== null ? `${Math.round(coin.progress)}%` : "–") : "Practice" },
    { k: "Holders", v: live ? (market ? String(market.holders.length >= 50 ? "50+" : market.holders.length) : "–") : String(market?.practiceHolders.length ?? "–") },
    { k: "Paid out", v: `${peth(paid)} pETH`, tone: "text-pot" },
  ];

  return (
    <main className="mx-auto max-w-[1280px] px-4 pt-8 pb-10 sm:px-6">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <CoinLogo src={coin.logo} symbol={coin.symbol} size={68} />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="h-display truncate text-[36px] sm:text-[44px]">{coin.name}</h1>
              <span className={`chip ${coin.kind === "live" ? "chip-up" : "chip-brand"}`}>{coin.kind === "live" ? "Live on Robinhood Chain" : "Practice coin"}</span>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
              <span className="font-mono font-medium text-ink">{coin.symbol}</span>
              {live ? <AddressCopy address={coin.key} /> : <span className="font-mono">{coin.key}</span>}
              <span>
                by{" "}
                <a href={explorerAddress(coin.creator)} target="_blank" rel="noreferrer" className="font-mono underline-offset-2 hover:underline">
                  {short(coin.creator, 3, 3)}
                </a>
              </span>
              <span>{now ? `${ago(coin.launchedAt, now)} ago` : ""}</span>
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.k} className="min-w-0">
              <dt className="label">{s.k}</dt>
              <dd className={`num truncate text-[18px] font-medium ${s.tone ?? ""}`}>{s.v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          <PotTicket coin={coin} now={now} />

          <section className="panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1">
                {live ? (
                  RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      className={`cursor-pointer rounded-full px-3 py-1 font-mono text-[12px] ${range === r ? "bg-ink text-chalk" : "text-ink-2 hover:bg-paper-2"}`}
                    >
                      {r}
                    </button>
                  ))
                ) : (
                  <span className="label">Practice coin · priced on its practice curve</span>
                )}
              </div>
              {live ? (
                <span className="flex gap-3 text-[12.5px]">
                  <a href={`https://dexscreener.com/robinhood/${coin.key}`} target="_blank" rel="noreferrer" className="text-ink-2 hover:text-ink">
                    DexScreener ↗
                  </a>
                  <a href={PONS.page(coin.key)} target="_blank" rel="noreferrer" className="text-ink-2 hover:text-ink">
                    Pons ↗
                  </a>
                </span>
              ) : null}
            </div>
            <div className="mt-3">
              {live ? (
                <PriceChart points={market?.chart ?? []} ethUsd={board?.ethUsd ?? null} supply={1_000_000_000} />
              ) : (
                <PracticeCurveNote coin={coin} />
              )}
            </div>
          </section>

          <section>
            <div className="scroll-x flex gap-1 border-b-[1.5px] border-ink" role="tablist">
              {TABS.filter((t) => live || t !== "Trades").map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`-mb-[1.5px] shrink-0 cursor-pointer rounded-t-xl border-[1.5px] px-4 py-2 text-[14px] font-semibold ${
                    tab === t ? "border-ink border-b-paper bg-paper" : "border-transparent text-ink-3 hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="pt-4" data-testid="coin-tab">
              {market?.error && (tab === "Trades" || tab === "Holders") ? <p className="mb-3 text-[13px] text-down">{market.error}</p> : null}
              {tab === "Trades" ? <ChainTrades market={market} symbol={coin.symbol} now={now} /> : null}
              {tab === "Practice plays" ? <PracticePlays market={market} symbol={coin.symbol} now={now} /> : null}
              {tab === "Holders" ? <Holders market={market} live={live} creator={coin.creator} /> : null}
              {tab === "Rounds" ? <RoundsTab coin={coin} /> : null}
              {tab === "About" ? <About coin={coin} /> : null}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
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
              title="Real trade"
              note="A real ETH trade on Robinhood Chain through the Pons contracts. It does not enter the practice pot: pots stay practice until the Cuilby contracts ship."
            />
          ) : null}
          <p className="rounded-xl border border-dashed border-line-2 p-4 text-[12.5px] leading-relaxed text-ink-3">
            18+ only. Pots are chance-based. Play only with what you can afford to lose. Practice pETH has no value and cannot be
            withdrawn.
          </p>
        </aside>
      </div>
    </main>
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
      className="flex cursor-pointer items-center gap-1 rounded-full bg-paper-2 px-2 py-0.5 font-mono text-ink-2 hover:text-ink"
      title={address}
    >
      {short(address, 4, 4)} {copied ? <Check className="size-3 text-up" /> : <Copy className="size-3" />}
    </button>
  );
}

function PotTicket({ coin, now }: { coin: CoinDetail; now: number }) {
  const { account } = usePractice();
  const { address } = useWallet();
  const g = coin.game;
  const running = g.endsAt !== null && now > 0 && g.endsAt > now;
  const drawing = g.endsAt !== null && now > 0 && g.endsAt <= now;
  const total = coin.tickets.reduce((s, t) => s + t.weight, 0);
  const mine = address ? (coin.tickets.find((t) => t.wallet === address.toLowerCase())?.weight ?? 0) : 0;
  const locked = account?.positions[coin.key]?.locked ?? 0;
  const [open, setOpen] = useState(false);
  return (
    <section className="ticket overflow-hidden" data-testid="pot-ticket">
      <div className="flex flex-col sm:flex-row">
        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-amber">
              {g.mode === "raffle" ? "Raffle" : "Hot seat"} · round {g.round}
            </span>
            <span className="chip chip-flat">practice pot</span>
          </div>
          <p className="mt-3 text-[14px] text-ink-2">{g.mode === "raffle" ? "A random ticket takes the pot" : "Last big buyer standing takes the pot"}</p>
          <p className="h-display mt-1 text-[56px] text-pot sm:text-[68px]" data-testid="pot-amount">
            {peth(g.pot)}
            <span className="ml-2 text-[24px] text-ink-3">pETH</span>
          </p>
          <p className="mt-1 font-mono text-[13px] text-ink-2">winner takes {peth(Math.floor(g.pot * 0.8))} · {peth(g.pot - Math.floor(g.pot * 0.8))} rolls over</p>
          {address && g.mode === "raffle" && total > 0 ? (
            <p className="mt-4 rounded-xl bg-brand-soft px-3 py-2 text-[13.5px] text-brand-deep">
              {mine > 0
                ? `Your tickets: ${peth(mine)} pETH of ${peth(total)}, a ${((mine / total) * 100).toFixed(1)}% chance. ${tokens(locked)} coins held until the draw.`
                : "You hold no ticket in this round yet."}
            </p>
          ) : null}
          {address && g.mode === "hotseat" && g.crown ? (
            <p className="mt-4 rounded-xl bg-brand-soft px-3 py-2 text-[13.5px] text-brand-deep">
              {g.crown === address.toLowerCase() ? "You hold the crown. Keep it until the timer hits zero." : `Buy ${peth(g.bar)} pETH or more to take the crown.`}
            </p>
          ) : null}
          <button type="button" onClick={() => setOpen((v) => !v)} className="mt-4 flex cursor-pointer items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
            <Info className="size-3.5" /> How this pot works
          </button>
          {open ? (
            <div className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
              {g.mode === "raffle" ? (
                <p>
                  Each playing buy from {peth(g.bar)} pETH up counts as an entry sized by its ETH. The timer ({durationLabel(g.durationSec)})
                  starts on the round&apos;s first ticket. When it ends, the hash of the first Robinhood Chain block after the close picks one
                  ticket. 80% of the pot goes to its owner, 20% starts the next round. Coins bought as tickets are held until the draw.
                </p>
              ) : (
                <p>
                  A buy of at least {peth(g.bar)} pETH grabs the crown and rewinds the {durationLabel(g.durationSec)} clock. Coins from the
                  crowning buy wait in the crown and come back the moment someone else takes it. At zero, the crown collects 80%
                  of the pot.
                </p>
              )}
              <p className="mt-2">
                Fees: 1% on every buy and sell, split 60% pot, 20% creator, 20% Cuilby. <Link href={g.mode === "raffle" ? "/docs/raffle" : "/docs/hot-seat"} className="text-brand underline">Full rules</Link>
              </p>
            </div>
          ) : null}
        </div>
        <div className="perf perf-y flex w-full shrink-0 flex-row items-center justify-between gap-3 bg-amber p-5 sm:w-[210px] sm:flex-col sm:justify-center sm:text-center">
          <div>
            <p className="label text-ink">{running ? "left on the clock" : drawing ? "clock" : "clock"}</p>
            <p className="h-display num mt-1 text-[44px]" data-testid="pot-clock">
              {running ? clock(g.endsAt!, now) : drawing ? "0:00" : durationLabel(g.durationSec)}
            </p>
          </div>
          <p className="max-w-[160px] text-[12.5px] font-semibold">
            {running
              ? g.mode === "raffle"
                ? `${g.players} ${g.players === 1 ? "player" : "players"}`
                : `Crown ${g.crown ? short(g.crown, 3, 3) : "–"}`
              : drawing
                ? "Drawing on the next block…"
                : g.mode === "raffle"
                  ? "Starts on the first ticket"
                  : "Starts on the first crown"}
          </p>
        </div>
      </div>
    </section>
  );
}

function PracticeCurveNote({ coin }: { coin: CoinDetail }) {
  return (
    <div className="rounded-xl bg-paper p-5 text-[14px] leading-relaxed text-ink-2">
      <p>
        This coin exists only in practice. It trades on a simple practice curve (2 virtual ETH against 1,000,000,000 coins, price
        rises with every buy), so its price is not a market price.
      </p>
      <p className="mt-2 font-mono text-[13px]">Current price: {coin.priceEth ? `${coin.priceEth.toExponential(3)} pETH` : "–"}</p>
    </div>
  );
}

function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty: string | null }) {
  if (empty) return <p className="panel p-5 text-[14px] text-ink-2">{empty}</p>;
  return (
    <div className="panel scroll-x">
      <table className="w-full min-w-[520px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-line">
            {head.map((h) => (
              <th key={h} className="label px-4 py-2.5 font-normal">
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

function ChainTrades({ market, symbol, now }: { market: Market | null; symbol: string; now: number }) {
  const rows = market?.trades ?? [];
  return (
    <Table head={["Account", "Side", "ETH", symbol, "Age", ""]} empty={!market ? "Reading trades…" : rows.length ? null : "No trades read for this coin yet."}>
      {rows.map((t, i) => (
        <tr key={`${t.tx}-${i}`} className="border-b border-line last:border-0">
          <td className="px-4 py-2 font-mono">{short(t.account, 3, 4)}</td>
          <td className={`px-4 py-2 font-semibold ${t.side === "buy" ? "text-up" : "text-down"}`}>{t.side === "buy" ? "Buy" : "Sell"}</td>
          <td className="num px-4 py-2">{t.eth < 0.001 ? t.eth.toFixed(6) : t.eth.toFixed(4)}</td>
          <td className="num px-4 py-2">{tokens(t.tokens)}</td>
          <td className="num px-4 py-2 text-ink-3">{now ? ago(t.at, now) : ""}</td>
          <td className="px-4 py-2 text-right">
            {t.tx ? (
              <a href={`${CHAIN.explorer}/tx/${t.tx}`} target="_blank" rel="noreferrer" aria-label="View transaction" className="text-ink-3 hover:text-ink">
                <ExternalLink className="inline size-3.5" />
              </a>
            ) : null}
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
      head={["Wallet", "Side", "pETH", symbol, "Played", "Age"]}
      empty={!market ? "Reading plays…" : rows.length ? null : "No practice plays on this coin yet. The first ticket starts the round."}
    >
      {rows.map((t, i) => (
        <tr key={i} className="border-b border-line last:border-0">
          <td className="px-4 py-2 font-mono">{short(t.wallet, 3, 4)}</td>
          <td className={`px-4 py-2 font-semibold ${t.side === "buy" ? "text-up" : "text-down"}`}>{t.side === "buy" ? "Buy" : "Sell"}</td>
          <td className="num px-4 py-2">{peth(t.eth)}</td>
          <td className="num px-4 py-2">{tokens(t.tokens)}</td>
          <td className="px-4 py-2">{t.play ? <span className="chip chip-amber">ticket</span> : <span className="text-ink-3">no</span>}</td>
          <td className="num px-4 py-2 text-ink-3">{now ? ago(t.at, now) : ""}</td>
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
        <div className="mb-3 flex gap-2">
          {(["chain", "practice"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-[13px] ${view === v ? "border-ink bg-ink text-chalk" : "border-line-2 text-ink-2"}`}
            >
              {v === "chain" ? "On chain" : "Practice"}
            </button>
          ))}
        </div>
      ) : null}
      {view === "chain" ? (
        <Table head={["#", "Holder", "Share", "Coins"]} empty={!market ? "Reading holders…" : chainRows.length ? null : "No holders read yet."}>
          {chainRows.map((h, i) => (
            <tr key={h.address} className="border-b border-line last:border-0">
              <td className="num px-4 py-2 text-ink-3">{i + 1}</td>
              <td className="px-4 py-2 font-mono">
                <a href={explorerAddress(h.address)} target="_blank" rel="noreferrer" className="hover:underline">
                  {short(h.address, 4, 4)}
                </a>
                {i === 0 && h.share > 30 ? <span className="ml-2 chip chip-flat">curve / pool</span> : null}
                {h.address === creator ? <span className="ml-2 chip chip-brand">creator</span> : null}
              </td>
              <td className="num px-4 py-2">{h.share.toFixed(2)}%</td>
              <td className="num px-4 py-2">{tokens(h.tokens)}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <Table head={["#", "Wallet", "Practice coins"]} empty={!market ? "Reading holders…" : practiceRows.length ? null : "Nobody holds this coin in practice yet."}>
          {practiceRows.map((h, i) => (
            <tr key={h.address} className="border-b border-line last:border-0">
              <td className="num px-4 py-2 text-ink-3">{i + 1}</td>
              <td className="px-4 py-2 font-mono">{short(h.address, 4, 4)}</td>
              <td className="num px-4 py-2">{tokens(h.tokens)}</td>
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
    <div className="panel space-y-4 p-5 text-[14.5px] leading-relaxed text-ink-2">
      <p>{coin.description || "The creator did not add a description."}</p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="label">Game</dt>
          <dd>
            {coin.game.mode === "raffle" ? "Raffle" : "Hot seat"}, {durationLabel(coin.game.durationSec)} rounds (practice)
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="label">{live ? "Token contract" : "Practice id"}</dt>
          <dd className="font-mono text-[13px] break-all">
            {live ? (
              <a href={explorerToken(coin.key)} target="_blank" rel="noreferrer" className="underline">
                {coin.key}
              </a>
            ) : (
              coin.key
            )}
          </dd>
        </div>
        <div>
          <dt className="label">Launched</dt>
          <dd>{new Date(coin.launchedAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="label">Where it trades</dt>
          <dd>{live ? (coin.graduated ? "Uniswap v4 pool (graduated on Pons)" : "Pons bonding curve") : "Practice curve on Cuilby"}</dd>
        </div>
      </dl>
      {coin.links && (coin.links.x || coin.links.telegram || coin.links.website) ? (
        <p className="flex flex-wrap gap-3">
          {coin.links.x ? <a href={coin.links.x} target="_blank" rel="noreferrer nofollow" className="text-brand underline">X ↗</a> : null}
          {coin.links.telegram ? <a href={coin.links.telegram} target="_blank" rel="noreferrer nofollow" className="text-brand underline">Telegram ↗</a> : null}
          {coin.links.website ? <a href={coin.links.website} target="_blank" rel="noreferrer nofollow" className="text-brand underline">Website ↗</a> : null}
        </p>
      ) : null}
      {live ? (
        <p className="text-[13px] text-ink-3">
          This coin was launched by someone else on the Pons launchpad. Cuilby shows its live data and runs a practice pot next to it; it
          has no say over the coin itself.
        </p>
      ) : null}
    </div>
  );
}
