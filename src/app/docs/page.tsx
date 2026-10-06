import type { Metadata } from "next";
import { DocView } from "@/components/docs/DocView";
import { DOCS } from "@/components/docs/content";

export const metadata: Metadata = { title: "Docs" };

export default function Page() {
  return <DocView doc={DOCS[0]} />;
}
