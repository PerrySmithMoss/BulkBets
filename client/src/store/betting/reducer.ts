import {
  calculatePotentialWinnings,
  roundOddsToFractional,
} from "@/lib/utils/betting";
import {
  BettingAction,
  BettingActionType,
  BettingState,
} from "@/types/betting";
import { saveState } from "./storage";
import { formatInputAsCurrency, roundCurrency } from "@/lib/utils/currency";

export const initialState: BettingState = {
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
  reducer: (state: BettingState, action: BettingAction) => BettingState
) => {
  return (state: BettingState, action: BettingAction) => {
    const newState = reducer(state, action);
    saveState(newState);
    return newState;
  };
};

export const bettingReducer = (
  state: BettingState,
  action: BettingAction
): BettingState => {
  switch (action.type) {
    case BettingActionType.StartBet: {
      const newBets = [...state.activeBets, action.payload];
      const odds = [
        ...state.activeBets.map((bet) => bet.odds),
        action.payload.odds,
      ];
      const totalDecimalOdds = odds.reduce((prev, curr) => prev * curr, 1);
      console.log("totalDecimalOdds: ", totalDecimalOdds);
      const totalFractionalOdds = roundOddsToFractional(totalDecimalOdds);
      const newTotalStake = newBets.reduce((sum, bet) => sum + bet.amount, 0);
      const newPotentialWinnings = newBets.reduce(
        (sum, bet) => sum + calculatePotentialWinnings(bet.amount, bet.odds),
        0
      );
      const potentialReturn = roundCurrency(
        odds.reduce((prev, curr) => {
          return prev * curr;
        }, state.totalStake)
      );
      const potentialWinnings = roundCurrency(
        potentialReturn - state.totalStake
      );

      return {
        ...state,
        activeBets: newBets,
        totalStake: newTotalStake,
        totalFractionalOdds,
        // potentialWinnings: newPotentialWinnings,
        potentialReturn,
        potentialWinnings,
      };
    }

    case BettingActionType.PlaceBet: {
      const newBets = [...state.activeBets, action.payload];
      const newTotalStake = newBets.reduce((sum, bet) => sum + bet.amount, 0);
      const newPotentialWinnings = newBets.reduce(
        (sum, bet) => sum + calculatePotentialWinnings(bet.amount, bet.odds),
        0
      );

      return {
        ...state,
        activeBets: newBets,
        totalStake: newTotalStake,
        potentialWinnings: newPotentialWinnings,
      };
    }

    case BettingActionType.RemoveBet: {
      const newBets = state.activeBets.filter(
        (bet) => bet._id !== action.payload
      );
      const newTotalStake = newBets.reduce((sum, bet) => sum + bet.amount, 0);
      const newPotentialWinnings = newBets.reduce(
        (sum, bet) => sum + calculatePotentialWinnings(bet.amount, bet.odds),
        0
      );

      return {
        ...state,
        activeBets: newBets,
        totalStake: newTotalStake,
        potentialWinnings: newPotentialWinnings,
      };
    }

    case BettingActionType.UpdateBetAmount: {
      const newBets = state.activeBets.map((bet) =>
        bet._id === action.payload.betId
          ? { ...bet, amount: action.payload.amount }
          : bet
      );
      const newTotalStake = newBets.reduce((sum, bet) => sum + bet.amount, 0);
      const newPotentialWinnings = newBets.reduce(
        (sum, bet) => sum + calculatePotentialWinnings(bet.amount, bet.odds),
        0
      );

      return {
        ...state,
        activeBets: newBets,
        totalStake: newTotalStake,
        potentialWinnings: newPotentialWinnings,
      };
    }

    case BettingActionType.UpdateBetAmount: {
      const newBets = state.activeBets.map((bet) =>
        bet._id === action.payload.betId
          ? { ...bet, amount: action.payload.amount }
          : bet
      );
      const newTotalStake = newBets.reduce((sum, bet) => sum + bet.amount, 0);
      const newPotentialWinnings = newBets.reduce(
        (sum, bet) => sum + calculatePotentialWinnings(bet.amount, bet.odds),
        0
      );

      return {
        ...state,
        activeBets: newBets,
        totalStake: newTotalStake,
        potentialWinnings: newPotentialWinnings,
      };
    }

    case BettingActionType.UpdateStakeMultiplier: {
      const rawValue = action.payload;
      const parsedRawValue = parseFloat(rawValue);
      const displayValue = formatInputAsCurrency(rawValue);
      const odds = state.activeBets.map((bet) => bet.odds);
      const totalDecimalOdds = odds.reduce((prev, curr) => prev * curr, 1);
      const totalFractionalOdds = roundOddsToFractional(totalDecimalOdds);

      const potentialReturn = roundCurrency(
        odds.reduce((prev, curr) => {
          return prev * curr;
        }, parsedRawValue)
      );
      const potentialWinnings = roundCurrency(potentialReturn - parsedRawValue);

      return {
        ...state,
        stakeMultiplierRawValue: rawValue,
        stakeMultiplierDisplayValue: displayValue,
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
