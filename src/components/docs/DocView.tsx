import Link from "next/link";
import { DOCS, type Doc } from "@/components/docs/content";

const href = (slug: string) => (slug ? `/docs/${slug}` : "/docs");

export function DocView({ doc }: { doc: Doc }) {
  const groups = [...new Set(DOCS.map((d) => d.group))];
  const i = DOCS.indexOf(doc);
  const prev = DOCS[i - 1];
  const next = DOCS[i + 1];
  return (
    <main className="mx-auto grid max-w-[1180px] grid-cols-1 gap-10 px-4 pt-10 pb-10 sm:px-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Docs" className="min-w-0">
        <div className="scroll-x flex gap-2 md:sticky md:top-24 md:flex-col md:gap-5">
          {groups.map((g) => (
            <div key={g} className="flex shrink-0 gap-2 md:flex-col md:gap-1">
              <p className="label hidden md:block">{g}</p>
              {DOCS.filter((d) => d.group === g).map((d) => (
                <Link
                  key={d.slug}
                  href={href(d.slug)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[14px] font-semibold md:rounded-lg ${
                    d === doc ? "bg-ink text-chalk" : "text-ink-2 hover:bg-paper-2 hover:text-ink"
                  }`}
                >
                  {d.title}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </nav>
      <article className="min-w-0 max-w-[720px]">
        <p className="label">{doc.group}</p>
        <h1 className="h-display mt-2 text-[44px] sm:text-[56px]">{doc.title}</h1>
        <p className="mt-3 text-[18px] leading-relaxed text-ink-2">{doc.lede}</p>
        <div className="prose-doc mt-6 text-[16px]">{doc.body}</div>
        <div className="mt-12 grid grid-cols-2 gap-3 border-t-[1.5px] border-ink pt-6">
          {prev ? (
            <Link href={href(prev.slug)} className="panel min-w-0 p-4 hover:border-ink">
              <span className="label">Previous</span>
              <span className="block truncate font-semibold">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={href(next.slug)} className="panel min-w-0 p-4 text-right hover:border-ink">
              <span className="label">Next</span>
              <span className="block truncate font-semibold">{next.title}</span>
            </Link>
          ) : null}
        </div>
      </article>
    </main>
  );
}
