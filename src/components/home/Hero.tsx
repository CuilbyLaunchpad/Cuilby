import Link from "next/link";
import { ArrowUpRight, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { BRAND, TOKEN } from "@/config/brand";
import { CopyCaInline } from "@/components/CopyCa";
import { Mark } from "@/components/Mark";
import { PaidSoFar } from "@/components/home/Home";
import { ChainChip } from "@/components/ui";

/** The official $CUILBY card at the top of the home page. */
export function OfficialToken() {
  return (
    <section className="mb-8" aria-label={`Official ${BRAND.name} token`}>
      <div className="surface relative overflow-hidden p-5 md:p-7">
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_260px_at_0%_0%,rgb(151_252_228/0.16),transparent_70%),radial-gradient(500px_220px_at_100%_100%,rgb(243_189_82/0.12),transparent_70%)]" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="grid size-[76px] shrink-0 place-items-center rounded-[21px] bg-card-3 outline-1 -outline-offset-1 outline-white/10">
              <Mark size={56} />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-surge">
                <SealCheck size={16} weight="fill" /> Official {BRAND.name} token
              </p>
              <p className="display mt-1 text-[24px] leading-tight font-extrabold md:truncate md:text-[38px] md:leading-none">
                {BRAND.name} <span className="text-fg-3">{BRAND.symbol}</span>
              </p>
              <CopyCaInline />
            </div>
          </div>
          <dl className="flex gap-8">
            <div>
              <dt className="text-[12px] text-fg-3">Status</dt>
              <dd className="num mt-0.5 text-[26px] leading-none">{TOKEN.isLive ? "Trading" : "Pre-launch"}</dd>
            </div>
          </dl>
          <div className="flex gap-2">
            <Link href="/swap" className="btn-surge inline-flex h-12 items-center gap-1.5 rounded-full px-6 text-[15px] font-bold">
              {TOKEN.isLive ? `Buy ${BRAND.symbol}` : `${BRAND.symbol} swap`} <ArrowUpRight size={15} weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Home hero: the page's H1, the primary keyword and the two main actions. */
export function Hero() {
  return (
    <section className="mb-4" aria-label="Introduction">
      <div className="surface relative isolate overflow-hidden">
        <div className="absolute inset-y-0 right-0 -z-10 w-full md:w-[76%]">
          {}
          <img
            src="/art/hero.webp"
            alt="The Cuilby water-drop mascot rising over stacks of gold coins"
            width={1600}
            height={900}
            fetchPriority="high"
            className="enter absolute inset-0 size-full object-cover object-[70%_50%] md:object-[60%_50%]"
            style={{ ["--d" as string]: "120ms" }}
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--color-ink)_0%,var(--color-ink)_24%,rgb(10_15_13/0.8)_40%,rgb(10_15_13/0.15)_62%,transparent_78%)] max-md:bg-[linear-gradient(180deg,rgb(10_15_13/0.2)_0%,rgb(10_15_13/0.75)_55%,var(--color-ink)_100%)]" />
        <div className="relative flex min-h-[360px] flex-col justify-end p-6 md:min-h-[420px] md:justify-center md:p-10">
          <div className="max-w-[46rem]">
            <ChainChip className="enter mb-4" />
            <h1 className="display text-[34px] leading-[0.95] font-extrabold sm:text-[46px] xl:text-[58px]">
              <span className="enter block">Jackpot launchpad</span>
              <span className="enter block text-surge" style={{ ["--d" as string]: "90ms" }}>
                on Robinhood Chain.
              </span>
            </h1>
            <p
              className="enter mt-3 max-w-[40ch] text-[15px] leading-relaxed text-fg-2 sm:mt-4 sm:text-[16px]"
              style={{ ["--d" as string]: "180ms" }}
            >
              Where coins get lucky. {BRAND.name} is a jackpot launchpad on Robinhood Chain: list a coin with one signature, and a slice of
              every trade on it builds a pot that one player collects when the round closes.
            </p>
            <div className="enter mt-5 flex flex-wrap items-center gap-2.5 sm:mt-6" style={{ ["--d" as string]: "260ms" }}>
              <Link href="/launch" className="btn-surge inline-flex h-11 items-center rounded-full px-6 text-[15px] font-bold">
                Launch a coin
              </Link>
              <Link href="/docs" className="btn-ghost inline-flex h-11 items-center rounded-full px-5 text-[15px] font-medium">
                See how pots pay
              </Link>
            </div>
            <p className="mt-6 hidden text-[13px] text-fg-3 sm:block">
              <PaidSoFar /> paid to practice winners so far
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
