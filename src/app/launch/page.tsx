import type { Metadata } from "next";
import { LaunchForm } from "@/components/launch/LaunchForm";

export const metadata: Metadata = { title: "Launch a coin" };

export default function Page() {
  return (
    <main className="mx-auto max-w-[1180px] px-4 pt-10 pb-10 sm:px-6">
      <h1 className="h-display text-[48px] sm:text-[64px]">Put a coin on the board.</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-ink-2">
        Sign once and it is listed with a pot of its own. Choose the payout style and the length of a round, then send people the link.
      </p>
      <div className="mt-8">
        <LaunchForm />
      </div>
    </main>
  );
}
