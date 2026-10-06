import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RULES,
  OPENING_CURVE,
  applyBuy,
  crownBar,
  curveBuy,
  curveSell,
  draw,
  drawSeed,
  emptyRound,
  isDue,
  odds,
  payout,
  rulesFor,
  settle,
  splitFee,
  type Ticket,
} from "./engine.ts";

const A = "0x000000000000000000000000000000000000000a";
const B = "0x000000000000000000000000000000000000000b";
const C = "0x000000000000000000000000000000000000000c";
const HASH = "0x" + "ab".repeat(32);

test("fee split adds up to the fee and the amount", () => {
  for (const amount of [0, 1, 99, 100, 12_345, 1_000_000, 987_654_321]) {
    const s = splitFee(amount, DEFAULT_RULES);
    assert.equal(s.pot + s.creator + s.protocol, s.fee);
    assert.equal(s.fee + s.net, amount);
    assert.ok(s.pot >= 0 && s.creator >= 0 && s.protocol >= 0);
  }
  const s = splitFee(1_000_000, DEFAULT_RULES); // 1 ETH, 1% fee
  assert.deepEqual(s, { fee: 10_000, pot: 6_000, creator: 2_000, protocol: 2_000, net: 990_000 });
  assert.throws(() => splitFee(-1, DEFAULT_RULES));
  assert.throws(() => splitFee(1.5, DEFAULT_RULES));
});

test("payout keeps the carry for the next round", () => {
  assert.deepEqual(payout(10_000, DEFAULT_RULES), { prize: 8_000, carry: 2_000 });
  assert.deepEqual(payout(7, DEFAULT_RULES), { prize: 6, carry: 1 });
});

test("raffle clock starts on the first ticket, not before", () => {
  const rules = rulesFor("raffle", 900);
  let round = emptyRound(1);
  ({ round } = applyBuy(round, { wallet: A, amount: 100_000, tokens: 10, at: 1_000, play: false }, 600, rules));
  assert.equal(round.startedAt, null, "a plain buy grows the pot but starts nothing");
  assert.equal(round.pot, 600);
  const small = applyBuy(round, { wallet: A, amount: 1_000, tokens: 1, at: 2_000, play: true }, 6, rules);
  assert.equal(small.effect.kind, "too-small");
  assert.equal(small.round.startedAt, null);
  const first = applyBuy(round, { wallet: B, amount: 50_000, tokens: 5, at: 5_000, play: true }, 300, rules);
  assert.equal(first.round.startedAt, 5_000);
  assert.equal(first.round.endsAt, 5_000 + 900_000);
  const second = applyBuy(first.round, { wallet: B, amount: 25_000, tokens: 2, at: 6_000, play: true }, 150, rules);
  assert.equal(second.round.endsAt, 905_000, "later tickets never move the clock");
  assert.deepEqual(second.round.tickets, [{ wallet: B, weight: 75_000, tokens: 7 }]);
  assert.equal(isDue(second.round, 904_999), false);
  assert.equal(isDue(second.round, 905_000), true);
  assert.throws(() => applyBuy(second.round, { wallet: A, amount: 50_000, tokens: 1, at: 905_000, play: true }, 1, rules));
});

test("applyBuy does not mutate its input", () => {
  const rules = rulesFor("raffle", 300);
  const round = emptyRound(1);
  const a = applyBuy(round, { wallet: A, amount: 50_000, tokens: 5, at: 1, play: true }, 1, rules).round;
  applyBuy(a, { wallet: A, amount: 50_000, tokens: 5, at: 2, play: true }, 1, rules);
  assert.deepEqual(a.tickets, [{ wallet: A, weight: 50_000, tokens: 5 }]);
  assert.equal(round.tickets.length, 0);
});

test("hot seat: crown resets the clock and returns the previous holder's coins", () => {
  const rules = rulesFor("hotseat", 300);
  let round = emptyRound(1);
  const first = applyBuy(round, { wallet: A, amount: 10_000, tokens: 100, at: 1_000, play: true }, 60, rules);
  assert.equal(first.effect.kind, "crown");
  round = first.round;
  assert.equal(round.endsAt, 301_000);
  const second = applyBuy(round, { wallet: B, amount: 20_000, tokens: 50, at: 200_000, play: true }, 120, rules);
  assert.deepEqual(second.effect, { kind: "crown", dethroned: { wallet: A, tokens: 100 }, startedRound: false });
  assert.equal(second.round.endsAt, 500_000);
  assert.equal(second.round.crown?.wallet, B);
});

