import { BetType } from "@/types/api/bets/bet-type";
import { Competitor } from "@/types/api/competitors/competitors";
import { ActiveBet, BettingActionType } from "@/types/betting";
import { useBet } from "./context";
import { STORAGE_KEY } from "./constants";

export const useBetActions = () => {
  const { dispatch } = useBet();

  const placeBet = (
    showId: number,
    divisionId: number,
    competitor: Competitor,
    betType: BetType,
    amount: number
  ) => {
    const odds = competitor.odds?.find(
      (o) => o.bet_type === betType
    )?.odds_value;
    if (!odds) {
      throw new Error("Invalid bet type or odds not found");
    }

    const newBet: ActiveBet = {
      id: `${Date.now()}-${Math.random()}`,
      showId,
      divisionId,
      competitorId: competitor.id,
      betType,
      odds,
      amount,
      timestamp: new Date().toISOString(),
    };

    dispatch({ type: BettingActionType.AddBet, payload: newBet });
  };

  const removeBet = (betId: string) => {
    dispatch({ type: BettingActionType.RemoveBet, payload: betId });
  };

  const updateBetAmount = (betId: string, amount: number) => {
    dispatch({
      type: BettingActionType.UpdateBetAmount,
      payload: { betId, amount },
    });
  };

  const clearAllBets = () => {
    return () => {
      localStorage.removeItem(STORAGE_KEY);
      dispatch({ type: BettingActionType.ClearAllBets });
    };
  };

  return {
    placeBet,
    removeBet,
    updateBetAmount,
    clearAllBets,
  };
};
