import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, CHAIN, TOKEN, explorerToken, isAddress, shortAddress } from "@/config/brand";
import { CopyCaBlock } from "@/components/CopyCa";
import { JsonLd } from "@/components/JsonLd";
import { Mark } from "@/components/Mark";
import { ChainTrade } from "@/components/trade/ChainTrade";
import { MAIN } from "@/components/ui";
import { breadcrumbs, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: `How to Buy ${BRAND.symbol} on Robinhood Chain`,
  description: `How to buy ${BRAND.symbol}, the official Cuilby token: connect a wallet to Robinhood Chain and swap ETH through Pons V2. Check the contract address here first.`,
  path: "/swap",
});

export default function SwapPage() {
  const token = isAddress(BRAND.ca) ? BRAND.ca : null;
  return (
    <main className={MAIN}>
      <JsonLd data={breadcrumbs([{ name: `Swap ${BRAND.symbol}`, path: "/swap" }])} />
      <div className="enter grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <section className="surface relative overflow-hidden p-6 md:p-8">
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_260px_at_0%_0%,rgb(151_252_228/0.14),transparent_70%)]" />
            <div className="relative">
              <span className="grid size-[76px] place-items-center rounded-[21px] bg-card-3 outline-1 -outline-offset-1 outline-white/10">
                <Mark size={56} />
              </span>
              <h1 className="display mt-5 text-[36px] leading-none font-extrabold md:text-[48px]">
                How to buy <span className="text-surge">{BRAND.symbol}</span>
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-fg-2">
                To buy {BRAND.symbol}, connect a wallet to {CHAIN.name} and swap ETH on this page. {BRAND.symbol} launches on the Pons V2
                launchpad: until it graduates, swaps go through its bonding curve, and after that through its Uniswap v4 pool. Quotes come
                straight from the chain and you sign every swap in your own wallet.
              </p>
              {!TOKEN.isLive ? (
                <p className="mt-5 max-w-xl rounded-[16px] bg-surge/10 px-4 py-3.5 text-[14px] leading-relaxed text-fg shadow-[inset_0_0_0_1px_rgb(151_252_228/0.25)]">
                  The contract address is not published yet. The swap card switches on by itself once it is. Until then you can connect a
                  wallet, add {CHAIN.name} and see your real ETH balance.
                </p>
              ) : null}
            </div>
          </section>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="tile px-4 py-3.5">
              <dt className="text-[12px] text-fg-3">Network</dt>
              <dd className="mt-1 font-semibold">{CHAIN.name}</dd>
              <dd className="num text-[12px] text-fg-3">chain id {CHAIN.id}</dd>
            </div>
            <div className="tile px-4 py-3.5">
              <dt className="text-[12px] text-fg-3">Gas token</dt>
              <dd className="mt-1 font-semibold">{CHAIN.nativeSymbol}</dd>
              <dd className="text-[12px] text-fg-3">paid on each swap</dd>
            </div>
            <div className="tile min-w-0 px-4 py-3.5">
              <dt className="text-[12px] text-fg-3">Contract</dt>
              {token ? (
                <dd className="mt-1 truncate">
                  <a href={explorerToken(token)} target="_blank" rel="noreferrer" className="num text-surge hover:underline">
                    {shortAddress(token, 4, 4)}
                  </a>
                </dd>
              ) : (
                <dd className="mt-1 font-semibold">At launch</dd>
              )}
            </div>
          </dl>
          <CopyCaBlock className="mt-4" />
          <section className="surface mt-4 p-5 md:p-6">
            <h2 className="text-[15px] font-semibold">Steps to buy {BRAND.symbol}</h2>
            <ol className="mt-3 flex flex-col gap-2 text-[14px] leading-relaxed text-fg-2">
              <li>1. Connect an EVM wallet; the site adds {CHAIN.name} for you.</li>
              <li>2. Make sure the wallet holds some ETH on {CHAIN.name} for the swap and gas.</li>
              <li>3. Check the contract address above, type an amount and sign the swap.</li>
            </ol>
            <p className="mt-4 text-[13px] text-fg-3">
              Looking for the pots instead? They live on each coin&apos;s page.{" "}
              <Link href="/" className="font-semibold text-surge hover:underline">
                Browse the coin board
              </Link>
              .
            </p>
          </section>
        </div>
        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <ChainTrade token={token} symbol={BRAND.ticker} title={`Swap ${BRAND.symbol}`} />
        </div>
      </div>
    </main>
  );
}
