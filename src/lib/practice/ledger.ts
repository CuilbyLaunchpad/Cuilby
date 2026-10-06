import "server-only";
import { randomBytes } from "node:crypto";
import type { Store } from "@/lib/auth/store";
import { drawBlock } from "@/lib/feeds/blocks";
import { ticker } from "@/lib/feeds/okx";
import { findCoin, type LiveCoin } from "@/lib/feeds/pons";
import {
  DEFAULT_RULES,
  DURATIONS,
  MICRO,
  OPENING_CURVE,
  applyBuy,
  curveBuy,
  curvePrice,
  curveSell,
  emptyRound,
  isDue,
  rulesFor,
  settle,
  splitFee,
  type Curve,
  type GameMode,
  type Round,
  type Rules,
  type Settlement,
} from "@/lib/game/engine";

/*
 * The practice ledger. No contract exists for Cuilby yet, so launches, pots,
 * rounds and draws run here with practice ETH (pETH) that has no value.
 * Every write happens under one store-wide lock (SET NX with a random owner
 * token and a TTL, released only by its owner), so two requests can never
 * pay the same pot or spend the same balance twice. Each settlement is also
 * frozen under its own SET NX key before anything is paid.
 */

/* ------------------------------------------------------------------ */
/* Limits                                                              */
/* ------------------------------------------------------------------ */

export const START_BALANCE = 1 * MICRO;
export const TOP_UP = MICRO / 2;
export const TOP_UP_BELOW = MICRO / 100;
export const TOP_UP_EVERY_MS = 24 * 3600 * 1000;
export const MIN_BUY = 1_000; // 0.001 pETH
export const MAX_BUY = MICRO; // 1 pETH
export const LAUNCH_FEE = 1_000; // 0.001 pETH
export const OPENING_BUYS = [0, 50_000, 100_000, 250_000] as const;
const MAX_POSITIONS = 60;
const MAX_WINS = 40;
const MAX_LAUNCHED = 20;
const HISTORY = 30;
const TAPE = 80;
const COIN_TRADES = 60;
const WINNERS = 100;
const PRACTICE_COINS = 200;
const MAX_HOLDERS = 300;
const LOCK_KEY = "practice:lock";
const LOCK_TTL = 30;
const LOCK_WAIT_MS = 6000;

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export type Position = { tokens: number; locked: number; cost: number };
export type Win = { coin: string; symbol: string; round: number; prize: number; at: number };
export type Account = {
  address: string;
  balance: number;
  createdAt: number;
  toppedUpAt: number;
  positions: Record<string, Position>;
  wins: Win[];
  launched: string[];
};

export type GameDoc = {
  key: string;
  rules: Rules;
  creator: string;
  round: Round;
  history: Settlement[];
};

export type PracticeCoin = {
  id: string;
  name: string;
  symbol: string;
  description: string;
  links: { x: string; telegram: string; website: string };
  image: string;
  creator: string;
  createdAt: number;
  curve: Curve;
};

export type TradeRow = { side: "buy" | "sell"; wallet: string; eth: number; tokens: number; play: boolean; at: number };
export type TapeRow = { kind: "buy" | "sell" | "win" | "launch"; coin: string; symbol: string; wallet: string; eth: number; at: number };
export type WinnerRow = {
  coin: string;
  symbol: string;
  name: string;
  round: number;
  mode: GameMode;
  winner: string;
  prize: number;
  pot: number;
  seed: string | null;
  drawBlock: number | null;
  roll: string | null;
  total: number | null;
  at: number;
};
export type Stats = { paid: number; biggest: number; rounds: number; protocol: number; launches: number };

