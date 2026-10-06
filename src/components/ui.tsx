import { Crown, Ticket } from "@phosphor-icons/react/dist/ssr";
import { Mark } from "@/components/Mark";

/** Page frame shared by every route: 1400 px column, room for the fixed bars at the bottom. */
export const MAIN = "mx-auto w-full max-w-[1400px] px-4 pb-32 pt-4 md:px-6 md:pb-20 md:pt-6";

/** The ETH glyph in its small round plate, used next to every ETH / pETH amount. */
export function EthGlyph({ size = 14 }: { size?: number }) {
  const inner = Math.round(size * 0.64);
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full bg-chip align-middle"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
        <path d="M12 2.5 5.5 12.6 12 16.4l6.5-3.8L12 2.5Z" fill="#97fce4" />
        <path d="M12 17.7 5.5 13.9 12 21.5l6.5-7.6-6.5 3.8Z" fill="#97fce4" fillOpacity="0.6" />
      </svg>
    </span>
  );
}

/** Small mint pill naming the network. */
export function ChainChip({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-surge/10 px-2.5 py-1 text-[12px] font-medium text-surge ${className}`}
    >
      <EthGlyph size={14} /> Built on Robinhood Chain
    </span>
  );
}

/** Gold badge naming a coin's game. */
export function ModeBadge({ mode, size = "md", suffix }: { mode: "raffle" | "hotseat"; size?: "sm" | "md"; suffix?: string }) {
  const Icon = mode === "raffle" ? Ticket : Crown;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/12 font-semibold text-gold ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]"
      }`}
    >
      <Icon size={size === "sm" ? 12 : 14} weight="fill" />
      {mode === "raffle" ? "Raffle" : "Hot seat"}
      {suffix ? ` · ${suffix}` : ""}
    </span>
  );
}

/** Mark plus the lowercase wordmark, as in the header. */
export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark size={size} />
      <span className="display text-[26px] leading-none font-extrabold tracking-[-0.06em] text-fg lowercase">cuilby</span>
    </span>
  );
}
