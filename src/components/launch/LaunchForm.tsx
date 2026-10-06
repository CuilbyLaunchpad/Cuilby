"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretDown, CheckCircle, Crown, ImageSquare, Ticket, X } from "@phosphor-icons/react";
import { CoinLogo } from "@/components/coin/CoinLogo";
import { usePractice } from "@/components/providers/PracticeProvider";
import { useStats } from "@/components/providers/hooks";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import { peth, usd } from "@/lib/format";

const DURATIONS = [
  { sec: 300, label: "5m" },
  { sec: 900, label: "15m" },
  { sec: 3600, label: "1h" },
];
const OPENING = [0, 50_000, 100_000, 250_000];
const LAUNCH_FEE = 1_000;
const MAX_IMAGE = 2800;

/** Shrinks a picture to a 64 px WebP data URL small enough to sign along with the launch. */
async function shrink(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("bad image"));
      img.src = url;
    });
    for (const [size, quality] of [
      [64, 0.8],
      [64, 0.6],
      [48, 0.6],
      [40, 0.5],
    ] as const) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      const data = canvas.toDataURL("image/webp", quality);
      if (data.startsWith("data:image/webp") && data.length <= MAX_IMAGE) return data;
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function LaunchForm() {
  const router = useRouter();
  const { address } = useWallet();
  const { open } = useWalletModal();
  const { configured, account, act, busy, error } = usePractice();
  const { data: stats } = useStats();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [showLinks, setShowLinks] = useState(false);
  const [links, setLinks] = useState({ x: "", telegram: "", website: "" });
  const [image, setImage] = useState("");
  const [imageNote, setImageNote] = useState<string | null>(null);
  const [mode, setMode] = useState<"raffle" | "hotseat">("raffle");
  const [duration, setDuration] = useState(900);
  const [opening, setOpening] = useState(0);
  const file = useRef<HTMLInputElement>(null);

  const total = LAUNCH_FEE + opening;
  const ready = name.trim().length >= 2 && symbol.length >= 2;
  const short = account ? account.balance < total : false;

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setImageNote(null);
    if (!f.type.startsWith("image/")) return setImageNote("That file is not an image.");
    const data = await shrink(f);
    if (!data) return setImageNote("This browser could not shrink that picture. Try a PNG or JPG.");
    setImage(data);
  };

  const launch = async () => {
    const result = await act("launch", {
      name,
      symbol,
      description,
      links,
      image,
      mode,
      durationSec: duration,
      openingBuy: opening,
    });
    if (result.ok && result.coin) router.push(`/t/${result.coin}`);
  };

  const label = "flex items-center justify-between text-[13px] text-fg-2";
  const field = "field h-11 text-[15px]";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="surface p-5 md:p-6" aria-labelledby="coin-details">
          <h2 id="coin-details" className="sr-only">
            Coin details
          </h2>
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => file.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void pick(e.dataTransfer.files[0]);
                }}
                aria-label="Upload coin image"
                className="group relative grid size-[132px] place-items-center overflow-hidden rounded-[28px] bg-card-2 shadow-[inset_0_0_0_1.5px_var(--color-line-2)] transition-colors hover:bg-card-3"
              >
                {image ? (
                  <img src={image} alt="Coin image preview" className="size-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-fg-3 group-hover:text-fg-2">
                    <ImageSquare size={24} />
                    <span className="text-[12px]">Add a picture</span>
                  </span>
                )}
              </button>
              <input
                ref={file}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => void pick(e.target.files?.[0])}
              />
              {image ? (
                <button
                  type="button"
                  onClick={() => setImage("")}
                  className="mt-2 flex items-center gap-1 text-[12px] text-fg-3 hover:text-fg"
                >
                  <X size={12} /> Remove image
                </button>
              ) : null}
              {imageNote ? <p className="mt-2 max-w-[132px] text-[12px] text-down">{imageNote}</p> : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>
                  <span>Name</span>
                  <span className="num text-[11px] text-fg-3">{name.length}/32</span>
                </span>
                <input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} className={field} placeholder="Lucky Clover" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>
                  <span>Ticker</span>
                  <span className="num text-[11px] text-fg-3">{symbol.length}/12</span>
                </span>
                <input
                  value={symbol}
                  maxLength={12}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  className={`${field} uppercase`}
                  placeholder="CLOVER"
                />
              </label>
            </div>
          </div>
          <label className="mt-4 flex flex-col gap-1.5">
            <span className={label}>
              <span>
                About the coin <span className="text-fg-3">· optional</span>
              </span>
              <span className="num text-[11px] text-fg-3">{description.length}/200</span>
            </span>
            <textarea
              value={description}
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="field resize-none py-2.5 text-[15px]"
              placeholder="Tell people why this coin exists."
            />
          </label>
          <button
            type="button"
            onClick={() => setShowLinks((v) => !v)}
            aria-expanded={showLinks}
            className="mt-3 inline-flex items-center gap-1 text-[13px] text-fg-3 hover:text-fg"
          >
            Social links <CaretDown size={12} className={showLinks ? "rotate-180" : ""} />
          </button>
          {showLinks ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(["x", "telegram", "website"] as const).map((k) => (
                <label key={k} className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[13px] text-fg-2">{k === "x" ? "X" : k === "telegram" ? "Telegram" : "Website"}</span>
                  <input
                    value={links[k]}
                    onChange={(e) => setLinks((l) => ({ ...l, [k]: e.target.value }))}
                    className="field h-10 text-[14px]"
                    placeholder={k === "x" ? "https://x.com/…" : k === "telegram" ? "https://t.me/…" : "https://…"}
                  />
                </label>
              ))}
            </div>
          ) : null}
        </section>

        <section className="surface p-5 md:p-6" aria-labelledby="pick-game">
          <h2 id="pick-game" className="text-[15px] font-semibold">
            Choose how the pot pays out
          </h2>
          <p className="mt-1 text-[13px] text-fg-3">
            Three fifths of every trading fee on this coin lands in its pot for good. You decide who collects it.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Game">
            {(
              [
                {
                  id: "raffle",
                  Icon: Ticket,
                  title: "Raffle",
                  line: "A drawn ticket takes it.",
                  body: "Each playing buy turns into a ticket sized by the ETH behind it. At the close, a fresh block hash picks one.",
                },
                {
                  id: "hotseat",
                  Icon: Crown,
                  title: "Hot seat",
                  line: "Hold the crown to the end.",
                  body: "A buy over the bar grabs the crown and winds the clock back up. Wear it at zero and the pot is yours.",
                },
              ] as const
            ).map((g) => (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={mode === g.id}
                onClick={() => setMode(g.id)}
                className={`relative rounded-[18px] p-4 text-left transition-colors ${
                  mode === g.id
                    ? "bg-surge/10 shadow-[inset_0_0_0_1.5px_var(--color-surge)]"
                    : "bg-card-2 shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-card-3"
                }`}
              >
                <span className="flex items-center gap-2">
                  <g.Icon size={20} weight="fill" className="text-gold" />
                  <span className="text-[16px] font-semibold">{g.title}</span>
                  {mode === g.id ? <CheckCircle size={18} weight="fill" className="ml-auto text-surge" /> : null}
                </span>
                <span className="mt-2 block text-[14px] font-medium">{g.line}</span>
                <span className="mt-1 block text-[13px] leading-snug text-fg-2">{g.body}</span>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <p className="mb-2 text-[13px] text-fg-2">Round length</p>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.sec}
                  type="button"
                  onClick={() => setDuration(d.sec)}
                  aria-pressed={duration === d.sec}
                  className={`num h-9 rounded-full px-4 text-[14px] ${duration === d.sec ? "bg-fg text-ink" : "btn-ghost"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="surface p-5 md:p-6" aria-labelledby="opening-buy">
          <h2 id="opening-buy" className="text-[15px] font-semibold">
            Opening buy
          </h2>
          <p className="mt-1 text-[13px] text-fg-3">
            Optional. Made in the same step at the starting price, before anyone else trades. Those coins are yours and stay outside every
            pot.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {OPENING.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOpening(o)}
                aria-pressed={opening === o}
                className={`num h-9 rounded-full px-4 text-[14px] ${opening === o ? "bg-fg text-ink" : "btn-ghost"}`}
              >
                {o === 0 ? "None" : `${peth(o)} pETH`}
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <div className="surface p-5">
          <p className="text-[13px] text-fg-3">Preview</p>
          <div className="mt-3 flex items-center gap-3">
            <CoinLogo src={image || null} symbol={symbol || "??"} size={56} />
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold">{name || "Your coin"}</p>
              <p className="text-[13px] text-fg-3">{symbol || "TICKER"}</p>
            </div>
          </div>
          <div className="tile mt-4 flex items-center gap-2.5 px-3 py-2.5">
            {mode === "raffle" ? (
              <Ticket size={16} weight="fill" className="text-gold" />
            ) : (
              <Crown size={16} weight="fill" className="text-gold" />
            )}
            <span className="text-[13px]">
              {mode === "raffle" ? "Raffle" : "Hot seat"}, {DURATIONS.find((d) => d.sec === duration)?.label} rounds
            </span>
          </div>
          <dl className="mt-4 flex flex-col gap-1.5 text-[13px]">
            <div className="flex justify-between gap-2">
              <dt className="text-fg-3">Supply</dt>
              <dd className="num">1,000,000,000</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-fg-3">Starting value</dt>
              <dd className="num">{stats?.ethUsd ? usd(2 * stats.ethUsd, false) : "2 pETH"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-fg-3">Listing fee</dt>
              <dd className="num">{peth(LAUNCH_FEE)} pETH</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-fg-3">Opening buy</dt>
              <dd className="num">{peth(opening)} pETH</dd>
            </div>
            <div className="mt-1 flex justify-between gap-2 border-t border-line pt-2 text-[14px]">
              <dt>Total</dt>
              <dd className="num font-semibold">{peth(total)} pETH</dd>
            </div>
          </dl>
          {configured === false ? (
            <p className="tile mt-5 px-3 py-3 text-[13px] text-fg-2">
              Practice storage is not configured on this site yet, so launches are off.
            </p>
          ) : !address ? (
            <button
              type="button"
              onClick={open}
              className="btn-surge mt-5 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-bold"
            >
              Connect wallet
            </button>
          ) : (
            <button
              type="button"
              onClick={launch}
              disabled={!ready || short || busy !== null}
              className="btn-surge mt-5 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-bold"
              data-testid="launch-submit"
            >
              {busy ?? (!ready ? "Add a name and ticker" : short ? "Not enough pETH" : "Sign and launch (practice)")}
            </button>
          )}
          {error ? (
            <p role="alert" className="mt-3 rounded-[12px] bg-down/10 px-3 py-2 text-[12.5px] break-words text-down">
              {error}
            </p>
          ) : null}
          <p className="mt-3 text-[12px] leading-relaxed text-fg-3">
            Launches run in practice until the Cuilby launcher contract is deployed: the coin, its curve and its pot live on this site with
            pETH. A real launch will be one transaction through the Pons V2 launchpad, with the whole supply on its bonding curve and no
            team allocation.
          </p>
        </div>
      </aside>
    </div>
  );
}
