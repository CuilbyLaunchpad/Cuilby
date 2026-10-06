import "server-only";
import { PONS } from "@/config/brand";

/*
 * Live launches on Robinhood Chain from the Pons launchpad's public JSON
 * endpoints (no key). Everything here is real chain data: names, prices,
 * market caps, trades, holders. Cuilby adds nothing to it; the practice pots
 * live in the ledger and are labelled as such wherever they are shown.
 *
 * Only Pons V2 launches priced in ETH are listed, because those are the ones
 * the trade panel can actually route (curve before graduation, Uniswap v4
 * pool after).
 */

const BASE = "https://www.ponsfamily.com";
const HEADERS = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36",
  referer: "https://www.ponsfamily.com/launchpad",
  accept: "application/json",
};
const ZERO = "0x0000000000000000000000000000000000000000";

export type LiveCoin = {
  key: string;
  address: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  launchedAt: number;
  priceUsd: number | null;
  mcapUsd: number | null;
  /** 0–100 towards graduation; 100 once graduated. */
  progress: number | null;
  graduated: boolean;
  latestBuyAt: number | null;
  hasLogo: boolean;
};

type RawLaunch = {
  version?: string;
  factory?: string;
  token?: string;
  deployer?: string;
  pairToken?: string;
  name?: string;
  symbol?: string;
  logo?: string | null;
  description?: string | null;
  priceUsd?: number | null;
  marketCapUsd?: number | null;
  launchedAt?: string;
  graduated?: boolean;
  graduationProgressPct?: number | null;
  latestBuyAt?: string | null;
  quoteAsset?: { isNative?: boolean; symbol?: string };
};

async function get<T>(path: string, timeout = 8000): Promise<T> {
  let last: unknown;
  for (let n = 0; n < 2; n++) {
    try {
      const res = await fetch(`${BASE}${path}`, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(timeout) });
      if (!res.ok) throw new Error(`pons ${res.status}`);
      return (await res.json()) as T;
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw last;
}

const isAddr = (v: unknown): v is string => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const time = (v: unknown) => {
  const t = typeof v === "string" ? Date.parse(v) : Number.NaN;
  return Number.isFinite(t) ? t : null;
};
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";

const logos = new Map<string, string>();

/** Validates one row; anything malformed is dropped rather than breaking the board. */
function toCoin(raw: RawLaunch): LiveCoin | null {
  if (!isAddr(raw.token) || raw.factory?.toLowerCase() !== PONS.factory.toLowerCase()) return null;
  const quoteIsEth = raw.quoteAsset ? raw.quoteAsset.isNative === true : (raw.pairToken ?? ZERO).toLowerCase() === ZERO;
  if (!quoteIsEth) return null;
  const name = clean(raw.name, 40);
  const symbol = clean(raw.symbol, 16);
  if (!name || !symbol) return null;
  const key = raw.token.toLowerCase();
  if (typeof raw.logo === "string" && raw.logo) logos.set(key, raw.logo);
  const graduated = raw.graduated === true;
  return {
    key,
    address: raw.token,
    name,
    symbol,
    description: clean(raw.description, 280),
    creator: isAddr(raw.deployer) ? raw.deployer.toLowerCase() : ZERO,
    launchedAt: time(raw.launchedAt) ?? 0,
    priceUsd: num(raw.priceUsd),
    mcapUsd: num(raw.marketCapUsd),
    progress: graduated ? 100 : num(raw.graduationProgressPct),
    graduated,
    latestBuyAt: time(raw.latestBuyAt),
    hasLogo: logos.has(key),
  };
}

type Cache<T> = { at: number; value: T } | null;
let board: Cache<LiveCoin[]> = null;
let boardJob: Promise<LiveCoin[]> | null = null;
let catalog: Cache<LiveCoin[]> = null;
let catalogJob: Promise<LiveCoin[]> | null = null;

const BOARD_TTL = 30_000;
const CATALOG_TTL = 5 * 60_000;

async function loadBoard(): Promise<LiveCoin[]> {
  const pages = await Promise.all(
    [1, 2].map((page) =>
      get<{ active?: { items?: RawLaunch[] } }>(
        `/api/pons-launches?explore=1&sort=recentBuys&age=all&page=${page}&pageSize=50&includeGraduated=0&version=all&v=22`,
      ).catch(() => null),
    ),
  );
  if (pages.every((p) => !p)) throw new Error("pons unreachable");
  const out: LiveCoin[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const raw of page?.active?.items ?? []) {
      const coin = toCoin(raw);
      if (coin && !seen.has(coin.key)) {
        seen.add(coin.key);
        out.push(coin);
      }
    }
  }
  return out;
}

async function loadCatalog(): Promise<LiveCoin[]> {
  const rows = await get<RawLaunch[]>("/api/pons-launches/graduations?catalog=1&v=12", 12_000);
  return (Array.isArray(rows) ? rows : [])
    .map((r) => toCoin({ ...r, graduated: true }))
    .filter((c): c is LiveCoin => Boolean(c))
    .sort((a, b) => (b.mcapUsd ?? 0) - (a.mcapUsd ?? 0));
}

function cached<T>(
  slot: () => Cache<T>,
  setSlot: (v: Cache<T>) => void,
  job: () => Promise<T> | null,
  setJob: (j: Promise<T> | null) => void,
  load: () => Promise<T>,
  ttl: number,
  fallback: T,
): Promise<T> {
  const hit = slot();
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);
  let running = job();
  if (!running) {
    running = load()
      .then((value) => {
        setSlot({ at: Date.now(), value });
        return value;
      })
      // A failed read keeps serving the last good list; it is never cached itself.
      .catch(() => slot()?.value ?? fallback)
      .finally(() => setJob(null));
    setJob(running);
  }
  // Serve stale data immediately while a refresh runs.
  return hit ? Promise.resolve(hit.value) : running;
}

