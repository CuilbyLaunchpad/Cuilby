import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoinPage } from "@/components/coin/CoinPage";
import { JsonLd } from "@/components/JsonLd";
import { MAIN } from "@/components/ui";
import { coinIdentity } from "@/lib/board";
import { breadcrumbs, pageMeta } from "@/lib/seo";

const valid = (key: string) => /^0x[0-9a-f]{40}$/.test(key) || /^p-[0-9a-z]{6,12}$/.test(key);

/** First candidate that fits the length limit; the last one cut to size otherwise. */
const fit = (candidates: string[], max: number) =>
  candidates.find((c) => c.length <= max) ?? candidates[candidates.length - 1].slice(0, max);

async function identity(key: string) {
  // Metadata must never hold the page hostage to a slow feed.
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
  return Promise.race([coinIdentity(key).catch(() => null), timeout]);
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const key = (await params).key.toLowerCase();
  const path = `/t/${key}`;
  const coin = valid(key) ? await identity(key) : null;
  if (!coin) {
    return pageMeta({
      title: "Coin Price, Chart and Jackpot Pot",
      description:
        "Live market cap, price chart, trades and holders for a coin on Robinhood Chain, with the practice jackpot pot that runs beside it on Cuilby.",
      path,
      index: false,
    });
  }
  const { name, symbol } = coin;
  const title = fit(
    [
      `${name} (${symbol}) Price, Chart and Jackpot Pot`,
      `${name} (${symbol}) Price and Jackpot Pot`,
      `${symbol} Price, Chart and Jackpot Pot`,
      `${symbol} Jackpot Pot`,
    ],
    51,
  );
  const description =
    coin.kind === "live"
      ? fit(
          [
            `Live ${name} (${symbol}) market cap, price chart, trades and holders on Robinhood Chain, plus the practice jackpot pot you can play on Cuilby.`,
            `Live ${symbol} market cap, price chart, trades and holders on Robinhood Chain, plus the practice jackpot pot you can play on Cuilby.`,
          ],
          160,
        )
      : fit(
          [
            `${name} (${symbol}) is a practice coin on Cuilby. See its pot, round clock, recent plays and holders, then sign a free play to join the draw.`,
            `${symbol} is a practice coin on Cuilby. See its pot, round clock, recent plays and holders, then sign a free play to join the draw.`,
          ],
          160,
        );
  return pageMeta({ title, description, path, index: coin.kind === "live" });
}

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key.toLowerCase();
  if (!valid(key)) notFound();
  return (
    <main className={MAIN}>
      <JsonLd
        data={breadcrumbs([
          { name: "Coins", path: "/" },
          { name: key.startsWith("p-") ? "Practice coin" : "Live coin", path: `/t/${key}` },
        ])}
      />
      <div className="enter">
        <CoinPage coinKey={key} />
      </div>
    </main>
  );
}
