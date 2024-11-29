import { calculatePotentialWinnings } from "@/lib/utils/betting";
import {
  BettingAction,
  BettingActionType,
  BettingState,
} from "@/types/betting";
import { saveState } from "./storage";
import { formatAsCurrency } from "@/lib/utils/currency";

export const initialState: BettingState = {
  activeBets: [],
  totalStake: 0,
  stakeMultiplierRawValue: "",
  stakeMultiplierDisplayValue: "",
  potentialWinnings: 0,
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
      const displayValue = formatAsCurrency(rawValue);
      const currentPotentialWinnings = state.potentialWinnings;

      const activeBetsStake = state.activeBets.reduce(
        (sum, bet) => sum + bet.amount,
        0
      );
      const totalStake = parseFloat(activeBetsStake + rawValue);
      // const newPotentialWinnings = totalStake.reduce(
      //   (sum, bet) => sum + calculatePotentialWinnings(bet.amount, bet.odds),
      //   0
      // );

      return {
        ...state,
        stakeMultiplierRawValue: rawValue,
        // TODO: figure out why decimal place isn't being being shown if user inputs decimal
        stakeMultiplierDisplayValue: displayValue,
        totalStake: totalStake,
        // potentialWinnings: newPotentialWinnings,
      };
    }

    case BettingActionType.ClearAllBets:
      return {
        ...state,
        activeBets: [],
        totalStake: 0,
        potentialWinnings: 0,
        alertMsg: "",
      };

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
