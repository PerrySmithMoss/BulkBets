import { BetType } from "@/types/api/bets/bets";
import { ActiveBet, BetSlipState, BetTypeDisplayMap } from "@/types/betting";
import { roundCurrency } from "./currency";
import { isNumeric } from "./math";

export const getBetTypeDisplay = (betType: BetType | undefined | null) => {
  if (betType == null) return "";

  return BetTypeDisplayMap[betType];
};

export const getBetSelectionsDisplay = (numOfSelections: number): string => {
  const specialCases: Record<number, string> = {
    2: "Double",
    3: "Treble",
  };

  return specialCases[numOfSelections] ?? `${numOfSelections} Fold`;
};

export const isValidBetSlip = (betSlip: BetSlipState): boolean => {
  const { stakeMultiplierRawValue, activeBets } = betSlip;

  const hasValidBetAmount = activeBets.some((bet) => isNumeric(bet.amount));
  const isValidStakeMultiplier = isNumeric(stakeMultiplierRawValue);
  const isValidAccumulator =
    isValidStakeMultiplier &&
    !betExistsInSameDivision(activeBets) &&
    hasValidBetAmount;

  return isValidAccumulator || hasValidBetAmount;
};

export const betExistsForDivision = (
  activeBets: ActiveBet[],
  divisionId: number
): boolean => {
  let occurrences = 0;

  for (const { division } of activeBets) {
    if (division.id === divisionId && ++occurrences > 1) {
      return true;
    }
  }

  return false;
};

export const betExistsForCompetitor = (
  activeBets: ActiveBet[],
  competitorId: string
): boolean => !!activeBets.find((bet) => bet.competitor.id === competitorId);

export const betExistsInSameDivision = (activeBets: ActiveBet[]): boolean => {
  const divisionIds = new Set<number>();

  for (const bet of activeBets) {
    const { id } = bet.division;
    if (divisionIds.has(id)) return true;
    divisionIds.add(id);
  }

  return false;
};

export const getUniqueCategoriesFromBets = (bets: ActiveBet[]): string[] => {
  return Array.from(
    new Set(
      bets
        .map((bet) => bet.division.category)
        .filter((category): category is string => category !== null) // Ensure only strings are kept
    )
  );
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

/**
 * Convert fractional odds to decimal odds.
 * @param numerator - The numerator of the fractional odds.
 * @param denominator - The denominator of the fractional odds.
 * @returns The decimal odds.
 */
export const fractionalToDecimal = (
  numerator: number,
  denominator: number
): number => {
  return numerator / denominator + 1;
};

/**
 * Convert decimal odds to fractional odds in simplified form.
 * @param decimalOdds - The decimal odds to convert.
 * @returns An object containing the simplified numerator and denominator.
 */
export const decimalToFraction = (
  decimalOdds: number
): { numerator: number; denominator: number } => {
  const profitPortion = decimalOdds - 1; // Subtract 1 to get the profit portion
  const precision = 10000; // To handle decimal precision
  const numerator = Math.round(profitPortion * precision);
  const denominator = precision;

  // Simplify the fraction using the GCD
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(numerator, denominator);

  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
};

export const roundOddsToFractional = (
  decimalOdds: number,
  xTo1 = false
): string => {
  // Ensure decimal odds are greater than 1 (odds below 1 don't make sense for betting)
  if (decimalOdds < 1) {
    throw new Error(
      "Decimal odds must be greater than 1 to convert to fractional."
    );
  }

  // Subtract 1 to isolate the winnings part (fractional odds exclude the stake)
  const fractionalValue = decimalOdds - 1;

  // Multiply by 100 to work with 2 decimal places
  const roundedFractionalValue = Math.round(fractionalValue * 10000) / 10000;

  // Convert to fractional representation with a denominator of 1
  const numerator = Math.round(roundedFractionalValue * 1000); // Multiply to preserve precision
  const denominator = 1000; // Denominator is always 100 for 2 decimal places

  // Simplify the fraction (optional, if you want to reduce it)
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(numerator, denominator);

  const simplifiedNumerator = numerator / divisor;
  const simplifiedDenominator = denominator / divisor;

  if (xTo1) {
    // Round the result to 2 decimal places and return as X/1 format
    const odds = (simplifiedNumerator / simplifiedDenominator).toFixed(2);
    return `${odds}/1`;
  }

  // Return the fractional odds as a string
  return `${simplifiedNumerator}/${simplifiedDenominator}`;
};

export const calculateSingularBetReturn = (bets: ActiveBet[]): number => {
  const validateBet = (bet: ActiveBet) => {
    const amount = parseFloat(bet.amount || "0");
    const odds = bet.odds;
    return amount >= 0 && odds > 0;
  };

  return bets.reduce((totalReturn, bet) => {
    if (!validateBet(bet)) {
      return totalReturn;
    }
    const betReturn = parseFloat(bet.amount || "0") * bet.odds;
    return totalReturn + betReturn;
  }, 0);
};

export const calculateAccumulatorBetReturn = (
  betSlip: BetSlipState
): number => {
  const { activeBets, stakeMultiplierRawValue } = betSlip;

  // Validate and parse stake
  const stake = stakeMultiplierRawValue
    ? parseFloat(stakeMultiplierRawValue)
    : 0;
  if (isNaN(stake) || stake < 0) {
    throw new Error(`Invalid stake multiplier: ${stakeMultiplierRawValue}`);
  }

  // Calculate total odds
  const totalOdds = activeBets.reduce((product, bet) => {
    if (bet.odds <= 0) {
      console.warn(
        `Skipping invalid odds (${bet.odds}) for bet ID: ${bet._id}`
      );
      return product;
    }
    return product * bet.odds;
  }, 1);

  return stake * totalOdds;
};

export const calculateBetSlipTotals = (betSlip: BetSlipState) => {
  const { activeBets, stakeMultiplierRawValue } = betSlip;

  const stakeMultiplier = stakeMultiplierRawValue
    ? parseFloat(stakeMultiplierRawValue)
    : 0;
  if (isNaN(stakeMultiplier) || stakeMultiplier < 0) {
    throw new Error(`Invalid stake multiplier: ${stakeMultiplierRawValue}`);
  }

  const isMultipleBets = activeBets.length > 1;

  const totalDecimalOdds = activeBets.reduce((product, bet) => {
    if (bet.odds <= 0) {
      console.warn(
        `Skipping invalid odds (${bet.odds}) for bet ID: ${bet._id}`
      );
      return product;
    }
    return product * bet.odds;
  }, 1);

  const totalFractionalOdds = roundOddsToFractional(
    totalDecimalOdds,
    isMultipleBets
  );

  const totalStake = activeBets.reduce((sum, bet) => {
    const amount = parseFloat(bet.amount || "0");
    return sum + (isNaN(amount) ? 0 : amount);
  }, stakeMultiplier);

  const totalSingularBetReturn = calculateSingularBetReturn(activeBets);
  const totalAccumulatorBetReturn = calculateAccumulatorBetReturn(betSlip);
  const potentialReturn = roundCurrency(
    totalSingularBetReturn + totalAccumulatorBetReturn
  );
  const potentialWinnings = roundCurrency(potentialReturn - totalStake);

  return {
    totalFractionalOdds,
    totalStake,
    potentialReturn,
    potentialWinnings,
  };
};
