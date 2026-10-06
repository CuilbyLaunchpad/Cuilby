import { keccak_256 } from "@noble/hashes/sha3.js";

/*
 * Pot math for every coin game, with no I/O: fee split, round clock, crown
 * rules and the weighted draw. The server ledger and the pages both call
 * these functions, so what a player sees is exactly what gets paid.
 *
 * Money is in integer micro-ETH (1 = 0.000001 ETH) so every sum is exact
 * and survives JSON. Time is in milliseconds.
 */

export type GameMode = "raffle" | "hotseat";

export type Rules = {
  mode: GameMode;
  /** Raffle: round length from the first ticket. Hot seat: clock after each crown. */
  durationSec: number;
  /** Trading fee on every buy and sell, in basis points of the ETH side. */
  feeBps: number;
  /** Shares of that fee. They add up to 10 000. */
  potBps: number;
  creatorBps: number;
  protocolBps: number;
  /** Share of a finished pot that stays to start the next round. */
  carryBps: number;
  /** Smallest buy that becomes a raffle ticket. */
  minTicket: number;
  /** Smallest buy that takes the crown, before the pot-based bar applies. */
  crownMin: number;
  /** Once the pot is large, a crown buy must also be this share of the pot. */
  crownPotBps: number;
};

export const DURATIONS = [300, 900, 3600] as const;

export const DEFAULT_RULES: Rules = {
  mode: "raffle",
  durationSec: 900,
  feeBps: 100,
  potBps: 6000,
  creatorBps: 2000,
  protocolBps: 2000,
  carryBps: 2000,
  minTicket: 5_000, // 0.005 ETH
  crownMin: 10_000, // 0.01 ETH
  crownPotBps: 100,
};

export const MICRO = 1_000_000;
export const toMicro = (eth: number) => Math.round(eth * MICRO);
export const fromMicro = (micro: number) => micro / MICRO;

export function rulesFor(mode: GameMode, durationSec: number): Rules {
  const duration = (DURATIONS as readonly number[]).includes(durationSec) ? durationSec : DEFAULT_RULES.durationSec;
  return { ...DEFAULT_RULES, mode, durationSec: duration };
}

/* ------------------------------------------------------------------ */
/* Fees                                                                */
/* ------------------------------------------------------------------ */

export type FeeSplit = { fee: number; pot: number; creator: number; protocol: number; net: number };

/**
 * Splits the fee on an ETH amount. Rounding always favours nobody in
 * particular: pot and creator are floored and the protocol takes the
 * remainder, so the three parts add up to the fee exactly.
 */
export function splitFee(amount: number, rules: Rules): FeeSplit {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("amount must be a non-negative integer");
  const fee = Math.floor((amount * rules.feeBps) / 10_000);
  const pot = Math.floor((fee * rules.potBps) / 10_000);
  const creator = Math.floor((fee * rules.creatorBps) / 10_000);
  return { fee, pot, creator, protocol: fee - pot - creator, net: amount - fee };
}

/** What the winner takes from a pot and what stays for the next round. */
export function payout(pot: number, rules: Rules) {
  const carry = Math.floor((pot * rules.carryBps) / 10_000);
  return { prize: pot - carry, carry };
}

/** Raffle: the smallest ticket. Hot seat: the smallest buy that takes the crown now. */
export function crownBar(pot: number, rules: Rules) {
  return Math.max(rules.crownMin, Math.ceil((pot * rules.crownPotBps) / 10_000));
}

/* ------------------------------------------------------------------ */
/* Rounds                                                              */
/* ------------------------------------------------------------------ */

export type Ticket = { wallet: string; weight: number; tokens: number };

export type Round = {
  index: number;
  /** Set by the first ticket (raffle) or the first crown (hot seat). */
  startedAt: number | null;
  endsAt: number | null;
  pot: number;
  /** Raffle tickets, one entry per wallet. */
  tickets: Ticket[];
  /** Hot seat: who holds the crown and the coins their crowning buy locked. */
  crown: { wallet: string; tokens: number; at: number } | null;
};

export type Buy = { wallet: string; amount: number; tokens: number; at: number; play: boolean };

export type BuyEffect =
  | { kind: "plain" }
  | { kind: "ticket"; weight: number; startedRound: boolean }
  | { kind: "crown"; dethroned: { wallet: string; tokens: number } | null; startedRound: boolean }
  | { kind: "too-small"; bar: number };

