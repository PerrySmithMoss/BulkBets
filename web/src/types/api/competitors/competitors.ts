import { CompetitorOdds } from "../odds/odds";

export interface Competitor {
  id: string;
  status?: string;
  first_name: string;
  last_name: string;
  residency: string;
  nationality: string;
  pre_judge_score: number | null;
  pre_judge_position: number | null;
  final_score: number | null;
  final_position: number | null;
  odds: CompetitorOdds[];
}
