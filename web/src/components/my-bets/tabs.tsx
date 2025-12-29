"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs as TabsComp,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BetResponse } from "@/types/api/bets/bet-response";
import { Bet } from "@/types/api/bets/bets";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BetCard } from "../bets/bet-card";
import { tabs } from "@/constants/tabs";

interface Props {
  initialBets: BetResponse["data"] | null;
}

export const Tabs: React.FC<Props> = ({ initialBets }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab") ?? tabs[0].title;
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const currentTab = tabs.find((tab) => tab.title === activeTab);

  // const { data, isLoading } = useQuery({
  //   queryKey: ["bets", currentTab?.statuses],
  //   queryFn: () =>
  //     getUserBetsClient({
  //       status: currentTab?.statuses,
  //     }),
  //   initialData: {
  //     bets: initialBets?.bets,
  //     pagination: {
  //       limit: 20,
  //       offset: 0,
  //     },
  //   },
  // });

  const handleTabChange = (value: string) => {
    router.push(`?tab=${value}`);
    setActiveTab(value);
  };

  const getBetById = (betId: string) => {
    const bet = initialBets?.bets?.find((bet) => bet.id === betId);
    return bet;
  };

  const getBetsInAccumulator = (accumulatorBetId: string): Bet[] => {
    const accumulatorBet = initialBets?.bets?.find(
      (bet) => bet.id === accumulatorBetId
    );
    const betIds = accumulatorBet?.components ?? [];

    return betIds
      .map((betId) => initialBets?.bets?.find((bet) => bet.id === betId))
      .filter((bet): bet is Bet => bet !== undefined); // Filter out undefined values
  };

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
      {/* {isLoading ? (
        <div>Loading...</div>
      ) : ( */}
      <div className="mt-6">
        {initialBets?.bets && initialBets?.bets.length > 0 ? (
          <>
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.title}>
                {Array.isArray(initialBets.bets) &&
                initialBets.bets.length > 0 ? (
                  initialBets.bets.map((bet) => (
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
          <Card className="bg-muted">
            <CardContent className="py-8">
              <div className="flex flex-col gap-3">
                <div className="text-center text-muted-foreground font-bold">
                  There are currently no bets to display
                </div>
                <div className="text-center text-[13px] text-muted-foreground">
                  {currentTab?.noContentText && (
                    <div>{currentTab.noContentText}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {/* )} */}
    </TabsComp>
  );
};
