import { Tabs } from "@/components/my-bets/tabs";
import { getUserBets } from "@/lib/api/bets/get-user-bets";
import { BetStatus } from "@/types/api/bets/bets";

export default async function Home() {
  const bets = await getUserBets({ status: [BetStatus.Won] });
  console.log("server bets: ", bets);
  return (
    <div className="max-w-[1450px] my-0 mx-auto flex items-stretch">
      <div className="px-8 py-4 w-full">
        <Tabs initialBets={bets} />
      </div>
    </div>
  );
}
