import { getBetStatusesForTab } from "@/lib/utils/tabs";
import { MY_BETS_TAB } from "@/types/betting";
export const tabs = [
  MY_BETS_TAB.All,
  MY_BETS_TAB.Unsettled,
  MY_BETS_TAB.Settled,
].map((title, id) => ({
  id,
  title,
  statuses: getBetStatusesForTab(title),
  noContentText:
    title === MY_BETS_TAB.All
      ? "Choose an athlete’s odds to make your first selection."
      : `Your ${title.toLowerCase()} bets will appear here.`,
}));
