import { Suspense } from "react";
import type { Metadata } from "next";
import { Board } from "@/components/home/Home";
import { Hero, OfficialToken } from "@/components/home/Hero";
import { MAIN } from "@/components/ui";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Jackpot Launchpad on Robinhood Chain",
  description:
    "Cuilby is a jackpot launchpad on Robinhood Chain. Each coin carries a pot that its trading fees fill, and every round pays it out. Launch a coin or play a pot.",
  path: "/",
});

export default function Page() {
  return (
    <main className={MAIN}>
      <OfficialToken />
      <Hero />
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Board />
      </Suspense>
    </main>
  );
}
