import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoinPage } from "@/components/coin/CoinPage";

const valid = (key: string) => /^0x[0-9a-f]{40}$/.test(key) || /^p-[0-9a-z]{6,12}$/.test(key);

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const key = (await params).key.toLowerCase();
  return { title: key.startsWith("p-") ? "Practice coin" : `Coin ${key.slice(0, 6)}…${key.slice(-4)}` };
}

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key.toLowerCase();
  if (!valid(key)) notFound();
  return <CoinPage coinKey={key} />;
}
