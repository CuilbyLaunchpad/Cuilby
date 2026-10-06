import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { Winners } from "@/components/pages/Winners";
import { MAIN } from "@/components/ui";
import { breadcrumbs, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Jackpot Winners and Settled Pots",
  description:
    "See every jackpot winner on Cuilby: settled rounds, prize sizes, winning wallets and the Robinhood Chain block behind each raffle draw. Check any draw yourself.",
  path: "/winners",
});

export default function Page() {
  return (
    <main className={MAIN}>
      <JsonLd data={breadcrumbs([{ name: "Winners", path: "/winners" }])} />
      <div className="enter">
        <Winners />
      </div>
    </main>
  );
}
