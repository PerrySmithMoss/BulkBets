import { BetType } from "../bets/bets";

export interface CompetitorOdds {
  bet_type_id: number;
  bet_type: BetType;
  odds_value: number;
}
