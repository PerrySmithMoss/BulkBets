import { getBetStatusesForTab } from "@/lib/utils/tabs";
import { BetStatus } from "@/types/api/bets/bets";
import { MY_BETS_TAB } from "@/types/betting";

const DEFAULT_TAB_TEXT = "There are currently no bets no display";
export const tabs: {
  id: number;
  title: MY_BETS_TAB;
  statuses: BetStatus[];
  text: string;
  noContentText: string;
}[] = [
  {
    id: 1,
    title: MY_BETS_TAB.CashOut,
    statuses: getBetStatusesForTab(MY_BETS_TAB.CashOut),
    text: DEFAULT_TAB_TEXT,
    noContentText:
      "Bets that can be fully or partially cashed out will appear here",
  },
  {
    id: 2,
    title: MY_BETS_TAB.LiveNow,
    statuses: getBetStatusesForTab(MY_BETS_TAB.LiveNow),
    text: DEFAULT_TAB_TEXT,
    noContentText: "Bets that are In-Play will appear here",
  },
  {
    id: 3,
    title: MY_BETS_TAB.Unsettled,
    statuses: getBetStatusesForTab(MY_BETS_TAB.Unsettled),
    text: DEFAULT_TAB_TEXT,
    noContentText: "Bets that are unsettled will appear here",
  },
  {
    id: 4,
    title: MY_BETS_TAB.Settled,
    statuses: getBetStatusesForTab(MY_BETS_TAB.Settled),
    text: DEFAULT_TAB_TEXT,
    noContentText: "Bets that are settled will appear here",
  },
  {
    id: 5,
    title: MY_BETS_TAB.All,
    statuses: getBetStatusesForTab(MY_BETS_TAB.All),
    text: DEFAULT_TAB_TEXT,
    noContentText: "All bets will appear here",
  },
];
