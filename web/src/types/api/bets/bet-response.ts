import { Bet, BetStatus } from "./bets";

export interface BetResponse {
  data: {
    bets: Bet[];
    pagination: {
      limit: number;
      offset: number;
    };
  };
}
