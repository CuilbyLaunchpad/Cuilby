import Link from "next/link";
import { BRAND, CHAIN, hasGithub } from "@/config/brand";
import { CopyCaBlock } from "@/components/CopyCa";
import { Mark } from "@/components/Mark";
import { ChainChip } from "@/components/ui";

const LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/safety", label: "Safety" },
  { href: "/docs/brand", label: "Brand kit" },
  { href: "/swap", label: `Swap ${BRAND.symbol}` },
  { href: "/terms", label: "Terms" },
  { href: CHAIN.explorer, label: "Block explorer", external: true },
  { href: BRAND.x, label: `X ${BRAND.xHandle}`, external: true },
];

export function SiteFooter() {
  const links = hasGithub ? [...LINKS, { href: BRAND.github, label: "Source code", external: true }] : LINKS;
  return (
    <footer className="mx-auto mt-10 mb-24 w-full max-w-[1400px] px-4 md:mb-12 md:px-6">
      <div className="flex flex-col gap-6 border-t border-line pt-8 text-[13px] text-fg-3 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-2.5">
          <Mark size={22} />
          <span>
            {BRAND.name} runs on {CHAIN.name}. Live coins trade on Pons V2.
          </span>
          <ChainChip />
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 md:ml-auto" aria-label="Footer">
          {links.map((l) =>
            l.external ? (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="hover:text-fg">
                {l.label}
              </a>
            ) : (
              <Link key={l.label} href={l.href} className="hover:text-fg">
                {l.label}
              </Link>
            ),
          )}
        </nav>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <CopyCaBlock />
        <p className="text-[12px] leading-relaxed text-fg-3">
          18+ only. Pots pay by chance, so only play with what you can afford to lose. Pots, rounds and draws run in practice mode with
          pETH, which has no value, until the {BRAND.name} contracts are deployed. Read the{" "}
          <Link href="/terms" className="text-fg-2 underline-offset-2 hover:underline">
            terms and responsible play notes
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
