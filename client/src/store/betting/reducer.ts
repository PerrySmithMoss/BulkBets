import {
  calculateActiveBetTotals,
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
import { invalidStakeValues } from "./constants";

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
    // Clicking to place a bet or add to the list of bets
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

      const {
        totalFractionalOdds,
        totalStake,
        potentialReturn,
        potentialWinnings,
      } = calculateActiveBetTotals(newBets);

      return {
        ...state,
        activeBets: newBets,
        totalStake,
        totalFractionalOdds,
        potentialReturn,
        potentialWinnings,
      };
    }

    // TODO: finalising the bet and paying??
    case BettingActionType.PlaceBet: {
      const newBets = [...state.activeBets, action.payload];
      const newTotalStake = newBets.reduce(
        (sum, bet) => sum + parseFloat(bet.amount),
        0
      );
      const newPotentialWinnings = newBets.reduce(
        (sum, bet) =>
          sum + calculatePotentialWinnings(parseFloat(bet.amount), bet.odds),
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
      const newTotalStake = newBets.reduce(
        (sum, bet) => sum + parseFloat(bet.amount),
        0
      );
      const newPotentialWinnings = newBets.reduce(
        (sum, bet) =>
          sum + calculatePotentialWinnings(parseFloat(bet.amount), bet.odds),
        0
      );
      const odds = newBets.map((bet) => bet.odds);
      const totalDecimalOdds = odds.reduce((prev, curr) => prev * curr, 1);
      const totalFractionalOdds = roundOddsToFractional(totalDecimalOdds);
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
        potentialWinnings: newPotentialWinnings,
        totalFractionalOdds,
        potentialReturn,
      };
    }

    case BettingActionType.UpdateBetAmount: {
      const parsedAmount = parseFloat(action.payload.amount);

      const newBets = state.activeBets.map((bet) =>
        bet._id === action.payload.betId
          ? { ...bet, amount: action.payload.amount }
          : bet
      );

      const totalStake = newBets.reduce((sum, bet) => {
        const betAmount = parseFloat(bet.amount || "0");
        return sum + (isNaN(betAmount) ? 0 : betAmount);
      }, 0);

      const validOdds = newBets
        .filter(
          (bet) => bet.amount && !invalidStakeValues.includes(bet.amount.trim())
        )
        .map((bet) => bet.odds || 1);

      const totalDecimalOdds = validOdds.reduce(
        (product, odds) => product * odds,
        1
      );
      const totalFractionalOdds = roundOddsToFractional(totalDecimalOdds);

      const potentialReturn =
        validOdds.length > 0
          ? roundCurrency(totalDecimalOdds * parsedAmount)
          : 0;
      const potentialWinnings = roundCurrency(potentialReturn - parsedAmount);

      return {
        ...state,
        activeBets: newBets,
        totalStake,
        potentialWinnings,
        totalFractionalOdds,
        potentialReturn,
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
