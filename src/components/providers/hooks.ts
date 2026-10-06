"use client";

import { useEffect, useState } from "react";
import type { Board, CoinDetail } from "@/lib/board";

/** Polls a JSON endpoint; keeps the last good answer when a poll fails. */
export function usePoll<T>(url: string | null, every = 15_000) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const load = () =>
      fetch(url, { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json() as Promise<T>;
        })
        .then((body) => {
          if (cancelled) return;
          setData(body);
          setFailed(false);
        })
        .catch(() => !cancelled && setFailed(true));
    load();
    const timer = window.setInterval(load, every);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [url, every, tick]);
  return { data, failed, reload: () => setTick((n) => n + 1) };
}

export const useBoard = () => usePoll<Board>("/api/coins", 15_000);
export const useCoin = (key: string) => usePoll<CoinDetail>(`/api/coins/${key}`, 8_000);

/**
 * The current time, re-read every second for countdowns. Zero until the
 * page is hydrated, so server and browser render the same first frame.
 */
export function useNow(every = 1000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), every);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [every]);
  return now;
}

export type Stats = {
  ethUsd: number | null;
  block: number | null;
  blockAge: number | null;
  gasGwei: number | null;
  liveCoins: number;
  launchedToday: number;
  practicePots: number;
  practice: { paid: number; biggest: number; rounds: number; launches: number } | null;
  practiceConfigured: boolean;
};
export const useStats = () => usePoll<Stats>("/api/stats", 20_000);
