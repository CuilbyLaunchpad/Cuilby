import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, CHAIN, TOKEN, explorerToken, isAddress, shortAddress } from "@/config/brand";
import { CopyCaBlock } from "@/components/CopyCa";
import { Mark } from "@/components/Mark";
import { ChainTrade } from "@/components/trade/ChainTrade";

export const metadata: Metadata = { title: `Swap ${BRAND.symbol}` };

export default function SwapPage() {
  const token = isAddress(BRAND.ca) ? BRAND.ca : null;
  return (
    <main className="mx-auto grid max-w-[1180px] grid-cols-1 gap-10 px-4 pt-10 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <Mark size={52} />
          <p className="chip chip-brand">Official token</p>
        </div>
        <h1 className="h-display mt-5 text-[52px] sm:text-[68px]">Swap {BRAND.symbol}</h1>
        <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-ink-2">
          {BRAND.symbol} launches on the Pons launchpad on {CHAIN.name}. Until it graduates, swaps go through its bonding curve;
          after that, through its Uniswap v4 pool. Quotes are read from the chain and every swap is signed in your own wallet.
        </p>
        {!TOKEN.isLive ? (
          <p className="mt-4 max-w-lg rounded-xl border-[1.5px] border-dashed border-ink bg-amber-soft p-4 text-[14.5px] leading-relaxed">
            The contract is not published yet. This card switches on by itself the moment it is. Until then you can connect a
            wallet, add {CHAIN.name} and see your real ETH balance.
          </p>
        ) : null}
        <dl className="mt-8 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="panel p-4">
            <dt className="label">Network</dt>
            <dd className="mt-1 font-semibold">{CHAIN.name}</dd>
            <dd className="font-mono text-[12px] text-ink-3">chain id {CHAIN.id}</dd>
          </div>
          <div className="panel p-4">
            <dt className="label">Gas</dt>
            <dd className="mt-1 font-semibold">{CHAIN.nativeSymbol}</dd>
            <dd className="font-mono text-[12px] text-ink-3">paid per swap</dd>
          </div>
          <div className="panel min-w-0 p-4">
            <dt className="label">Contract</dt>
            {token ? (
              <dd className="mt-1 truncate">
                <a href={explorerToken(token)} target="_blank" rel="noreferrer" className="font-mono text-brand underline">
                  {shortAddress(token, 4, 4)}
                </a>
              </dd>
            ) : (
              <dd className="mt-1 font-semibold">At launch</dd>
            )}
          </div>
        </dl>
        <CopyCaBlock className="mt-8 max-w-lg" />
        <p className="mt-6 max-w-lg text-[13.5px] text-ink-3">
          Looking for the pots? They live on each coin&apos;s page. <Link href="/" className="text-brand underline">Open the board</Link>.
        </p>
      </div>
      <div className="min-w-0">
        <ChainTrade token={token} symbol={BRAND.ticker} title={`Swap ${BRAND.ticker}`} />
      </div>
    </main>
  );
}
