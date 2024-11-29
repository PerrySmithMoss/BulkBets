import { BetType } from "@/types/api/bets/bet-type";
import { ActiveBet, BetTypeDisplayMap } from "@/types/betting";

export const getBetTypeDisplay = (betType: BetType | undefined | null) => {
  if (betType == null) return "";

  return BetTypeDisplayMap[betType];
};

export const calculatePotentialWinnings = (
  amount: number,
  odds: number
): number => {
  return amount * odds;
};

export const findMostRecentBet = (bets: ActiveBet[]): ActiveBet | null => {
  if (bets.length === 0) {
    return null;
  }

  return bets.reduce((mostRecent, currentBet) => {
    return new Date(currentBet._timestamp) > new Date(mostRecent._timestamp)
      ? currentBet
      : mostRecent;
  });
};
