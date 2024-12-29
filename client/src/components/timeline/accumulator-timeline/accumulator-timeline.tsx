import React from "react";
import { Check, X, CircleDot, Circle } from "lucide-react";

import { Bet, BetStatus } from "@/types/api/bets/bets";
import { BetTypeDisplayMap } from "@/types/betting";
import { decimalToFraction } from "@/lib/utils/math";
import { cn } from "@/lib/utils/cn";
import { formatTimestamp } from "@/lib/utils/date";

interface AccumulatorTimelineProps {
  accumulatorBet: Bet;
  singularBets: Bet[];
  className?: string;
}

const StatusIcon = ({
  status,
  size = "sm",
}: {
  status: BetStatus;
  size?: "sm" | "md";
}) => {
  switch (status) {
    case "won":
      return (
        <div
          className={cn(
            "w-4 h-4 rounded-full bg-green-500 flex items-center justify-center",
            { "w-5 h-5": size === "md" }
          )}
        >
          <Check
            className={cn("w-3 h-3 text-white", { "w-4 h-4": size === "md" })}
          />
        </div>
      );
    case "lost":
      return (
        <div
          className={cn(
            "w-4 h-4 rounded-full bg-red-500 flex items-center justify-center",
            { "w-5 h-5": size === "md" }
          )}
        >
          <X
            className={cn("w-3 h-3 text-white", { "w-4 h-4": size === "md" })}
          />
        </div>
      );
    default:
      return (
        <div
          className={cn(
            "w-4 h-4 rounded-full border border-gray-500 flex items-center justify-center",
            { "w-5 h-5": size === "md" }
          )}
        >
          {/* <Circle className="w-2 h-2 text-white" /> */}
        </div>
      );
  }
};

export const AccumulatorTimeline: React.FC<AccumulatorTimelineProps> = ({
  accumulatorBet,
  singularBets,
  className,
}) => {
  return (
    <div>
      <div className="flex gap-2 w-full">
        <div className="pt-0.5">
          <StatusIcon status={accumulatorBet.status} size="md" />
        </div>
        <div className="w-full">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">{`${
                accumulatorBet.components?.length || 0
              } Fold Accumulator`}</div>
              <div className="text-xs mt-1 text-zinc-400">
                {formatTimestamp(accumulatorBet.created_at, {
                  format: "E, MMM eo HH:mm",
                })}
              </div>
            </div>
            <div className="text-sm">
              {accumulatorBet.odds_at_time
                ? decimalToFraction(accumulatorBet.odds_at_time)
                : "N/A"}
            </div>
          </div>

          <ul role="list" className={cn("relative pt-4", className)}>
            {singularBets.map((bet) => (
              <li
                key={bet.id}
                className="group relative flex flex-col pb-8 pl-5 last:pb-0"
              >
                {/* Vertical line with icon */}
                <div className="absolute left-0 top-0.5 bottom-0 flex flex-col items-center">
                  {/* <div className="w-px flex-1 bg-white/10"></div> */}
                  <div className="flex-shrink-0">
                    <StatusIcon status={bet.status} />
                  </div>
                  <div className="w-px flex-1 bg-white/10"></div>
                </div>
                {/* Content */}
                <div className="pl-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-white">
                      {bet.athlete?.first_name} {bet.athlete?.last_name}
                    </h3>
                    {/* <div className="text-sm">
                      {bet.odds_at_time
                        ? decimalToFraction(bet.odds_at_time)
                        : "N/A"}
                    </div> */}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {BetTypeDisplayMap[bet.bet_type_name]}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {bet.show?.name}{" "}
                    {bet.division?.category && `(${bet.division.category})`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
