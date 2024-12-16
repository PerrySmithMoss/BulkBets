import { BetType } from "./api/bets/bet-type";
import { Competitor } from "./api/competitors/competitors";
import { Division } from "./api/division/division";
import { Show } from "./api/show/show";

export interface ActiveBet {
  _id: string;
  show: Show;
  division: Division;
  competitor: Competitor;
  betType: BetType;
  betTypeId: number;
  odds: number;
  // TODO: Change this to number to avoid having
  // the parse later down the line?
  amount: string;
  _timestamp: string;
}

export interface BetSlipState {
  activeBets: ActiveBet[];
  stakeMultiplierRawValue: string;
  stakeMultiplierDisplayValue: string;
  totalStake: number;
  totalFractionalOdds: string;
  potentialWinnings: number;
  potentialReturn: number;
  rememberBets: boolean;
  alertMsg: string;
}

export enum BettingActionType {
  StartBet = "START_BET",
  PlaceBet = "PLACE_BET",
  RemoveBet = "REMOVE_BET",
  UpdateBetAmount = "UPDATE_BET_AMOUNT",
  UpdateStakeMultiplier = "UPDATE_STAKE_MULTIPLIER",
  ClearAllBets = "CLEAR_ALL_BETS",
  SyncState = "SYNC_STATE",
  Alert = "ALERT",
}

export type BettingAction =
  | { type: BettingActionType.StartBet; payload: ActiveBet }
  | { type: BettingActionType.PlaceBet; payload: ActiveBet }
  | { type: BettingActionType.RemoveBet; payload: string }
  | {
      type: BettingActionType.UpdateBetAmount;
      payload: { betId: string; amount: string };
    }
  | {
      type: BettingActionType.UpdateStakeMultiplier;
      payload: string;
    }
  | { type: BettingActionType.ClearAllBets }
  | { type: BettingActionType.SyncState; payload: BetSlipState }
  | { type: BettingActionType.Alert; payload: string };

export const BetTypeDisplayMap: Record<BetType, string> = {
  [BetType.Win]: "To Win",
  // [BetType.Place]: "To Place",
  // [BetType.Show]: "To Show",
};
