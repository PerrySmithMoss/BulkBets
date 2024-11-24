import { BetType } from "./api/bets/bet-type";

export interface ActiveBet {
  id: string;
  showId: number;
  divisionId: number;
  competitorId: string;
  betType: BetType;
  odds: number;
  amount: number;
  timestamp: string;
}

export interface BettingState {
  activeBets: ActiveBet[];
  totalStake: number;
  potentialWinnings: number;
  rememberBets: boolean;
}

export enum BettingActionType {
  AddBet = "ADD_BET",
  RemoveBet = "REMOVE_BET",
  UpdateBetAmount = "UPDATE_BET_AMOUNT",
  ClearAllBets = "CLEAR_ALL_BETS",
  SyncState = "SYNC_STATE",
}

export type BettingAction =
  | { type: BettingActionType.AddBet; payload: ActiveBet }
  | { type: BettingActionType.RemoveBet; payload: string }
  | {
      type: BettingActionType.UpdateBetAmount;
      payload: { betId: string; amount: number };
    }
  | { type: BettingActionType.ClearAllBets }
  | { type: BettingActionType.SyncState; payload: BettingState };
