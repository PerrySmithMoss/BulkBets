import { Competitor } from "../competitors/competitors";
import { Division } from "../division/division";
import { Show } from "./show";

export interface ShowDetailsResponse {
  show: Show;
  divisions: Division[];
  competitors: Record<number, Competitor[]>; // Keyed by Division ID
}
