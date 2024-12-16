"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDialog } from "@/store/dialog/dialog-context";
import { useUser } from "@/store/user/user-context";
import { decimalToFraction, decimalToPercentage } from "@/lib/utils/math";
import { BetType } from "@/types/api/bets/bet-type";
import { Competitor } from "@/types/api/competitors/competitors";
import { Dialog } from "@/types/dialog";
import { useBet, useBetActions } from "@/store/betting";
import { Show } from "@/types/api/show/show";
import { Division } from "@/types/api/division/division";
import { useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface Props {
  show: Show;
  division: Division;
  competitors: Competitor[];
}

export const CompetitorTable: React.FC<Props> = ({
  show,
  division,
  competitors,
}) => {
  const { openDialog } = useDialog();
  const { user } = useUser();
  const { state } = useBet();
  const { activeBets } = state;
  const { startBet, removeBet, alert } = useBetActions();

  const memoizedBetSlipAlert = useCallback(alert, [alert]);

  const handleStartBet = (competitor: Competitor) => {
    if (!user) {
      openDialog(Dialog.LogInToBet);
      return;
    }

    const competitorBetExists = !!state.activeBets.find(
      (bet) => bet.competitor.id === competitor.id
    );

    if (competitorBetExists) {
      startBet(show, division, competitor);
      return;
    }

    const divisionBetExists = activeBets.find(
      (bet) => bet.division.id === division.id
    );

    if (divisionBetExists) {
      // user should not be allowed to place multiple bets on competitors in the same division
      memoizedBetSlipAlert("Maximum of 1 to win per division already made.");
      return;
    }

    startBet(show, division, competitor);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted hover:bg-muted">
          <TableHead>Competitor</TableHead>
          <TableHead>Country</TableHead>
          <TableHead className="text-center">X</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {competitors.map((competitor) => {
          const winOdds = competitor.odds?.find(
            (odds) => odds.bet_type === BetType.Win
          )?.odds_value;
          const fractionOdds = winOdds ? decimalToFraction(winOdds) : null;
          const percentageOdds = winOdds
            ? decimalToPercentage(winOdds, true)
            : null;

          // Check if the competitor has active bets
          const isActiveBet = activeBets.some(
            (bet) => bet.competitor.id === competitor.id
          );

          return (
            <TableRow key={competitor.id} className="hover:bg-background">
              <TableCell className="font-medium">
                {competitor.first_name} {competitor.last_name}
              </TableCell>
              <TableCell>
                {competitor.nationality}, {competitor.residency}
              </TableCell>
              <TableCell
                className={cn(
                  "text-cta border-l text-center cursor-pointer hover:bg-muted/50",
                  {
                    "bg-card-foreground text-primary hover:bg-card-foreground":
                      isActiveBet,
                  }
                )}
                onClick={() => handleStartBet(competitor)}
              >
                {fractionOdds && `${fractionOdds} (${percentageOdds})`}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
