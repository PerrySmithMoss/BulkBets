"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDialog } from "@/contexts/dialog-context";
import { Competitor } from "@/types/competitor";
import { Dialog } from "@/types/dialog";

const isUserLoggedIn = false;

interface Props {
  competitors: Competitor[];
}

export const CompetitorTable: React.FC<Props> = ({ competitors }) => {
  const { openDialog } = useDialog();

  const handlePlaceBet = (competitor: Competitor) => {
    // need to pop up with log in dialog if user is not logged in,
    // otherwise show the betting screen
    if (!isUserLoggedIn) {
      console.log("user is not logged in ");
      openDialog(Dialog.LogInToBet);
      return;
    }
    console.log("user is logged in");
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
            <TableCell className="font-medium">{competitor.name}</TableCell>
            <TableCell>{competitor.country}</TableCell>
            <TableCell
              className="text-cta border-l text-center cursor-pointer hover:bg-muted/50"
              onClick={() => handlePlaceBet(competitor)}
            >
              {competitor.odds.fractional} {`(${competitor.odds.percentage}%)`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
