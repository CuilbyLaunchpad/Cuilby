"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { CHAIN, PONS } from "@/config/brand";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import { rpc } from "@/lib/rpc";
import {
  formatUnits,
  loadMarket,
  parseUnits,
  plan,
  quote,
  tokenBalance,
  waitForReceipt,
  withSlippage,
  type Market,
} from "@/lib/pons";

/*
 * A real swap card for any Pons V2 launch priced in ETH: quotes are read from
 * the chain and the trade is sent by the visitor's own wallet (curve before
 * graduation, Uniswap v4 pool after). `token` null means "not launched yet".
 */

const SLIPPAGES = [50, 100, 300];
/** Left in the wallet on a max buy so the swap itself can pay for gas. */
const GAS_RESERVE = 20_000_000_000_000n; // 0.00002 ETH

function useBalances(token: string | null, address: string | null, tick: number) {
  const [value, setValue] = useState<{ eth: bigint | null; token: bigint | null }>({ eth: null, token: null });
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const load = () => {
      rpc<string>("eth_getBalance", [address, "latest"])
        .then((hex) => !cancelled && setValue((v) => ({ ...v, eth: BigInt(hex) })))
        .catch(() => {});
      if (token) {
        tokenBalance(token, address)
          .then((raw) => !cancelled && setValue((v) => ({ ...v, token: raw })))
          .catch(() => {});
      }
    };
    load();
    const timer = window.setInterval(load, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, address, tick]);
  return address ? value : { eth: null, token: null };
}

function useMarket(token: string | null, tick: number) {
  const [market, setMarket] = useState<Market | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () =>
      loadMarket(token)
        .then((m) => {
          if (cancelled) return;
          setMarket(m);
          setFailed(false);
        })
        .catch(() => !cancelled && setFailed(true));
    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, tick]);
  return { market, failed };
}

export function venueLabel(token: string | null, market: Market | null, failed: boolean) {
  if (!token) return "Opens at launch";
  if (failed && !market) return "Could not read the market";
  if (!market) return "Reading the market…";
  if (market.venue === "curve") return "Pons bonding curve";
  if (market.venue === "pool") return "Uniswap v4 pool";
  if (market.venue === "graduating") return "Graduating";
  return market.reason ?? "Unavailable";
}

