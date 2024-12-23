import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitorTable } from "@/components/competitor-table";
import { fetchShowById } from "@/lib/api/shows/fetch-show-by-id";
import { getUserBets } from "@/lib/api/bets/get-user-bets";
import { useUser } from "@/store/user/user-context";

export default async function Home() {
  const bets = await getUserBets();
  console.log("user bets: ", bets);
  return (
    <div className="max-w-[1450px] my-0 mx-auto flex items-stretch">
      {/* <Tabs
        // Todo: find better/more reliable way of doing this
        defaultValue={`${olympiaShow.divisions?.at(0)?.id}-${
          olympiaShow.divisions?.at(0)?.name
        }`}
      >
        <TabsList>
          {olympiaShow.divisions?.map((division) => (
            <TabsTrigger
              key={`${division.id}-${division.name}`}
              value={`${division.id}-${division.name}`}
            >
              {division.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="mt-6">
          {olympiaShow.divisions?.map((division) => (
            <TabsContent
              key={`${division.id}-${division.name}`}
              value={`${division.id}-${division.name}`}
            >
              <Card className="bg-background">
                <CardContent className="flex px-0 pb-0">
                  <CompetitorTable
                    show={olympiaShow.show}
                    division={division}
                    competitors={olympiaShow.competitors[division.id]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </div>
      </Tabs> */}
    </div>
  );
}
