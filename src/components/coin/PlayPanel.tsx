"use client";

import { useState } from "react";
import Link from "next/link";
import { usePractice } from "@/components/providers/PracticeProvider";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import type { CoinDetail } from "@/lib/board";
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
    <section className="ticket p-4 sm:p-5" data-testid="play-panel">
      <div className="flex items-center justify-between gap-2">
        <h2 className="h-display text-[26px]">Play</h2>
        <span className="chip chip-amber">practice · pETH</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-full border-[1.5px] border-ink p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`cursor-pointer rounded-full py-1.5 text-[14px] font-bold ${side === s ? (s === "buy" ? "bg-up text-white" : "bg-down text-white") : "text-ink-2"}`}
          >
            {s === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      {side === "buy" ? (
        <>
          <label className="mt-4 block">
            <span className="label">You pay (pETH)</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").slice(0, 10))}
              className="field num mt-1 text-[22px]"
              aria-label="Practice ETH to spend"
            />
          </label>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setAmount(String(p))} className="btn btn-ghost h-8 px-0 font-mono text-[12px] font-medium">
                {p}
              </button>
            ))}
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-paper p-3">
            <input type="checkbox" checked={play} onChange={(e) => setPlay(e.target.checked)} className="mt-1 size-4 accent-[var(--color-brand)]" />
            <span className="text-[13.5px] leading-snug">
              <span className="font-bold">Play for the pot</span>
              <span className="block text-ink-3">
                {g.mode === "raffle"
                  ? `Makes this buy a ticket (min ${peth(g.bar)}). Its coins are held until the draw.`
                  : `Takes the crown if it is ${peth(g.bar)} or more. Its coins wait in the crown.`}
              </span>
            </span>
          </label>
          <div className="mt-3 space-y-1 font-mono text-[12.5px] text-ink-2">
            <p className="flex justify-between gap-2">
              <span>Fee 1%</span>
              <span>{valid ? peth(Math.floor(micro / 100), 6) : "–"} pETH</span>
            </p>
            <p className="flex justify-between gap-2">
              <span>Into the pot</span>
              <span className="text-pot">{valid ? peth(Math.floor(Math.floor(micro / 100) * 0.6), 6) : "–"} pETH</span>
            </p>
            {after !== null ? (
              <p className="flex justify-between gap-2">
                <span>Your chance after</span>
                <span className="text-brand">{(after * 100).toFixed(1)}%</span>
              </p>
            ) : null}
            {tooSmall ? <p className="text-down">Below the {peth(g.bar)} pETH bar: turn playing off or buy more.</p> : null}
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-[13.5px] text-ink-2">
            Free: <span className="num font-semibold text-ink">{tokens(pos?.tokens ?? 0)}</span> · held for the pot:{" "}
            <span className="num">{tokens(pos?.locked ?? 0)}</span>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[25, 50, 100].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPct(p)}
                className={`btn h-9 px-0 font-mono text-[13px] font-medium ${pct === p ? "btn-ink" : "btn-ghost"}`}
              >
                {p}%
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">Coins held for a ticket or the crown come back after the round and can be sold then.</p>
        </>
      )}

      <div className="mt-4">
        {configured === false ? (
          <p className="rounded-xl bg-paper-2 p-3 text-[13px] text-ink-2">Practice storage is not configured on this site yet.</p>
        ) : !address ? (
          <button type="button" onClick={open} className="btn btn-ink h-12 w-full text-base">
            Connect wallet to play
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={busy !== null || (side === "buy" ? !valid || short || tooSmall : !pos || pos.tokens <= 0)}
            className={`btn h-12 w-full text-base ${side === "buy" ? "btn-brand" : "btn-ink"}`}
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
                        ? "Sign & buy a ticket"
                        : "Sign & take the crown"
                      : "Sign & buy"
                : "Sign & sell")}
          </button>
        )}
      </div>
      {address ? (
        <p className="mt-2 text-center text-[12.5px] text-ink-3">
          Balance: <span className="num">{balance === null ? "1 pETH on first play" : `${peth(balance)} pETH`}</span> ·{" "}
          <Link href="/me" className="underline">
            portfolio
          </Link>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-lg border border-down bg-down-soft px-3 py-2 text-[12.5px] break-words text-down" data-testid="play-error">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 rounded-lg border border-up bg-up-soft px-3 py-2 text-[12.5px] text-up-deep" data-testid="play-notice">
          {notice}
        </p>
      ) : null}
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        Each play is a free signature (no transaction). Practice uses live prices{coin.kind === "live" ? " from the chain" : ""} but
        moves no real funds.
      </p>
    </section>
  );
}
