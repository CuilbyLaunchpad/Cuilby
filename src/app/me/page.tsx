import type { Metadata } from "next";
import { Portfolio } from "@/components/pages/Portfolio";
import { MAIN } from "@/components/ui";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Crypto Portfolio and Pot Wins",
  description:
    "Track your coins on Robinhood Chain, your practice pETH balance, open pot positions and every round you won, plus creator fees from coins you launched.",
  path: "/me",
  index: false,
});

export default function Page() {
  return (
    <main className={MAIN}>
      <div className="enter">
        <Portfolio />
      </div>
    </main>
  );
}
