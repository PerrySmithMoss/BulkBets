import { BetStatus } from "./bets";

export interface BetResponse {
  id: string;
  divisionId?: string | null;
  betType: number;
  betTypeName: string;
  amount: number;
  currency: string;
  oddsAtTime: number;
  potentialPayout: number;
  status: BetStatus;
  cancelledAt?: string | null;
  createdAt: string;
  settledAt?: string | null;
  isAccumulator: boolean;
  components?: string[];
}
