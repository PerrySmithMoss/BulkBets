import { BetStatus } from "@/types/api/bets/bets";
import { MY_BETS_TAB } from "@/types/betting";

export function getBetStatusesForTab(tab: MY_BETS_TAB): BetStatus[] {
  switch (tab) {
    case MY_BETS_TAB.CashOut:
      return [BetStatus.Won];
    case MY_BETS_TAB.LiveNow:
      return [BetStatus.Live];
    case MY_BETS_TAB.Unsettled:
      return [BetStatus.Pending];
    case MY_BETS_TAB.Settled:
      return [BetStatus.Won, BetStatus.Lost, BetStatus.Void];
    case MY_BETS_TAB.All:
      return [];
    default:
      return [];
  }
}
