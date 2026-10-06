import { NextResponse } from "next/server";
import { activeCoins, fetchLogo, findCoin, graduatedCoins } from "@/lib/feeds/pons";

export const dynamic = "force-dynamic";

/**
 * A listed coin's logo, fetched by the server. Only coins already on the
 * board resolve: the URL never comes from the request.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(key)) return new NextResponse(null, { status: 404 });
  await Promise.all([activeCoins(), graduatedCoins()]);
  const logo = await fetchLogo(key).catch(() => null);
  if (!logo) {
    // No usable logo: a plain monogram drawn here, so the page shows a tile instead of a broken image.
    const coin = await findCoin(key).catch(() => null);
    const letters = (coin?.symbol ?? "?").slice(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, "") || "?";
    const tones = ["#3442e0", "#e9502a", "#0c8a57", "#12152e", "#b4489b", "#d39e0c"];
    const tone = tones[Number.parseInt(key.slice(2, 4), 16) % tones.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${tone}"/><text x="32" y="41" font-family="monospace" font-size="24" fill="#fff" text-anchor="middle">${letters}</text></svg>`;
    return new NextResponse(svg, {
      headers: {
        "content-type": "image/svg+xml",
        "cache-control": "public, max-age=600",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
      },
    });
  }
  return new NextResponse(logo.body, {
    headers: {
      "content-type": logo.type,
      "cache-control": "public, max-age=86400, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'",
    },
  });
}
