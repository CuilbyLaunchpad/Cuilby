"use client";

import { useState } from "react";
import Link from "next/link";
import { usePractice } from "@/components/providers/PracticeProvider";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import type { CoinDetail } from "@/lib/board";
import { EthGlyph } from "@/components/ui";
import { peth, tokens } from "@/lib/format";

const PRESETS = [0.005, 0.01, 0.05, 0.1];

/**
 * Practice play on a coin: a pETH buy that can enter the pot, or a sale of
 * free practice coins. Every action is a fresh signed message, nothing else.
 */
export function PlayPanel({ coin, onDone }: { coin: CoinDetail; onDone?: () => void }) {
  const { address } = useWallet();
  const { open } = useWalletModal();
  const { configured, account, act, busy, error, notice } = usePractice();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.01");
  const [play, setPlay] = useState(true);
  const [pct, setPct] = useState(100);

  const micro = Math.round(Number(amount) * 1_000_000);
  const valid = Number.isFinite(micro) && micro >= 1_000 && micro <= 1_000_000;
  const balance = account?.balance ?? null;
  const pos = account?.positions[coin.key];
  const g = coin.game;
  const tooSmall = play && valid && micro < g.bar;
  const total = coin.tickets.reduce((s, t) => s + t.weight, 0);
  const mine = address ? (coin.tickets.find((t) => t.wallet === address.toLowerCase())?.weight ?? 0) : 0;
  const after = address && g.mode === "raffle" && play && valid && !tooSmall ? (mine + micro) / (total + micro) : null;
  const short = balance !== null && valid && micro > balance;

  const submit = async () => {
    const result = side === "buy" ? await act("buy", { coin: coin.key, amount: micro, play }) : await act("sell", { coin: coin.key, pct });
    if (result.ok) onDone?.();
  };

  return (
    <section className="surface p-4" data-testid="play-panel" aria-label="Play for the pot">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-[15px] font-semibold">Play for the pot</h2>
        <span className="rounded-full bg-gold/12 px-2 py-0.5 text-[11px] font-semibold text-gold">practice · pETH</span>
      </div>
      <div
        className="mt-3 grid grid-cols-2 rounded-full bg-card-2 p-1 shadow-[inset_0_0_0_1px_var(--color-line)]"
        role="tablist"
        aria-label="Side"
      >
        {(["buy", "sell"] as const).map((sd) => (
          <button
            key={sd}
            type="button"
            role="tab"
            aria-selected={side === sd}
            onClick={() => setSide(sd)}
            className={`relative h-9 rounded-full text-[14px] font-semibold transition-colors ${side === sd ? "text-ink" : "text-fg-2 hover:text-fg"}`}
          >
            {side === sd ? <span className="absolute inset-0 rounded-full bg-surge" /> : null}
            <span className="relative">{sd === "buy" ? "Buy" : "Sell"}</span>
          </button>
        ))}
      </div>

      {side === "buy" ? (
        <>
          <div className="tile mt-3 px-4 pt-3 pb-3">
            <div className="flex items-center justify-between text-[12px] text-fg-3">
              <label htmlFor="play-amount">You pay</label>
              <span className="num">{balance === null ? "1 pETH on first play" : `Balance ${peth(balance)}`}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="play-amount"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").slice(0, 10))}
                className="num min-w-0 flex-1 bg-transparent text-[32px] leading-tight font-medium text-fg outline-none placeholder:text-fg-4"
                aria-label="Practice ETH to spend"
                placeholder="0"
              />
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-card-3 py-1.5 pr-3 pl-1.5 text-[13px] font-semibold">
                <EthGlyph size={20} />
                pETH
              </span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setAmount(String(p))} className="btn-ghost num h-9 rounded-full text-[13px]">
                {p}
              </button>
            ))}
          </div>
          <label className="tile mt-3 flex cursor-pointer items-start gap-3 px-3 py-2.5">
            <input
              type="checkbox"
              checked={play}
              onChange={(e) => setPlay(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-surge)]"
            />
            <span className="text-[13px] leading-snug">
              <span className="font-semibold">Count this buy for the pot</span>
              <span className="block text-fg-3">
                {g.mode === "raffle"
                  ? `Turns it into a ticket (from ${peth(g.bar)} pETH). Its coins wait until the draw.`
                  : `Takes the crown at ${peth(g.bar)} pETH or more. Its coins wait with the crown.`}
              </span>
            </span>
          </label>
          <div className="num mt-3 space-y-1 px-1 text-[12.5px] text-fg-3">
            <p className="flex justify-between gap-2">
              <span>Fee 1%</span>
              <span className="text-fg-2">{valid ? peth(Math.floor(micro / 100), 6) : "–"} pETH</span>
            </p>
            <p className="flex justify-between gap-2">
              <span>Into the pot</span>
              <span className="text-gold">{valid ? peth(Math.floor(Math.floor(micro / 100) * 0.6), 6) : "–"} pETH</span>
            </p>
            {after !== null ? (
              <p className="flex justify-between gap-2">
                <span>Your odds after</span>
                <span className="text-surge">{(after * 100).toFixed(1)}%</span>
              </p>
            ) : null}
            {tooSmall ? <p className="text-down">Under the {peth(g.bar)} pETH bar. Turn the pot off or raise the amount.</p> : null}
          </div>
        </>
      ) : (
        <>
          <div className="tile mt-3 px-4 py-3 text-[13px] text-fg-2">
            Free to sell: <span className="num font-semibold text-fg">{tokens(pos?.tokens ?? 0)}</span>
            <span className="block text-[12px] text-fg-3">
              Waiting for the round: <span className="num">{tokens(pos?.locked ?? 0)}</span>
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[25, 50, 100].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPct(p)}
                className={`num h-9 rounded-full text-[13px] ${pct === p ? "bg-fg text-ink" : "btn-ghost"}`}
              >
                {p}%
              </button>
            ))}
          </div>
          <p className="mt-2 px-1 text-[12px] text-fg-3">Coins held for a ticket or the crown come back once the round settles.</p>
        </>
      )}

      <div className="mt-4">
        {configured === false ? (
          <p className="tile px-3 py-3 text-[13px] text-fg-2">Practice storage is not configured on this site yet.</p>
        ) : !address ? (
          <button type="button" onClick={open} className="btn-surge h-12 w-full rounded-full text-[15px] font-bold">
            Connect wallet to play
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={busy !== null || (side === "buy" ? !valid || short || tooSmall : !pos || pos.tokens <= 0)}
            className="btn-surge h-12 w-full rounded-full text-[15px] font-bold"
            data-testid="play-submit"
          >
            {busy ??
              (side === "buy"
                ? !valid
                  ? "Enter 0.001 to 1 pETH"
                  : short
                    ? "Not enough pETH"
                    : play
                      ? g.mode === "raffle"
                        ? "Sign and get a ticket"
                        : "Sign and claim the crown"
                      : "Sign and buy"
                : "Sign and sell")}
          </button>
        )}
      </div>
      {address ? (
        <p className="mt-2 text-center text-[12px] text-fg-3">
          <Link href="/me" className="hover:text-fg">
            Open your practice portfolio
          </Link>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-[12px] bg-down/10 px-3 py-2 text-[12.5px] break-words text-down" data-testid="play-error">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 rounded-[12px] bg-up/10 px-3 py-2 text-[12.5px] text-up" data-testid="play-notice">
          {notice}
        </p>
      ) : null}
      <p className="mt-3 text-center text-[11.5px] leading-relaxed text-fg-3">
        Each play is a free signature, not a transaction. Prices are{" "}
        {coin.kind === "live" ? "live from the chain" : "from the practice curve"}; no real funds move.
      </p>
    </section>
  );
}