test("hot seat bar grows with the pot", () => {
  const rules = rulesFor("hotseat", 300);
  assert.equal(crownBar(0, rules), 10_000);
  assert.equal(crownBar(5_000_000, rules), 50_000); // 1% of a 5 ETH pot
  const round = { ...emptyRound(1), pot: 5_000_000 };
  const r = applyBuy(round, { wallet: A, amount: 40_000, tokens: 1, at: 1, play: true }, 0, rules);
  assert.deepEqual(r.effect, { kind: "too-small", bar: 50_000 });
});

test("draw is reproducible and independent of ticket order", () => {
  const tickets: Ticket[] = [
    { wallet: C, weight: 30, tokens: 1 },
    { wallet: A, weight: 50, tokens: 1 },
    { wallet: B, weight: 20, tokens: 1 },
  ];
  const seed = drawSeed(HASH, "0xToken", 3);
  assert.equal(seed, drawSeed(HASH, "0xtoken", 3), "game key is case-insensitive");
  assert.notEqual(seed, drawSeed(HASH, "0xtoken", 4));
  const one = draw(tickets, seed);
  const two = draw([...tickets].reverse(), seed);
  assert.deepEqual(one, two);
  assert.ok(one);
  assert.equal(one.total, 100);
  assert.deepEqual(
    one.ranges.map((r) => [r.wallet, r.from, r.to]),
    [
      [A, 0, 50],
      [B, 50, 70],
      [C, 70, 100],
    ],
  );
  const roll = Number(one.roll);
  const slice = one.ranges.find((r) => roll >= r.from && roll < r.to);
  assert.equal(slice?.wallet, one.winner);
  assert.equal(draw([], seed), null);
});

test("draw frequencies follow the weights", () => {
  const tickets: Ticket[] = [
    { wallet: A, weight: 70, tokens: 0 },
    { wallet: B, weight: 30, tokens: 0 },
  ];
  let a = 0;
  const n = 4000;
  for (let i = 0; i < n; i++) {
    const seed = drawSeed("0x" + i.toString(16).padStart(64, "0"), "g", 1);
    if (draw(tickets, seed)?.winner === A) a++;
  }
  assert.ok(Math.abs(a / n - 0.7) < 0.03, `A won ${a}/${n}`);
});

test("odds are each wallet's share of the tickets", () => {
  const round = { ...emptyRound(1), tickets: [{ wallet: A, weight: 1, tokens: 0 }, { wallet: B, weight: 3, tokens: 0 }] };
  assert.equal(odds(round, A), 0.25);
  assert.equal(odds(round, C), 0);
});

test("settle pays 80%, carries 20% and releases every locked coin", () => {
  const rules = rulesFor("raffle", 300);
  let round = emptyRound(7);
  round = applyBuy(round, { wallet: A, amount: 50_000, tokens: 11, at: 0, play: true }, 9_000, rules).round;
  round = applyBuy(round, { wallet: B, amount: 50_000, tokens: 22, at: 1, play: true }, 1_000, rules).round;
  const { settlement, next } = settle(round, rules, "game", { number: 42, hash: HASH });
  assert.equal(settlement.pot, 10_000);
  assert.equal(settlement.prize, 8_000);
  assert.equal(settlement.carry, 2_000);
  assert.ok(settlement.winner === A || settlement.winner === B);
  assert.deepEqual(settlement.released, [
    { wallet: A, tokens: 11 },
    { wallet: B, tokens: 22 },
  ]);
  assert.equal(settlement.drawBlock, 42);
  assert.deepEqual(next, emptyRound(8, 2_000));
  assert.throws(() => settle(round, rules, "game", null), /draw block/);
  assert.throws(() => settle(emptyRound(1), rules, "game", { number: 1, hash: HASH }), /never started/);
});

test("hot seat settles to the crown without a block", () => {
  const rules = rulesFor("hotseat", 300);
  const round = applyBuy(emptyRound(1), { wallet: B, amount: 10_000, tokens: 9, at: 0, play: true }, 5_000, rules).round;
  const { settlement } = settle(round, rules, "g", null);
  assert.equal(settlement.winner, B);
  assert.equal(settlement.prize, 4_000);
  assert.deepEqual(settlement.released, [{ wallet: B, tokens: 9 }]);
});

test("practice curve: buys raise the price, a round trip loses only to rounding", () => {
  const { out, curve } = curveBuy(OPENING_CURVE, 100_000);
  assert.ok(out > 0 && curve.eth === OPENING_CURVE.eth + 100_000);
  const back = curveSell(curve, out);
  assert.ok(Math.abs(back.out - 100_000) <= 1);
  assert.ok(back.curve.eth >= OPENING_CURVE.eth);
});
