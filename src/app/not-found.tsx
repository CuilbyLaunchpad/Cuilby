import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[760px] px-4 py-20 sm:px-6">
      <div className="ticket p-8">
        <p className="label">404</p>
        <h1 className="h-display mt-2 text-[48px]">This ticket did not draw.</h1>
        <p className="mt-3 text-ink-2">The page you asked for is not here. The board is.</p>
        <Link href="/" className="btn btn-brand mt-6 h-11 px-5">
          Back to the board
        </Link>
      </div>
    </main>
  );
}
