"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket, X, ChevronUp, RotateCcw, Play } from "lucide-react";
import { useBet, useBetActions } from "@/store/betting";
import { useUser } from "@/store/user/user-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DemoButton } from "@/components/demo-button";
import { placeBet } from "@/lib/api/bets/place-bet";
import { demoRequest } from "@/lib/api/demo";
import { formatCurrency } from "@/lib/utils/currency";
import {
  betExistsInSameDivision,
  roundOddsToFractional,
} from "@/lib/utils/betting";
import { User } from "@/types/api/user/user";

function SlipContent() {
  const { state } = useBet();
  const { removeBet, clearAllBets, updateBetAmount, updateStakeMultiplier } =
    useBetActions();
  const { user, setUser, refreshUser } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const router = useRouter();
  const count = state.activeBets.length;
  const sameDivision = betExistsInSameDivision(state.activeBets);
  const missingStakes =
    count > 1 &&
    !(Number(state.stakeMultiplierRawValue) > 0) &&
    state.activeBets.some((bet) => !(Number(bet.amount) > 0));
  const tooMuch = !!user && state.totalStake > user.balance;
  const moneyInput = (value: string, change: (value: string) => void) => {
    if (/^\d{0,6}(\.\d{0,2})?$/.test(value)) change(value);
  };
  async function submit() {
    setError("");
    setReceipt("");
    setBusy(true);
    try {
      const result = await placeBet(state);
      if (result.error) {
        setError(result.error);
        return;
      }
      setReceipt(
        `${count === 1 ? "Bet" : "Bets"} placed. ${formatCurrency(state.totalStake)} staked${user?.is_demo ? " in virtual funds" : ""}.`,
      );
      clearAllBets();
      await refreshUser();
      router.refresh();
    } catch {
      setError("Unable to place your bet. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function demoAction(action: "reset" | "settle") {
    setError("");
    setReceipt("");
    setBusy(true);
    try {
      if (action === "reset") {
        setUser(await demoRequest<User["data"]>("reset"));
        clearAllBets();
        setReceipt(
          "Demo reset. Your balance is £1,000 and your bet history is clear.",
        );
      } else {
        const result = await demoRequest<{
          settled_bets: number;
          payout: number;
        }>("settle");
        setReceipt(
          result.settled_bets
            ? `${result.settled_bets} bet${result.settled_bets === 1 ? "" : "s"} settled. ${formatCurrency(result.payout)} returned to your virtual balance.`
            : "No pending bets to settle. Place a bet first.",
        );
        await refreshUser();
      }
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Demo unavailable. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Ticket className="size-4 text-primary" />
          Bet slip{" "}
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {count}
          </span>
        </h2>
        {count > 0 && (
          <button
            onClick={clearAllBets}
            disabled={busy}
            className="min-h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>
      {user?.is_demo && (
        <div className="flex items-center justify-between border-b bg-primary/5 px-4 py-3">
          <span className="text-xs text-muted-foreground">Virtual balance</span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(user.balance)}
          </span>
        </div>
      )}
      {receipt && (
        <div
          role="status"
          className="m-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"
        >
          <p>{receipt}</p>
          <Link
            href="/customer/my-bets?tab=All"
            className="mt-2 inline-block font-semibold text-primary underline underline-offset-2"
          >
            View my bets
          </Link>
        </div>
      )}
      {count === 0 ? (
        <div className="px-6 py-8 text-center">
          <Ticket className="mx-auto mb-4 size-8 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold">Your next pick starts here</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Select an athlete’s odds to add them to your slip.
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <fieldset disabled={busy} className="min-w-0">
            <div className="max-h-[40vh] overflow-y-auto divide-y">
              {state.activeBets.map((bet) => (
                <div key={bet._id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {bet.competitor.first_name} {bet.competitor.last_name}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        To win · {bet.division.name}
                        <br />
                        {bet.show.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${bet.competitor.first_name} ${bet.competitor.last_name} from slip`}
                      onClick={() => removeBet(bet._id)}
                      className="-mr-2 -mt-2 flex size-10 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {roundOddsToFractional(bet.odds)}
                    </span>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Stake £
                      <input
                        aria-label={`Stake for ${bet.competitor.first_name} ${bet.competitor.last_name}`}
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0.00"
                        value={bet.amount}
                        onChange={(e) =>
                          moneyInput(e.target.value, (value) =>
                            updateBetAmount(bet._id, value),
                          )
                        }
                        className="h-11 w-24 rounded-md border bg-background px-3 text-right text-sm tabular-nums text-foreground focus:border-primary focus:outline-none"
                      />
                    </label>
                  </div>
                  {Number(bet.amount) > 0 && (
                    <p className="mt-2 text-right text-[11px] text-muted-foreground">
                      Returns {formatCurrency(Number(bet.amount) * bet.odds)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {count > 1 && (
              <div className="border-t bg-background/40 p-4">
                {sameDivision ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Selections in the same division can be placed as singles. An
                    accumulator needs different divisions.
                  </p>
                ) : (
                  <>
                    <label className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">
                        {count}-fold accumulator £
                      </span>
                      <input
                        aria-label="Accumulator stake"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={state.stakeMultiplierRawValue}
                        onChange={(e) =>
                          moneyInput(e.target.value, updateStakeMultiplier)
                        }
                        className="h-11 w-24 rounded-md border bg-background px-3 text-right text-sm focus:border-primary focus:outline-none"
                      />
                    </label>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      Optional extra bet. Every selection must win.
                    </p>
                  </>
                )}
              </div>
            )}
            <div className="space-y-3 border-t p-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total stake</span>
                <span className="text-foreground">
                  {formatCurrency(state.totalStake)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Potential return</span>
                <span className="text-primary">
                  {formatCurrency(state.potentialReturn)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Returns include your stake.
              </p>
              {missingStakes && (
                <p className="text-xs text-muted-foreground">
                  Enter a stake for each single, or add an accumulator stake.
                </p>
              )}
              {tooMuch && (
                <p role="alert" className="text-xs text-amber-400">
                  Not enough balance. Lower your stake
                  {user?.is_demo ? " or reset your demo below" : ""}.
                </p>
              )}
              {user && (
                <Button
                  type="submit"
                  className="h-11 w-full font-bold"
                  disabled={
                    busy ||
                    !Number.isFinite(state.totalStake) ||
                    state.totalStake <= 0 ||
                    missingStakes ||
                    tooMuch
                  }
                >
                  {busy
                    ? "Please wait…"
                    : user.is_demo
                      ? "Place demo bet"
                      : "Place bet"}
                </Button>
              )}
            </div>
          </fieldset>
        </form>
      )}
      {error && (
        <p
          role="alert"
          className="m-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs"
        >
          {error}
        </p>
      )}
      {!user?.is_demo ? (
        <div className="border-t bg-background/30 p-4">
          <h3 className="text-sm font-semibold">Try it with £1,000</h3>
          <p className="mb-3 mt-2 text-xs leading-relaxed text-muted-foreground">
            Virtual funds. No sign-up. Pick your winners, place a bet and
            simulate the results.
          </p>
          <DemoButton className="h-11 w-full" />
          <Link
            href="/customer/account/create"
            className="mt-3 block text-center text-xs text-muted-foreground underline underline-offset-4"
          >
            Or create an account
          </Link>
        </div>
      ) : (
        <div className="border-t bg-background/30 p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Your demo controls
          </p>
          <Button
            variant="outline"
            className="h-11 w-full gap-2 text-xs"
            disabled={busy}
            onClick={() => demoAction("settle")}
          >
            <Play className="size-3" />
            Simulate results
          </Button>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Settles your pending bets using the lowest-priced athlete in each
            division as the simulated winner.
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Link
              href="/customer/my-bets?tab=All"
              className="inline-flex min-h-11 items-center text-xs text-primary hover:underline"
            >
              My bet history
            </Link>
            <button
              disabled={busy}
              onClick={() => demoAction("reset")}
              className="flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" />
              Reset my demo
            </button>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Reset clears only your bets and restores £1,000.
          </p>
        </div>
      )}
    </div>
  );
}

export function SportsbookSlip() {
  const { state } = useBet();
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside
        aria-label="Bet slip"
        className="hidden self-start overflow-hidden rounded-lg border bg-card lg:sticky lg:top-20 lg:block lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
      >
        <SlipContent />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-center justify-between gap-3 border-t border-primary/30 bg-[#15231c] px-5 pb-[env(safe-area-inset-bottom)] text-sm shadow-lg lg:hidden"
            aria-label={`Open bet slip, ${state.activeBets.length} selections`}
          >
            <span className="flex items-center gap-2 font-semibold">
              <Ticket className="size-4 text-primary" />
              Bet slip{" "}
              <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {state.activeBets.length}
              </span>
            </span>
            <span className="flex items-center gap-3 text-xs">
              {state.totalStake > 0
                ? formatCurrency(state.totalStake)
                : "Add your picks"}
              <ChevronUp className="size-4" />
            </span>
          </button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] overflow-y-auto rounded-t-xl p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <SheetTitle className="sr-only">Your bet slip</SheetTitle>
          <SheetDescription className="sr-only">
            Review selections, enter stakes and manage your demo.
          </SheetDescription>
          <div className="pt-8">
            <SlipContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
