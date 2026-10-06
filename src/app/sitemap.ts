import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";
import { DOCS } from "@/components/docs/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/launch", "/winners", "/me", "/swap", "/terms", ...DOCS.map((d) => (d.slug ? `/docs/${d.slug}` : "/docs"))];
  return pages.map((p) => ({ url: `${BRAND.url}${p}`, changeFrequency: "daily" }));
}
