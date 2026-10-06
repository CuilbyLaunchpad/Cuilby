import { NextResponse } from "next/server";
import { getStore } from "@/lib/auth/store";
import { CHART_RANGES, chart, holders, trades, type ChartRange } from "@/lib/feeds/pons";
import { isGameKey, readHolders, readList, type TradeRow } from "@/lib/practice/ledger";

export const dynamic = "force-dynamic";

/**
 * Market data for one coin. Live coins: chart, trades and holders straight
 * from the chain (through the launchpad's public API). Practice plays on the
 * coin come from the ledger and are returned separately, never merged.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key.toLowerCase();
  if (!isGameKey(key)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const url = new URL(request.url);
  const asked = url.searchParams.get("range") ?? "1h";
  const range: ChartRange = (CHART_RANGES as readonly string[]).includes(asked) ? (asked as ChartRange) : "1h";
  const store = getStore();
  const practice = store ? await readList<TradeRow>(store, `trades:${key}`).catch(() => []) : [];
  const practiceHolders = store ? await readHolders(store, key).catch(() => []) : [];
  if (key.startsWith("p-")) {
    return NextResponse.json({ live: false, chart: [], trades: [], holders: [], practice, practiceHolders, error: null });
  }
  const [c, t, h] = await Promise.allSettled([chart(key, range), trades(key), holders(key)]);
  return NextResponse.json(
    {
      live: true,
      range,
      chart: c.status === "fulfilled" ? c.value : [],
      trades: t.status === "fulfilled" ? t.value : [],
      holders: h.status === "fulfilled" ? h.value : [],
      practice,
      practiceHolders,
      error: [c, t, h].some((r) => r.status === "rejected") ? "Some live data could not be read right now." : null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
