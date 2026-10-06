import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocView } from "@/components/docs/DocView";
import { DOCS, docBySlug } from "@/components/docs/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return DOCS.filter((d) => d.slug).map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const doc = docBySlug((await params).slug);
  return { title: doc ? doc.title : "Docs" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const doc = docBySlug((await params).slug);
  if (!doc || !doc.slug) notFound();
  return <DocView doc={doc} />;
}
