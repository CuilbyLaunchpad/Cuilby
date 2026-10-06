"use client";

import { useState } from "react";
import { CHAIN } from "@/config/brand";
import type { CoinDetail } from "@/lib/board";
import { peth, short } from "@/lib/format";
import { draw, drawSeed, type Settlement } from "@/lib/game/engine";
import { rpc } from "@/lib/rpc";

/** Finished rounds, each with everything needed to redo its draw in the browser. */
export function RoundsTab({ coin }: { coin: CoinDetail }) {
  if (!coin.history.length) {
    return (
      <p className="panel p-5 text-[14px] text-ink-2">
        No round has finished on this coin yet. Finished rounds show their winner, the draw block and a button to check the draw
        yourself.
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {coin.history.map((s) => (
        <RoundRow key={s.round} s={s} game={coin.key} />
      ))}
    </ol>
  );
}

function RoundRow({ s, game }: { s: Settlement; game: string }) {
  const [check, setCheck] = useState<{ state: "idle" | "busy" | "ok" | "bad" | "error"; text?: string }>({ state: "idle" });

  const verify = async () => {
    if (!s.drawBlock || !s.seed) return;
    setCheck({ state: "busy" });
    try {
      const block = await rpc<{ hash: string } | null>("eth_getBlockByNumber", [`0x${s.drawBlock.toString(16)}`, false]);
      if (!block) throw new Error("block not found");
      const seed = drawSeed(block.hash, game, s.round);
      const result = draw(
        (s.tickets ?? []).map((t) => ({ ...t, tokens: 0 })),
        seed,
      );
      const same = seed === s.seed && result?.winner === s.winner && result?.roll === s.roll;
      setCheck(
        same
          ? { state: "ok", text: `Recomputed from block ${s.drawBlock}: roll ${result?.roll} of ${result?.total} lands on ${short(result!.winner, 3, 3)}.` }
          : { state: "bad", text: "The recomputed draw does not match the recorded one." },
      );
    } catch {
      setCheck({ state: "error", text: "The block could not be read right now. Try again." });
    }
  };

  return (
    <li className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            Round {s.round} · {s.mode === "raffle" ? "Raffle" : "Hot seat"}
          </p>
          <p className="text-[13px] text-ink-3">{new Date(s.closedAt).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="num text-[18px] text-pot">{peth(s.prize)} pETH</p>
          <p className="text-[12.5px] text-ink-3">of a {peth(s.pot)} pot</p>
        </div>
      </div>
      <p className="mt-2 text-[13.5px]">
        Winner: <span className="font-mono">{s.winner ? short(s.winner, 4, 4) : "nobody (pot rolls over)"}</span>
      </p>
      {s.mode === "raffle" && s.seed ? (
        <div className="mt-3 rounded-xl bg-paper p-3 font-mono text-[12px] leading-relaxed break-all text-ink-2">
          <p>
            draw block{" "}
            <a href={`${CHAIN.explorer}/block/${s.drawBlock}`} target="_blank" rel="noreferrer" className="text-brand underline">
              {s.drawBlock}
            </a>
          </p>
          <p>seed {s.seed}</p>
          <p>
            roll {s.roll} of {s.total} · {(s.tickets ?? []).length} {(s.tickets ?? []).length === 1 ? "wallet" : "wallets"}
          </p>
          <button type="button" onClick={verify} disabled={check.state === "busy"} className="btn btn-ghost mt-2 h-8 px-3 font-sans text-[12px]">
            {check.state === "busy" ? "Checking…" : "Check this draw"}
          </button>
          {check.text ? (
            <p className={`mt-2 font-sans text-[12.5px] ${check.state === "ok" ? "text-up" : "text-down"}`} data-testid="draw-check">
              {check.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
