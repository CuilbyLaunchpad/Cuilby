import { NextResponse } from "next/server";
import { readBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

/** Live launches plus practice coins, each with its practice pot. */
export async function GET() {
  const board = await readBoard();
  return NextResponse.json(board, { headers: { "cache-control": "no-store" } });
}
