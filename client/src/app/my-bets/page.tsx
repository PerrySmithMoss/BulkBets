import { Tabs } from "@/components/my-bets/tabs";
import { tabs } from "@/constants/tabs";
import { getUserBets } from "@/lib/api/bets/get-user-bets";
import { MY_BETS_TAB } from "@/types/betting";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const initialTab = (await searchParams).tab || MY_BETS_TAB.CashOut;
  const currentTab = tabs.find((tab) => tab.title === initialTab);
  const betStatuses = currentTab?.statuses || tabs[0].statuses;

  const bets = await getUserBets({ status: betStatuses });
  // console.log("server bets: ", bets);
  return (
    <div className="max-w-[1450px] my-0 mx-auto flex items-stretch">
      <div className="px-8 py-4 w-full">
        <Tabs initialBets={bets} />
      </div>
    </div>
  );
}
