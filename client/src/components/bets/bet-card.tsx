import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { Bet, BetStatus } from "@/types/api/bets/bets";
import { formatCurrency } from "@/lib/utils/currency";
import { capitalizeFirstLetter } from "@/lib/utils/string";
import { decimalToFraction } from "@/lib/utils/math";
import { AccumulatorTimeline } from "../timeline/accumulator-timeline/accumulator-timeline";
import { BetTypeDisplayMap } from "@/types/betting";

interface Props {
  bet: Bet | null;
  getBetsInAccumulator: (accumulatorId: string) => Bet[];
}

export const BetCard: React.FC<Props> = ({ bet, getBetsInAccumulator }) => {
  if (!bet) return null;

  const isAccumulator =
    bet.is_accumulator && bet.components && bet.components.length > 0;
  const singularBets = getBetsInAccumulator(bet.id);

  return (
    <Card className="mb-4">
      <CardHeader className="py-3 pr-3 border-b">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <CardTitle className="text-lg font-medium text-primary">
              {isAccumulator ? (
                <div className="flex items-center gap-2">
                  <div>{formatCurrency(bet.amount)}</div>
                  <div>{`${bet.components?.length || 0} Fold Accumulator`}</div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div>{formatCurrency(bet.amount)}</div>
                  <div>Single</div>
                </div>
              )}
            </CardTitle>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant={
                bet.status === BetStatus.Won
                  ? "default"
                  : bet.status === BetStatus.Lost
                  ? "destructive"
                  : "outline"
              }
              className="ml-2 px-8 py-3 rounded bg-gray-500/40"
            >
              {capitalizeFirstLetter(bet.status) || "Pending"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 px-6">
        <div className="space-y-4">
          {isAccumulator ? (
            <AccumulatorTimeline
              singularBets={singularBets}
              accumulatorBet={bet}
            />
          ) : (
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium">
                  {bet.athlete?.first_name} {bet.athlete?.last_name}
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {BetTypeDisplayMap[bet.bet_type_name]}
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {bet.show?.name}{" "}
                  {bet.division?.category && `(${bet.division.category})`}
                </div>
                {/* {selection?.status === 'LIVE' && ( */}
                <div className="mt-2 flex items-center gap-1 text-sm text-orange-500">
                  <AlertCircle className="w-3 h-3" />
                  Live Now
                </div>
                {/* )} */}
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">
                  {bet.odds_at_time
                    ? decimalToFraction(bet.odds_at_time)
                    : "N/A"}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-6 pt-4 flex border-t justify-between items-center">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Stake</div>
          <div className="font-medium">{formatCurrency(bet.amount || 0)}</div>
        </div>
        <div className="space-y-1 text-right">
          <div className="text-sm text-muted-foreground">To Return</div>
          <div className="font-medium">
            {formatCurrency(bet.potential_payout || 0)}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};
