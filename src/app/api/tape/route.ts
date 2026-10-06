import { NextResponse } from "next/server";
import { getStore } from "@/lib/auth/store";
import { activeCoins, trades } from "@/lib/feeds/pons";
import { readList, type TapeRow } from "@/lib/practice/ledger";

export const dynamic = "force-dynamic";

export type TapeItem = {
  source: "chain" | "practice";
  kind: "buy" | "sell" | "win" | "launch";
  coin: string;
  symbol: string;
  wallet: string;
  eth: number;
  at: number;
  tx: string | null;
  /** Logo route for live coins that have one. */
  logo?: string | null;
};

/**
 * The tape: real trades on the most active live coins (from the chain) next
 * to practice plays, each tagged with where it came from.
 */
export async function GET() {
  const coins = (await activeCoins())
    .filter((c) => c.latestBuyAt)
    .sort((a, b) => (b.latestBuyAt ?? 0) - (a.latestBuyAt ?? 0))
    .slice(0, 4);
  const lists = await Promise.allSettled(coins.map((c) => trades(c.key)));
  const chain: TapeItem[] = lists.flatMap((r, i) =>
    r.status === "fulfilled"
      ? r.value.slice(0, 12).map((t) => ({
          source: "chain" as const,
          kind: t.side,
          coin: coins[i].key,
          symbol: coins[i].symbol,
          wallet: t.account,
          eth: t.eth,
          at: t.at,
          tx: t.tx || null,
          logo: coins[i].hasLogo ? `/api/logo/${coins[i].key}` : null,
        }))
      : [],
  );
  const store = getStore();
  const practice: TapeItem[] = store
    ? (await readList<TapeRow>(store, "tape").catch(() => [])).slice(0, 30).map((t) => ({
        source: "practice" as const,
        kind: t.kind,
        coin: t.coin,
        symbol: t.symbol,
        wallet: t.wallet,
        eth: t.eth / 1_000_000,
        at: t.at,
        tx: null,
      }))
    : [];
  const items = [...chain, ...practice].sort((a, b) => b.at - a.at).slice(0, 40);
  return NextResponse.json({ items }, { headers: { "cache-control": "no-store" } });
}
