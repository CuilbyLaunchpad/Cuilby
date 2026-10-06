"use client";

import Link from "next/link";
import { BRAND, CHAIN } from "@/config/brand";
import { CoinLogo } from "@/components/coin/CoinLogo";
import { EthGlyph } from "@/components/ui";
import { usePoll, useNow } from "@/components/providers/hooks";
import { ago, peth, short } from "@/lib/format";
import type { Stats, WinnerRow } from "@/lib/practice/ledger";

export function Winners() {
  const { data } = usePoll<{ configured: boolean; winners: WinnerRow[]; stats: Stats | null }>("/api/winners", 15_000);
  const { data: board } = usePoll<{ practicePots: number }>("/api/stats", 30_000);
  const now = useNow(10_000);
  const stats = [
    { k: "Paid out so far", v: data?.stats ? `${peth(data.stats.paid)} pETH` : "–", tone: "" },
    { k: "Biggest single win", v: data?.stats ? `${peth(data.stats.biggest)} pETH` : "–", tone: "text-gold" },
    { k: "Still in pots", v: board ? `${peth(board.practicePots)} pETH` : "–", tone: "" },
    { k: "Rounds settled", v: data?.stats ? String(data.stats.rounds) : "–", tone: "" },
  ];
  return (
    <>
      <section className="surface relative isolate mb-6 overflow-hidden p-6 md:p-10">
        {}
        <img
          src="/art/winners.webp"
          alt="A glass Cuilby coin wearing a gold crown among falling confetti and coins"
          width={1600}
          height={600}
          fetchPriority="high"
          className="absolute inset-0 -z-20 size-full object-cover object-[70%_50%] md:object-right"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--color-ink)_0%,rgb(10_15_13/0.85)_36%,rgb(10_15_13/0.2)_64%,transparent_82%)] max-md:bg-[linear-gradient(180deg,rgb(10_15_13/0.3)_0%,rgb(10_15_13/0.8)_55%,var(--color-ink)_100%)]" />
        <div className="relative z-10 max-w-xl pt-24 md:pt-0">
          <h1 className="display text-[40px] leading-[0.95] font-extrabold md:text-[56px]">
            Jackpot winners.
            <span className="block text-surge">Every pot that paid.</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-fg-2">
            The jackpot winners list shows every round that has settled, newest first. Winners are real wallets; amounts are practice pETH
            until the {BRAND.name} contracts ship.
          </p>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
            {stats.map((st) => (
              <div key={st.k}>
                <dt className="text-[13px] text-fg-3">{st.k}</dt>
                <dd className={`num text-[26px] ${st.tone}`}>{st.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {!data ? (
        <div className="surface px-6 py-14 text-center text-[14px] text-fg-3">Reading winners…</div>
      ) : !data.configured ? (
        <div className="surface px-6 py-14 text-center text-[14px] text-fg-2">
          Practice storage is not configured on this site yet, so there are no rounds to show.
        </div>
      ) : data.winners.length === 0 ? (
        <div className="surface flex flex-col items-center px-6 py-12 text-center">
          {}
          <img
            src="/art/crown.webp"
            alt="A gold crown resting on a pile of coins"
            width={240}
            height={240}
            loading="lazy"
            className="size-[120px] object-contain"
          />
          <h2 className="display mt-3 text-[22px] font-bold">The first pot is still filling.</h2>
          <p className="mt-1 text-[14px] text-fg-2">A round pays the moment its clock hits zero. The next name here could be yours.</p>
          <Link href="/?sort=pots#coins" className="btn-surge mt-5 inline-flex h-11 items-center rounded-full px-6 text-[15px] font-bold">
            Find the biggest pots
          </Link>
        </div>
      ) : (
        <>
          <h2 className="sr-only">Settled rounds, newest first</h2>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2" data-testid="winners">
            {data.winners.map((w, i) => (
              <li key={`${w.coin}-${w.round}-${i}`} className="surface flex min-w-0 animate-rise items-center gap-3 p-3.5">
                <Link href={`/t/${w.coin}`} className="shrink-0" aria-label={`Open ${w.name}`}>
                  <CoinLogo src={w.coin.startsWith("0x") ? `/api/logo/${w.coin}` : null} symbol={w.symbol} size={44} />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-fg-3">
                    <Link href={`/t/${w.coin}`} className="truncate font-semibold text-fg hover:underline">
                      {w.symbol}
                    </Link>
                    <span className="shrink-0">
                      round {w.round} · {w.mode === "raffle" ? "Raffle" : "Hot seat"}
                    </span>
                  </p>
                  <p className="num mt-0.5 truncate text-[14px] text-fg-2">{short(w.winner, 5, 4)}</p>
                  {w.drawBlock ? (
                    <p className="num truncate text-[11.5px] text-fg-3">
                      block{" "}
                      <a href={`${CHAIN.explorer}/block/${w.drawBlock}`} target="_blank" rel="noreferrer" className="hover:text-fg">
                        {w.drawBlock}
                      </a>{" "}
                      · roll {w.roll}/{w.total}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="display flex items-center justify-end gap-1.5 text-[22px] leading-none font-extrabold text-gold">
                    {peth(w.prize)} <EthGlyph size={18} />
                  </p>
                  <p className="num mt-1 text-[12px] text-fg-3">
                    of {peth(w.pot)} · {now ? `${ago(w.at, now)} ago` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-6 text-[12px] text-fg-3">18+ only. Pots pay by chance; play only with what you can afford to lose.</p>
    </>
  );
}