/** Active ETH-priced launches, most recently bought first. */
export function activeCoins(): Promise<LiveCoin[]> {
  return cached(
    () => board,
    (v) => (board = v),
    () => boardJob,
    (j) => (boardJob = j),
    loadBoard,
    BOARD_TTL,
    [],
  );
}

/** Graduated ETH-priced launches, largest first. */
export function graduatedCoins(): Promise<LiveCoin[]> {
  return cached(
    () => catalog,
    (v) => (catalog = v),
    () => catalogJob,
    (j) => (catalogJob = j),
    loadCatalog,
    CATALOG_TTL,
    [],
  );
}

/** Whether the last board read worked. */
export const boardStatus = () => ({ ok: Boolean(board), readAt: board?.at ?? null });

export async function findCoin(address: string): Promise<LiveCoin | null> {
  const key = address.toLowerCase();
  const active = await activeCoins();
  const hit = active.find((c) => c.key === key);
  if (hit) return hit;
  const grads = await graduatedCoins();
  return grads.find((c) => c.key === key) ?? null;
}

export const logoOf = (key: string) => logos.get(key.toLowerCase()) ?? null;

/* ------------------------------------------------------------------ */
/* Per-coin market data                                                */
/* ------------------------------------------------------------------ */

export type Trade = { side: "buy" | "sell"; account: string; eth: number; tokens: number; at: number; tx: string; block: number };
export type Holder = { address: string; share: number; tokens: number };
export type ChartPoint = { t: number; priceEth: number; volumeEth: number; trades: number };

const small = new Map<string, { at: number; value: unknown }>();
async function memo<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = small.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  try {
    const value = await load();
    if (small.size > 2000) small.clear();
    small.set(key, { at: Date.now(), value });
    return value;
  } catch (error) {
    if (hit) return hit.value as T;
    throw error;
  }
}

const big = (v: unknown) => {
  try {
    return typeof v === "string" && /^\d+$/.test(v) ? Number(BigInt(v)) / 1e18 : 0;
  } catch {
    return 0;
  }
};

export function trades(address: string): Promise<Trade[]> {
  const key = address.toLowerCase();
  return memo(`t:${key}`, 10_000, async () => {
    const body = await get<{ trades?: Record<string, unknown>[] }>(`/api/pons-v2-market/${key}/trades`);
    return (body.trades ?? [])
      .map((t) => ({
        side: t.side === "sell" ? ("sell" as const) : ("buy" as const),
        account: isAddr(t.account) ? t.account.toLowerCase() : ZERO,
        eth: big(t.quoteAmount),
        tokens: big(t.tokenAmount),
        at: (num(t.timestamp) ?? 0) * 1000,
        tx: typeof t.transactionHash === "string" && /^0x[0-9a-f]{64}$/i.test(t.transactionHash) ? t.transactionHash : "",
        block: num(t.blockNumber) ?? 0,
      }))
      .filter((t) => t.at > 0)
      .slice(0, 50);
  });
}

export function holders(address: string): Promise<Holder[]> {
  const key = address.toLowerCase();
  return memo(`h:${key}`, 30_000, async () => {
    const body = await get<{ holders?: Record<string, unknown>[] }>(`/api/pons-v2-market/${key}/holders`);
    return (body.holders ?? [])
      .filter((h) => isAddr(h.address))
      .map((h) => ({ address: String(h.address).toLowerCase(), share: num(h.percentage) ?? 0, tokens: big(h.balance) }))
      .slice(0, 50);
  });
}

export const CHART_RANGES = ["5m", "1h", "6h", "1d", "all"] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

export function chart(address: string, range: ChartRange): Promise<ChartPoint[]> {
  const key = address.toLowerCase();
  return memo(`c:${key}:${range}`, range === "5m" ? 10_000 : 30_000, async () => {
    const body = await get<{ points?: Record<string, unknown>[] }>(`/api/pons-v2-market/${key}/chart?range=${range}`);
    return (body.points ?? [])
      .map((p) => ({
        t: (num(p.t) ?? 0) * 1000,
        priceEth: num(p.price) ?? 0,
        volumeEth: num(p.volumeQuote) ?? 0,
        trades: num(p.tradeCount) ?? 0,
      }))
      .filter((p) => p.t > 0 && p.priceEth > 0)
      .slice(-500);
  });
}

/** Fetches a coin's logo through the launchpad's IPFS proxy, or its https URL. */
export async function fetchLogo(key: string): Promise<{ body: ArrayBuffer; type: string } | null> {
  const logo = logoOf(key);
  if (!logo) return null;
  let url: string | null = null;
  const cid = /^ipfs:\/\/([A-Za-z0-9]+)/.exec(logo)?.[1] ?? /\/ipfs\/([A-Za-z0-9]{40,})/.exec(logo)?.[1];
  if (cid) url = `${BASE}/api/ipfs/content/${cid}?variant=card`;
  else {
    try {
      const u = new URL(logo);
      // Public https hosts only; no IP literals or local names.
      if (u.protocol === "https:" && /[a-z]/i.test(u.hostname.split(".").pop() ?? "") && !/localhost|\.local$|\.internal$/i.test(u.hostname)) {
        url = u.toString();
      }
    } catch {
      url = null;
    }
  }
  if (!url) return null;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(6000), redirect: "follow" });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !/^image\/(png|jpe?g|webp|gif|avif)/.test(type)) return null;
  const body = await res.arrayBuffer();
  if (body.byteLength > 1_500_000) return null;
  return { body, type };
}
