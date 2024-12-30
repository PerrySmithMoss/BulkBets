import {
  betExistsForCompetitor,
  betExistsInSameDivision,
  calculateBetSlipTotals,
} from "@/lib/utils/betting";
import {
  BettingAction,
  BettingActionType,
  BetSlipState,
} from "@/types/betting";
import { saveState } from "./storage";
import { formatInputAsCurrency, roundCurrency } from "@/lib/utils/currency";

export const initialState: BetSlipState = {
  activeBets: [],
  totalStake: 0,
  totalFractionalOdds: "",
  stakeMultiplierRawValue: "",
  stakeMultiplierDisplayValue: "",
  potentialWinnings: 0,
  potentialReturn: 0,
  rememberBets: false,
  alertMsg: "",
};

// wrap reducer to handle persistence
export const createPersistedReducer = (
  reducer: (state: BetSlipState, action: BettingAction) => BetSlipState
) => {
  return (state: BetSlipState, action: BettingAction) => {
    const newState = reducer(state, action);
    saveState(newState);
    return newState;
  };
};

export const bettingReducer = (
  state: BetSlipState,
  action: BettingAction
): BetSlipState => {
  switch (action.type) {
    case BettingActionType.StartBet: {
      const isExistingCompetitorBet = betExistsForCompetitor(
        state.activeBets,
        action.payload.competitor.id
      );

      const newBets = isExistingCompetitorBet
        ? // remove activeBets which contain existing competitors
          state.activeBets.filter(
            (bet) => bet.competitor.id !== action.payload.competitor.id
          )
        : [...state.activeBets, action.payload];

      const newBetSlip: BetSlipState = {
        ...state,
        activeBets: newBets,
      };

      const totals = calculateBetSlipTotals(newBetSlip);

      return {
        ...newBetSlip,
        ...totals,
      };
    }

    // TODO: finalising the bet and paying??
    // case BettingActionType.PlaceBet: {
    //   const newBets = [...state.activeBets, action.payload];
    //   const newTotalStake = newBets.reduce(
    //     (sum, bet) => sum + parseFloat(bet.amount),
    //     0
    //   );
    //   const newPotentialWinnings = newBets.reduce(
    //     (sum, bet) =>
    //       sum + calculatePotentialWinnings(parseFloat(bet.amount), bet.odds),
    //     0
    //   );

    //   return {
    //     ...state,
    //     activeBets: newBets,
    //     totalStake: newTotalStake,
    //     potentialWinnings: newPotentialWinnings,
    //   };
    // }

    case BettingActionType.RemoveBet: {
      const newBets = state.activeBets.filter(
        (bet) => bet._id !== action.payload
      );

      const newBetSlip: BetSlipState = {
        ...state,
        activeBets: newBets,
      };

      const totals = calculateBetSlipTotals(newBetSlip);

      return {
        ...newBetSlip,
        ...totals,
      };
    }

    case BettingActionType.UpdateBetAmount: {
      const parsedAmount = action.payload.amount
        ? parseFloat(action.payload.amount)
        : null;

      const newBets = state.activeBets.map((bet) =>
        bet._id === action.payload.betId
          ? {
              ...bet,
              amount: action.payload.amount,
              _potentialReturn: parsedAmount
                ? roundCurrency(parsedAmount * bet.odds)
                : null,
            }
          : bet
      );

      const updatedBetSlip: BetSlipState = {
        ...state,
        activeBets: newBets,
      };

      const totals = calculateBetSlipTotals(updatedBetSlip);

      return {
        ...updatedBetSlip,
        ...totals,
      };
    }

    case BettingActionType.UpdateStakeMultiplier: {
      const rawValue = action.payload;
      const displayValue = formatInputAsCurrency(rawValue);

      const newBetSlip: BetSlipState = {
        ...state,
        stakeMultiplierRawValue: rawValue,
        stakeMultiplierDisplayValue: displayValue,
      };

      const totals = calculateBetSlipTotals(newBetSlip);

      return {
        ...newBetSlip,
        ...totals,
      };
    }

    case BettingActionType.ClearAllBets:
      return initialState;

    case BettingActionType.SyncState:
      // Compare the payload with the current state to avoid unnecessary updates
      if (JSON.stringify(state) === JSON.stringify(action.payload)) {
        return state; // No change, so return the current state
      }
      return action.payload; // Otherwise, return the new state

    case BettingActionType.Alert:
      return {
        ...state,
        alertMsg: action.payload,
      };

    default:
      return state;
  }
};
