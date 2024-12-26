"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs as TabsComp,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getUserBetsClient } from "@/lib/api/bets/client/get-user-bets";
import { BetResponse } from "@/types/api/bets/bet-response";
import { BetStatus } from "@/types/api/bets/bets";
import { BET_STATUS_TAB_TRANSLATION, MY_BETS_TABS } from "@/types/betting";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface Props {
  initialBets: BetResponse[] | null;
}

export const Tabs: React.FC<Props> = ({ initialBets }) => {
  const [activeTab, setActiveTab] = useState<string>(tabs[0].title);

  const currentTab = tabs.find((tab) => tab.title === activeTab);

  const { data: bets, isLoading } = useQuery({
    queryKey: ["bets", currentTab?.statuses],
    queryFn: () =>
      getUserBetsClient({
        status: currentTab?.statuses,
      }),
    initialData: initialBets,
  });

  console.log("client bets: ", bets);

  return (
    <TabsComp defaultValue={tabs[0].title} onValueChange={setActiveTab}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.title}>
            {tab.title}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="mt-6">
        {initialBets?.length && initialBets.length > 0 ? (
          <>
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.title}>
                <Card className="bg-background">
                  <CardContent className="flex px-0 pb-0">
                    {tab.title}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </>
        ) : (
          <div>
            <div>There are currently no bets no display</div>
            <div>
              Bets that can be fully or partially cashed out appear here
            </div>
          </div>
        )}
      </div>
    </TabsComp>
  );
};

const tabs: { id: number; title: string; statuses: BetStatus[] | undefined }[] =
  [
    {
      id: 1,
      title: "Cash Out",
      statuses: BET_STATUS_TAB_TRANSLATION[MY_BETS_TABS.CashOut] as BetStatus[],
    },
    {
      id: 2,
      title: "Live Now",
      statuses: BET_STATUS_TAB_TRANSLATION[MY_BETS_TABS.LiveNow] as BetStatus[],
    },
    {
      id: 3,
      title: "Unsettled",
      statuses: BET_STATUS_TAB_TRANSLATION[
        MY_BETS_TABS.Unsettled
      ] as BetStatus[],
    },
    {
      id: 4,
      title: "Settled",
      statuses: BET_STATUS_TAB_TRANSLATION[MY_BETS_TABS.Settled] as BetStatus[],
    },
    {
      id: 5,
      title: "All",
      statuses: [],
    },
  ];
