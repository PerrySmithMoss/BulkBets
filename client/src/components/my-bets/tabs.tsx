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
import { Bet, BetStatus } from "@/types/api/bets/bets";
import { BET_STATUS_TAB_TRANSLATION, MY_BETS_TABS } from "@/types/betting";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BetCard } from "../bets/bet-card";

interface Props {
  initialBets: BetResponse | null;
}

export const Tabs: React.FC<Props> = ({ initialBets }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab") || tabs[0].title;
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const currentTab = tabs.find((tab) => tab.title === activeTab);

  const { data, isLoading } = useQuery({
    queryKey: ["bets", currentTab?.statuses],
    queryFn: () =>
      getUserBetsClient({
        status: currentTab?.statuses,
      }),
    initialData: {
      bets: initialBets?.bets,
      pagination: {
        limit: 20,
        offset: 0,
      },
    },
  });

  const handleTabChange = (value: string) => {
    router.push(`?tab=${value}`);
    setActiveTab(value);
  };

  const getBetById = (betId: string) => {
    const bet = data?.bets?.find((bet) => bet.id === betId);
    return bet;
  };

  const getBetsInAccumulator = (accumulatorBetId: string): Bet[] => {
    const accumulatorBet = data?.bets?.find(
      (bet) => bet.id === accumulatorBetId
    );
    const betIds = accumulatorBet?.components ?? [];

    return betIds
      .map((betId) => data?.bets?.find((bet) => bet.id === betId))
      .filter((bet): bet is Bet => bet !== undefined); // Filter out undefined values
  };

  console.log("client data: ", data);

  // if (!data) {
  //   return <div>Show error screen??</div>;
  // }

  return (
    <TabsComp defaultValue={initialTab} onValueChange={handleTabChange}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.title}>
            {tab.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="mt-6">
          {data && data.bets && data.bets.length > 0 ? (
            <>
              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.title}>
                  {Array.isArray(data.bets) && data.bets.length > 0 ? (
                    data.bets.map((bet) => (
                      <BetCard
                        key={bet.id}
                        bet={bet}
                        getBetsInAccumulator={getBetsInAccumulator}
                      />
                    ))
                  ) : (
                    <Card className="bg-background">
                      <CardContent className="flex px-0 pb-0">
                        <div className="text-center py-8 text-muted-foreground">
                          No bets to display
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              ))}
            </>
          ) : (
            <div>
              <div>There are currently no bets to display</div>
              {currentTab?.noContentText && (
                <div>{currentTab.noContentText}</div>
              )}
            </div>
          )}
        </div>
      )}
    </TabsComp>
  );
};

const TAB_TEXT = "There are currently no bets no display";
const tabs: {
  id: number;
  title: MY_BETS_TABS;
  statuses: BetStatus[] | undefined;
  text: string;
  noContentText: string;
}[] = [
  {
    id: 1,
    title: MY_BETS_TABS.CashOut,
    statuses: BET_STATUS_TAB_TRANSLATION[MY_BETS_TABS.CashOut] as BetStatus[],
    text: TAB_TEXT,
    noContentText: "Bets that can be fully or partially cashed out appear here",
  },
  {
    id: 2,
    title: MY_BETS_TABS.LiveNow,
    statuses: BET_STATUS_TAB_TRANSLATION[MY_BETS_TABS.LiveNow] as BetStatus[],
    text: TAB_TEXT,
    noContentText: "Bets that are In-Play will appear here",
  },
  {
    id: 3,
    title: MY_BETS_TABS.Unsettled,
    statuses: BET_STATUS_TAB_TRANSLATION[MY_BETS_TABS.Unsettled] as BetStatus[],
    text: TAB_TEXT,
    noContentText: "Bets that are unsettled will appear here",
  },
  {
    id: 4,
    title: MY_BETS_TABS.Settled,
    statuses: BET_STATUS_TAB_TRANSLATION[MY_BETS_TABS.Settled] as BetStatus[],
    text: TAB_TEXT,
    noContentText: "Bets that are settled will appear here",
  },
  {
    id: 5,
    title: MY_BETS_TABS.All,
    statuses: BET_STATUS_TAB_TRANSLATION[MY_BETS_TABS.All] as BetStatus[],
    text: TAB_TEXT,
    noContentText: "All bets will appear here",
  },
];
