import Link from "next/link";
import { BRAND, CHAIN, PONS } from "@/config/brand";

export type Doc = { slug: string; group: string; title: string; lede: string; body: React.ReactNode };

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 rounded-2xl border-[1.5px] border-dashed border-ink bg-amber-soft p-4 text-[14.5px] leading-relaxed">{children}</div>
);

const Steps = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="mt-5 space-y-3">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-amber font-mono text-[13px]">{i + 1}</span>
        <span className="pt-0.5 leading-relaxed text-ink-2">{item}</span>
      </li>
    ))}
  </ol>
);

export const DOCS: Doc[] = [
  {
    slug: "",
    group: "Getting going",
    title: "What is Cuilby",
    lede: "A launchpad on Robinhood Chain where each coin carries a pot, and the pot always finds a winner.",
    body: (
      <>
        <p>
          On most launchpads the only reason to keep holding a coin is the hope that its price goes up. Cuilby adds a second one. Every
          coin launched here has a pot attached to it, and a slice of every buy fee drops into that pot. Rounds run on a clock, and when a
          round closes the pot goes to one of the people who played it.
        </p>
        <p>
          There are two ways a pot can pay out. In a <strong>Raffle</strong>, every playing buy becomes an entry and chance picks one. In a{" "}
          <strong>Hot seat</strong>, a buy over the bar grabs the crown and winds the timer back up, and whoever is wearing the crown when the
          clock hits zero takes the pot. The creator picks one at launch.
        </p>
        <h2>Why it holds up</h2>
        <ul>
          <li>
            <strong>Pots come from fees, nothing else.</strong> Prizes are never minted and never skimmed off anyone&apos;s balance.
          </li>
          <li>
            <strong>Every round has a winner.</strong> If anyone played, four fifths of the pot leave with one of them and the last fifth seeds what comes next.
          </li>
          <li>
            <strong>Creators earn too.</strong> A fifth of every fee on a coin belongs to whoever launched it.
          </li>
        </ul>
        <Note>
          <strong>Where things stand today.</strong> The live coins on the board are real launches on {CHAIN.name}, read from the Pons
          launchpad with their real prices, trades and holders. The pots, rounds and draws run in <strong>practice mode</strong>: you play
          with practice ETH (pETH) that has no value, every action is a free wallet signature, and no contract holds anyone&apos;s money.
          The Cuilby contracts are designed but not deployed yet.
        </Note>
      </>
    ),
  },
  {
    slug: "quickstart",
    group: "Getting going",
    title: "First play",
    lede: "Sixty seconds from a fresh wallet to a live entry.",
    body: (
      <>
        <h2>Set up</h2>
        <Steps
          items={[
            "Install an EVM wallet that can add a network, such as MetaMask, Rabby or OKX Wallet.",
            <>Press Connect. Cuilby asks the wallet to switch to {CHAIN.name} (chain {CHAIN.id}) and adds it if it is missing.</>,
            "Open your portfolio and open a practice account. It starts with 1 pETH. Practice needs no real ETH at all.",
          ]}
        />
        <h2>Enter a round</h2>
        <Steps
          items={[
            <>Choose something on the <Link href="/">board</Link>. The Closing soon tab sorts rounds by time left.</>,
            "Each coin's page opens with its ticket: what is in the pot, how long is left, and your share.",
            "Type an amount in the Play panel, keep Play for the pot switched on, and sign. The signature is free and sends nothing.",
            "Once time is up, the next visit to the coin settles it, and the prize drops into your practice balance.",
          ]}
        />
        <p>
          The coin page also has a separate Real trade card. That one is an actual ETH swap through the Pons contracts, signed and paid
          from your wallet. It does not enter any pot.
        </p>
      </>
    ),
  },
  {
    slug: "raffle",
    group: "The games",
    title: "Raffle",
    lede: "Buy in, hold an entry, let a block hash choose.",
    body: (
      <>
        <h2>The rules</h2>
        <ul>
          <li>The creator picks a round length of 5 minutes, 15 minutes or 1 hour.</li>
          <li>
            The clock does not run on an empty round. It starts with the round&apos;s <strong>first ticket</strong> and never moves after
            that.
          </li>
          <li>Any playing buy from 0.005 pETH up counts as an entry sized by its ETH. Repeat buys from one wallet stack.</li>
          <li>Odds follow money in: 0.1 pETH of entries in a 0.4 pETH round means a one-in-four shot.</li>
          <li>Coins bought as tickets are held until the draw, then returned to their owner whatever the result.</li>
          <li>Whoever is drawn collects 80% of what had built up by the close; the remaining 20% carries forward.</li>
        </ul>
        <h2>Inside the draw</h2>
        <p>
          At the close, the draw waits for the first {CHAIN.name} block produced after the close. No ticket can be bought once
          the clock is over, so nobody could know that block while tickets were on sale. The seed is{" "}
          <code>keccak256(blockHash ‖ &quot;cuilby:&lt;coin&gt;:&lt;round&gt;&quot;)</code>. Tickets are sorted by wallet address into
          back-to-back ranges, and <code>keccak256(seed) mod total</code> picks the range that wins.
        </p>
        <p>
          Every finished round on a coin page lists its draw block, seed, roll and tickets, with a button that fetches the block from the
          chain and redoes the whole draw in your browser.
        </p>
        <Note>
          A block hash is not a perfect coin. {CHAIN.name} has one sequencer, and in theory it could influence which hash a block gets.
          That is acceptable for practice; the live contracts need more. See <Link href="/docs/randomness">Randomness</Link>.
        </Note>
      </>
    ),
  },
  {
    slug: "hot-seat",
    group: "The games",
    title: "Hot seat",
    lede: "Take the crown, keep the crown, take the pot.",
    body: (
      <>
        <h2>The rules</h2>
        <ul>
          <li>The creator picks a clock of 5 minutes, 15 minutes or 1 hour.</li>
          <li>
            To grab the crown a playing buy must clear a bar: 0.01 pETH, rising to 1% of the pot when that figure is higher. The
            ticket on each coin page displays the bar live.
          </li>
          <li>Every new crown restarts the clock. The first crown starts it.</li>
          <li>Coins bought with a crowning buy are parked in the crown. The moment someone outbids you, they return to your wallet.</li>
          <li>At zero, the wearer collects 80% of the pot plus the parked coins. A fifth stays behind for round two.</li>
        </ul>
        <h2>Why crown coins are parked</h2>
        <p>
          Otherwise a player could grab the crown, dump the coins immediately and still be paid. Parking them until the result is in
          keeps the crown with someone who has real skin in the coin.
        </p>
        <p>No randomness is involved: the final qualifying buy before zero takes it.</p>
      </>
    ),
  },
  {
    slug: "fees",
    group: "The games",
    title: "Fees & pots",
    lede: "Where each fee goes, down to the last unit.",
    body: (
      <>
        <p>Every buy and every sell on a Cuilby coin pays a 1% fee on its ETH side. That fee is split three ways:</p>
        <div className="panel mt-5 overflow-hidden">
          <table className="w-full text-left text-[14.5px]">
            <tbody>
              {[
                ["60%", "the coin's pot (Raffle or Hot seat)"],
                ["20%", "the coin's creator"],
                ["20%", "Cuilby"],
              ].map(([a, b]) => (
                <tr key={b} className="border-b border-line last:border-0">
                  <td className="w-24 px-4 py-3 font-mono font-medium">{a}</td>
                  <td className="px-4 py-3 text-ink-2">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Shares are rounded down for the pot and the creator; Cuilby takes the remainder, so the three parts always add up to the fee
          exactly. A buy that does not play still grows the pot. When a round pays, 80% goes to the winner and 20% stays as the seed of
          the next round.
        </p>
        <h2>Other costs</h2>
        <ul>
          <li>Launching a coin: 0.001 pETH in practice. A real launch will cost the launchpad&apos;s fee plus gas.</li>
          <li>Playing or trading in practice: the 1% fee, no gas (signatures are free).</li>
          <li>A real trade from the Real trade card: the Pons curve or pool fees plus {CHAIN.name} gas, paid from your wallet.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "launch",
    group: "Coins",
    title: "Launching a coin",
    lede: "Name it, pick its game, sign once.",
    body: (
      <>
        <Steps
          items={[
            <>Go to <Link href="/launch">the launch page</Link>. A picture, a name (32 characters max) and a ticker (12 max) are all it needs.</>,
            "Choose Raffle or Hot seat and how long a round lasts.",
            "If you like, grab a bag at the starting price. It stays out of every pot, which stops a creator opening with a free entry or crown.",
            "Sign. The coin appears on the board straight away, with an empty pot waiting for its first fee.",
          ]}
        />
        <h2>What a coin is</h2>
        <p>
          A coin has a fixed supply of 1,000,000,000. In practice it trades on a simple curve on this site: 2 virtual ETH against the
          whole supply, with the price rising as people buy. Creators keep a fifth of every fee their coin produces, which you can move
          into your balance from your portfolio.
        </p>
        <Note>
          When the Cuilby launcher is deployed, a launch becomes a single transaction through the{" "}
          <a href={PONS.page("")} target="_blank" rel="noreferrer">
            Pons launchpad
          </a>{" "}
          on {CHAIN.name}: the whole supply on its bonding curve, no team allocation, graduating into a Uniswap v4 pool with the Cuilby
          fee hook attached.
        </Note>
      </>
    ),
  },
  {
    slug: "winnings",
    group: "Coins",
    title: "Prizes & held coins",
    lede: "Nothing to claim by hand.",
    body: (
      <>
        <ul>
          <li>A round is settled the first time anyone looks at the coin after its clock ran out: opening the board is enough.</li>
          <li>The prize lands in the winner&apos;s practice balance and shows up under Wins in the portfolio.</li>
          <li>Entry coins are released at the close. Crown coins are released the instant another player takes over.</li>
          <li>Each settlement is recorded once, under its own key, before anything is paid. Two visitors loading the page at the same moment cannot pay a round twice.</li>
        </ul>
        <p>
          With live contracts, a keeper will settle rounds within seconds and anyone will be able to trigger settlement, so nothing
          depends on this site staying up.
        </p>
      </>
    ),
  },
  {
    slug: "safety",
    group: "Trust & help",
    title: "Safety & status",
    lede: "What is real today, what is practice, and what the contracts will and will not be able to do.",
    body: (
      <>
        <h2>Real today</h2>
        <ul>
          <li>Wallet connection on {CHAIN.name}, with the network added on connect.</li>
          <li>Live coins, prices, charts, trades and holders, read from the chain through the Pons launchpad&apos;s public data.</li>
          <li>Real trades from the Real trade card, sent by your own wallet to the Pons contracts.</li>
          <li>The block hashes that decide practice draws.</li>
        </ul>
        <h2>Practice today</h2>
        <ul>
          <li>Pots, rounds, tickets, crowns, draws, launches and creator earnings. All in pETH, which has no value and cannot be withdrawn.</li>
          <li>Every practice action is a one-time message signed with your wallet. The message names the site, the action and the amount, expires in five minutes and works once.</li>
        </ul>
        <h2>The contracts we will ship</h2>
        <ul>
          <li>Prize money can only leave the vault as a settled round&apos;s payout; no other withdrawal exists.</li>
          <li>Launched tokens come without an admin: no extra supply, transfer tax, pausing or blacklists, ever.</li>
          <li>Admin powers limited to the platform&apos;s own fee recipient and a capped launch fee.</li>
          <li>Open source, verified on Blockscout, and audited before real money goes in.</li>
        </ul>
        <Note>Nothing is deployed yet. Until it is, no address on this site holds anyone&apos;s funds for Cuilby, and the {BRAND.symbol} contract address shows &quot;at launch&quot;. Only trust an address shown on this site.</Note>
      </>
    ),
  },
  {
    slug: "randomness",
    group: "Trust & help",
    title: "Randomness",
    lede: "What a fair draw needs on this chain, and what exists today.",
    body: (
      <>
        <p>
          A raffle is only as fair as its random number. The usual answer is a VRF: a service that delivers a random value together with
          a proof that it was not chosen. We checked what {CHAIN.name} offers as of October 2026.
        </p>
        <ul>
          <li>Chainlink VRF: not offered on {CHAIN.name} (Chainlink price feeds are live there; VRF is not).</li>
          <li>Pyth Entropy: not deployed; Pyth lists {CHAIN.name} for price feeds only.</li>
          <li>Supra, API3, Gelato and other randomness services: no deployment found.</li>
          <li>
            <code>block.prevrandao</code> is a constant on this kind of chain, and block hashes come from a single sequencer.
          </li>
        </ul>
        <h2>What that means for Cuilby</h2>
        <p>
          Practice draws use the hash of the first block after the close. It is reproducible and nobody can see it in advance, but the
          sequencer could in theory steer it. For real pots the plan is a commit and reveal: Cuilby commits to a secret before tickets go
          on sale, reveals it after the close, and the contract mixes it with a later block hash. Neither side alone can pick the result,
          and the switch to a VRF happens as soon as one is offered on {CHAIN.name}.
        </p>
      </>
    ),
  },
  {
    slug: "faq",
    group: "Trust & help",
    title: "Questions",
    lede: "Short answers.",
    body: (
      <>
        {[
          ["Is any of this real money?", "The live coins and the Real trade card are. Pots, rounds and launches are practice until the contracts ship."],
          ["Do I need ETH to play practice?", "No. Practice signatures are free and send no transaction."],
          ["Will I ever see a pot at zero?", "On a brand-new coin, yes, until fees arrive. With no entries a round simply waits; its timer stays off."],
          ["Who can launch?", "Any wallet. Launches here are practice coins today."],
          ["Is there an official token?", `Yes, ${BRAND.symbol}. Its contract address appears on this site at launch, in the navbar and the footer. Trust no other source.`],
          ["Which wallets work?", `Any EVM wallet that can add a network: MetaMask, Rabby, OKX, Coinbase and others. Phantom cannot add ${CHAIN.name}, so it is listed but disabled. On a phone, open the site inside your wallet's browser.`],
          ["Is this gambling?", "Pots are chance-based. Cuilby is for adults (18+); only play with what you can afford to lose."],
        ].map(([q, a]) => (
          <div key={q} className="mt-6">
            <h2 className="!mt-0 !text-[1.2rem]">{q}</h2>
            <p className="!mt-1">{a}</p>
          </div>
        ))}
      </>
    ),
  },
  {
    slug: "brand",
    group: "Trust & help",
    title: "Brand kit",
    lede: "Artwork to use when you write about Cuilby.",
    body: (
      <>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["Mark, 512 px", "/brand/cuilby-mark.webp"],
            ["Mark on plate, 1024 px", "/brand/cuilby-badge.webp"],
            ["Banner, 1500 × 500", "/brand/cuilby-banner.webp"],
            ["Social card, 1200 × 630", "/brand/cuilby-card.webp"],
          ].map(([label, href]) => (
            <a key={href} href={href} download className="panel flex items-center justify-between gap-3 p-4 hover:border-ink">
              <span className="font-semibold">{label}</span>
              <span className="font-mono text-[12px] text-brand">download</span>
            </a>
          ))}
        </div>
        <p>
          Colours: cobalt <code>#3442E0</code> for the brand, lucky yellow <code>#FFC83A</code> for tickets, tomato <code>#E9502A</code> for
          money in a pot, navy ink <code>#12152E</code> on fog <code>#EEF0F6</code>. Please keep the mark&apos;s proportions and colours.
        </p>
      </>
    ),
  },
];

export const docBySlug = (slug: string) => DOCS.find((d) => d.slug === slug) ?? null;
