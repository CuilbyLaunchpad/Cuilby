import type { Metadata, Viewport } from "next";
import { DM_Mono, Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/config/brand";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PracticeProvider } from "@/components/providers/PracticeProvider";
import { WalletModalProvider } from "@/components/wallet/WalletButton";
import { WalletProvider } from "@/components/wallet/WalletProvider";

const fraunces = Fraunces({ subsets: ["latin"], axes: ["SOFT", "WONK", "opsz"], variable: "--font-fraunces", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dmmono", display: "swap" });

const title = `${BRAND.name} (${BRAND.symbol}) · ${BRAND.slogan}`;

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: title, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  keywords: [BRAND.name, BRAND.symbol, "Robinhood Chain", "launchpad", "jackpot", "raffle", "memecoin"],
  openGraph: {
    type: "website",
    url: BRAND.url,
    siteName: BRAND.name,
    title,
    description: BRAND.tagline,
  },
  twitter: {
    card: "summary_large_image",
    site: BRAND.xHandle,
    title,
    description: BRAND.tagline,
  },
};

export const viewport: Viewport = { themeColor: "#eef0f6" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${figtree.variable} ${dmMono.variable}`}>
      <body className="min-h-dvh overflow-x-hidden bg-paper font-sans text-ink antialiased">
        <WalletProvider>
          <WalletModalProvider>
            <PracticeProvider>
              <SiteHeader />
              <div className="min-h-[70vh]">{children}</div>
              <SiteFooter />
            </PracticeProvider>
          </WalletModalProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
