import type { Metadata } from "next";
import { BRAND } from "@/config/brand";

/** Social card generated from src/app/opengraph-image.jpg (1200 x 630). */
export const OG_IMAGE = {
  url: "/opengraph-image.jpg",
  width: 1200,
  height: 630,
  alt: `${BRAND.name}, the jackpot launchpad on Robinhood Chain`,
};

/**
 * Per-route metadata: one title ("Primary keyword — Cuilby"), one description,
 * a canonical URL and matching Open Graph / X cards. `index: false` keeps thin
 * account views out of search results while still letting crawlers follow links.
 */
export function pageMeta({
  title,
  description,
  path,
  type = "website",
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  index?: boolean;
}): Metadata {
  const full = `${title} — ${BRAND.name}`;
  return {
    title: { absolute: full },
    description,
    alternates: { canonical: path },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      type,
      url: path,
      siteName: BRAND.name,
      title: full,
      description,
      locale: "en_US",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      site: BRAND.xHandle,
      creator: BRAND.xHandle,
      title: full,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

/** BreadcrumbList for nested pages. `trail` excludes Home. */
export function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${BRAND.url}${t.path === "/" ? "" : t.path}`,
    })),
  };
}

/** Serialises JSON-LD safely for a <script> tag (no closing-tag injection). */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