const isAddr = (v: unknown): v is string => typeof v === "string" && /^0x[0-9a-f]{40}$/.test(v);
const int = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isSafeInteger(v) ? v : fallback);
const fin = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback);

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Read-side validation: a damaged entry is repaired or dropped, never thrown. */
function cleanAccount(raw: unknown, address: string): Account | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Partial<Account>;
  const positions: Record<string, Position> = {};
  for (const [key, p] of Object.entries(a.positions ?? {}).slice(0, MAX_POSITIONS)) {
    if (!isGameKey(key) || !p || typeof p !== "object") continue;
    const pos = { tokens: fin(p.tokens), locked: fin(p.locked), cost: fin(p.cost) };
    if (pos.tokens > 0 || pos.locked > 0) positions[key] = pos;
  }
  return {
    address,
    balance: Math.max(0, int(a.balance)),
    createdAt: int(a.createdAt, Date.now()),
    toppedUpAt: int(a.toppedUpAt),
    positions,
    wins: (Array.isArray(a.wins) ? a.wins : [])
      .filter((w) => w && isGameKey(w.coin) && Number.isSafeInteger(w.prize))
      .slice(0, MAX_WINS),
    launched: (Array.isArray(a.launched) ? a.launched : []).filter(isGameKey).slice(0, MAX_LAUNCHED),
  };
}

export const isGameKey = (v: unknown): v is string =>
  typeof v === "string" && (/^0x[0-9a-f]{40}$/.test(v) || /^p-[0-9a-z]{6,12}$/.test(v));

function cleanRound(raw: unknown, fallbackIndex: number): Round {
  const r = (raw ?? {}) as Partial<Round>;
  const tickets = (Array.isArray(r.tickets) ? r.tickets : [])
    .filter((t) => t && isAddr(t.wallet) && Number.isSafeInteger(t.weight) && t.weight > 0)
    .map((t) => ({ wallet: t.wallet, weight: t.weight, tokens: fin(t.tokens) }))
    .slice(0, 500);
  const crown = r.crown && isAddr(r.crown.wallet) ? { wallet: r.crown.wallet, tokens: fin(r.crown.tokens), at: int(r.crown.at) } : null;
  return {
    index: Math.max(1, int(r.index, fallbackIndex)),
    startedAt: typeof r.startedAt === "number" ? r.startedAt : null,
    endsAt: typeof r.endsAt === "number" ? r.endsAt : null,
    pot: Math.max(0, int(r.pot)),
    tickets,
    crown,
  };
}

function cleanGame(raw: unknown, key: string): GameDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<GameDoc>;
  const mode: GameMode = g.rules?.mode === "hotseat" ? "hotseat" : "raffle";
  const rules = rulesFor(mode, int(g.rules?.durationSec, DEFAULT_RULES.durationSec));
  return {
    key,
    rules,
    creator: isAddr(g.creator) ? g.creator : "0x0000000000000000000000000000000000000000",
    round: cleanRound(g.round, 1),
    history: (Array.isArray(g.history) ? g.history : []).filter((s) => s && Number.isSafeInteger(s.round)).slice(0, HISTORY),
  };
}

function cleanCoin(raw: unknown): PracticeCoin | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<PracticeCoin>;
  if (!isGameKey(c.id) || typeof c.name !== "string" || typeof c.symbol !== "string" || !isAddr(c.creator)) return null;
  const curve = c.curve && fin(c.curve.eth) > 0 && fin(c.curve.tokens) > 0 ? c.curve : OPENING_CURVE;
  return {
    id: c.id,
    name: c.name.slice(0, 32),
    symbol: c.symbol.slice(0, 12),
    description: typeof c.description === "string" ? c.description.slice(0, 280) : "",
    links: {
      x: typeof c.links?.x === "string" ? c.links.x : "",
      telegram: typeof c.links?.telegram === "string" ? c.links.telegram : "",
      website: typeof c.links?.website === "string" ? c.links.website : "",
    },
    image: typeof c.image === "string" && c.image.startsWith("data:image/webp;base64,") ? c.image : "",
    creator: c.creator,
    createdAt: int(c.createdAt),
    curve,
  };
}

/* ------------------------------------------------------------------ */
/* Store access                                                        */
/* ------------------------------------------------------------------ */

const K = {
  account: (a: string) => `practice:acct:${a}`,
  earn: (a: string) => `practice:earn:${a}`,
  game: (k: string) => `practice:game:${k}`,
  coin: (k: string) => `practice:coin:${k}`,
  trades: (k: string) => `practice:trades:${k}`,
  holders: (k: string) => `practice:holders:${k}`,
  result: (k: string, round: number) => `practice:result:${k}:${round}`,
  coins: "practice:coins",
  tape: "practice:tape",
  winners: "practice:winners",
  stats: "practice:stats",
};

