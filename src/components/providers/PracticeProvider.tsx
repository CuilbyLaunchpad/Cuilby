"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import type { Account } from "@/lib/practice/ledger";

/*
 * The visitor's practice account and the one way to change it: ask the
 * server for a one-time message, sign it in the wallet (personal_sign, free,
 * no transaction), send the signature back. Nothing else can move pETH.
 */

type AccountView = { configured: boolean; account: Account | null; earnings: number; canTopUp: boolean };

type Practice = {
  configured: boolean | null;
  account: Account | null;
  earnings: number;
  canTopUp: boolean;
  busy: string | null;
  error: string | null;
  notice: string | null;
  refresh: () => void;
  act: (action: string, params?: Record<string, unknown>) => Promise<{ ok: boolean; coin?: string }>;
  clear: () => void;
};

const Ctx = createContext<Practice | null>(null);

export function PracticeProvider({ children }: { children: React.ReactNode }) {
  const { address, signMessage } = useWallet();
  const [view, setView] = useState<AccountView | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      const url = address ? `/api/practice/account?address=${address}` : "/api/winners";
      fetch(url, { cache: "no-store" })
        .then((r) => r.json())
        .then((body) => {
          if (cancelled) return;
          if (!address) setView({ configured: body.configured !== false, account: null, earnings: 0, canTopUp: false });
          else setView({ configured: body.configured !== false, account: body.account ?? null, earnings: body.earnings ?? 0, canTopUp: Boolean(body.canTopUp) });
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [address, tick]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const act = useCallback(
    async (action: string, params: Record<string, unknown> = {}) => {
      if (!address) {
        setError("Connect a wallet first.");
        return { ok: false };
      }
      setError(null);
      setNotice(null);
      setBusy("Preparing…");
      try {
        const intent = await fetch("/api/practice/intent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ address, action, params }),
        });
        const prepared = (await intent.json()) as { nonce?: string; message?: string; error?: string };
        if (!intent.ok || !prepared.nonce || !prepared.message) {
          throw new Error(prepared.error === "not_configured" ? "Practice is not configured on this site yet." : prepared.error || "Could not prepare that.");
        }
        setBusy("Sign in your wallet…");
        const signature = await signMessage(prepared.message);
        setBusy("Recording…");
        const res = await fetch("/api/practice/act", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nonce: prepared.nonce, signature }),
        });
        const body = (await res.json()) as { ok?: boolean; summary?: string; coin?: string; error?: string };
        if (!res.ok || !body.ok) throw new Error(body.error || "That did not go through.");
        setNotice(body.summary ?? "Done");
        return { ok: true, coin: body.coin };
      } catch (cause) {
        const code = (cause as { code?: number })?.code;
        setError(code === 4001 ? "The signature was declined in the wallet." : cause instanceof Error ? cause.message : "That did not go through.");
        return { ok: false };
      } finally {
        setBusy(null);
        setTick((n) => n + 1);
      }
    },
    [address, signMessage],
  );

  const clear = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const value: Practice = {
    configured: view?.configured ?? null,
    account: address ? (view?.account ?? null) : null,
    earnings: address ? (view?.earnings ?? 0) : 0,
    canTopUp: address ? Boolean(view?.canTopUp) : false,
    busy,
    error,
    notice,
    refresh,
    act,
    clear,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePractice() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePractice must be used inside PracticeProvider");
  return ctx;
}
