import type { Metadata } from "next";
import { Winners } from "@/components/pages/Winners";

export const metadata: Metadata = { title: "Winners" };

export default function Page() {
  return <Winners />;
}
