"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useDialog } from "@/store/dialog/dialog-context";
import { useUser } from "@/store/user/user-context";
import { decimalToFraction } from "@/lib/utils/math";
import { BetType } from "@/types/api/bets/bets";
import { Competitor } from "@/types/api/competitors/competitors";
import { Dialog } from "@/types/dialog";
import { useBet, useBetActions } from "@/store/betting";
import { Show } from "@/types/api/show/show";
import { Division } from "@/types/api/division/division";
import { cn } from "@/lib/utils/cn";
import { isMarketOpen } from "@/lib/utils/markets";

export function CompetitorTable({
  show,
  division,
  competitors = [],
  asOf,
}: {
  show: Show;
  division: Division;
  competitors: Competitor[];
  asOf: number;
}) {
  const { openDialog } = useDialog();
  const { user } = useUser();
  const { state } = useBet();
  const { startBet } = useBetActions();
  const [now, setNow] = useState(asOf);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const open = isMarketOpen(show, division, now);
  function handleSelection(competitor: Competitor) {
    // eslint-disable-next-line react-hooks/purity -- Recheck the clock when the user clicks, not during rendering.
    if (!isMarketOpen(show, division, Date.now())) return;
    startBet(show, division, competitor);
    if (!user) openDialog(Dialog.LogInToBet);
  }
  return (
    <div className="w-full">
      {!open && (
        <p className="border-b px-4 py-3 text-sm text-muted-foreground">
          Betting closed. Prices below are historical.
        </p>
      )}
      {competitors.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          The line-up for this division is not available yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-background/30 hover:bg-background/30">
              <TableHead className="pl-5 text-xs sm:pl-6">Athlete</TableHead>
              <TableHead className="hidden text-xs sm:table-cell">
                Nationality
              </TableHead>
              <TableHead className="pr-5 text-right text-xs sm:pr-6">
                {open ? "Winner" : "Last odds"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitors.map((competitor) => {
              const odds = competitor.odds?.find(
                (odd) => odd.bet_type === BetType.Win,
              )?.odds_value;
              const valid =
                typeof odds === "number" && Number.isFinite(odds) && odds > 1;
              const selected = state.activeBets.some(
                (bet) => bet.competitor.id === competitor.id,
              );
              const name = `${competitor.first_name} ${competitor.last_name}`;
              return (
                <TableRow key={competitor.id}>
                  <TableCell className="py-3 pl-5 font-medium sm:pl-6">
                    {name}
                    <span className="mt-1 block text-xs font-normal text-muted-foreground sm:hidden">
                      {competitor.nationality}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {competitor.nationality}
                  </TableCell>
                  <TableCell className="pr-5 text-right sm:pr-6">
                    <button
                      type="button"
                      disabled={!open || !valid}
                      aria-pressed={selected}
                      aria-label={`${selected ? "Remove" : "Select"} ${name} to win ${division.name} at ${valid ? decimalToFraction(odds) : "unavailable odds"}`}
                      onClick={() => handleSelection(competitor)}
                      className={cn(
                        "min-h-11 min-w-20 rounded-md border px-3 py-2 font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-transparent disabled:text-muted-foreground",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted/60 text-primary hover:border-primary hover:bg-muted",
                      )}
                    >
                      {valid ? decimalToFraction(odds) : "—"}
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