export const emptyRound = (index: number, pot = 0): Round => ({
  index,
  startedAt: null,
  endsAt: null,
  pot,
  tickets: [],
  crown: null,
});

/** A round is due once its clock has run out. Rounds that never started are never due. */
export const isDue = (round: Round, now: number) => round.endsAt !== null && now >= round.endsAt;

/**
 * Applies a buy to the live round. The caller must have closed a due round
 * first (see `isDue`): a buy never lands in a round whose clock is over.
 * `potShare` is the pot part of this buy's fee; it grows the pot whether or
 * not the buy plays.
 */
export function applyBuy(round: Round, buy: Buy, potShare: number, rules: Rules): { round: Round; effect: BuyEffect } {
  if (isDue(round, buy.at)) throw new Error("round is over; close it before applying buys");
  const next: Round = { ...round, pot: round.pot + potShare, tickets: round.tickets.map((t) => ({ ...t })) };
  if (!buy.play) return { round: next, effect: { kind: "plain" } };

  if (rules.mode === "raffle") {
    if (buy.amount < rules.minTicket) return { round: next, effect: { kind: "too-small", bar: rules.minTicket } };
    const startedRound = next.startedAt === null;
    if (startedRound) {
      next.startedAt = buy.at;
      next.endsAt = buy.at + rules.durationSec * 1000;
    }
    const mine = next.tickets.find((t) => t.wallet === buy.wallet);
    if (mine) {
      mine.weight += buy.amount;
      mine.tokens += buy.tokens;
    } else {
      next.tickets.push({ wallet: buy.wallet, weight: buy.amount, tokens: buy.tokens });
    }
    return { round: next, effect: { kind: "ticket", weight: buy.amount, startedRound } };
  }

  // Hot seat: the bar is measured against the pot before this buy.
  const bar = crownBar(round.pot, rules);
  if (buy.amount < bar) return { round: next, effect: { kind: "too-small", bar } };
  const startedRound = next.startedAt === null;
  if (startedRound) next.startedAt = buy.at;
  const dethroned = round.crown ? { wallet: round.crown.wallet, tokens: round.crown.tokens } : null;
  next.crown = { wallet: buy.wallet, tokens: buy.tokens, at: buy.at };
  next.endsAt = buy.at + rules.durationSec * 1000;
  return { round: next, effect: { kind: "crown", dethroned, startedRound } };
}

/* ------------------------------------------------------------------ */
/* The draw                                                            */
/* ------------------------------------------------------------------ */

