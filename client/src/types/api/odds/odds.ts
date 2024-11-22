import { BetType } from "../bets/bet-type";

export interface CompetitorOdds {
  bet_type: BetType;
  odds_value: number;
}
