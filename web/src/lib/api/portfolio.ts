export async function portfolioRequest<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    method: body === undefined ? "GET" : method,
    credentials: "include",
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(result?.error ?? "Unable to connect. Please try again.");
  return result.data as T;
}

export interface WalletReceipt {
  id: string;
  amount: number;
  currency: string;
  balance_after: number;
  kind: string;
  created_at: string;
}

export function transactionLabel(kind: string) {
  return (
    (
      {
        DEMO_DEPOSIT: "Demo deposit",
        DEMO_WITHDRAWAL: "Demo withdrawal",
        BET_PLACEMENT: "Bet stake",
        BET_PAYOUT: "Winnings",
        BET_REFUND: "Stake refund",
        DEMO_PAYOUT: "Demo winnings",
        DEMO_REFUND: "Demo refund",
      } as Record<string, string>
    )[kind] ?? kind.replaceAll("_", " ").toLowerCase()
  );
}
