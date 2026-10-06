import { NextResponse } from "next/server";
import { readCoin } from "@/lib/board";
import { isGameKey } from "@/lib/practice/ledger";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key.toLowerCase();
  if (!isGameKey(key)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const coin = await readCoin(key);
  if (!coin) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(coin, { headers: { "cache-control": "no-store" } });
}
