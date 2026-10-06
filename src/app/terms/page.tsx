import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, CHAIN } from "@/config/brand";

export const metadata: Metadata = { title: "Terms" };

const SECTIONS: [string, string][] = [
  [
    "What this site is",
    `${BRAND.name} shows coins launched on ${CHAIN.name} and runs practice pots next to them. Practice pots, rounds, launches and balances use practice ETH (pETH), which has no value, cannot be bought, sold or withdrawn, and may be reset.`,
  ],
  [
    "Responsible play",
    "You must be 18 or older, and old enough under the law where you live, to use the pots. Pots are chance-based: most rounds are won by someone else. Only ever risk what you can afford to lose, set yourself limits, and stop if it stops being fun. Where games of chance are restricted, do not use them.",
  ],
  [
    "Real trades",
    `The Real trade card sends transactions from your own wallet to third-party contracts on ${CHAIN.name}. ${BRAND.name} does not hold your funds, cannot reverse a transaction, and does not vouch for any coin listed from the launchpad. Coins can lose all of their value.`,
  ],
  [
    "Signatures",
    "Practice actions ask your wallet to sign a plain-text message. It sends no transaction, costs nothing, names this site, the action and the amount, and works once within five minutes. Never sign a message that does not match what you asked for.",
  ],
  [
    "No advice",
    "Nothing on this site is financial, legal or tax advice. Data from the chain and third-party sources is shown as read and may be late or wrong.",
  ],
  [
    "Changes",
    "These terms will be replaced when the Cuilby contracts go live with real pots. The new version will be posted here before that happens.",
  ],
];

export default function Page() {
  return (
    <main className="mx-auto max-w-[760px] px-4 pt-10 pb-10 sm:px-6">
      <h1 className="h-display text-[48px] sm:text-[60px]">Terms</h1>
      <p className="mt-3 text-ink-2">Plain language, last updated October 2026.</p>
      <div className="mt-8 space-y-8">
        {SECTIONS.map(([h, p]) => (
          <section key={h} className={h === "Responsible play" ? "ticket p-5" : ""}>
            <h2 className="h-display text-[26px]">{h}</h2>
            <p className="mt-2 leading-relaxed text-ink-2">{p}</p>
          </section>
        ))}
      </div>
      <p className="mt-10 text-[14px] text-ink-3">
        Questions? Reach {BRAND.name} on <a href={BRAND.x} className="underline" target="_blank" rel="noreferrer">X {BRAND.xHandle}</a> or read the{" "}
        <Link href="/docs/faq" className="underline">FAQ</Link>.
      </p>
    </main>
  );
}