const enc = new TextEncoder();
const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function hexBytes(hex: string) {
  const body = hex.replace(/^0x/, "");
  if (!/^[0-9a-fA-F]*$/.test(body) || body.length % 2) throw new Error("bad hex");
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * The seed of a draw: keccak256(blockHash ‖ "cuilby:<game>:<round>").
 * The block is the first one produced after the round closed, so nobody
 * holding a ticket could know it while tickets were still on sale.
 */
export function drawSeed(blockHash: string, game: string, round: number) {
  const tag = enc.encode(`cuilby:${game.toLowerCase()}:${round}`);
  const block = hexBytes(blockHash);
  const input = new Uint8Array(block.length + tag.length);
  input.set(block);
  input.set(tag, block.length);
  return `0x${toHex(keccak_256(input))}`;
}

export type DrawResult = {
  winner: string;
  /** keccak256(seed) as an integer, reduced modulo the total weight. */
  roll: string;
  total: number;
  /** Each wallet's slice of [0, total): the winner's slice contains the roll. */
  ranges: { wallet: string; from: number; to: number }[];
};

/**
 * Weighted pick. Tickets are ordered by wallet address so anyone can rebuild
 * the same ranges from the public ticket list; the roll is
 * uint256(keccak256(seed)) mod total. Reproducible from seed + tickets alone.
 */
export function draw(tickets: Ticket[], seed: string): DrawResult | null {
  const live = tickets.filter((t) => t.weight > 0).sort((a, b) => (a.wallet < b.wallet ? -1 : a.wallet > b.wallet ? 1 : 0));
  const total = live.reduce((sum, t) => sum + t.weight, 0);
  if (!live.length || total <= 0) return null;
  const roll = BigInt(`0x${toHex(keccak_256(hexBytes(seed)))}`) % BigInt(total);
  const ranges: DrawResult["ranges"] = [];
  let from = 0;
  let winner = live[live.length - 1].wallet;
  let found = false;
  for (const t of live) {
    const to = from + t.weight;
    ranges.push({ wallet: t.wallet, from, to });
    if (!found && roll >= BigInt(from) && roll < BigInt(to)) {
      winner = t.wallet;
      found = true;
    }
    from = to;
  }
  return { winner, roll: roll.toString(), total, ranges };
}

/** A wallet's chance in a raffle round, 0–1. */
export function odds(round: Round, wallet: string) {
  const total = round.tickets.reduce((sum, t) => sum + t.weight, 0);
  const mine = round.tickets.find((t) => t.wallet === wallet)?.weight ?? 0;
  return total > 0 ? mine / total : 0;
}

export type Settlement = {
  round: number;
  mode: GameMode;
  pot: number;
  prize: number;
  carry: number;
  winner: string | null;
  /** Coins locked by tickets or the crown, returned to their owners. */
  released: { wallet: string; tokens: number }[];
  /** The raffle's tickets as they stood at close, so anyone can redo the draw. */
  tickets: { wallet: string; weight: number }[];
  seed: string | null;
  drawBlock: number | null;
  roll: string | null;
  total: number | null;
  closedAt: number;
};

/**
 * Closes a due round. A raffle needs the draw block's hash; a hot seat pays
 * the crown and needs none. Returns the settlement and the next round,
 * which starts empty but for the carried part of the pot.
 */
export function settle(
  round: Round,
  rules: Rules,
  game: string,
  block: { number: number; hash: string } | null,
): { settlement: Settlement; next: Round } {
  if (round.endsAt === null) throw new Error("round never started");
  const released =
    rules.mode === "raffle"
      ? round.tickets.filter((t) => t.tokens > 0).map((t) => ({ wallet: t.wallet, tokens: t.tokens }))
      : round.crown
        ? [{ wallet: round.crown.wallet, tokens: round.crown.tokens }]
        : [];
  let winner: string | null = null;
  let seed: string | null = null;
  let roll: string | null = null;
  let total: number | null = null;
  if (rules.mode === "raffle") {
    if (!block) throw new Error("a raffle needs the draw block");
    seed = drawSeed(block.hash, game, round.index);
    const result = draw(round.tickets, seed);
    if (result) {
      winner = result.winner;
      roll = result.roll;
      total = result.total;
    }
  } else {
    winner = round.crown?.wallet ?? null;
  }
  const { prize, carry } = winner ? payout(round.pot, rules) : { prize: 0, carry: round.pot };
  return {
    settlement: {
      round: round.index,
      mode: rules.mode,
      pot: round.pot,
      prize,
      carry,
      winner,
      released,
      tickets: rules.mode === "raffle" ? round.tickets.map((t) => ({ wallet: t.wallet, weight: t.weight })) : [],
      seed,
      drawBlock: block?.number ?? null,
      roll,
      total,
      closedAt: round.endsAt,
    },
    next: emptyRound(round.index + 1, carry),
  };
}

/* ------------------------------------------------------------------ */
/* Practice curve for coins launched in practice                       */
/* ------------------------------------------------------------------ */

/** Constant-product curve: virtual ETH and token reserves, k fixed at launch. */
export type Curve = { eth: number; tokens: number };

export const SUPPLY = 1_000_000_000;
export const OPENING_CURVE: Curve = { eth: 2 * MICRO, tokens: SUPPLY };

/** Tokens out for `ethIn` micro-ETH that already had its fee taken. */
export function curveBuy(curve: Curve, ethIn: number): { out: number; curve: Curve } {
  const k = curve.eth * curve.tokens;
  const eth = curve.eth + ethIn;
  const tokens = k / eth;
  return { out: curve.tokens - tokens, curve: { eth, tokens } };
}

/** Micro-ETH out (before fee) for selling `tokensIn`. */
export function curveSell(curve: Curve, tokensIn: number): { out: number; curve: Curve } {
  const k = curve.eth * curve.tokens;
  const tokens = curve.tokens + tokensIn;
  const eth = Math.ceil(k / tokens);
  return { out: Math.max(0, curve.eth - eth), curve: { eth, tokens } };
}

/** Spot price in ETH per token. */
export const curvePrice = (curve: Curve) => curve.eth / MICRO / curve.tokens;
