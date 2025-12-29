import { tryFetcher } from "@/lib/utils/tryFetcher";
import { BetSlipState } from "@/types/betting";

export const placeBet = async (betSlip: BetSlipState) => {
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

    const { data, error } = await tryFetcher<{ data: null }>(
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/bets`, {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify(reqBody),
      })
    );

    if (error) {
      console.error(`[placeBet] - error placing bet: `, String(error));
      return { data: null, error: String(error) };
    }

    return { data: data?.data ?? null, error };
  } catch (error) {
    const errorMessage = `[placeBet] - unexpected error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    return { data: null, error: errorMessage };
  }
};
