import React from "react";
import { Check, X, CircleDot, Circle } from "lucide-react";

import { Bet, BetStatus } from "@/types/api/bets/bets";
import { BetTypeDisplayMap } from "@/types/betting";
import { decimalToFraction } from "@/lib/utils/math";

interface AccumulatorTimelineProps {
  accumulatorBet: Bet;
  singularBets: Bet[];
  className?: string;
}

const StatusIcon = ({ status }: { status: BetStatus }) => {
  switch (status) {
    case "won":
      return (
        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      );
    case "lost":
      return (
        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
          <X className="w-3 h-3 text-white" />
        </div>
      );
    default:
      return (
        <div className="w-4 h-4 rounded-full border border-gray-500 flex items-center justify-center">
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
    <ul role="list" className={`relative ${className}`}>
      {singularBets.map((bet) => (
        <li
          key={bet.id}
          className="group relative flex flex-col pb-8 pl-7 last:pb-0"
        >
          {/* Vertical line with icon */}
          <div className="absolute left-2 top-0.5 bottom-0 flex flex-col items-center">
            {/* <div className="w-px flex-1 bg-white/10"></div> */}
            <div className="flex-shrink-0">
              <StatusIcon status={bet.status} />
            </div>
            <div className="w-px flex-1 bg-white/10"></div>
          </div>
          {/* Content */}
          <div className="pl-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">
                {bet.athlete?.first_name} {bet.athlete?.last_name}
              </h3>
              <div className="text-sm">
                {bet.odds_at_time ? decimalToFraction(bet.odds_at_time) : "N/A"}
              </div>
            </div>
            <p className="mt-0.5 text-sm text-zinc-400">
              {BetTypeDisplayMap[bet.bet_type_name]}
            </p>
            <p className="mt-0.5 text-sm text-zinc-400">{bet.show?.name}</p>
          </div>
        </li>
      ))}
    </ul>
  );
};
