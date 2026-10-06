# Cuilby

**Where Coins Get Lucky.** A jackpot launchpad on Robinhood Chain. Launch a coin. Every buy feeds the pot. Someone always wins.

## The problem

Most new coins hand all of their early upside to whoever is fastest: bots buy the first block, sell into the first wave of real buyers,
and the people who actually show up and trade get nothing for being there. Meanwhile the fees every trade pays disappear into the
platform, and nothing about a round of trading is ever settled in a way a player can check for themselves.

## The solution

Cuilby gives every coin a **pot**. A share of every buy fee goes into it, and every round hands that pot to one of the coin's players.

- **Players** buy to play. A qualifying buy is a ticket (Raffle) or takes the crown (Hot seat). The coins bought to play are held until
  the draw, so a ticket costs real exposure, not just a quick in-and-out.
- **Creators** launch a coin with a game and a round length, and earn 20% of every fee their coin pays.
- **Everyone** can re-run any draw in the browser from the chain's own block data.

## How it works

1. Every buy and sell pays a 1% fee on the ETH side: 60% to the coin's pot, 20% to the creator, 20% to the protocol (pot and creator are
   rounded down, the remainder goes to the protocol).
2. **Raffle**: every buy of at least 0.005 ETH marked "play" is a ticket, weighted by the ETH spent. The clock starts on the first ticket
   and never moves. **Hot seat**: a buy of at least max(0.01 ETH, 1% of the pot) takes the crown and resets the clock; the crown holder's
   coins are held and come back when someone takes the crown.
3. When the round closes, the winner takes 80% of the pot and 20% carries over into the next round. Held coins are released.
4. The draw uses the first Robinhood Chain block with a timestamp at least one second after the close:
   `seed = keccak256(blockHash ‖ "cuilby:<coin>:<round>")`, tickets sorted by address into ranges, `roll = uint256(keccak256(seed)) mod total`.

All of these rules live in one pure, tested TypeScript module: `src/lib/game/engine.ts`.

## What you can try

**Live today**
- Connect any EVM wallet; Robinhood Chain is added to the wallet on connect.
- A live board of Pons V2 coins quoted in ETH: price, market cap, graduation progress, charts, the latest trades and top holders.
- Real swaps through Pons from a coin's page, and your real ETH and coin balances on the portfolio page.
- Every game in **practice mode** with practice ETH (pETH, no value): play, launch, take the crown, win, claim creator earnings.
  Each action is a free `personal_sign` of a plain-English, single-use message. No funds move and no transaction is sent.
- Re-running any practice draw in the browser from the chain's block hash.

**Coming later**
- The launcher, router, pot vault and round controller contracts, after an external audit.
- A stronger randomness source. Robinhood Chain has no VRF service today, so the practice draw uses a block hash from a single
  sequencer; this is fine for a game without value and not good enough for real pots.
- The $CUILBY token on Pons.

## Run it locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm test          # unit tests for the game rules, the rate limiter and network keys
npm run build
npm start         # http://localhost:4900
```

For development, `npm run dev` also serves on port 4900.

Every environment variable is optional. Copy `.env.example` to `.env.local` and fill in only what you need:

| Variable | Purpose |
|---|---|
| `ROBINHOOD_RPC_URL` | Server-side RPC for Robinhood Chain (falls back to the public endpoint) |
| `NEXT_PUBLIC_ROBINHOOD_RPC_URL` | Browser RPC (restrict it to your domain at the provider) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Enables WalletConnect (project id from cloud.reown.com) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or `KV_REDIS_URL` | Store for practice play. Without it a local run keeps a JSON file; a serverless deploy shows practice as "not configured yet" while live data keeps working |
| `CHAT_KEY_PREFIX` | Key prefix in a shared Redis (default `cuilby:`) |
| `TRUST_PROXY_HEADERS` | Set to `1` only behind your own proxy. The site then reads the rightmost `X-Forwarded-For` entry (the one your proxy appended), never client-written entries. On Vercel it is automatic; without it all visitors share one rate-limit budget |
| `TRUSTED_PROXY_HOPS` | With `TRUST_PROXY_HEADERS=1`: how many proxies append to `X-Forwarded-For` (default 1) |
| `CLIENT_IP_HEADER` | With `TRUST_PROXY_HEADERS=1`: read this header instead (for example `x-real-ip`), only if your proxy overwrites it |

## Network in your wallet

| Field | Value |
|---|---|
| Network name | Robinhood Chain |
| Chain id | 4663 (0x1237) |
| RPC | https://rpc.mainnet.chain.robinhood.com |
| Currency | ETH |
| Explorer | https://robinhoodchain.blockscout.com |

The site adds this network for you when you connect.

## Project layout

```
src/app/                 routes (Next.js App Router) and API handlers
src/app/api/rpc          read-only JSON-RPC relay with a per-network cost budget
src/app/api/practice     signed single-use practice actions
src/components/          UI, wallet dialog, board, coin page, launch form
src/config/brand.ts      name, links, contract address, chain, Pons contracts
src/lib/game/engine.ts   the game rules (fees, tickets, crown, rounds, draw)
src/lib/practice/        practice ledger and signed intents
src/lib/feeds/           Pons, chain and ETH price feeds
src/lib/guard.ts         body limits and rate-limit keys
```

## Contracts and token

- Pons V2 launchpad and the Uniswap v4 contracts its graduated pools trade on: listed in `src/config/brand.ts`, each checked on
  Robinhood Chain mainnet.
- Cuilby game contracts: **not deployed yet.** The intended design is described in the docs.
- $CUILBY: the contract address is published on the site at launch. Only trust the address shown there.

## Security and status

Experimental. The game contracts are not deployed and not audited; every pot, round and draw on the site today is practice and moves
no funds. Play responsibly; the site is for adults (18+).

The practice service uses single-use signed messages (the nonce is burned before anything is applied), one owner-checked ledger
lock, bounded state and rate limits keyed per network. A wallet address is only counted on its own after its signature is verified,
so nobody can use up someone else's allowance. Rate limits are shared across instances with Redis and never let a request through
when the store fails; without any store they are per server instance and best-effort. Users behind the same carrier-grade NAT may
share an aggregate budget. If the site's RPC relay refuses a read, the browser falls back to the public RPC.

If you find a problem, please open an issue or contact the team on X.

## Contributing

Download the ZIP or fork the repository, create a branch, run `npm test` and `npx tsc --noEmit`, and open a pull request with a short
description of the change. Please keep all code, comments and copy in English.

## License

MIT. See `LICENSE`.
