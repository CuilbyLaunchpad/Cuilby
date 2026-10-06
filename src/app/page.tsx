import { Suspense } from "react";
import { Home } from "@/components/home/Home";

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-[60vh]" />}>
      <Home />
    </Suspense>
  );
}
