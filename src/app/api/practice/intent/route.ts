import { NextResponse } from "next/server";
import { signInDomain } from "@/lib/auth/auth";
import { getStore } from "@/lib/auth/store";
import { findCoin } from "@/lib/feeds/pons";
import { allow, allowNetwork, clientIp, readBody, tooMany } from "@/lib/guard";
import { createIntent, parseAction } from "@/lib/practice/intent";
import { readPracticeCoin } from "@/lib/practice/ledger";

export const dynamic = "force-dynamic";

/** Step 1 of a practice action: the server writes the message the wallet will sign. */
export async function POST(request: Request) {
  const store = getStore();
  if (!store) return NextResponse.json({ error: "not_configured", message: "Practice storage is not configured on this site yet." }, { status: 503 });
  const body = await readBody<{ address?: unknown; action?: unknown; params?: unknown }>(request);
  if ("response" in body) return body.response;
  const address = typeof body.data.address === "string" ? body.data.address.toLowerCase() : "";
  if (!/^0x[0-9a-f]{40}$/.test(address)) return NextResponse.json({ error: "Connect a wallet first." }, { status: 400 });
  // The address is only claimed here, not proven: it is counted together with the caller's network so
  // nobody can use up someone else's allowance. Per-wallet limits wait for the signature (act route).
  if (!(await allowNetwork(request, "intent", 30, 60)) || !(await allow(store, "intent", [`pair:${clientIp(request)}:${address}`], 30, 60))) return tooMany();
  const action = parseAction(body.data.action, body.data.params);
  if (typeof action === "string") return NextResponse.json({ error: action }, { status: 400 });
  if (action.kind === "launch" && !(await allowNetwork(request, "launch", 5, 3600))) return tooMany();
  let label = "";
  if (action.kind === "buy" || action.kind === "sell") {
    const coin = action.params.coin;
    const found = coin.startsWith("p-") ? await readPracticeCoin(store, coin) : await findCoin(coin).catch(() => null);
    if (!found) return NextResponse.json({ error: "That coin is not on the board right now." }, { status: 404 });
    label = `${found.symbol} (${coin.startsWith("p-") ? "practice coin" : `${coin.slice(0, 6)}…${coin.slice(-4)}`})`;
  }
  const intent = await createIntent(store, address, action, signInDomain(request.headers.get("host")), label);
  return NextResponse.json(intent);
}