export async function readAccount(store: Store, address: string) {
  return cleanAccount(parse(await store.get(K.account(address))), address);
}

export async function readEarnings(store: Store, address: string) {
  return Math.max(0, Number((await store.get(K.earn(address))) ?? 0) || 0);
}

export async function readPracticeCoin(store: Store, id: string) {
  return cleanCoin(parse(await store.get(K.coin(id))));
}

export async function listPracticeCoins(store: Store): Promise<PracticeCoin[]> {
  const ids = (parse<string[]>(await store.get(K.coins)) ?? []).filter(isGameKey).slice(0, PRACTICE_COINS);
  if (!ids.length) return [];
  const raws = await store.mget(ids.map(K.coin));
  return raws.map((r) => cleanCoin(parse(r))).filter((c): c is PracticeCoin => Boolean(c));
}

export async function readGames(store: Store, keys: string[]): Promise<Map<string, GameDoc>> {
  const out = new Map<string, GameDoc>();
  if (!keys.length) return out;
  const raws = await store.mget(keys.map(K.game));
  keys.forEach((key, i) => {
    const game = cleanGame(parse(raws[i]), key);
    if (game) out.set(key, game);
  });
  return out;
}

export async function readList<T>(store: Store, key: "tape" | "winners" | `trades:${string}`) {
  const storeKey = key === "tape" ? K.tape : key === "winners" ? K.winners : K.trades(key.slice(7));
  const list = parse<T[]>(await store.get(storeKey));
  return Array.isArray(list) ? list.filter((x) => x && typeof x === "object") : [];
}

export async function readHolders(store: Store, key: string) {
  const doc = parse<Record<string, number>>(await store.get(K.holders(key))) ?? {};
  return Object.entries(doc)
    .filter(([w, n]) => isAddr(w) && typeof n === "number" && Number.isFinite(n) && n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([address, tokens]) => ({ address, tokens }));
}

export async function readSettlement(store: Store, key: string, round: number) {
  return parse<Settlement>(await store.get(K.result(key, round)));
}

export async function readStats(store: Store): Promise<Stats> {
  const s = parse<Partial<Stats>>(await store.get(K.stats)) ?? {};
  return { paid: int(s.paid), biggest: int(s.biggest), rounds: int(s.rounds), protocol: int(s.protocol), launches: int(s.launches) };
}

const newGame = (key: string, creator: string, rules: Rules = DEFAULT_RULES): GameDoc => ({
  key,
  rules,
  creator,
  round: emptyRound(1),
  history: [],
});

/* ------------------------------------------------------------------ */
/* The lock and the write batch                                        */
/* ------------------------------------------------------------------ */

type Failure = { error: string; status: number };

async function withLock<T>(store: Store, fn: () => Promise<T>): Promise<T | Failure> {
  const token = randomBytes(12).toString("hex");
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    if (await store.setNx(LOCK_KEY, token, LOCK_TTL)) {
      try {
        return await fn();
      } finally {
        // Release only our own lock: it may have expired and been taken.
        if ((await store.get(LOCK_KEY).catch(() => null)) === token) await store.del(LOCK_KEY).catch(() => {});
      }
    }
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 50));
  }
  return { error: "The practice desk is busy. Try again in a moment.", status: 409 };
}

/**
 * Everything one locked section reads and writes, cached so a section that
 * touches the same account twice sees its own changes, then written once.
 */
class Batch {
  private accounts = new Map<string, Account>();
  private games = new Map<string, GameDoc>();
  private dirty = new Set<string>();
  private lists = new Map<string, unknown[]>();
  stats: Stats | null = null;
  earn = new Map<string, number>();
  private holderDocs = new Map<string, Record<string, number>>();

