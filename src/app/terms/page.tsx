import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, CHAIN } from "@/config/brand";
import { JsonLd } from "@/components/JsonLd";
import { MAIN } from "@/components/ui";
import { breadcrumbs, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Terms of Use and Responsible Play",
  description:
    "Cuilby terms of use: practice pETH has no value, pots are for adults 18 and over, real swaps go from your own wallet, and nothing here is financial advice.",
  path: "/terms",
});

const SECTIONS: [string, string][] = [
  [
    "What this site does",
    `${BRAND.name} lists coins launched on ${CHAIN.name} and runs practice pots beside them. Practice pots, rounds, launches and balances use practice ETH (pETH), which has no value, cannot be bought, sold or withdrawn, and may be reset.`,
  ],
  [
    "Responsible play",
    "You must be 18 or older, and of legal age where you live, to use the pots. Pots pay by chance and most rounds are won by someone else. Only risk what you can afford to lose, set yourself limits and stop when it stops being fun. Where games of chance are restricted, do not use them.",
  ],
  [
    "Real trades",
    `The Real trade card sends transactions from your own wallet to third-party contracts on ${CHAIN.name}. ${BRAND.name} never holds your funds, cannot reverse a transaction and does not vouch for any coin listed from the launchpad. Coins can lose all their value.`,
  ],
  [
    "Signed messages",
    "Practice actions ask your wallet to sign a plain-text message. It sends no transaction, costs nothing, names this site, the action and the amount, and works once within five minutes. Never sign a message that does not match what you asked for.",
  ],
  [
    "No advice",
    "Nothing on this site is financial, legal or tax advice. Data from the chain and other sources is shown as read and may be late or wrong.",
  ],
  [
    "Changes to these terms",
    `These terms will be replaced before the ${BRAND.name} contracts go live with real pots, and the new version will be posted here first.`,
  ],
];

export default function Page() {
  return (
    <main className={MAIN}>
      <JsonLd data={breadcrumbs([{ name: "Terms", path: "/terms" }])} />
      <div className="enter mx-auto max-w-[760px]">
        <h1 className="display text-[38px] leading-none font-extrabold md:text-[48px]">Terms of use and responsible play</h1>
        <p className="mt-3 text-[17px] text-fg-2">These terms of use are written in plain language. Last updated October 2026.</p>
        <div className="mt-8 flex flex-col gap-4">
          {SECTIONS.map(([h, p]) => (
            <section
              key={h}
              className={h === "Responsible play" ? "surface p-5 shadow-[inset_0_0_0_1px_rgb(243_189_82/0.35)]" : "tile px-5 py-4"}
            >
              <h2 className={`text-[16px] font-semibold ${h === "Responsible play" ? "text-gold" : ""}`}>{h}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-fg-2">{p}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-[14px] text-fg-3">
          Questions? Reach {BRAND.name} on{" "}
          <a href={BRAND.x} className="text-fg-2 hover:text-fg" target="_blank" rel="noreferrer">
            X {BRAND.xHandle}
          </a>{" "}
          or read the{" "}
          <Link href="/docs/faq" className="font-semibold text-surge hover:underline">
            jackpot launchpad FAQ
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
