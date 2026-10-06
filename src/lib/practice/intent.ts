import "server-only";
import { randomBytes } from "node:crypto";
import { BRAND, CHAIN } from "@/config/brand";
import type { Store } from "@/lib/auth/store";
import { recoverSigner } from "@/lib/auth/verify";
import { DURATIONS, MICRO, type GameMode } from "@/lib/game/engine";
import { MAX_BUY, MIN_BUY, OPENING_BUYS, isGameKey, type BuyParams, type LaunchParams, type SellParams } from "@/lib/practice/ledger";

/*
 * Signed practice actions. Every action is its own one-time message: the
 * server writes it (domain from signInDomain(), the wallet, the action and
 * its amount, a random nonce and an expiry), the wallet signs it with
 * personal_sign, and the server applies exactly what it wrote. The nonce is
 * burned with SET NX before anything is applied, so a replayed signature
 * gets a 409 and never runs twice.
 */

export const INTENT_TTL = 5 * 60;

export type Action =
  | { kind: "join" }
  | { kind: "buy"; params: BuyParams }
  | { kind: "sell"; params: SellParams }
  | { kind: "launch"; params: LaunchParams }
  | { kind: "topup" }
  | { kind: "claim" };

type Intent = { address: string; action: Action; message: string; expires: number };

const intentKey = (nonce: string) => `practice:intent:${nonce}`;
const usedKey = (nonce: string) => `practice:used:${nonce}`;

const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

function link(v: unknown, hosts: RegExp | null) {
  const s = text(v, 120);
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return null;
    if (hosts && !hosts.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Validates what the browser asked for. Returns a clean action or an error message. */
export function parseAction(kind: unknown, raw: unknown): Action | string {
  const p = (raw ?? {}) as Record<string, unknown>;
  switch (kind) {
    case "join":
      return { kind: "join" };
    case "topup":
      return { kind: "topup" };
    case "claim":
      return { kind: "claim" };
    case "buy": {
      const coin = typeof p.coin === "string" ? p.coin.toLowerCase() : "";
      const amount = typeof p.amount === "number" ? Math.round(p.amount) : Number.NaN;
      if (!isGameKey(coin)) return "Unknown coin.";
      if (!Number.isSafeInteger(amount) || amount < MIN_BUY || amount > MAX_BUY) {
        return `Buy between ${MIN_BUY / MICRO} and ${MAX_BUY / MICRO} practice ETH.`;
      }
      return { kind: "buy", params: { coin, amount, play: p.play === true } };
    }
    case "sell": {
      const coin = typeof p.coin === "string" ? p.coin.toLowerCase() : "";
      const pct = Number(p.pct);
      if (!isGameKey(coin)) return "Unknown coin.";
      if (![25, 50, 100].includes(pct)) return "Sell 25%, 50% or 100%.";
      return { kind: "sell", params: { coin, pct } };
    }
    case "launch": {
      const name = text(p.name, 32);
      const symbol = text(p.symbol, 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (name.length < 2) return "Give the coin a name of at least two characters.";
      if (symbol.length < 2) return "Give the coin a ticker of 2 to 12 letters or digits.";
      const mode: GameMode = p.mode === "hotseat" ? "hotseat" : "raffle";
      const durationSec = Number(p.durationSec);
      if (!(DURATIONS as readonly number[]).includes(durationSec)) return "Pick a round length.";
      const openingBuy = Number(p.openingBuy);
      if (!(OPENING_BUYS as readonly number[]).includes(openingBuy)) return "Pick an opening buy.";
      const links = (p.links ?? {}) as Record<string, unknown>;
      const x = link(links.x, /^(x|twitter)\.com$|\.(x|twitter)\.com$/);
      const telegram = link(links.telegram, /^t\.me$/);
      const website = link(links.website, null);
      if (x === null || telegram === null || website === null) return "Links must be https addresses (X on x.com, Telegram on t.me).";
      const image = typeof p.image === "string" ? p.image : "";
      if (image && (!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 2800)) {
        return "The image could not be used. Try a smaller picture.";
      }
      return {
        kind: "launch",
        params: { name, symbol, description: text(p.description, 200), links: { x, telegram, website }, image, mode, durationSec, openingBuy },
      };
    }
    default:
      return "Unknown action.";
  }
}

const eth = (micro: number) => `${micro / MICRO} pETH`;

function describe(action: Action, label: string) {
  switch (action.kind) {
    case "join":
      return "Open a practice account (1 pETH to start)";
    case "topup":
      return "Top up the practice balance";
    case "claim":
      return "Move creator earnings to the practice balance";
    case "buy":
      return `Buy ${eth(action.params.amount)} of ${label}${action.params.play ? ", playing for the pot" : ", not playing"}`;
    case "sell":
      return `Sell ${action.params.pct}% of free ${label}`;
    case "launch": {
      const p = action.params;
      const game = p.mode === "raffle" ? "Raffle" : "Hot seat";
      return `Launch ${p.name} (${p.symbol}), ${game}, ${p.durationSec / 60}m rounds, opening buy ${eth(p.openingBuy)}`;
    }
  }
}

export async function createIntent(store: Store, address: string, action: Action, host: string, label: string) {
  const nonce = randomBytes(16).toString("hex");
  const expires = Date.now() + INTENT_TTL * 1000;
  const message = [
    `${host} asks you to confirm a practice action on ${BRAND.name}:`,
    address,
    "",
    `Action: ${describe(action, label)}`,
    "Practice mode: no real funds move and no transaction is sent.",
    "",
    `Chain ID: ${CHAIN.id}`,
    `Nonce: ${nonce}`,
    `Expires At: ${new Date(expires).toISOString()}`,
  ].join("\n");
  const intent: Intent = { address, action, message, expires };
  await store.setEx(intentKey(nonce), JSON.stringify(intent), INTENT_TTL);
  return { nonce, message };
}

/**
 * Burns the nonce, then checks the signature. The burn comes first and is
 * atomic (SET NX): of two identical submissions only one gets past it.
 */
export async function consumeIntent(
  store: Store,
  nonce: string,
  signature: string,
): Promise<{ address: string; action: Action } | { error: string; status: number }> {
  if (!/^[0-9a-f]{32}$/.test(nonce)) return { error: "Unknown request.", status: 400 };
  if (!(await store.setNx(usedKey(nonce), "1", INTENT_TTL * 2))) {
    return { error: "This signature was already used.", status: 409 };
  }
  const raw = await store.get(intentKey(nonce));
  await store.del(intentKey(nonce));
  if (!raw) return { error: "This request expired. Try again.", status: 410 };
  let intent: Intent;
  try {
    intent = JSON.parse(raw) as Intent;
  } catch {
    return { error: "This request expired. Try again.", status: 410 };
  }
  if (Date.now() > intent.expires) return { error: "This request expired. Try again.", status: 410 };
  if (recoverSigner(intent.message, signature) !== intent.address) {
    return { error: "That signature does not match the wallet.", status: 401 };
  }
  return { address: intent.address, action: intent.action };
}