  /** Practice holdings of one coin (free + locked), kept for its Holders tab. */
  async setHolding(coin: string, wallet: string, pos: Position | undefined) {
    let doc = this.holderDocs.get(coin);
    if (!doc) {
      doc = parse<Record<string, number>>(await this.store.get(K.holders(coin))) ?? {};
      this.holderDocs.set(coin, doc);
    }
    const amount = pos ? pos.tokens + pos.locked : 0;
    if (amount > 1e-9) doc[wallet] = amount;
    else delete doc[wallet];
    const entries = Object.entries(doc);
    if (entries.length > MAX_HOLDERS) {
      entries.sort((a, b) => b[1] - a[1]);
      this.holderDocs.set(coin, Object.fromEntries(entries.slice(0, MAX_HOLDERS)));
    }
    this.dirty.add(`h:${coin}`);
  }

  constructor(readonly store: Store) {}

  async account(address: string, create = false): Promise<Account | null> {
    const hit = this.accounts.get(address);
    if (hit) return hit;
    let account = await readAccount(this.store, address);
    if (!account && create) {
      account = { address, balance: START_BALANCE, createdAt: Date.now(), toppedUpAt: 0, positions: {}, wins: [], launched: [] };
      this.dirty.add(`a:${address}`);
    }
    if (account) this.accounts.set(address, account);
    return account;
  }
  touch(address: string) {
    this.dirty.add(`a:${address}`);
  }
  async game(key: string, fallback: () => GameDoc): Promise<GameDoc> {
    const hit = this.games.get(key);
    if (hit) return hit;
    const game = (await readGames(this.store, [key])).get(key) ?? fallback();
    this.games.set(key, game);
    return game;
  }
  setGame(game: GameDoc) {
    this.games.set(game.key, game);
    this.dirty.add(`g:${game.key}`);
  }
  async list<T>(key: string, cap: number) {
    let list = this.lists.get(key) as T[] | undefined;
    if (!list) {
      const raw = parse<T[]>(await this.store.get(key));
      list = Array.isArray(raw) ? raw.slice(0, cap) : [];
      this.lists.set(key, list);
    }
    return list;
  }
  async push<T>(key: string, item: T, cap: number) {
    const list = await this.list<T>(key, cap);
    list.unshift(item);
    list.length = Math.min(list.length, cap);
    this.dirty.add(`l:${key}`);
  }
  async readStats() {
    this.stats ??= await readStats(this.store);
    this.dirty.add("stats");
    return this.stats;
  }
  credit(address: string, micro: number) {
    this.earn.set(address, (this.earn.get(address) ?? 0) + micro);
  }
  async commit() {
    const writes: Promise<void>[] = [];
    for (const key of this.dirty) {
      if (key.startsWith("a:")) {
        const a = this.accounts.get(key.slice(2));
        if (a) writes.push(this.store.set(K.account(a.address), JSON.stringify(a)));
      } else if (key.startsWith("g:")) {
        const g = this.games.get(key.slice(2));
        if (g) writes.push(this.store.set(K.game(g.key), JSON.stringify(g)));
      } else if (key.startsWith("l:")) {
        writes.push(this.store.set(key.slice(2), JSON.stringify(this.lists.get(key.slice(2)) ?? [])));
      } else if (key.startsWith("h:")) {
        writes.push(this.store.set(K.holders(key.slice(2)), JSON.stringify(this.holderDocs.get(key.slice(2)) ?? {})));
      } else if (key === "stats" && this.stats) {
        writes.push(this.store.set(K.stats, JSON.stringify(this.stats)));
      }
    }
    for (const [address, micro] of this.earn) if (micro) writes.push(this.store.incrBy(K.earn(address), micro).then(() => {}));
    await Promise.all(writes);
  }
}

/* ------------------------------------------------------------------ */
/* Settlement                                                          */
/* ------------------------------------------------------------------ */

type Label = { symbol: string; name: string };
type Prepared = { endsAt: number; block: { number: number; hash: string } | null } | null;

/**
 * Settles a due round inside the lock. The result is frozen first with SET NX
 * on a per-round key; if another request already froze it, nothing is paid
 * again. Returns false when a raffle's draw block is not known yet.
 */
