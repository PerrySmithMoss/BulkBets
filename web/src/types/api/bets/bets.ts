import { Athlete } from "../athlete";
import { Division } from "../division/division";
import { Show } from "../show/show";

export interface Bet {
  id: string;
  // division_participant_id won't exist if it's an
  // accumulator bet as you can't tie an accumulator
  // bet to one division participant
  division_participant_id?: string;
  bet_type: number;
  bet_type_name: BetType;
  amount: number;
  currency: string;
  odds_at_time: number;
  potential_payout: number;
  status: BetStatus;
  cancelled_at: string | null;
  created_at: string;
  settled_at: string | null;
  is_accumulator: boolean;
  // if 'components' field exists that means it's
  // an accumulator bet and it will contain an array
  // of bet ids belonging to the accumulator
  components?: string[];

  athlete?: Athlete;
  show?: Show;
  division?: Division;
}

export enum BetType {
  Win = "win",
  // Place = "place",
  // Show = "show",
}

export enum BetStatus {
  Pending = "pending",
  Live = "live",
  Won = "won",
  Lost = "lost",
  Void = "void",
  Cancelled = "cancelled",
}
