import "server-only";
import { getStore } from "@/lib/auth/store";
import { activeCoins, boardStatus, findCoin, graduatedCoins, type LiveCoin } from "@/lib/feeds/pons";
import { DEFAULT_RULES, MICRO, SUPPLY, crownBar, curvePrice, type GameMode } from "@/lib/game/engine";
import {
  ethUsd,
  listPracticeCoins,
  readGames,
  readPracticeCoin,
  settleDue,
  type GameDoc,
  type PracticeCoin,
} from "@/lib/practice/ledger";

/*
 * The board: live Pons launches on Robinhood Chain (real prices) plus coins
 * launched here in practice, each with its practice pot. The two are never
 * mixed up: `kind` says which one a coin is, and every pot is practice.
 */

export type GameView = {
  mode: GameMode;
  durationSec: number;
  round: number;
  /** micro-pETH */
  pot: number;
  startedAt: number | null;
  endsAt: number | null;
  players: number;
  crown: string | null;
  /** Smallest buy that plays right now, micro-pETH. */
  bar: number;
  creator: string;
};

export type BoardCoin = {
  key: string;
  kind: "live" | "practice";
  name: string;
  symbol: string;
  description: string;
  creator: string;
  launchedAt: number;
  priceUsd: number | null;
  mcapUsd: number | null;
  progress: number | null;
  graduated: boolean;
  latestBuyAt: number | null;
  logo: string | null;
  game: GameView;
};

export function gameView(game: GameDoc | undefined, creator: string): GameView {
  const rules = game?.rules ?? DEFAULT_RULES;
  const round = game?.round;
  return {
    mode: rules.mode,
    durationSec: rules.durationSec,
    round: round?.index ?? 1,
    pot: round?.pot ?? 0,
    startedAt: round?.startedAt ?? null,
    endsAt: round?.endsAt ?? null,
    players: round?.tickets.length ?? 0,
    crown: round?.crown?.wallet ?? null,
    bar: rules.mode === "hotseat" ? crownBar(round?.pot ?? 0, rules) : rules.minTicket,
    creator: game?.creator ?? creator,
  };
}

function fromLive(c: LiveCoin, game: GameDoc | undefined): BoardCoin {
  return {
    key: c.key,
    kind: "live",
    name: c.name,
    symbol: c.symbol,
    description: c.description,
    creator: c.creator,
    launchedAt: c.launchedAt,
    priceUsd: c.priceUsd,
    mcapUsd: c.mcapUsd,
    progress: c.progress,
    graduated: c.graduated,
    latestBuyAt: c.latestBuyAt,
    logo: c.hasLogo ? `/api/logo/${c.key}` : null,
    game: gameView(game, c.creator),
  };
}

function fromPractice(c: PracticeCoin, game: GameDoc | undefined, usd: number | null): BoardCoin {
  const priceUsd = usd ? curvePrice(c.curve) * usd : null;
  return {
    key: c.id,
    kind: "practice",
    name: c.name,
    symbol: c.symbol,
    description: c.description,
    creator: c.creator,
    launchedAt: c.createdAt,
    priceUsd,
    mcapUsd: priceUsd === null ? null : priceUsd * SUPPLY,
    progress: null,
    graduated: false,
    latestBuyAt: null,
    logo: c.image || null,
    game: gameView(game, c.creator),
  };
}

export type Board = {
  coins: BoardCoin[];
  ethUsd: number | null;
  live: { ok: boolean; readAt: number | null };
  practice: boolean;
};

const GRADUATED_ON_BOARD = 12;

export async function readBoard(): Promise<Board> {
  const store = getStore();
  const [active, grads, usd] = await Promise.all([activeCoins(), graduatedCoins(), ethUsd()]);
  const live = [...active, ...grads.filter((g) => !active.some((a) => a.key === g.key)).slice(0, GRADUATED_ON_BOARD)];
  const practice = store ? await listPracticeCoins(store).catch(() => []) : [];
  const keys = [...live.map((c) => c.key), ...practice.map((c) => c.id)];
  let games = new Map<string, GameDoc>();
  if (store) {
    games = await readGames(store, keys).catch(() => new Map());
    const due = [...games.values()].filter((g) => g.round.endsAt !== null && g.round.endsAt <= Date.now());
    if (due.length) {
      await settleDue(store, due.map((g) => g.key)).catch(() => {});
      games = await readGames(store, keys).catch(() => games);
    }
  }
  return {
    coins: [...practice.map((c) => fromPractice(c, games.get(c.id), usd)), ...live.map((c) => fromLive(c, games.get(c.key)))],
    ethUsd: usd,
    live: boardStatus(),
    practice: Boolean(store),
  };
}

export type CoinDetail = BoardCoin & {
  history: GameDoc["history"];
  tickets: { wallet: string; weight: number }[];
  links: { x: string; telegram: string; website: string } | null;
  priceEth: number | null;
};

export async function readCoin(key: string): Promise<CoinDetail | null> {
  const store = getStore();
  const usd = await ethUsd();
  if (store) await settleDue(store, [key]).catch(() => {});
  const game = store ? (await readGames(store, [key]).catch(() => new Map<string, GameDoc>())).get(key) : undefined;
  const extra = {
    history: game?.history ?? [],
    tickets: (game?.round.tickets ?? []).map((t) => ({ wallet: t.wallet, weight: t.weight })),
  };
  if (key.startsWith("p-")) {
    const coin = store ? await readPracticeCoin(store, key) : null;
    if (!coin) return null;
    return { ...fromPractice(coin, game, usd), ...extra, links: coin.links, priceEth: curvePrice(coin.curve) };
  }
  const coin = await findCoin(key).catch(() => null);
  if (!coin) return null;
  return {
    ...fromLive(coin, game),
    ...extra,
    links: null,
    priceEth: coin.priceUsd && usd ? coin.priceUsd / usd : null,
  };
}

export const microToEth = (micro: number) => micro / MICRO;

/** Name, ticker and kind for page metadata. Reads only; never settles a round. */
export async function coinIdentity(key: string): Promise<{ name: string; symbol: string; kind: "live" | "practice"; logo: string | null } | null> {
  if (key.startsWith("p-")) {
    const store = getStore();
    const coin = store ? await readPracticeCoin(store, key).catch(() => null) : null;
    return coin ? { name: coin.name, symbol: coin.symbol, kind: "practice", logo: null } : null;
  }
  const coin = await findCoin(key).catch(() => null);
  return coin ? { name: coin.name, symbol: coin.symbol, kind: "live", logo: coin.hasLogo ? `/api/logo/${coin.key}` : null } : null;
}
