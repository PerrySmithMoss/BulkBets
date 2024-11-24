import { calculatePotentialWinnings } from "@/lib/utils/betting";
import {
  BettingAction,
  BettingActionType,
  BettingState,
} from "@/types/betting";
import { saveState } from "./storage";

export const initialState: BettingState = {
  activeBets: [],
  totalStake: 0,
  potentialWinnings: 0,
  rememberBets: false,
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
    case BettingActionType.AddBet: {
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
        (bet) => bet.id !== action.payload
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
        bet.id === action.payload.betId
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

    case BettingActionType.ClearAllBets:
      return initialState;

    case BettingActionType.SyncState:
      return action.payload;

    default:
      return state;
  }
};
