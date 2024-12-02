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

export const roundOddsToFractional = (decimalOdds: number): string => {
  // Ensure decimal odds are greater than 1 (odds below 1 don't make sense for betting)
  if (decimalOdds <= 1) {
    throw new Error(
      "Decimal odds must be greater than 1 to convert to fractional."
    );
  }

  // Subtract 1 to isolate the winnings part (fractional odds exclude the stake)
  const fractionalValue = decimalOdds - 1;

  // Multiply by 100 to work with 2 decimal places
  const roundedFractionalValue = Math.round(fractionalValue * 100) / 100;

  // Convert to fractional representation with a denominator of 1
  const numerator = Math.round(roundedFractionalValue * 100); // Multiply to preserve precision
  const denominator = 100; // Denominator is always 100 for 2 decimal places

  // Simplify the fraction (optional, if you want to reduce it)
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(numerator, denominator);

  const simplifiedNumerator = numerator / divisor;
  const simplifiedDenominator = denominator / divisor;

  // Return the fractional odds as a string
  return `${simplifiedNumerator}/${simplifiedDenominator}`;
};
