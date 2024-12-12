import { calculateBetSlipTotals } from "@/lib/utils/betting";
import {
  BettingAction,
  BettingActionType,
  BetSlipState,
} from "@/types/betting";
import { saveState } from "./storage";
import { formatInputAsCurrency } from "@/lib/utils/currency";

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
      const isExistingCompetitorBet = state.activeBets.some(
        (bet) => bet.competitor.id === action.payload.competitor.id
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

      const {
        totalStake,
        totalFractionalOdds,
        potentialReturn,
        potentialWinnings,
      } = calculateBetSlipTotals(newBetSlip);

      return {
        ...newBetSlip,
        totalStake,
        totalFractionalOdds,
        potentialReturn,
        potentialWinnings,
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

      const {
        totalStake,
        totalFractionalOdds,
        potentialReturn,
        potentialWinnings,
      } = calculateBetSlipTotals(newBetSlip);

      return {
        ...newBetSlip,
        totalStake,
        totalFractionalOdds,
        potentialReturn,
        potentialWinnings,
      };
    }

    case BettingActionType.UpdateBetAmount: {
      const newBets = state.activeBets.map((bet) =>
        bet._id === action.payload.betId
          ? { ...bet, amount: action.payload.amount }
          : bet
      );

      const newBetSlip: BetSlipState = {
        ...state,
        activeBets: newBets,
      };

      const {
        totalFractionalOdds,
        totalStake,
        potentialReturn,
        potentialWinnings,
      } = calculateBetSlipTotals(newBetSlip);

      return {
        ...newBetSlip,
        totalStake,
        potentialWinnings,
        totalFractionalOdds,
        potentialReturn,
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

      const { totalFractionalOdds, potentialReturn, potentialWinnings } =
        calculateBetSlipTotals(newBetSlip);

      return {
        ...newBetSlip,
        totalFractionalOdds,
        potentialReturn,
        potentialWinnings,
      };
    }

    case BettingActionType.ClearAllBets:
      return initialState;

    case BettingActionType.SyncState:
      return action.payload;

    case BettingActionType.Alert:
      return {
        ...state,
        alertMsg: action.payload,
      };

    default:
      return state;
  }
};
