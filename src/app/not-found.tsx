import type { Metadata } from "next";
import Link from "next/link";
import { MAIN } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <main className={MAIN}>
      <div className="surface enter mx-auto flex max-w-lg flex-col items-center px-6 py-14 text-center">
        <p className="num text-[13px] text-fg-3">404</p>
        <h1 className="display mt-2 text-[28px] font-extrabold">This page did not get drawn.</h1>
        <p className="mt-1.5 text-[14px] text-fg-2">The address you followed leads nowhere. The coin board is still live.</p>
        <Link href="/" className="btn-surge mt-5 inline-flex h-11 items-center rounded-full px-6 text-[15px] font-bold">
          Back to the coin board
        </Link>
      </div>
    </main>
  );
}