async function settleInBatch(
  b: Batch,
  game: GameDoc,
  prepared: Prepared,
  label: Label,
  now: number,
): Promise<boolean> {
  if (!isDue(game.round, now)) return true;
  // The block must belong to this very round's close, not one read for an earlier state.
  const block = prepared && prepared.endsAt === game.round.endsAt ? prepared.block : null;
  if (game.rules.mode === "raffle" && !block) return false;
  const { settlement, next } = settle(game.round, game.rules, game.key, game.rules.mode === "raffle" ? block : null);
  const frozen = await b.store.setNx(K.result(game.key, settlement.round), JSON.stringify(settlement), 400 * 24 * 3600);
  if (!frozen) {
    // Already paid by an earlier section; only make sure the game moved on.
    game.round = next;
    b.setGame(game);
    return true;
  }
  for (const r of settlement.released) {
    const account = await b.account(r.wallet);
    const pos = account?.positions[game.key];
    if (account && pos) {
      const back = Math.min(pos.locked, r.tokens);
      pos.locked -= back;
      pos.tokens += back;
      b.touch(account.address);
    }
  }
  if (settlement.winner && settlement.prize > 0) {
    const account = await b.account(settlement.winner, true);
    if (account) {
      account.balance += settlement.prize;
      account.wins.unshift({ coin: game.key, symbol: label.symbol, round: settlement.round, prize: settlement.prize, at: settlement.closedAt });
      account.wins.length = Math.min(account.wins.length, MAX_WINS);
      b.touch(account.address);
    }
    const stats = await b.readStats();
    stats.paid += settlement.prize;
    stats.biggest = Math.max(stats.biggest, settlement.prize);
    stats.rounds += 1;
    await b.push<WinnerRow>(
      K.winners,
      {
        coin: game.key,
        symbol: label.symbol,
        name: label.name,
        round: settlement.round,
        mode: settlement.mode,
        winner: settlement.winner,
        prize: settlement.prize,
        pot: settlement.pot,
        seed: settlement.seed,
        drawBlock: settlement.drawBlock,
        roll: settlement.roll,
        total: settlement.total,
        at: settlement.closedAt,
      },
      WINNERS,
    );
    await b.push<TapeRow>(K.tape, { kind: "win", coin: game.key, symbol: label.symbol, wallet: settlement.winner, eth: settlement.prize, at: settlement.closedAt }, TAPE);
  }
  game.history = [settlement, ...game.history].slice(0, HISTORY);
  game.round = next;
  b.setGame(game);
  return true;
}

async function labelOf(store: Store, key: string): Promise<Label> {
  if (key.startsWith("p-")) {
    const coin = await readPracticeCoin(store, key);
    return { symbol: coin?.symbol ?? "COIN", name: coin?.name ?? "Practice coin" };
  }
  const coin = await findCoin(key).catch(() => null);
  return { symbol: coin?.symbol ?? "COIN", name: coin?.name ?? "Coin" };
}

/**
 * Settles every due round among `keys`. Draw blocks are read before taking
 * the lock, so the locked section never waits on the chain.
 */
export async function settleDue(store: Store, keys: string[]) {
  const now = Date.now();
  const games = await readGames(store, keys);
  const due = [...games.values()].filter((g) => isDue(g.round, now)).slice(0, 8);
  if (!due.length) return;
  const prepared = await Promise.all(
    due.map(async (g) => ({
      key: g.key,
      prepared: { endsAt: g.round.endsAt!, block: g.rules.mode === "raffle" ? await drawBlock(g.round.endsAt!) : null },
      label: await labelOf(store, g.key),
    })),
  );
  await withLock(store, async () => {
    const b = new Batch(store);
    for (const p of prepared) {
      const game = await b.game(p.key, () => newGame(p.key, "0x0000000000000000000000000000000000000000"));
      await settleInBatch(b, game, p.prepared, p.label, Date.now());
    }
    await b.commit();
  });
}

/* ------------------------------------------------------------------ */
/* Coins the ledger can price                                          */
/* ------------------------------------------------------------------ */

type Priced = {
  key: string;
  symbol: string;
  name: string;
  creator: string;
  defaultRules: Rules;
  /** ETH per token for live coins; null for practice coins (their curve prices them). */
  priceEth: number | null;
};

