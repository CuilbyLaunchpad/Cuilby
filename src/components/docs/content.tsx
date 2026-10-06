import Link from "next/link";
import { BRAND, CHAIN, PONS } from "@/config/brand";

/**
 * Docs pages. Each entry carries its own search metadata: one primary keyword
 * (used in the title, the H1 and the first paragraph) and a few secondary ones.
 */
export type Doc = {
  slug: string;
  group: string;
  /** Short label for the sidebar. */
  nav: string;
  /** The page's single H1. */
  h1: string;
  lede: string;
  metaTitle: string;
  metaDescription: string;
  keyword: string;
  secondary: string[];
  body: React.ReactNode;
  /** Question and answer pairs, also published as FAQPage structured data. */
  faq?: [string, string][];
};

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 rounded-[16px] bg-surge/10 px-4 py-3.5 text-[14.5px] leading-relaxed text-fg shadow-[inset_0_0_0_1px_rgb(151_252_228/0.25)]">
    {children}
  </div>
);

const Bullets = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="mt-4 flex flex-col gap-2.5 text-[15px] leading-relaxed text-fg-2">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3">
        <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-surge" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const Steps = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="mt-4 flex flex-col gap-3">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3">
        <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-card-3 text-[13px] text-surge">{i + 1}</span>
        <span className="pt-0.5 text-[15px] leading-relaxed text-fg-2">{item}</span>
      </li>
    ))}
  </ol>
);

const FAQ: [string, string][] = [
  [
    "Is any of this real money today?",
    `The live coins, their prices and the Real trade card are real: those trades settle on ${CHAIN.name} from your own wallet. Pots, rounds and launches run in practice with pETH until the ${BRAND.name} contracts are deployed.`,
  ],
  [
    "Do I need ETH to play a practice pot?",
    "No. A practice play is a free wallet signature that sends no transaction, so it costs nothing and needs no gas.",
  ],
  [
    "Can a pot sit at zero?",
    "Yes, on a coin that nobody has traded yet. A raffle with no tickets simply waits with its clock off, and the first playing buy starts it.",
  ],
  [
    "Who can launch a coin?",
    "Any wallet. Coins launched on this site today are practice coins that live next to the real Pons V2 launches.",
  ],
  [
    `Is there an official ${BRAND.symbol} token?`,
    `${BRAND.symbol} is the official token. Its contract address appears on this site at launch, in the navbar and the footer. Treat any other address as fake.`,
  ],
  [
    "Which wallets work with Cuilby?",
    `Any EVM wallet that can add a network, such as MetaMask, Rabby, OKX Wallet or Coinbase Wallet. Phantom cannot add ${CHAIN.name}, so it is listed but switched off. On a phone, open the site inside your wallet's own browser.`,
  ],
  [
    "Is playing a pot gambling?",
    `Pots pay by chance. ${BRAND.name} is for adults aged 18 and over; only play with what you can afford to lose.`,
  ],
];

