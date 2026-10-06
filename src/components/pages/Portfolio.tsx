"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CHAIN, explorerAddress } from "@/config/brand";
import { CoinLogo } from "@/components/coin/CoinLogo";
import { usePractice } from "@/components/providers/PracticeProvider";
import { useBoard, useNow } from "@/components/providers/hooks";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import type { BoardCoin } from "@/lib/board";
import { ago, peth, short, tokens, usd } from "@/lib/format";
import { rpcBatch } from "@/lib/rpc";

/** Real balances of the board's live coins, read in batches through the relay. */
function useHoldings(address: string | null, coins: BoardCoin[]) {
  const [rows, setRows] = useState<{ coin: BoardCoin; amount: number }[] | null>(null);
  const [failed, setFailed] = useState(false);
  const live = coins.filter((c) => c.kind === "live");
  const key = live.map((c) => c.key).join(",");
  useEffect(() => {
    if (!address || !key) return;
    let cancelled = false;
    const list = key.split(",");
    const data = `0x70a08231${address.slice(2).toLowerCase().padStart(64, "0")}`;
    (async () => {
      const out: { key: string; amount: number }[] = [];
      for (let i = 0; i < list.length; i += 20) {
        const chunk = list.slice(i, i + 20);
        const res = await rpcBatch<string>(chunk.map((to) => ({ method: "eth_call", params: [{ to, data }, "latest"] })));
        res.forEach((hex, j) => {
          const raw = hex && hex !== "0x" ? BigInt(hex) : 0n;
          if (raw > 0n) out.push({ key: chunk[j], amount: Number(raw) / 1e18 });
        });
      }
      return out;
    })()
      .then((out) => {
        if (cancelled) return;
        const byKey = new Map(live.map((c) => [c.key, c]));
        setRows(out.map((o) => ({ coin: byKey.get(o.key)!, amount: o.amount })).filter((r) => r.coin));
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, key]);
  return { rows: address ? rows : null, failed };
}

export function Portfolio() {
  const { address, balance, onRobinhoodChain, chainId } = useWallet();
  const { open } = useWalletModal();
  const { configured, account, earnings, canTopUp, act, busy, error, notice } = usePractice();
  const { data: board } = useBoard();
  const coins = board?.coins ?? [];
  const holdings = useHoldings(address, coins);
  const now = useNow(10_000);

  if (!address) {
    return (
      <main className="mx-auto max-w-[1180px] px-4 pt-14 pb-10 sm:px-6">
        <div className="ticket mx-auto flex max-w-2xl flex-col overflow-hidden sm:flex-row">
          <div className="min-w-0 flex-1 p-7">
            <h1 className="h-display text-[44px]">Every ticket you hold, in one place.</h1>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
              Link a wallet and this page lists its coins on {CHAIN.name}, the practice rounds it entered and took, and the fees it
              collected from coins it started.
            </p>
            <button type="button" onClick={open} className="btn btn-ink mt-6 h-12 px-6 text-base">
              Connect wallet
            </button>
          </div>
          <div className="perf perf-y hidden w-[150px] shrink-0 items-center justify-center bg-amber sm:flex">
            <span className="h-display -rotate-90 text-[30px] whitespace-nowrap">admit one</span>
          </div>
        </div>
      </main>
    );
  }

  const byKey = new Map(coins.map((c) => [c.key, c]));
  const positions = Object.entries(account?.positions ?? {});
  const value = (key: string, amount: number) => {
    const c = byKey.get(key);
    return c?.priceUsd ? c.priceUsd * amount : null;
  };

  return (
    <main className="mx-auto max-w-[1180px] px-4 pt-10 pb-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="h-display text-[48px] sm:text-[60px]">Portfolio</h1>
          <a href={explorerAddress(address)} target="_blank" rel="noreferrer" className="font-mono text-[13px] break-all text-ink-2 hover:underline">
            {address}
          </a>
        </div>
        <p className={`chip ${onRobinhoodChain ? "chip-up" : "chip-down"}`}>
          {onRobinhoodChain ? `${CHAIN.name} · ${CHAIN.id}` : `Wallet on chain ${chainId ?? "?"}`}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="label">Real ETH on {CHAIN.name}</p>
          <p className="num mt-1 text-[26px]">{balance ?? "–"}</p>
          <p className="text-[12.5px] text-ink-3">read from the chain</p>
        </div>
        <div className="ticket p-5">
          <p className="label">Practice balance</p>
          <p className="num mt-1 text-[26px]" data-testid="practice-balance">
            {configured === false ? "off" : account ? `${peth(account.balance)} pETH` : "not opened"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {configured !== false && !account ? (
              <button type="button" onClick={() => act("join")} disabled={busy !== null} className="btn btn-brand h-9 px-4 text-[13px]" data-testid="join">
                {busy ?? "Open with 1 pETH"}
              </button>
            ) : null}
            {canTopUp ? (
              <button type="button" onClick={() => act("topup")} disabled={busy !== null} className="btn btn-accent h-9 px-4 text-[13px]">
                Top up 0.5 pETH
              </button>
            ) : null}
          </div>
        </div>
        <div className="panel p-5">
          <p className="label">Creator earnings (practice)</p>
          <p className="num mt-1 text-[26px] text-brand">{peth(earnings)} pETH</p>
          {earnings > 0 ? (
            <button type="button" onClick={() => act("claim")} disabled={busy !== null} className="btn btn-ghost mt-2 h-9 px-4 text-[13px]">
              Move to balance
            </button>
          ) : (
            <p className="text-[12.5px] text-ink-3">20% of fees on coins you launched</p>
          )}
        </div>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-lg border border-down bg-down-soft px-3 py-2 text-[13px] text-down">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-lg border border-up bg-up-soft px-3 py-2 text-[13px] text-up-deep">{notice}</p> : null}

      <section className="mt-12">
        <h2 className="h-display text-[30px]">Practice positions</h2>
        {positions.length === 0 ? (
          <p className="panel mt-4 p-5 text-ink-2">
            No practice coins yet. <Link href="/" className="text-brand underline">Pick a coin on the board</Link> and play a buy.
          </p>
        ) : (
          <div className="panel scroll-x mt-4">
            <table className="w-full min-w-[600px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-line">
                  {["Coin", "Free", "Held for a pot", "Value", "Cost"].map((h) => (
                    <th key={h} className="label px-4 py-2.5 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map(([key, p]) => {
                  const c = byKey.get(key);
                  const v = value(key, p.tokens + p.locked);
                  return (
                    <tr key={key} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5">
                        <Link href={`/t/${key}`} className="flex items-center gap-2 font-semibold hover:underline">
                          <CoinLogo src={c?.logo ?? null} symbol={c?.symbol ?? "?"} size={28} />
                          {c?.symbol ?? short(key)}
                        </Link>
                      </td>
                      <td className="num px-4 py-2.5">{tokens(p.tokens)}</td>
                      <td className="num px-4 py-2.5">{p.locked > 0 ? tokens(p.locked) : "–"}</td>
                      <td className="num px-4 py-2.5">{v === null ? "–" : usd(v)}</td>
                      <td className="num px-4 py-2.5">{peth(p.cost)} pETH</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <h2 className="h-display text-[30px]">Wins</h2>
          {account?.wins.length ? (
            <ul className="mt-4 space-y-2">
              {account.wins.map((w, i) => (
                <li key={`${w.coin}-${w.round}-${i}`} className="panel flex items-center justify-between gap-3 p-4">
                  <Link href={`/t/${w.coin}`} className="min-w-0 truncate font-semibold hover:underline">
                    {w.symbol} · round {w.round}
                  </Link>
                  <span className="num shrink-0 text-pot">
                    +{peth(w.prize)} pETH <span className="text-[12px] text-ink-3">{now ? `${ago(w.at, now)} ago` : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel mt-4 p-5 text-ink-2">No wins yet. Prizes land in the practice balance the moment a round settles.</p>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="h-display text-[30px]">On chain</h2>
          <p className="mt-1 text-[13px] text-ink-3">Real balances of the live coins on the board, read from {CHAIN.name}.</p>
          {holdings.failed ? (
            <p className="panel mt-4 p-5 text-ink-2">The chain could not be read right now.</p>
          ) : !holdings.rows ? (
            <p className="panel mt-4 p-5 text-ink-2">Reading balances…</p>
          ) : holdings.rows.length === 0 ? (
            <p className="panel mt-4 p-5 text-ink-2">This wallet holds none of the coins on the board.</p>
          ) : (
            <ul className="mt-4 space-y-2" data-testid="holdings">
              {holdings.rows.map((r) => (
                <li key={r.coin.key} className="panel flex items-center justify-between gap-3 p-3">
                  <Link href={`/t/${r.coin.key}`} className="flex min-w-0 items-center gap-2 font-semibold hover:underline">
                    <CoinLogo src={r.coin.logo} symbol={r.coin.symbol} size={30} />
                    <span className="truncate">{r.coin.symbol}</span>
                  </Link>
                  <span className="num shrink-0 text-right text-[13.5px]">
                    {tokens(r.amount)}
                    <span className="block text-[12px] text-ink-3">{r.coin.priceUsd ? usd(r.coin.priceUsd * r.amount) : "–"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {account?.launched.length ? (
        <section className="mt-12">
          <h2 className="h-display text-[30px]">Coins you launched</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {account.launched.map((id) => {
              const c = byKey.get(id);
              return (
                <li key={id}>
                  <Link href={`/t/${id}`} className="btn btn-ghost h-10 px-4 text-[14px]">
                    {c?.symbol ?? id}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
