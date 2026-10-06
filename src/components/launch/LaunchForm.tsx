"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
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

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-8">
        <section className="panel p-5 sm:p-6">
          <h2 className="h-display text-[26px]">The coin</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[132px_minmax(0,1fr)]">
            <div>
              <button
                type="button"
                onClick={() => file.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void pick(e.dataTransfer.files[0]);
                }}
                className="flex size-[132px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-[1.5px] border-dashed border-ink bg-paper text-center text-[12.5px] text-ink-2 hover:bg-amber-soft"
              >
                {image ? (
                  <img src={image} alt="Coin image preview" className="size-full object-cover" />
                ) : (
                  <>
                    <ImagePlus className="size-6" />
                    Drop an image
                    <br />
                    or tap to pick
                  </>
                )}
              </button>
              <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
              {image ? (
                <button type="button" onClick={() => setImage("")} className="mt-2 flex cursor-pointer items-center gap-1 text-[12px] text-ink-3 hover:text-ink">
                  <X className="size-3" /> remove
                </button>
              ) : null}
              {imageNote ? <p className="mt-2 text-[12px] text-down">{imageNote}</p> : null}
            </div>
            <div className="min-w-0 space-y-4">
              <label className="block">
                <span className="flex justify-between">
                  <span className="label">Name</span>
                  <span className="label">{name.length}/32</span>
                </span>
                <input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} className="field mt-1" placeholder="Lucky Clover" />
              </label>
              <label className="block">
                <span className="flex justify-between">
                  <span className="label">Ticker</span>
                  <span className="label">{symbol.length}/12</span>
                </span>
                <input
                  value={symbol}
                  maxLength={12}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  className="field num mt-1"
                  placeholder="CLOVER"
                />
              </label>
            </div>
          </div>
          <label className="mt-5 block">
            <span className="flex justify-between">
              <span className="label">About it · optional</span>
              <span className="label">{description.length}/200</span>
            </span>
            <textarea
              value={description}
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="field mt-1 resize-none"
              placeholder="What is this coin about?"
            />
          </label>
          <button type="button" onClick={() => setShowLinks((v) => !v)} className="mt-3 cursor-pointer text-[13.5px] font-semibold text-brand">
            {showLinks ? "Hide socials" : "+ Socials"}
          </button>
          {showLinks ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(["x", "telegram", "website"] as const).map((k) => (
                <label key={k} className="block min-w-0">
                  <span className="label">{k === "x" ? "X" : k === "telegram" ? "Telegram" : "Website"}</span>
                  <input
                    value={links[k]}
                    onChange={(e) => setLinks((l) => ({ ...l, [k]: e.target.value }))}
                    className="field mt-1 text-[14px]"
                    placeholder={k === "x" ? "https://x.com/…" : k === "telegram" ? "https://t.me/…" : "https://…"}
                  />
                </label>
              ))}
            </div>
          ) : null}
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="h-display text-[26px]">How the pot pays</h2>
          <p className="mt-2 text-[14.5px] text-ink-2">Three fifths of each trading fee lands in this coin&apos;s pot for its whole life. You decide who collects it.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                { id: "raffle", title: "Raffle", line: "Luck of the draw.", body: "Playing buys turn into entries sized by the ETH behind them. At the close, a fresh block hash picks one entry." },
                { id: "hotseat", title: "Hot seat", line: "Hold the crown to the end.", body: "A buy over the bar grabs the crown and winds the clock back up. Wear it at zero and the pot is yours." },
              ] as const
            ).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setMode(g.id)}
                aria-pressed={mode === g.id}
                className={`cursor-pointer rounded-2xl border-[1.5px] p-4 text-left transition-shadow ${
                  mode === g.id ? "border-ink bg-amber-soft shadow-[3px_3px_0_var(--color-ink)]" : "border-line-2 bg-card hover:border-ink"
                }`}
              >
                <p className="h-display text-[22px]">{g.title}</p>
                <p className="mt-1 font-semibold">{g.line}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{g.body}</p>
              </button>
            ))}
          </div>
          <p className="label mt-6">Round length</p>
          <div className="mt-2 flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.sec}
                type="button"
                onClick={() => setDuration(d.sec)}
                className={`btn h-10 min-w-16 px-4 font-mono text-[14px] font-medium ${duration === d.sec ? "btn-ink" : "btn-ghost"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="label mt-6">Opening buy · optional</p>
          <p className="mt-1 text-[13.5px] text-ink-2">Made in the same step at the starting price. Those coins are yours but sit outside every pot.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OPENING.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOpening(o)}
                className={`btn h-10 px-4 font-mono text-[14px] font-medium ${opening === o ? "btn-ink" : "btn-ghost"}`}
              >
                {o === 0 ? "None" : `${peth(o)} pETH`}
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="min-w-0">
        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="ticket overflow-hidden">
            <div className="p-5">
              <p className="label">Preview</p>
              <div className="mt-3 flex items-center gap-3">
                <CoinLogo src={image || null} symbol={symbol || "??"} size={56} />
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-bold">{name || "Your coin"}</p>
                  <p className="font-mono text-[13px] text-ink-3">{symbol || "TICKER"}</p>
                </div>
              </div>
              <p className="mt-3 chip chip-amber">
                {mode === "raffle" ? "Raffle" : "Hot seat"}, {DURATIONS.find((d) => d.sec === duration)?.label} rounds
              </p>
            </div>
            <dl className="perf perf-x space-y-2 bg-paper p-5 font-mono text-[13px]">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-2">Total supply</dt>
                <dd>1,000,000,000</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-2">Starting value</dt>
                <dd>{stats?.ethUsd ? usd(2 * stats.ethUsd, false) : "2 pETH"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-2">Listing fee</dt>
                <dd>{peth(LAUNCH_FEE)} pETH</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-2">Opening buy</dt>
                <dd>{peth(opening)} pETH</dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-dashed border-line-2 pt-2 font-medium">
                <dt>Total</dt>
                <dd>{peth(total)} pETH</dd>
              </div>
            </dl>
          </div>
          {configured === false ? (
            <p className="rounded-xl bg-paper-2 p-3 text-[13px] text-ink-2">Practice storage is not configured on this site yet, so launches are off.</p>
          ) : !address ? (
            <button type="button" onClick={open} className="btn btn-ink h-12 w-full text-base">
              Connect wallet
            </button>
          ) : (
            <button type="button" onClick={launch} disabled={!ready || short || busy !== null} className="btn btn-brand h-12 w-full text-base" data-testid="launch-submit">
              {busy ?? (!ready ? "Add a name and ticker" : short ? "Not enough pETH" : "Sign & launch (practice)")}
            </button>
          )}
          {error ? (
            <p role="alert" className="rounded-lg border border-down bg-down-soft px-3 py-2 text-[12.5px] break-words text-down">
              {error}
            </p>
          ) : null}
          <p className="text-[12.5px] leading-relaxed text-ink-3">
            Launches run in practice until the Cuilby launcher contract is deployed: the coin, its curve and its pot live on this site
            with pETH. A real launch will be one transaction through the Pons launchpad on Robinhood Chain, with the whole supply on
            its bonding curve and no team allocation.
          </p>
        </div>
      </aside>
    </div>
  );
}
