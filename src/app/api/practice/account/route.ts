import { NextResponse } from "next/server";
import { getStore } from "@/lib/auth/store";
import { MICRO } from "@/lib/game/engine";
import { TOP_UP_BELOW, TOP_UP_EVERY_MS, readAccount, readEarnings } from "@/lib/practice/ledger";

export const dynamic = "force-dynamic";

/** A wallet's practice account. Practice data is public, like a chain would be. */
export async function GET(request: Request) {
  const store = getStore();
  if (!store) return NextResponse.json({ configured: false });
  const address = (new URL(request.url).searchParams.get("address") ?? "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) return NextResponse.json({ error: "A wallet address is required." }, { status: 400 });
  const [account, earnings] = await Promise.all([readAccount(store, address), readEarnings(store, address)]);
  const canTopUp = Boolean(account && account.balance < TOP_UP_BELOW && Date.now() - account.toppedUpAt >= TOP_UP_EVERY_MS);
  return NextResponse.json(
    { configured: true, account, earnings, canTopUp, unit: MICRO },
    { headers: { "cache-control": "no-store" } },
  );
}