export function ChainTrade({ token, symbol, title = "Trade on chain", note }: { token: string | null; symbol: string; title?: string; note?: string }) {
  const [reverse, setReverse] = useState(false);
  const [amount, setAmount] = useState("");
  const { address, chainId, onRobinhoodChain, switchNetwork, switching, sendTransaction, refreshBalance } = useWallet();
  const { open } = useWalletModal();
  const [tick, setTick] = useState(0);
  const balances = useBalances(token, address, tick);
  const { market, failed } = useMarket(token, tick);
  const [slippage, setSlippage] = useState(100);
  const [quoted, setQuoted] = useState<{ key: string; out: bigint } | null>(null);
  const [quoteFailedKey, setQuoteFailedKey] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const buying = !reverse;
  const amountIn = parseUnits(amount);
  const tradable = market?.venue === "curve" || market?.venue === "pool";
  const quoteKey = `${buying}:${amountIn}:${market?.venue}`;

  useEffect(() => {
    if (!market || !tradable || !amountIn) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      quote(market, buying, amountIn, address ?? "0x000000000000000000000000000000000000dEaD")
        .then((out) => !cancelled && setQuoted({ key: quoteKey, out }))
        .catch(() => !cancelled && setQuoteFailedKey(quoteKey));
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [market, tradable, amountIn, buying, address, quoteKey]);

  const out = amountIn && quoted?.key === quoteKey ? quoted.out : null;
  const quoteError = amountIn && out === null && quoteFailedKey === quoteKey ? "No quote for this amount right now." : null;
  const sendBalanceRaw = buying ? balances.eth : balances.token;
  const short = amountIn !== null && sendBalanceRaw !== null && amountIn + (buying ? GAS_RESERVE : 0n) > sendBalanceRaw;

  const fillMax = () => {
    if (sendBalanceRaw === null) return;
    const max = buying ? (sendBalanceRaw > GAS_RESERVE ? sendBalanceRaw - GAS_RESERVE : 0n) : sendBalanceRaw;
    setAmount(formatUnits(max, 18, 18).replace(/,/g, ""));
  };

  const trade = async () => {
    if (!market || !address || !amountIn) return;
    setTradeError(null);
    setLastTx(null);
    try {
      setStage("Quoting…");
      // Re-quote right before signing: curve prices move with every buy.
      const fresh = await quote(market, buying, amountIn, address);
      const txs = await plan(market, buying, amountIn, withSlippage(fresh, slippage), address);
      for (const [i, tx] of txs.entries()) {
        const step = txs.length > 1 ? ` (${i + 1}/${txs.length})` : "";
        setStage(`${tx.label}${step}: confirm in wallet…`);
        const hash = await sendTransaction(tx);
        setStage(`${tx.label}${step}: waiting for block…`);
        await waitForReceipt(hash);
        if (i === txs.length - 1) setLastTx(hash);
      }
      setAmount("");
    } catch (cause) {
      setTradeError(cause instanceof Error ? cause.message : "The swap did not go through.");
    } finally {
      setStage(null);
      setTick((n) => n + 1);
      refreshBalance();
    }
  };

  const wrong = address !== null && chainId !== null && !onRobinhoodChain;
  const sendToken = reverse ? symbol : "ETH";
  const receiveToken = reverse ? "ETH" : symbol;
  const show = (v: bigint | null) => (v === null ? null : formatUnits(v, 18, 4));

  return (
    <div className="panel p-4 sm:p-5" data-testid="chain-trade">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="h-display text-[24px]">{title}</h2>
        <span className="flex items-center gap-1 font-mono text-[11px]">
          <span className="text-ink-3">Slippage</span>
          {SLIPPAGES.map((bps) => (
            <button
              key={bps}
              type="button"
              onClick={() => setSlippage(bps)}
              className={`cursor-pointer rounded-full border px-1.5 py-0.5 ${slippage === bps ? "border-ink bg-ink text-chalk" : "border-transparent text-ink-2 hover:border-line-2"}`}
            >
              {bps / 100}%
            </button>
          ))}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-ink-3">
        Venue: <span className="font-semibold text-ink-2" data-testid="swap-venue">{venueLabel(token, market, failed)}</span>
      </p>

      <div className="mt-3 rounded-xl border border-line-2 bg-paper px-4 pt-2.5 pb-3">
        <div className="flex justify-between gap-2 text-xs font-semibold text-ink-2">
          <span>You pay</span>
          <span className="flex min-w-0 gap-2">
            <span className="truncate">Balance: {show(sendBalanceRaw) ?? "–"}</span>
            {token && sendBalanceRaw !== null ? (
              <button type="button" onClick={fillMax} className="cursor-pointer font-bold text-brand underline">
                Max
              </button>
            ) : null}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <input
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "");
              const dot = v.indexOf(".");
              setAmount(dot < 0 ? v : v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, ""));
            }}
            className="min-w-0 flex-1 bg-transparent font-mono text-[24px] outline-none placeholder:text-ink-3"
            aria-label={`Amount of ${sendToken} to send`}
          />
          <span className="max-w-[45%] shrink-0 truncate rounded-full border border-line-2 bg-card px-3 py-1 text-sm font-semibold">{sendToken}</span>
        </div>
      </div>

      <div className="relative z-10 -my-3 flex justify-center">
        <button
          type="button"
          onClick={() => setReverse((v) => !v)}
          aria-label="Flip direction"
          className="flex size-9 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-ink bg-card transition-transform hover:rotate-180"
        >
          <ArrowDownUp className="size-4" strokeWidth={2.5} />
        </button>
      </div>

      <div className="rounded-xl border border-line-2 bg-paper-2 px-4 pt-2.5 pb-3">
        <div className="flex justify-between gap-2 text-xs font-semibold text-ink-2">
          <span>You get</span>
          <span className="truncate">Balance: {show(buying ? balances.token : balances.eth) ?? "–"}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`min-w-0 flex-1 truncate font-mono text-[24px] ${out ? "text-ink" : "text-ink-3"}`} data-testid="swap-out">
            {out !== null ? formatUnits(out, 18, buying ? 2 : 6) : "0"}
          </span>
          <span className="max-w-[45%] shrink-0 truncate rounded-full border border-line-2 bg-card px-3 py-1 text-sm font-semibold">{receiveToken}</span>
        </div>
      </div>
      <p className="mt-1.5 px-1 text-xs text-ink-3">
        {!token
          ? "Quotes open at launch"
          : quoteError
            ? quoteError
            : out !== null
              ? `At least ${formatUnits(withSlippage(out, slippage), 18, buying ? 2 : 6)} after ${slippage / 100}% slippage`
              : "Fees included in the quote"}
      </p>

      <div className="mt-3">
        {!address ? (
          <button type="button" onClick={open} className="btn btn-ink h-12 w-full text-base" data-testid="swap-connect">
            Connect wallet
          </button>
        ) : wrong ? (
          <button type="button" onClick={switchNetwork} disabled={switching} className="btn btn-accent h-12 w-full text-base">
            {switching ? "Confirm in wallet…" : `Switch to ${CHAIN.name}`}
          </button>
        ) : !token ? (
          <button type="button" disabled className="btn btn-accent h-12 w-full text-base">
            Swaps open at launch
          </button>
        ) : market && market.venue === "unavailable" ? (
          <a href={PONS.page(token)} target="_blank" rel="noreferrer" className="btn btn-accent h-12 w-full text-base">
            Trade on Pons ↗
          </a>
        ) : (
          <button
            type="button"
            onClick={trade}
            disabled={!tradable || !amountIn || short || out === null || out === 0n || stage !== null}
            className="btn btn-accent h-12 w-full text-base"
            data-testid="swap-submit"
          >
            {stage ??
              (!tradable
                ? "Trading paused"
                : !amountIn
                  ? "Enter an amount"
                  : short
                    ? `Not enough ${buying ? "ETH" : symbol}`
                    : out === null
                      ? "Getting a quote…"
                      : buying
                        ? `Buy ${symbol}`
                        : `Sell ${symbol}`)}
          </button>
        )}
      </div>
      {tradeError ? (
        <p role="alert" className="mt-3 rounded-lg border border-down bg-down-soft px-3 py-2 text-xs leading-relaxed break-words text-down">
          {tradeError}
        </p>
      ) : null}
      {lastTx ? (
        <a href={`${CHAIN.explorer}/tx/${lastTx}`} target="_blank" rel="noreferrer" className="mt-3 block text-center font-mono text-xs text-up underline" data-testid="swap-done">
          Swap confirmed · view transaction ↗
        </a>
      ) : null}
      {note ? <p className="mt-3 text-[12px] leading-relaxed text-ink-3">{note}</p> : null}
    </div>
  );
}
