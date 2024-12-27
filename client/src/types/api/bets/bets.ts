export interface Bet {
  id: string;
  division_id?: string | null;
  bet_type: number;
  bet_type_name: BetType;
  amount: number;
  currency: string;
  odds_at_time: number;
  potential_payout: number;
  status: BetStatus;
  cancelled_at?: string | null;
  created_at: string;
  settled_at?: string | null;
  is_accumulator: boolean;
  components?: string[];
}

export enum BetType {
  Win = "win",
  // Place = "place",
  // Show = "show",
}

export enum BetStatus {
  Pending = "pending",
  Won = "won",
  Lost = "lost",
  Void = "void",
  Cancelled = "cancelled",
}
