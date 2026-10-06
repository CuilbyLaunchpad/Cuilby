"use client";

import Link from "next/link";
import { CHAIN } from "@/config/brand";
import { usePoll, useNow } from "@/components/providers/hooks";
import { ago, peth, short } from "@/lib/format";
import type { Stats, WinnerRow } from "@/lib/practice/ledger";

export function Winners() {
  const { data } = usePoll<{ configured: boolean; winners: WinnerRow[]; stats: Stats | null }>("/api/winners", 15_000);
  const { data: board } = usePoll<{ practicePots: number }>("/api/stats", 30_000);
  const now = useNow(10_000);
  const stats = [
    { k: "Won so far", v: data?.stats ? `${peth(data.stats.paid)} pETH` : "–" },
    { k: "Biggest single win", v: data?.stats ? `${peth(data.stats.biggest)} pETH` : "–" },
    { k: "Waiting in pots", v: board ? `${peth(board.practicePots)} pETH` : "–" },
    { k: "Rounds paid", v: data?.stats ? String(data.stats.rounds) : "–" },
  ];
  return (
    <main className="mx-auto max-w-[1180px] px-4 pt-10 pb-10 sm:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div>
          <h1 className="h-display text-[52px] sm:text-[72px]">
            Rounds that
            <br />
            <span className="text-pot">paid out.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[16.5px] leading-relaxed text-ink-2">
            Every round that has paid out, newest first. Winners are wallets that played; the amounts are practice ETH until the Cuilby
            contracts ship. Raffle rows carry their draw block and seed, so anyone can redo the draw.
          </p>
        </div>
        <dl className="ticket grid grid-cols-2 gap-4 p-5">
          {stats.map((s) => (
            <div key={s.k} className="min-w-0">
              <dt className="label">{s.k}</dt>
              <dd className="num mt-1 truncate text-[20px] font-medium">{s.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section className="mt-12">
        {!data ? (
          <p className="panel p-6 text-ink-2">Reading winners…</p>
        ) : !data.configured ? (
          <p className="panel p-6 text-ink-2">Practice storage is not configured on this site yet, so there are no rounds to show.</p>
        ) : data.winners.length === 0 ? (
          <div className="panel p-8">
            <p className="h-display text-[30px]">Nobody has cashed a pot yet.</p>
            <p className="mt-2 max-w-lg text-ink-2">The first pots are still filling. Each round pays as soon as its timer hits zero. Yours could be next.</p>
            <Link href="/?sort=pots#coins" className="btn btn-brand mt-5 h-11 px-5">
              Find a pot
            </Link>
          </div>
        ) : (
          <ol className="grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="winners">
            {data.winners.map((w, i) => (
              <li key={`${w.coin}-${w.round}-${i}`} className="panel flex min-w-0 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/t/${w.coin}`} className="block truncate font-bold hover:underline">
                      {w.name} <span className="font-mono text-[13px] font-normal text-ink-3">{w.symbol}</span>
                    </Link>
                    <p className="text-[13px] text-ink-3">
                      round {w.round} · {w.mode === "raffle" ? "Raffle" : "Hot seat"} · {now ? `${ago(w.at, now)} ago` : ""}
                    </p>
                  </div>
                  <p className="num shrink-0 text-[20px] text-pot">{peth(w.prize)}</p>
                </div>
                <p className="text-[13.5px]">
                  <span className="text-ink-3">Winner </span>
                  <span className="font-mono">{short(w.winner, 4, 4)}</span>
                  <span className="text-ink-3"> · pot {peth(w.pot)} pETH</span>
                </p>
                {w.drawBlock ? (
                  <p className="font-mono text-[11.5px] break-all text-ink-3">
                    block{" "}
                    <a href={`${CHAIN.explorer}/block/${w.drawBlock}`} target="_blank" rel="noreferrer" className="underline">
                      {w.drawBlock}
                    </a>{" "}
                    · roll {w.roll}/{w.total}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
      <p className="mt-8 text-[12.5px] text-ink-3">18+ only. Pots are chance-based; play only with what you can afford to lose.</p>
    </main>
  );
}
