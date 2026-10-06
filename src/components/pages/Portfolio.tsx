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
      <div className="surface mx-auto flex max-w-lg flex-col items-center px-6 py-14 text-center">
        {}
        <img
          src="/art/ticket.webp"
          alt="A gold raffle ticket stamped with the Cuilby mascot"
          width={248}
          height={248}
          className="size-[124px] object-contain"
        />
        <h1 className="display mt-3 text-[28px] font-extrabold">Your crypto portfolio and pot wins</h1>
        <p className="mt-1.5 text-[14px] text-fg-2">
          Link a wallet to list its coins on {CHAIN.name}, the practice rounds it played and won, and the fees it earned from coins it
          launched.
        </p>
        <button type="button" onClick={open} className="btn-surge mt-5 h-11 rounded-full px-6 text-[15px] font-bold">
          Connect wallet
        </button>
      </div>
    );
  }

  const byKey = new Map(coins.map((c) => [c.key, c]));
  const positions = Object.entries(account?.positions ?? {});
  const value = (key: string, amount: number) => {
    const c = byKey.get(key);
    return c?.priceUsd ? c.priceUsd * amount : null;
  };
  const head = "text-[15px] font-semibold";

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-[36px] leading-none font-extrabold md:text-[48px]">Your portfolio</h1>
          <a
            href={explorerAddress(address)}
            target="_blank"
            rel="noreferrer"
            className="num mt-2 block text-[13px] break-all text-fg-3 hover:text-fg"
          >
            {address}
          </a>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${onRobinhoodChain ? "bg-up/10 text-up" : "bg-down/10 text-down"}`}
        >
          <span className={`size-1.5 rounded-full ${onRobinhoodChain ? "bg-up" : "bg-down"}`} />
          {onRobinhoodChain ? `${CHAIN.name} · ${CHAIN.id}` : `Wallet on chain ${chainId ?? "?"}`}
        </span>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="surface p-5">
          <p className="text-[12px] text-fg-3">Real ETH on {CHAIN.name}</p>
          <p className="num mt-1 text-[26px]">{balance ?? "–"}</p>
          <p className="text-[12px] text-fg-3">read from the chain</p>
        </div>
        <div className="surface relative overflow-hidden p-5">
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(360px_160px_at_100%_0%,rgb(243_189_82/0.12),transparent_70%)]" />
          <p className="relative text-[12px] text-fg-3">Practice balance</p>
          <p className="num relative mt-1 text-[26px] text-gold" data-testid="practice-balance">
            {configured === false ? "off" : account ? `${peth(account.balance)} pETH` : "not opened"}
          </p>
          <div className="relative mt-2 flex flex-wrap gap-2">
            {configured !== false && !account ? (
              <button
                type="button"
                onClick={() => act("join")}
                disabled={busy !== null}
                className="btn-surge h-9 rounded-full px-4 text-[13px] font-bold"
                data-testid="join"
              >
                {busy ?? "Open with 1 pETH"}
              </button>
            ) : null}
            {canTopUp ? (
              <button
                type="button"
                onClick={() => act("topup")}
                disabled={busy !== null}
                className="btn-ghost h-9 rounded-full px-4 text-[13px] font-semibold"
              >
                Top up 0.5 pETH
              </button>
            ) : null}
          </div>
        </div>
        <div className="surface p-5">
          <p className="text-[12px] text-fg-3">Creator earnings (practice)</p>
          <p className="num mt-1 text-[26px] text-surge">{peth(earnings)} pETH</p>
          {earnings > 0 ? (
            <button
              type="button"
              onClick={() => act("claim")}
              disabled={busy !== null}
              className="btn-ghost mt-2 h-9 rounded-full px-4 text-[13px] font-semibold"
            >
              Move to balance
            </button>
          ) : (
            <p className="text-[12px] text-fg-3">20% of the fees on coins you launched</p>
          )}
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-4 rounded-[12px] bg-down/10 px-3 py-2 text-[13px] text-down">
          {error}
        </p>
      ) : null}
      {notice ? <p className="mt-4 rounded-[12px] bg-up/10 px-3 py-2 text-[13px] text-up">{notice}</p> : null}

      <section className="surface mt-4 p-2 md:p-3">
        <h2 className={`${head} px-3 pt-2 pb-1`}>Practice positions</h2>
        {positions.length === 0 ? (
          <p className="px-3 py-5 text-[13px] text-fg-3">
            No practice coins yet.{" "}
            <Link href="/" className="font-semibold text-surge hover:underline">
              Pick a coin on the board
            </Link>{" "}
            and play a buy.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-[13px]">
              <thead className="text-left text-[12px] text-fg-3">
                <tr>
                  {["Coin", "Free", "Held for a pot", "Value", "Cost"].map((h, i) => (
                    <th key={h} className={`px-3 py-2 font-normal ${i ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map(([key, p]) => {
                  const c = byKey.get(key);
                  const v = value(key, p.tokens + p.locked);
                  return (
                    <tr key={key} className="border-t border-line">
                      <td className="px-3 py-2">
                        <Link href={`/t/${key}`} className="flex items-center gap-2 font-semibold hover:text-surge">
                          <CoinLogo src={c?.logo ?? null} symbol={c?.symbol ?? "?"} size={28} />
                          {c?.symbol ?? short(key)}
                        </Link>
                      </td>
                      <td className="num px-3 py-2 text-right">{tokens(p.tokens)}</td>
                      <td className="num px-3 py-2 text-right">{p.locked > 0 ? tokens(p.locked) : "–"}</td>
                      <td className="num px-3 py-2 text-right">{v === null ? "–" : usd(v)}</td>
                      <td className="num px-3 py-2 text-right text-fg-2">{peth(p.cost)} pETH</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="surface min-w-0 p-4 md:p-5">
          <h2 className={head}>Pot wins</h2>
          {account?.wins.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {account.wins.map((w, i) => (
                <li key={`${w.coin}-${w.round}-${i}`} className="tile flex items-center justify-between gap-3 px-3 py-2.5">
                  <Link href={`/t/${w.coin}`} className="min-w-0 truncate font-semibold hover:text-surge">
                    {w.symbol} · round {w.round}
                  </Link>
                  <span className="num shrink-0 text-gold">
                    +{peth(w.prize)} pETH <span className="text-[12px] text-fg-3">{now ? `${ago(w.at, now)} ago` : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-fg-3">No wins yet. A prize lands in the practice balance the moment its round settles.</p>
          )}
        </div>
        <div className="surface min-w-0 p-4 md:p-5">
          <h2 className={head}>Coins held on chain</h2>
          <p className="mt-1 text-[12px] text-fg-3">Real balances of the live coins on the board, read from {CHAIN.name}.</p>
          {holdings.failed ? (
            <p className="mt-3 text-[13px] text-fg-3">The chain could not be read right now.</p>
          ) : !holdings.rows ? (
            <p className="mt-3 text-[13px] text-fg-3">Reading balances…</p>
          ) : holdings.rows.length === 0 ? (
            <p className="mt-3 text-[13px] text-fg-3">This wallet holds none of the coins on the board.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2" data-testid="holdings">
              {holdings.rows.map((r) => (
                <li key={r.coin.key} className="tile flex items-center justify-between gap-3 px-3 py-2">
                  <Link href={`/t/${r.coin.key}`} className="flex min-w-0 items-center gap-2 font-semibold hover:text-surge">
                    <CoinLogo src={r.coin.logo} symbol={r.coin.symbol} size={30} />
                    <span className="truncate">{r.coin.symbol}</span>
                  </Link>
                  <span className="num shrink-0 text-right text-[13px]">
                    {tokens(r.amount)}
                    <span className="block text-[12px] text-fg-3">{r.coin.priceUsd ? usd(r.coin.priceUsd * r.amount) : "–"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {account?.launched.length ? (
        <section className="surface mt-4 p-4 md:p-5">
          <h2 className={head}>Coins you launched</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {account.launched.map((id) => {
              const c = byKey.get(id);
              return (
                <li key={id}>
                  <Link href={`/t/${id}`} className="btn-ghost inline-flex h-9 items-center rounded-full px-4 text-[14px]">
                    {c?.symbol ?? id}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}