export const DOCS: Doc[] = [
  {
    slug: "",
    group: "Getting started",
    nav: "What is Cuilby",
    h1: "What is Cuilby, the jackpot launchpad",
    lede: `A jackpot launchpad on ${CHAIN.name}: every coin carries a pot, and every round hands it to a player.`,
    metaTitle: "What Is Cuilby, the Jackpot Launchpad",
    metaDescription: `Cuilby is a jackpot launchpad on ${CHAIN.name}. Learn how each coin's trading fees fill a pot, how rounds pay a winner and what runs in practice today.`,
    keyword: "jackpot launchpad",
    secondary: ["Robinhood Chain launchpad", "memecoin pot", "crypto jackpot"],
    body: (
      <>
        <p>
          {BRAND.name} is a jackpot launchpad. Most launchpads give you one reason to hold a coin, the hope that its price climbs. Here
          every coin here comes with a <strong>pot</strong>. A slice of each trading fee drops into it, rounds run on a clock, and when a
          round closes the pot goes to one of the people who played.
        </p>
        <p>
          The creator picks one of two games at launch. In a <strong>Raffle</strong>, playing buys become tickets and a block hash draws
          one. In a <strong>Hot seat</strong>, a buy over the bar takes the crown and winds the clock back, and whoever wears the crown at
          zero collects.
        </p>
        <h2>Why the pots add up</h2>
        <Bullets
          items={[
            <>
              <strong>Prizes come from fees only.</strong> Nothing is minted to pay a winner and nothing is taken out of anyone&apos;s
              balance.
            </>,
            <>
              <strong>A round always ends with a winner.</strong> When anyone played, 80% of the pot leaves with one of them and 20% seeds
              the next round.
            </>,
            <>
              <strong>Creators share the upside.</strong> A fifth of every fee on a coin belongs to the wallet that launched it.
            </>,
          ]}
        />
        <h2>What is live and what is practice</h2>
        <p>
          The coins on the board are real launches on {CHAIN.name}, read from the Pons V2 launchpad with their real prices, trades and
          holders. Pots, rounds and draws run in <strong>practice mode</strong> with pETH, which has no value. Every practice action is a
          free wallet signature, and no contract holds anyone&apos;s money yet.
        </p>
        <Note>
          New to it? Start with the <Link href="/docs/quickstart">first play guide</Link>, then read how a{" "}
          <Link href="/docs/raffle">raffle round</Link> or a <Link href="/docs/hot-seat">hot seat round</Link> pays out.
        </Note>
      </>
    ),
  },
  {
    slug: "quickstart",
    group: "Getting started",
    nav: "First play",
    h1: "First play: how to join a pot",
    lede: "A fresh wallet can hold a ticket about a minute from now.",
    metaTitle: "How to Join a Crypto Jackpot Pot",
    metaDescription: `How to join a crypto jackpot pot on Cuilby: connect a wallet, add ${CHAIN.name}, open a free practice balance and sign your first ticket in under a minute.`,
    keyword: "join a crypto jackpot",
    secondary: ["connect wallet to Robinhood Chain", "practice pot", "first ticket"],
    body: (
      <>
        <p>
          Here is how to join a crypto jackpot pot on {BRAND.name}. Practice play needs no real ETH, so you can try every step before
          anything is deployed.
        </p>
        <h2>Connect a wallet to {CHAIN.name}</h2>
        <Steps
          items={[
            "Install an EVM wallet that can add a network, such as MetaMask, Rabby or OKX Wallet.",
            <>
              Press Connect. The site asks your wallet to switch to {CHAIN.name} (chain id {CHAIN.id}) and adds the network if it is
              missing.
            </>,
            <>
              Open your <Link href="/me">portfolio</Link> and start a practice balance. It opens with 1 pETH.
            </>,
          ]}
        />
        <h2>Get your first ticket</h2>
        <Steps
          items={[
            <>
              Pick a coin on the <Link href="/">coin board</Link>. The Closing soon tab sorts rounds by the time they have left.
            </>,
            "The top of each coin page shows its pot, the round clock and, once you play, your share of the tickets.",
            "Enter an amount in the Play for the pot panel, keep the pot box ticked and sign. The signature is free and sends nothing.",
            "Once time is up, the next visit to the coin settles the round and the prize lands in your practice balance.",
          ]}
        />
        <p>
          Each coin page also has a Real trade card. That one is an actual ETH swap through the Pons V2 contracts, signed and paid from your
          wallet, and it never enters a pot.
        </p>
      </>
    ),
  },
  {
    slug: "raffle",
    group: "Pot games",
    nav: "Raffle",
    h1: "Raffle rounds: a crypto raffle drawn by block hash",
    lede: "Buy in, hold a ticket, let the next block choose.",
    metaTitle: "Crypto Raffle Rules and Odds",
    metaDescription: `Crypto raffle rules on Cuilby: playing buys become tickets weighted by ETH, the clock starts with the first ticket and a ${CHAIN.name} block hash draws one.`,
    keyword: "crypto raffle",
    secondary: ["raffle odds", "block hash draw", "provably fair draw"],
    body: (
      <>
        <p>
          A Cuilby raffle is a crypto raffle tied to one coin. Every playing buy becomes a ticket, and at zero one ticket is drawn to take
          the pot.
        </p>
        <h2>Raffle rules</h2>
        <Bullets
          items={[
            "The creator sets a round length of 5 minutes, 15 minutes or 1 hour.",
            <>
              The clock stays off on an empty round. It starts with the <strong>first ticket</strong> and never moves after that.
            </>,
            "A playing buy of 0.005 pETH or more counts as a ticket sized by its ETH. Several buys from one wallet stack up.",
            "Coins bought as tickets wait until the draw and then go back to their owner, whatever the result.",
            "The drawn ticket collects 80% of the pot at the close; the other 20% carries into the next round.",
          ]}
        />
        <h2>Raffle odds explained</h2>
        <p>
          Odds follow what you put in. Holding 0.1 pETH of tickets in a round with 0.4 pETH of tickets in total gives you a one in four
          chance. The play panel shows your odds before you sign.
        </p>
        <h2>Inside the block hash draw</h2>
        <p>
          After the close, the draw waits for the first {CHAIN.name} block made after it. Ticket sales stop at the close, so nobody could
          know that block while buying. The seed is <code>keccak256(blockHash ‖ &quot;cuilby:&lt;coin&gt;:&lt;round&gt;&quot;)</code>.
          Tickets are sorted by wallet into back-to-back ranges, and <code>keccak256(seed) mod total</code> picks the winning range.
        </p>
        <p>
          The Rounds tab on every coin page lists each draw&apos;s block, seed, roll and tickets, with a button that reads the block from
          the chain and repeats the whole draw in your browser.
        </p>
        <Note>
          A block hash is not perfect randomness: {CHAIN.name} has a single sequencer that could in theory steer it. That is fine for
          practice; real pots need more, as the <Link href="/docs/randomness">randomness notes</Link> explain.
        </Note>
      </>
    ),
  },
  {
    slug: "hot-seat",
    group: "Pot games",
    nav: "Hot seat",
    h1: "Hot seat: the last buyer jackpot",
    lede: "Take the crown, keep the crown, take the pot.",
    metaTitle: "Hot Seat: Last Buyer Jackpot Rules",
    metaDescription:
      "Hot seat rules on Cuilby: a big enough buy takes the crown and resets the clock, and whoever holds the crown when time runs out collects 80% of the pot.",
    keyword: "last buyer jackpot",
    secondary: ["crown", "countdown pot", "king of the hill crypto"],
    body: (
      <>
        <p>Hot seat is a last buyer jackpot. There is no draw: the final qualifying buy before the clock hits zero wins the round.</p>
        <h2>Hot seat rules</h2>
        <Bullets
          items={[
            "The creator sets a clock of 5 minutes, 15 minutes or 1 hour.",
            "To claim the crown a playing buy must clear the bar: 0.01 pETH, or 1% of the pot when that is higher. Each coin page shows the bar live.",
            "The first crown starts the clock and every new crown winds it back to full.",
            "Coins from a crowning buy wait with the crown and go back to their owner as soon as another player claims it.",
            "At zero the crown holder collects 80% of the pot plus their waiting coins; 20% stays for the next round.",
          ]}
        />
        <h2>Why crown coins wait</h2>
        <p>
          Without it, a player could grab the crown, dump the coins at once and still get paid. Holding them until the round settles keeps
          the crown with someone who actually owns the coin.
        </p>
      </>
    ),
  },
  {
    slug: "fees",
    group: "Pot games",
    nav: "Fees and pots",
    h1: "Trading fees and how they fill the pot",
    lede: "Where each fee goes, down to the last unit.",
    metaTitle: "Trading Fees and Pot Split Explained",
    metaDescription:
      "How Cuilby trading fees work: every buy and sell pays 1%, split 60% to the coin's pot, 20% to its creator and 20% to Cuilby. Winners take 80% of a pot.",
    keyword: "trading fees",
    secondary: ["fee split", "creator fees", "pot size"],
    body: (
      <>
        <p>Every buy and sell on a Cuilby coin pays 1% in trading fees on its ETH side. The fee is split three ways:</p>
        <div className="tile mt-5 overflow-hidden">
          <table className="w-full text-left text-[14.5px]">
            <tbody>
              {[
                ["60%", "the coin's pot, for its raffle or hot seat"],
                ["20%", "the wallet that launched the coin"],
                ["20%", BRAND.name],
              ].map(([a, b]) => (
                <tr key={b} className="border-t border-line first:border-0">
                  <td className="num w-24 px-4 py-3 font-medium text-gold">{a}</td>
                  <td className="px-4 py-3 text-fg-2">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The pot and creator shares round down and {BRAND.name} keeps the remainder, so the three parts always add up to the exact fee. A
          buy that does not play still grows the pot. When a round pays out, 80% goes to the winner and 20% seeds the next round.
        </p>
        <h2>Other costs to expect</h2>
        <Bullets
          items={[
            "Launching a coin: 0.001 pETH in practice. A real launch will cost the launchpad fee plus gas.",
            "Playing or trading in practice: the 1% fee and nothing else, since signatures are free.",
            `A real swap from the Real trade card: the Pons V2 curve or pool fee plus ${CHAIN.name} gas, paid from your wallet.`,
          ]}
        />
      </>
    ),
  },
  {
    slug: "launch",
    group: "Coins",
    nav: "Launching a coin",
    h1: "How to launch a memecoin with a pot",
    lede: "Name it, choose its game, sign once.",
    metaTitle: "How to Launch a Memecoin With a Pot",
    metaDescription: `How to launch a memecoin on ${CHAIN.name} with Cuilby: add a name, ticker and image, pick raffle or hot seat, set the round length and sign once to list it.`,
    keyword: "launch a memecoin",
    secondary: ["create a token on Robinhood Chain", "bonding curve", "creator fees"],
    body: (
      <>
        <p>To launch a memecoin on {BRAND.name} you need a picture, a name and a ticker. Everything else has a sensible default.</p>
        <h2>Launch steps</h2>
        <Steps
          items={[
            <>
              Open <Link href="/launch">the launch page</Link>. Give it a picture, a name (32 characters at most) and a ticker (12 at most).
            </>,
            "Choose Raffle or Hot seat and how long each round lasts.",
            "Optionally make an opening buy at the starting price. It stays out of every pot, so a creator cannot open with a free ticket or crown.",
            "Sign. The coin shows up on the board at once, with an empty pot waiting for its first fee.",
          ]}
        />
        <h2>Supply, curve and creator fees</h2>
        <p>
          Every coin has a fixed supply of 1,000,000,000. In practice it trades on a simple curve on this site, 2 virtual ETH against the
          whole supply, so the price rises as people buy. Creators keep a fifth of every fee their coin earns and can move it to their
          balance from the portfolio.
        </p>
        <Note>
          Once the {BRAND.name} launcher is deployed, a launch becomes one transaction through the{" "}
          <a href={PONS.page("")} target="_blank" rel="noreferrer">
            Pons V2 launchpad
          </a>{" "}
          on {CHAIN.name}: the whole supply on its bonding curve, no team allocation, and a Uniswap v4 pool after graduation.
        </Note>
      </>
    ),
  },
  {
    slug: "winnings",
    group: "Coins",
    nav: "Prizes and held coins",
    h1: "Pot prizes and held coins",
    lede: "Nothing to claim by hand.",
    metaTitle: "How Pot Prizes Are Paid Out",
    metaDescription:
      "How Cuilby pays pot prizes: rounds settle on the next visit after the clock ends, prizes land in the winner's balance and held coins go back to their owners.",
    keyword: "pot prizes",
    secondary: ["round settlement", "held coins", "prize payout"],
    body: (
      <>
        <p>Pot prizes pay themselves. You never need to press a claim button after a win.</p>
        <h2>How a round settles</h2>
        <Bullets
          items={[
            "A round settles the first time anyone looks at its coin after the clock ran out. Opening the board is enough.",
            "The prize lands in the winner's practice balance and appears under Pot wins in the portfolio.",
            "Ticket coins are released at the close. Crown coins are released the moment another player takes the crown.",
            "Each result is written once, under its own key, before anything is paid, so two visitors at the same moment cannot pay a round twice.",
          ]}
        />
        <p>
          With live contracts, a keeper will settle rounds within seconds and anyone will be able to trigger settlement, so payouts will not
          depend on this site staying online.
        </p>
      </>
    ),
  },
  {
    slug: "safety",
    group: "Trust and help",
    nav: "Safety and status",
    h1: "Safety, contracts and what is live",
    lede: "What is real today, what is practice, and what the contracts will and will not be able to do.",
    metaTitle: "Safety, Contracts and Project Status",
    metaDescription:
      "What is live on Cuilby today and what runs in practice, how signed practice plays work, and the limits the planned pot contracts will have before real money.",
    keyword: "launchpad safety",
    secondary: ["smart contract status", "signed messages", "no admin token"],
    body: (
      <>
        <p>
          This launchpad safety page lists exactly what is real today, what is practice, and the rules the future contracts will follow.
        </p>
        <h2>Live on {CHAIN.name} today</h2>
        <Bullets
          items={[
            `Wallet connection on ${CHAIN.name}, with the network added on connect.`,
            "Live coins, prices, charts, trades and holders, read from the chain through the Pons V2 launchpad's public data.",
            "Real swaps from the Real trade card, sent by your own wallet to the Pons V2 contracts.",
            "The block hashes that decide practice draws.",
          ]}
        />
        <h2>Running in practice</h2>
        <Bullets
          items={[
            "Pots, rounds, tickets, crowns, draws, launches and creator earnings, all in pETH, which has no value and cannot be withdrawn.",
            "Every practice action is a single-use message signed by your wallet. It names the site, the action and the amount, expires in five minutes and works once.",
          ]}
        />
        <h2>Rules for the contracts we plan to ship</h2>
        <Bullets
          items={[
            "Prize money can leave the vault only as a settled round's payout. No other withdrawal exists.",
            "Launched tokens have no admin: no extra supply, no transfer tax, no pausing and no blacklist.",
            "Admin powers stop at the platform's own fee recipient and a capped launch fee.",
            "Open source, verified on the block explorer, and audited before real money goes in.",
          ]}
        />
        <Note>
          Nothing is deployed yet. Until it is, no address on this site holds funds for {BRAND.name}, and the {BRAND.symbol} contract
          address reads &quot;at launch&quot;. Only trust an address shown on this site.
        </Note>
      </>
    ),
  },
  {
    slug: "randomness",
    group: "Trust and help",
    nav: "Randomness",
    h1: "Randomness and fair draws on Robinhood Chain",
    lede: "What a fair draw needs on this chain, and what exists today.",
    metaTitle: "Randomness and Fair Draws on Robinhood Chain",
    metaDescription: `How Cuilby keeps draws fair on ${CHAIN.name}: which randomness services exist there today, why practice uses block hashes, and the commit and reveal plan.`,
    keyword: "randomness on Robinhood Chain",
    secondary: ["VRF", "fair draw", "commit and reveal"],
    body: (
      <>
        <p>
          A raffle is only as fair as its random number, so we checked what randomness on Robinhood Chain looks like as of October 2026. The
          usual tool is a VRF, a service that returns a random value with proof that nobody picked it.
        </p>
        <h2>Randomness services checked</h2>
        <Bullets
          items={[
            `Chainlink VRF: not offered on ${CHAIN.name}. Chainlink price feeds are live there; VRF is not.`,
            `Pyth Entropy: not deployed. Pyth lists ${CHAIN.name} for price feeds only.`,
            "Supra, API3, Gelato and other randomness providers: no deployment found.",
            <>
              <code>block.prevrandao</code> is a constant on this type of chain, and block hashes come from a single sequencer.
            </>,
          ]}
        />
        <h2>What Cuilby uses now and next</h2>
        <p>
          Practice draws use the hash of the first block after the close. It is reproducible and nobody sees it ahead of time, but the
          sequencer could in theory steer it. For real pots the plan is commit and reveal: {BRAND.name} commits to a secret before tickets
          go on sale, reveals it after the close, and the contract mixes it with a later block hash. Neither side can choose the result
          alone, and a VRF replaces it as soon as one is offered on {CHAIN.name}.
        </p>
      </>
    ),
  },
  {
    slug: "faq",
    group: "Trust and help",
    nav: "FAQ",
    h1: "Jackpot launchpad FAQ",
    lede: "Short, straight answers.",
    metaTitle: "Jackpot Launchpad FAQ",
    metaDescription: `Answers about the Cuilby jackpot launchpad: real money versus practice, wallets that work on ${CHAIN.name}, empty pots, launching coins and the token.`,
    keyword: "jackpot launchpad FAQ",
    secondary: ["is it real money", "supported wallets", "official token"],
    faq: FAQ,
    body: (
      <>
        <p className="sr-only">Frequently asked questions about the {BRAND.name} jackpot launchpad.</p>
        {FAQ.map(([q, a]) => (
          <div key={q} className="border-t border-line py-5 first:mt-4">
            <h2 className="!mt-0 font-sans !text-[16px] !font-semibold !tracking-normal">{q}</h2>
            <p className="!mt-1.5 !text-[15px] !leading-relaxed">{a}</p>
          </div>
        ))}
      </>
    ),
  },
  {
    slug: "brand",
    group: "Trust and help",
    nav: "Brand kit",
    h1: "Cuilby brand kit and logo downloads",
    lede: "Artwork for articles, listings and partner pages.",
    metaTitle: "Brand Kit and Logo Downloads",
    metaDescription:
      "Download the Cuilby brand kit: the water-drop mascot logo, a logo on a dark plate, an X banner and a social card, plus the colour values to use with them.",
    keyword: "brand kit",
    secondary: ["logo download", "press kit", "brand colours"],
    body: (
      <>
        <p>Everything in the {BRAND.name} brand kit is free to use when you write about the project.</p>
        <h2>Logo and banner files</h2>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["Logo mark, 512 px", "/brand/cuilby-mark.webp", "The Cuilby water-drop mascot logo on a transparent background"],
            ["Logo on dark plate, 1024 px", "/brand/cuilby-badge.webp", "The Cuilby logo centred on a dark square plate"],
            ["X banner, 1500 × 500", "/brand/cuilby-banner.webp", "Wide Cuilby banner for an X profile header"],
            ["Social card, 1200 × 630", "/brand/cuilby-card.webp", "Cuilby social sharing card with the logo and slogan"],
          ].map(([label, href, alt]) => (
            <a key={href} href={href} download className="tile group flex flex-col overflow-hidden transition-colors hover:bg-card-3">
              {}
              <img src={href} alt={alt} width={480} height={128} loading="lazy" className="h-32 w-full bg-ink object-contain p-4" />
              <span className="flex items-center justify-between px-4 py-3 text-[14px]">
                <span className="text-fg">{label}</span>
                <span className="text-fg-3 group-hover:text-surge">Download</span>
              </span>
            </a>
          ))}
        </div>
        <h2>Brand colours</h2>
        <p>
          The brand colour is mint <code>#97FCE4</code>, pot amounts use gold <code>#F3BD52</code> and the page ground is{" "}
          <code>#0A0F0D</code>. The mascot logo keeps its own watercolour blues; use it on the dark ground or on its dark plate. Please
          do not recolour or stretch it.
        </p>
      </>
    ),
  },
];

export const docBySlug = (slug: string) => DOCS.find((d) => d.slug === slug) ?? null;
export const docHref = (slug: string) => (slug ? `/docs/${slug}` : "/docs");
