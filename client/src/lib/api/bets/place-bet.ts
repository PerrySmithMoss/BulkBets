import { tryFetcher } from "@/lib/utils/tryFetcher";
import { BetSlipState } from "@/types/betting";

export const placeBet = async (
  betSlip: BetSlipState
  //   TODO: Replace return value with actual response type from API
): Promise<true | false> => {
  try {
    const stakeMultiplier = parseFloat(betSlip.stakeMultiplierRawValue);

    const reqBody = {
      stakeMultiplier,
      activeBets: betSlip.activeBets.map((bet) => ({
        showId: bet.show.id,
        divisionId: bet.division.id,
        competitorId: bet.competitor.id,
        betTypeId: bet.betTypeId,
        betType: bet.betType,
        odds: bet.odds,
        // TODO: remove parseFloat after converting bet.amount to number (float)
        amount: parseFloat(bet.amount),
      })),
    };
    const { data: response, error: fetchError } = await tryFetcher(
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/bets`, {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify(reqBody),
      })
    );

    if (fetchError) {
      console.error(`[placeBet] - error placing bet: `, fetchError);
      return false;
    }

    if (!response) {
      console.error(
        `[placeBet] - no response received while attempting to place bet`
      );
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = `[placeBet] - unexpected error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    return false;
  }
};