let ethUsdCache: { at: number; value: number } | null = null;
export async function ethUsd(): Promise<number | null> {
  if (ethUsdCache && Date.now() - ethUsdCache.at < 15_000) return ethUsdCache.value;
  const t = await ticker("ETH-USDT");
  if (t?.last) ethUsdCache = { at: Date.now(), value: t.last };
  return t?.last ?? ethUsdCache?.value ?? null;
}

async function priced(store: Store, key: string): Promise<Priced | Failure> {
  if (key.startsWith("p-")) {
    const coin = await readPracticeCoin(store, key);
    if (!coin) return { error: "That practice coin does not exist.", status: 404 };
    return { key, symbol: coin.symbol, name: coin.name, creator: coin.creator, defaultRules: DEFAULT_RULES, priceEth: null };
  }
  const [coin, usd] = await Promise.all([findCoin(key).catch(() => null as LiveCoin | null), ethUsd()]);
  if (!coin) return { error: "That coin is not on the board right now.", status: 404 };
  if (!coin.priceUsd || !usd) return { error: "The live price could not be read. Try again in a moment.", status: 503 };
  return { key, symbol: coin.symbol, name: coin.name, creator: coin.creator, defaultRules: DEFAULT_RULES, priceEth: coin.priceUsd / usd };
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export type BuyParams = { coin: string; amount: number; play: boolean };
export type SellParams = { coin: string; pct: number };
export type LaunchParams = {
  name: string;
  symbol: string;
  description: string;
  links: { x: string; telegram: string; website: string };
  image: string;
  mode: GameMode;
  durationSec: number;
  openingBuy: number;
};

export type ActionResult = { ok: true; summary: string; coin?: string } | Failure;

async function prepareDue(store: Store, key: string): Promise<Prepared> {
  const game = (await readGames(store, [key])).get(key);
  if (!game || !isDue(game.round, Date.now())) return null;
  const endsAt = game.round.endsAt!;
  return { endsAt, block: game.rules.mode === "raffle" ? await drawBlock(endsAt) : null };
}

export async function join(store: Store, address: string): Promise<ActionResult> {
  const result = await withLock(store, async () => {
    const b = new Batch(store);
    const existing = await b.account(address);
    if (existing) return { ok: true as const, summary: "Already joined" };
    await b.account(address, true);
    await b.commit();
    return { ok: true as const, summary: "Joined with 1 practice ETH" };
  });
  return result;
}

export async function buy(store: Store, address: string, p: BuyParams): Promise<ActionResult> {
  const coin = await priced(store, p.coin);
  if ("error" in coin) return coin;
  const block = await prepareDue(store, p.coin);
  const label = { symbol: coin.symbol, name: coin.name };
  return withLock(store, async () => {
    const b = new Batch(store);
    const now = Date.now();
    const account = (await b.account(address, true))!;
    if (account.balance < p.amount) return { error: "Not enough practice ETH. Top up from your portfolio.", status: 409 };
    if (!account.positions[p.coin] && Object.keys(account.positions).length >= MAX_POSITIONS) {
      return { error: `You already hold ${MAX_POSITIONS} practice coins. Sell one first.`, status: 409 };
    }
    const game = await b.game(p.coin, () => newGame(p.coin, coin.creator, coin.defaultRules));
    if (!(await settleInBatch(b, game, block, label, now))) {
      return { error: "The last round is being drawn. Try again in a few seconds.", status: 409 };
    }
    const split = splitFee(p.amount, game.rules);
    let tokens: number;
    let practiceCoin: PracticeCoin | null = null;
    if (coin.priceEth === null) {
      practiceCoin = await readPracticeCoin(store, p.coin);
      if (!practiceCoin) return { error: "That practice coin does not exist.", status: 404 };
      const r = curveBuy(practiceCoin.curve, split.net);
      tokens = r.out;
      practiceCoin.curve = r.curve;
    } else {
      tokens = split.net / MICRO / coin.priceEth;
    }
    const applied = applyBuy(game.round, { wallet: address, amount: p.amount, tokens, at: now, play: p.play }, split.pot, game.rules);
    if (applied.effect.kind === "too-small") {
      return { error: `To play, a buy needs at least ${applied.effect.bar / MICRO} practice ETH.`, status: 400 };
    }
    game.round = applied.round;
    b.setGame(game);
    account.balance -= p.amount;
    const pos = (account.positions[p.coin] ??= { tokens: 0, locked: 0, cost: 0 });
    pos.cost += p.amount;
    if (applied.effect.kind === "plain") pos.tokens += tokens;
    else pos.locked += tokens;
    b.touch(address);
    await b.setHolding(p.coin, address, pos);
    if (applied.effect.kind === "crown" && applied.effect.dethroned) {
      const d = applied.effect.dethroned;
      const prev = await b.account(d.wallet);
      const prevPos = prev?.positions[p.coin];
      if (prev && prevPos) {
        const back = Math.min(prevPos.locked, d.tokens);
        prevPos.locked -= back;
        prevPos.tokens += back;
        b.touch(prev.address);
      }
    }
    b.credit(game.creator, split.creator);
    (await b.readStats()).protocol += split.protocol;
    if (practiceCoin) await store.set(K.coin(practiceCoin.id), JSON.stringify(practiceCoin));
    await b.push<TradeRow>(K.trades(p.coin), { side: "buy", wallet: address, eth: p.amount, tokens, play: p.play, at: now }, COIN_TRADES);
    await b.push<TapeRow>(K.tape, { kind: "buy", coin: p.coin, symbol: coin.symbol, wallet: address, eth: p.amount, at: now }, TAPE);
    await b.commit();
    const what = applied.effect.kind === "ticket" ? "Ticket bought" : applied.effect.kind === "crown" ? "Crown taken" : "Bought";
    return { ok: true as const, summary: `${what}: ${p.amount / MICRO} pETH of ${coin.symbol}`, coin: p.coin };
  });
}

export async function sell(store: Store, address: string, p: SellParams): Promise<ActionResult> {
  const coin = await priced(store, p.coin);
  if ("error" in coin) return coin;
  const block = await prepareDue(store, p.coin);
  return withLock(store, async () => {
    const b = new Batch(store);
    const now = Date.now();
    const account = await b.account(address);
    const pos = account?.positions[p.coin];
    if (!account || !pos || pos.tokens <= 0) return { error: "You hold no free coins of this kind to sell.", status: 409 };
    const game = await b.game(p.coin, () => newGame(p.coin, coin.creator, coin.defaultRules));
    if (!(await settleInBatch(b, game, block, { symbol: coin.symbol, name: coin.name }, now))) {
      return { error: "The last round is being drawn. Try again in a few seconds.", status: 409 };
    }
    // Settlement may just have released coins to this account.
    const tokens = p.pct >= 100 ? pos.tokens : (pos.tokens * p.pct) / 100;
    let gross: number;
    let practiceCoin: PracticeCoin | null = null;
    if (coin.priceEth === null) {
      practiceCoin = await readPracticeCoin(store, p.coin);
      if (!practiceCoin) return { error: "That practice coin does not exist.", status: 404 };
      const r = curveSell(practiceCoin.curve, tokens);
      gross = Math.floor(r.out);
      practiceCoin.curve = r.curve;
    } else {
      gross = Math.floor(tokens * coin.priceEth * MICRO);
    }
    if (gross < 1) return { error: "That sale is worth less than 0.000001 pETH.", status: 400 };
    const split = splitFee(gross, game.rules);
    game.round = { ...game.round, pot: game.round.pot + split.pot };
    b.setGame(game);
    const share = pos.tokens > 0 ? tokens / pos.tokens : 1;
    pos.cost = Math.max(0, Math.round(pos.cost * (1 - share)));
    pos.tokens = Math.max(0, pos.tokens - tokens);
    if (pos.tokens < 1e-9 && pos.locked <= 0) delete account.positions[p.coin];
    await b.setHolding(p.coin, address, account.positions[p.coin]);
    account.balance += split.net;
    b.touch(address);
    b.credit(game.creator, split.creator);
    (await b.readStats()).protocol += split.protocol;
    if (practiceCoin) await store.set(K.coin(practiceCoin.id), JSON.stringify(practiceCoin));
    await b.push<TradeRow>(K.trades(p.coin), { side: "sell", wallet: address, eth: gross, tokens, play: false, at: now }, COIN_TRADES);
    await b.push<TapeRow>(K.tape, { kind: "sell", coin: p.coin, symbol: coin.symbol, wallet: address, eth: gross, at: now }, TAPE);
    await b.commit();
    return { ok: true as const, summary: `Sold for ${split.net / MICRO} pETH`, coin: p.coin };
  });
}

export async function launch(store: Store, address: string, p: LaunchParams): Promise<ActionResult> {
  return withLock(store, async () => {
    const b = new Batch(store);
    const now = Date.now();
    const account = (await b.account(address, true))!;
    if (account.launched.length >= MAX_LAUNCHED) return { error: `One wallet can launch ${MAX_LAUNCHED} practice coins.`, status: 409 };
    const cost = LAUNCH_FEE + p.openingBuy;
    if (account.balance < cost) return { error: "Not enough practice ETH for the launch fee and opening buy.", status: 409 };
    const ids = (await b.list<string>(K.coins, PRACTICE_COINS)).filter(isGameKey);
    if (ids.length >= PRACTICE_COINS) ids.pop();
    const id = `p-${randomBytes(5).toString("hex")}`;
    const rules = rulesFor(p.mode, p.durationSec);
    const coin: PracticeCoin = { id, name: p.name, symbol: p.symbol, description: p.description, links: p.links, image: p.image, creator: address, createdAt: now, curve: OPENING_CURVE };
    account.balance -= cost;
    (await b.readStats()).protocol += LAUNCH_FEE;
    if (p.openingBuy > 0) {
      // The opening buy goes to the creator's wallet and never plays.
      const split = splitFee(p.openingBuy, rules);
      const r = curveBuy(coin.curve, split.net);
      coin.curve = r.curve;
      account.positions[id] = { tokens: r.out, locked: 0, cost: p.openingBuy };
      await b.setHolding(id, address, account.positions[id]);
      const game = newGame(id, address, rules);
      game.round.pot = split.pot;
      b.setGame(game);
      b.credit(address, split.creator);
      (await b.readStats()).protocol += split.protocol;
    } else {
      b.setGame(newGame(id, address, rules));
    }
    account.launched.unshift(id);
    b.touch(address);
    (await b.readStats()).launches += 1;
    await store.set(K.coin(id), JSON.stringify(coin));
    await b.push<string>(K.coins, id, PRACTICE_COINS);
    await b.push<TapeRow>(K.tape, { kind: "launch", coin: id, symbol: p.symbol, wallet: address, eth: 0, at: now }, TAPE);
    await b.commit();
    return { ok: true as const, summary: `${p.symbol} launched in practice`, coin: id };
  });
}

export async function topUp(store: Store, address: string): Promise<ActionResult> {
  return withLock(store, async () => {
    const b = new Batch(store);
    const account = (await b.account(address, true))!;
    if (account.balance >= TOP_UP_BELOW) return { error: `Top-ups open below ${TOP_UP_BELOW / MICRO} pETH.`, status: 409 };
    if (Date.now() - account.toppedUpAt < TOP_UP_EVERY_MS) return { error: "One top-up per day.", status: 409 };
    account.balance += TOP_UP;
    account.toppedUpAt = Date.now();
    b.touch(address);
    await b.commit();
    return { ok: true as const, summary: `Topped up ${TOP_UP / MICRO} pETH` };
  });
}

export async function claimEarnings(store: Store, address: string): Promise<ActionResult> {
  return withLock(store, async () => {
    const b = new Batch(store);
    const earned = await readEarnings(store, address);
    if (earned <= 0) return { error: "No creator earnings to move.", status: 409 };
    const account = (await b.account(address, true))!;
    account.balance += earned;
    b.touch(address);
    b.credit(address, -earned);
    await b.commit();
    return { ok: true as const, summary: `Moved ${earned / MICRO} pETH of creator earnings to your balance` };
  });
}

export { DURATIONS, curvePrice };
