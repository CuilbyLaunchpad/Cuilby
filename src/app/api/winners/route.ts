import { NextResponse } from "next/server";
import { getStore } from "@/lib/auth/store";
import { readList, readStats, type WinnerRow } from "@/lib/practice/ledger";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  if (!store) return NextResponse.json({ configured: false, winners: [], stats: null });
  const [winners, stats] = await Promise.all([readList<WinnerRow>(store, "winners"), readStats(store)]);
  return NextResponse.json({ configured: true, winners, stats }, { headers: { "cache-control": "no-store" } });
}
