"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@/store/user/user-context";
import { Button } from "@/components/ui/button";
import {
  portfolioRequest,
  transactionLabel,
  WalletReceipt,
} from "@/lib/api/portfolio";
import { formatCurrency } from "@/lib/utils/currency";

export function WalletPanel() {
  const { user, refreshUser } = useUser();
  const [amount, setAmount] = useState("100");
  const [kind, setKind] = useState("DEMO_DEPOSIT");
  const [transactions, setTransactions] = useState<WalletReceipt[]>([]);
  const userID = user?.id;
  const [transactionOwner, setTransactionOwner] = useState<string>();
  const [receipt, setReceipt] = useState<WalletReceipt & { owner: string }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const load = useCallback(async () => {
    const items = await portfolioRequest<WalletReceipt[]>("wallet");
    setTransactions(items);
    setTransactionOwner(userID);
  }, [userID]);
  useEffect(() => {
    let active = true;
    if (userID)
      void portfolioRequest<WalletReceipt[]>("wallet")
        .then((items) => {
          if (active) {
            setTransactions(items);
            setTransactionOwner(userID);
          }
        })
        .catch(() => {
          if (active)
            setError("Your transactions could not be loaded. Try refreshing.");
        });
    return () => {
      active = false;
    };
  }, [userID]);
  useEffect(() => {
    if (!userID || busy) return;
    const timer = setInterval(() => {
      void Promise.all([refreshUser(), load()])
        .then(() =>
          setError((current) =>
            current.startsWith("Live updates") ? "" : current,
          ),
        )
        .catch(() =>
          setError("Live updates are unavailable. Refresh the page to retry."),
        );
    }, 3000);
    return () => clearInterval(timer);
  }, [userID, busy, load, refreshUser]);
  async function transfer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setReceipt(undefined);
    setBusy(true);
    const payload = JSON.stringify({ amount: Number(amount), kind });
    if (attempt.current?.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    try {
      const result = await portfolioRequest<WalletReceipt>("wallet/transfer", {
        amount: Number(amount),
        kind,
        request_key: attempt.current.key,
      });
      setReceipt({ ...result, owner: userID! });
      attempt.current = null;
      await Promise.all([refreshUser(), load()]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Your transfer could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-8 pb-24">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Demo wallet</h1>
        <Link href="/" className="text-sm text-primary">
          ← Back to markets
        </Link>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Explore the complete money journey with virtual pounds. No money is
        charged, sent to a bank, or redeemable.
      </p>
      <div className="my-6 rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Available virtual balance
        </p>
        <p
          className="mt-2 text-4xl font-bold tabular-nums"
          aria-label="Wallet balance"
        >
          {formatCurrency(user?.balance ?? 0)}
        </p>
      </div>
      {!user?.is_demo ? (
        <p className="rounded-lg border p-5">
          Start a visitor demo from the markets page to use the virtual wallet.
        </p>
      ) : (
        <form onSubmit={transfer} className="rounded-xl border bg-card p-5">
          <fieldset
            disabled={busy}
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <label className="text-sm">
              Action
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="mt-2 min-h-11 w-full rounded-md border bg-background px-3"
              >
                <option value="DEMO_DEPOSIT">Deposit demo funds</option>
                <option value="DEMO_WITHDRAWAL">Withdraw demo funds</option>
              </select>
            </label>
            <label className="text-sm">
              Amount (£)
              <input
                aria-label="Transfer amount"
                type="number"
                min="0.01"
                max="10000"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-2 min-h-11 w-full rounded-md border bg-background px-3"
              />
            </label>
            <Button className="min-h-11" type="submit">
              {busy
                ? "Processing…"
                : kind === "DEMO_DEPOSIT"
                  ? "Deposit demo funds"
                  : "Withdraw demo funds"}
            </Button>
          </fieldset>
          <p className="mt-3 text-xs text-muted-foreground">
            £0.01–£10,000 per transfer. Demo deposits cannot take your balance
            above £1,000,000.
          </p>
        </form>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-destructive p-4 text-sm"
        >
          {error}
        </p>
      )}
      {receipt && receipt.owner === userID && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm"
        >
          <p className="font-semibold">
            {transactionLabel(receipt.kind)} complete ·{" "}
            {formatCurrency(Math.abs(receipt.amount))}
          </p>
          <p className="mt-2 break-all text-xs text-muted-foreground">
            Receipt {receipt.id}
          </p>
          <p className="mt-2">
            Virtual balance: {formatCurrency(receipt.balance_after)}. No real
            money moved.
          </p>
        </div>
      )}
      <h2 className="mb-3 mt-8 text-lg font-semibold">Transaction history</h2>
      {!(transactionOwner === userID ? transactions : []).length ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          Your deposits, stakes, winnings and withdrawals will appear here.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {(transactionOwner === userID ? transactions : []).map((t) => (
            <li key={t.id} className="flex flex-wrap justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">
                  {transactionLabel(t.kind)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("en-GB")}
                </p>
                <p className="mt-1 max-w-64 break-all text-[10px] text-muted-foreground">
                  {t.id}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <p className={t.amount > 0 ? "text-primary" : ""}>
                  {t.amount > 0 ? "+" : ""}
                  {formatCurrency(t.amount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Balance {formatCurrency(t.balance_after)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
