import { useMemo } from "react";
import { BetType } from "@/types/api/bets/bets";
import { Competitor } from "@/types/api/competitors/competitors";
import { ActiveBet, BettingActionType } from "@/types/betting";
import { useBet } from "./context";
import { STORAGE_KEY } from "./constants";
import { Show } from "@/types/api/show/show";
import { Division } from "@/types/api/division/division";

export const useBetActions = () => {
  const { dispatch } = useBet();

  return useMemo(() => {
    const startBet = (
      show: Show,
      division: Division,
      competitor: Competitor,
    ) => {
      // we only offer bet type of 'Win' atm
      const winningOdds = competitor.odds?.find(
        (odds) => odds.bet_type === BetType.Win,
      );

      if (!winningOdds) {
        throw new Error("Invalid bet type or odds not found");
      }

      const newBet: ActiveBet = {
        _id: crypto.randomUUID(),
        show: show,
        division: division,
        competitor: competitor,
        betTypeId: winningOdds.bet_type_id,
        odds: winningOdds.odds_value,
        // hard coded as we only offer bet type of 'Win' atm
        betType: BetType.Win,
        // initialise as empty string as no stake has been set
        amount: "",
        _potentialReturn: null,
        _timestamp: new Date().toISOString(),
      };

      dispatch({ type: BettingActionType.StartBet, payload: newBet });
    };

    const removeBet = (betId: string) => {
      dispatch({ type: BettingActionType.RemoveBet, payload: betId });
    };

    const updateBetAmount = (betId: string, amount: string) => {
      dispatch({
        type: BettingActionType.UpdateBetAmount,
        payload: { betId, amount },
      });
    };

    const updateStakeMultiplier = (rawStakeMultiplierValue: string) => {
      dispatch({
        type: BettingActionType.UpdateStakeMultiplier,
        payload: rawStakeMultiplierValue,
      });
    };

    const clearAllBets = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* Storage may be unavailable. */
      }
      dispatch({ type: BettingActionType.ClearAllBets });
    };

    const alert = (alertMsg: string) => {
      dispatch({ type: BettingActionType.Alert, payload: alertMsg });
    };

    return {
      startBet,
      removeBet,
      updateBetAmount,
      updateStakeMultiplier,
      clearAllBets,
      alert,
    };
  }, [dispatch]);
};
