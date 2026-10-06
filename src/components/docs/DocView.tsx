import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { BRAND } from "@/config/brand";
import { JsonLd } from "@/components/JsonLd";
import { DOCS, docHref, type Doc } from "@/components/docs/content";
import { MAIN } from "@/components/ui";
import { breadcrumbs } from "@/lib/seo";

export function DocView({ doc }: { doc: Doc }) {
  const groups = [...new Set(DOCS.map((d) => d.group))];
  const i = DOCS.indexOf(doc);
  const prev = DOCS[i - 1];
  const next = DOCS[i + 1];
  const url = `${BRAND.url}${docHref(doc.slug)}`;
  const data: unknown[] = [
    breadcrumbs(
      doc.slug
        ? [
            { name: "Docs", path: "/docs" },
            { name: doc.nav, path: docHref(doc.slug) },
          ]
        : [{ name: "Docs", path: "/docs" }],
    ),
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: doc.h1,
      description: doc.metaDescription,
      url,
      inLanguage: "en",
      keywords: [doc.keyword, ...doc.secondary].join(", "),
      dateModified: "2026-10-06",
      author: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
      publisher: { "@id": `${BRAND.url}/#org` },
      mainEntityOfPage: url,
    },
  ];
  if (doc.faq) {
    data.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: doc.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    });
  }

  return (
    <main className={MAIN}>
      {data.map((d, n) => (
        <JsonLd key={n} data={d} />
      ))}
      <div className="enter grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0">
          <nav className="no-scrollbar -mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 lg:hidden" aria-label="Docs pages">
            {DOCS.map((d) => (
              <Link
                key={d.slug}
                href={docHref(d.slug)}
                aria-current={d === doc ? "page" : undefined}
                className={`relative shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium ${d === doc ? "text-ink" : "bg-card-2 text-fg-2"}`}
              >
                {d === doc ? <span className="absolute inset-0 rounded-full bg-fg" /> : null}
                <span className="relative">{d.nav}</span>
              </Link>
            ))}
          </nav>
          <nav className="sticky top-24 hidden flex-col gap-6 lg:flex" aria-label="Docs sections">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-2 px-3 text-[12px] font-semibold tracking-[0.12em] text-fg-3 uppercase">{g}</p>
                <ul className="flex flex-col gap-0.5">
                  {DOCS.filter((d) => d.group === g).map((d) => (
                    <li key={d.slug}>
                      <Link
                        href={docHref(d.slug)}
                        aria-current={d === doc ? "page" : undefined}
                        className={`relative block rounded-[12px] px-3 py-2 text-[14px] ${d === doc ? "text-fg" : "text-fg-2 hover:text-fg"}`}
                      >
                        {d === doc ? (
                          <span className="absolute inset-0 rounded-[12px] bg-card-2 shadow-[inset_2px_0_0_var(--color-surge)]" />
                        ) : null}
                        <span className="relative">{d.nav}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 max-w-[760px]">
          <article>
            <p className="text-[13px] font-semibold text-surge">{doc.group}</p>
            <h1 className="display mt-1 text-[38px] leading-none font-extrabold md:text-[48px]">{doc.h1}</h1>
            <p className="mt-3 text-[17px] text-fg-2">{doc.lede}</p>
            <div className="prose-doc mt-2">{doc.body}</div>
            <nav className="mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2" aria-label="Previous and next page">
              {prev ? (
                <Link href={docHref(prev.slug)} className="tile group flex flex-col px-4 py-3.5 hover:bg-card-3">
                  <span className="flex items-center gap-1 text-[12px] text-fg-3">
                    <ArrowLeft size={12} /> Previous
                  </span>
                  <span className="mt-0.5 font-semibold group-hover:text-surge">{prev.nav}</span>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}
              {next ? (
                <Link href={docHref(next.slug)} className="tile group flex flex-col items-end px-4 py-3.5 text-right hover:bg-card-3">
                  <span className="flex items-center gap-1 text-[12px] text-fg-3">
                    Next <ArrowRight size={12} />
                  </span>
                  <span className="mt-0.5 font-semibold group-hover:text-surge">{next.nav}</span>
                </Link>
              ) : null}
            </nav>
          </article>
        </div>
      </div>
    </main>
  );
}
