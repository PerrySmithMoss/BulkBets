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
import { useRouter } from "next/navigation";

interface Props {
  showId: number;
  divisionId: number;
  competitors: Competitor[];
}

export const CompetitorTable: React.FC<Props> = ({
  showId,
  divisionId,
  competitors,
}) => {
  const { openDialog } = useDialog();
  const user = useUser();

  const handlePlaceBet = (competitor: Competitor) => {
    if (!user) {
      openDialog(Dialog.LogInToBet);
      return;
    }

    openDialog(Dialog.PlaceBet);
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
        {competitors.map((competitor, index) => (
          <TableRow key={index} className="hover:bg-background">
            <TableCell className="font-medium">
              {competitor.first_name} {competitor.last_name}
            </TableCell>
            <TableCell>
              {competitor.nationality}, {competitor.residency}{" "}
            </TableCell>
            <TableCell
              className="text-cta border-l text-center cursor-pointer hover:bg-muted/50"
              onClick={() => handlePlaceBet(competitor)}
            >
              {`${decimalToFraction(
                competitor.odds?.find((odds) => odds.bet_type === BetType.Win)
                  ?.odds_value
              )}`}{" "}
              {competitor.odds?.find((odds) => odds.bet_type === BetType.Win)
                ?.odds_value
                ? `(${decimalToPercentage(
                    competitor.odds?.find(
                      (odds) => odds.bet_type === BetType.Win
                    )?.odds_value,
                    true
                  )})`
                : ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
