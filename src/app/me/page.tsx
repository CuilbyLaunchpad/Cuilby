import type { Metadata } from "next";
import { Portfolio } from "@/components/pages/Portfolio";

export const metadata: Metadata = { title: "Portfolio" };

export default function Page() {
  return <Portfolio />;
}
