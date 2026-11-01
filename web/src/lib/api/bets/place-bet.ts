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

    const response = await fetch("/api/v1/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(reqBody),
    });
    const result = await response.json();
    if (!response.ok)
      return {
        data: null,
        error: result.error || "Unable to place your bet. Please try again.",
      };
    return { data: result.data ?? null, error: null };
  } catch (error) {
    const errorMessage = `[placeBet] - unexpected error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    return {
      data: null,
      error: "Unable to connect. Your selections are saved. Please try again.",
    };
  }
};
