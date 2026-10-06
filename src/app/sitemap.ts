import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";
import { DOCS, docHref } from "@/components/docs/content";

/** Every indexable page. /me is an account view and stays out (noindex). */
export default function sitemap(): MetadataRoute.Sitemap {
  const modified = new Date("2026-10-06T00:00:00Z");
  const pages: { path: string; priority: number; changeFrequency: "hourly" | "daily" | "weekly" | "monthly" }[] = [
    { path: "/", priority: 1, changeFrequency: "hourly" },
    { path: "/launch", priority: 0.9, changeFrequency: "weekly" },
    { path: "/winners", priority: 0.8, changeFrequency: "hourly" },
    { path: "/swap", priority: 0.7, changeFrequency: "weekly" },
    ...DOCS.map((d) => ({ path: docHref(d.slug), priority: d.slug ? 0.6 : 0.7, changeFrequency: "monthly" as const })),
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
  ];
  return pages.map((p) => ({
    url: `${BRAND.url}${p.path === "/" ? "" : p.path}`,
    lastModified: modified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
