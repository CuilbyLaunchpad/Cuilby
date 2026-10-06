import { NextResponse } from "next/server";
import { getStore } from "@/lib/auth/store";
import { allow, allowNetwork, readBody, tooMany } from "@/lib/guard";
import { consumeIntent } from "@/lib/practice/intent";
import { buy, claimEarnings, join, launch, sell, topUp } from "@/lib/practice/ledger";

export const dynamic = "force-dynamic";

/** Step 2: the signed message comes back. The nonce is burned before anything runs. */
export async function POST(request: Request) {
  const store = getStore();
  if (!store) return NextResponse.json({ error: "not_configured", message: "Practice storage is not configured on this site yet." }, { status: 503 });
  if (!(await allowNetwork(request, "act-ip", 40, 60))) return tooMany();
  const body = await readBody<{ nonce?: unknown; signature?: unknown }>(request, 1024);
  if ("response" in body) return body.response;
  const nonce = typeof body.data.nonce === "string" ? body.data.nonce : "";
  const signature = typeof body.data.signature === "string" ? body.data.signature : "";
  const consumed = await consumeIntent(store, nonce, signature);
  if ("error" in consumed) return NextResponse.json({ error: consumed.error }, { status: consumed.status });
  const { address, action } = consumed;
  if (!(await allow(store, "act", [address], 20, 60))) return tooMany();
  if (action.kind === "launch" && !(await allow(store, "launch-wallet", [address], 5, 3600))) return tooMany();
  const result =
    action.kind === "join"
      ? await join(store, address)
      : action.kind === "buy"
        ? await buy(store, address, action.params)
        : action.kind === "sell"
          ? await sell(store, address, action.params)
          : action.kind === "launch"
            ? await launch(store, address, action.params)
            : action.kind === "topup"
              ? await topUp(store, address)
              : await claimEarnings(store, address);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
