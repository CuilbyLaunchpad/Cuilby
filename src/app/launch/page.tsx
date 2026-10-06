import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LaunchForm } from "@/components/launch/LaunchForm";
import { MAIN } from "@/components/ui";
import { breadcrumbs, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Launch a Memecoin on Robinhood Chain",
  description:
    "Launch a memecoin on Robinhood Chain with a jackpot pot built in. Pick a raffle or hot seat, set the round length and go live with one signature. No code.",
  path: "/launch",
});

export default function Page() {
  return (
    <main className={MAIN}>
      <JsonLd data={breadcrumbs([{ name: "Launch a coin", path: "/launch" }])} />
      <div className="enter">
        <div className="mb-6 flex items-end gap-4">
          <div className="flex-1">
            <h1 className="display text-[36px] leading-none font-extrabold md:text-[48px]">Launch a memecoin.</h1>
            <p className="mt-2 max-w-2xl text-[15px] text-fg-2">
              Launch a memecoin on Robinhood Chain with its own pot attached. One signature puts it on the board, and its trading fees start
              building a prize from the first buy.
            </p>
          </div>
          {}
          <img
            src="/art/rocket.webp"
            alt="A Cuilby coin riding a rocket over a rising chart"
            width={220}
            height={220}
            className="hidden size-[110px] object-contain md:block"
          />
        </div>
        <LaunchForm />
      </div>
    </main>
  );
}
