import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRAND, CHAIN } from "@/config/brand";
import { JsonLd } from "@/components/JsonLd";
import { MobileNav, StatusBar } from "@/components/SiteChrome";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PracticeProvider } from "@/components/providers/PracticeProvider";
import { WalletModalProvider } from "@/components/wallet/WalletButton";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { OG_IMAGE } from "@/lib/seo";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-bricolage", display: "swap" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist-mono", display: "swap" });

const TITLE = "Jackpot Launchpad on Robinhood Chain — Cuilby";
const DESCRIPTION =
  "Cuilby is a jackpot launchpad on Robinhood Chain. Each coin carries a pot that its trading fees fill, and every round pays it out. Launch a coin or play a pot.";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: TITLE, template: `%s — ${BRAND.name}` },
  description: DESCRIPTION,
  applicationName: BRAND.name,
  category: "finance",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  openGraph: {
    type: "website",
    url: "/",
    siteName: BRAND.name,
    locale: "en_US",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: BRAND.xHandle,
    creator: BRAND.xHandle,
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export const viewport: Viewport = { themeColor: "#0a0f0d", viewportFit: "cover" };

const ORG = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BRAND.url}/#org`,
      name: BRAND.name,
      url: BRAND.url,
      logo: `${BRAND.url}/brand/cuilby-mark.webp`,
      sameAs: [BRAND.x],
    },
    {
      "@type": "WebSite",
      "@id": `${BRAND.url}/#site`,
      name: BRAND.name,
      url: BRAND.url,
      description: DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${BRAND.url}/#org` },
    },
    {
      "@type": "WebApplication",
      "@id": `${BRAND.url}/#app`,
      name: BRAND.name,
      url: BRAND.url,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web browser",
      description: `Launchpad on ${CHAIN.name} where every coin carries a prize pot funded by its trading fees. Pots currently run in practice mode.`,
      publisher: { "@id": `${BRAND.url}/#org` },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${geist.variable} ${geistMono.variable}`}>
      <body className="overflow-x-hidden font-sans text-[15px] antialiased">
        <JsonLd data={ORG} />
        <WalletProvider>
          <WalletModalProvider>
            <PracticeProvider>
              <SiteHeader />
              {children}
              <SiteFooter />
              <StatusBar />
              <MobileNav />
            </PracticeProvider>
          </WalletModalProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
