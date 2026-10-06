"use client";

import { useMemo, useState } from "react";

export type ChartPoint = { t: number; priceEth: number; volumeEth: number; trades: number };

const W = 720;
const H = 260;
const PAD = { l: 8, r: 64, t: 14, b: 22 };
const VOL_H = 46;

/** Market cap line (USD) with volume bars underneath, drawn as plain SVG. */
export function PriceChart({ points, ethUsd, supply }: { points: ChartPoint[]; ethUsd: number | null; supply: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const toUsd = (p: number) => (ethUsd ? p * ethUsd * supply : p * supply);
  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const xs = points.map((p) => p.t);
    const ys = points.map((p) => toUsd(p.priceEth));
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    let y0 = Math.min(...ys);
    let y1 = Math.max(...ys);
    if (y1 - y0 < y1 * 0.02) {
      y0 *= 0.98;
      y1 *= 1.02;
    }
    const vMax = Math.max(...points.map((p) => p.volumeEth), 1e-12);
    const plotH = H - PAD.t - PAD.b - VOL_H;
    const sx = (t: number) => PAD.l + ((t - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r);
    const sy = (v: number) => PAD.t + (1 - (v - y0) / (y1 - y0 || 1)) * plotH;
    const line = points.map((p, i) => `${i ? "L" : "M"}${sx(p.t).toFixed(1)},${sy(toUsd(p.priceEth)).toFixed(1)}`).join(" ");
    const area = `${line} L${sx(x1).toFixed(1)},${(PAD.t + plotH).toFixed(1)} L${sx(x0).toFixed(1)},${(PAD.t + plotH).toFixed(1)} Z`;
    const barW = Math.min(12, Math.max(1.5, (W - PAD.l - PAD.r) / points.length - 1));
    const bars = points.map((p) => ({ x: sx(p.t) - barW / 2, h: (p.volumeEth / vMax) * (VOL_H - 6), w: barW }));
    const ticks = [y1, (y0 + y1) / 2, y0].map((v) => ({ v, y: sy(v) }));
    return { line, area, bars, ticks, sx, sy, plotH };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, ethUsd, supply]);

  if (!geo) {
    return <div className="flex h-[220px] items-center justify-center text-[14px] text-ink-3">Not enough trades in this range to draw.</div>;
  }
  const fmt = (v: number) =>
    v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K` : `$${v.toFixed(v < 10 ? 2 : 0)}`;
  const h = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label="Market cap chart"
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - box.left) / box.width) * W;
          let best = 0;
          let bestD = Infinity;
          points.forEach((p, i) => {
            const d = Math.abs(geo.sx(p.t) - x);
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          });
          setHover(best);
        }}
      >
        {geo.ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="var(--color-line)" strokeDasharray="3 4" />
            <text x={W - PAD.r + 6} y={t.y + 4} fontSize="11" fill="var(--color-ink-3)" fontFamily="var(--font-mono)">
              {fmt(t.v)}
            </text>
          </g>
        ))}
        <path d={geo.area} fill="var(--color-brand)" fillOpacity="0.08" />
        <path d={geo.line} fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinejoin="round" />
        {geo.bars.map((b, i) => (
          <rect key={i} x={b.x} y={H - PAD.b - b.h} width={b.w} height={b.h} fill="var(--color-ink)" fillOpacity={hover === i ? 0.6 : 0.18} />
        ))}
        {h ? (
          <g>
            <line x1={geo.sx(h.t)} x2={geo.sx(h.t)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-ink)" strokeOpacity="0.4" />
            <circle cx={geo.sx(h.t)} cy={geo.sy(toUsd(h.priceEth))} r="4" fill="var(--color-amber)" stroke="var(--color-ink)" strokeWidth="1.5" />
          </g>
        ) : null}
      </svg>
      <div className="pointer-events-none absolute top-1 left-2 rounded-lg bg-card/90 px-2 py-1 font-mono text-[11.5px] text-ink-2">
        {h
          ? `${new Date(h.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${fmt(toUsd(h.priceEth))} · ${h.trades} trades`
          : `Market cap ${fmt(toUsd(points[points.length - 1].priceEth))}`}
      </div>
    </div>
  );
}
