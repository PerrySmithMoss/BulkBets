import { Bet, BetStatus } from "./bets";

export interface BetResponse {
  bets: Bet[];
  pagination: {
    limit: number;
    offset: number;
  };
}
