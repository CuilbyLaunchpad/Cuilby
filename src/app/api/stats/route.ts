import { NextResponse } from "next/server";
import { getStore } from "@/lib/auth/store";
import { readBoard } from "@/lib/board";
import { rpcBatch } from "@/lib/feeds/rpc";
import { readStats } from "@/lib/practice/ledger";

export const dynamic = "force-dynamic";

type ChainRead = ({ number: string; timestamp: string } | string | null)[] | null;
let chainCache: { at: number; value: ChainRead } | null = null;

/** Latest block and gas, cached for a few seconds so visitor traffic never multiplies node reads. */
async function chainFacts(): Promise<ChainRead> {
  if (chainCache && Date.now() - chainCache.at < 5000) return chainCache.value;
  const value = await rpcBatch<{ number: string; timestamp: string } | string>([
    { method: "eth_getBlockByNumber", params: ["latest", false] },
    { method: "eth_gasPrice", params: [] },
  ]).catch(() => chainCache?.value ?? null);
  chainCache = { at: Date.now(), value };
  return value;
}

/** Footer strip: live chain facts plus practice totals, each labelled for what it is. */
export async function GET() {
  const store = getStore();
  const [board, chain, practice] = await Promise.all([
    readBoard().catch(() => null),
    chainFacts(),
    store ? readStats(store).catch(() => null) : Promise.resolve(null),
  ]);
  const block = chain?.[0] && typeof chain[0] === "object" ? chain[0] : null;
  const gas = typeof chain?.[1] === "string" ? chain[1] : null;
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  return NextResponse.json(
    {
      ethUsd: board?.ethUsd ?? null,
      block: block ? Number.parseInt(block.number, 16) : null,
      blockAge: block ? Math.max(0, Math.round(Date.now() / 1000 - Number.parseInt(block.timestamp, 16))) : null,
      gasGwei: gas ? Number(BigInt(gas)) / 1e9 : null,
      liveCoins: board?.coins.filter((c) => c.kind === "live").length ?? 0,
      launchedToday: board?.coins.filter((c) => c.kind === "live" && c.launchedAt > dayAgo).length ?? 0,
      practicePots: board?.coins.reduce((sum, c) => sum + c.game.pot, 0) ?? 0,
      practice,
      practiceConfigured: Boolean(store),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
