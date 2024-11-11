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

export default async function Home() {
  return (
    <div className="max-w-[1450px] my-0 mx-auto flex items-stretch">
      <div className="grid w-full md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr]">
        <div className="hidden border-r md:block">
          <div className="flex flex-col gap-3">
            <Card className="pt-5 mx-2 mt-3 bg-background">
              <CardContent className="pb-5 px-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-red-400" />
                    <p className="text-sm font-bold">Live betting</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-yellow-400" />
                    <p className="text-sm font-bold">2024 NEW YORK PRO</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-yellow-400" />
                    <p className="text-sm font-bold">FIT XPO 2024 Manchester</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-yellow-400" />
                    <p className="text-sm font-bold">NABBA Wales 2024</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-yellow-400" />
                    <p className="text-sm font-bold">2024 DETROIT PRO</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-yellow-400" />
                    <p className="text-sm font-bold">
                      Pure Elite Manchester 2024
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-yellow-400" />
                    <p className="text-sm font-bold">PCA Universe Pro/Am</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="mx-2 bg-background">
              <CardHeader className="px-4 pb-4">
                <CardTitle className="text-base">Time filters</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center px-1 pb-4 justify-evenly">
                <Toggle aria-label="Toggle italic">TODAY</Toggle>
                <Toggle aria-label="Toggle italic">24H</Toggle>
                <Toggle aria-label="Toggle italic">3D</Toggle>
                <Toggle aria-label="Toggle italic">1WK</Toggle>
                <Toggle aria-label="Toggle italic">ALL</Toggle>
              </CardContent>
            </Card>
            <Card className="mx-2 bg-background">
              <CardContent className="px-4 py-3">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-b-0">
                    <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                      Bodybuilding
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes. It adheres to the WAI-ARIA design pattern.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2" className="border-b-0">
                    <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                      Classic Physique
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes. It comes with default styles that matches the other
                      components&apos; aesthetic.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-b-0">
                    <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                      Men&apos;s Physique
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes. It&apos;s animated by default, but you can disable it
                      if you prefer.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-b-0">
                    <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                      Figure
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes. It&apos;s animated by default, but you can disable it
                      if you prefer.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-b-0">
                    <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                      Fitness
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes. It&apos;s animated by default, but you can disable it
                      if you prefer.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-b-0">
                    <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                      Wellness
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes. It&apos;s animated by default, but you can disable it
                      if you prefer.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-b-0">
                    <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                      Bikini
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes. It&apos;s animated by default, but you can disable it
                      if you prefer.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-b-0">
                    <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                      Female Bodybuilding
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes. It&apos;s animated by default, but you can disable it
                      if you prefer.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-b-0">
                    <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                      Masters
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes. It&apos;s animated by default, but you can disable it
                      if you prefer.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="w-full h-[200px] bg-card rounded-3xl flex flex-col justify-center items-center">
            <p className="font-bold text-3xl">
              Who will win the Arnold Classic 2024?
            </p>
            <Button className="mt-4 bg-[#f9d904]">Bet now!</Button>
          </div>
          <form>
            <div className="relative">
              <Search className="absolute left-4 top-3 h-6 w-6 text-white" />
              <Input
                type="search"
                placeholder="Search"
                className="pl-[52px] py-6 placeholder:text-white font-bold"
              />
            </div>
          </form>
          <div className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">
              Pro Muscle Italy Pro
            </h1>
            <Tabs defaultValue="mens-bodybuilding">
              <TabsList>
                <TabsTrigger value="mens-bodybuilding">
                  Men&apos;s Bodybuilding
                </TabsTrigger>
                <TabsTrigger value="mens-physique">
                  Men&apos;s Physique
                </TabsTrigger>
                <TabsTrigger value="womens-bikini">
                  Women&apos;s Bikini
                </TabsTrigger>
              </TabsList>
              <div className="mt-6">
                <TabsContent value="mens-bodybuilding">
                  <Card className="bg-background">
                    <CardContent className="flex px-0 pb-0">
                      <CompetitorTable
                        competitors={italyProMaleBodybuildingCompetitors}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="mens-physique">
                  <Card className="bg-background">
                    <CardHeader className="py-2 pl-3 bg-muted rounded-t-md">
                      <CardTitle className="text-xs">Sun 8th Sep</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center px-1 pb-4 justify-evenly"></CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="womens-bikini">
                  <Card className="bg-background">
                    <CardHeader className="py-2 pl-3 bg-muted rounded-t-md">
                      <CardTitle className="text-xs">Sun 8th Sep</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center px-1 pb-4 justify-evenly"></CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

// could assign odds based on the actual scoring that judges give in
// pre-judging & finals (lowest score wins)
const italyProMaleBodybuildingCompetitors = [
  {
    name: "Ahmad Alrefaei",
    country: "Kuwait",
    odds: {
      percentage: "2",
      fractional: "1/50",
    },
  },
  {
    name: "Morgan Aste",
    country: "France",
    odds: {
      percentage: "3",
      fractional: "3/100",
    },
  },
  {
    name: "Alie Edward",
    country: "France",
    odds: {
      percentage: "2",
      fractional: "1/50",
    },
  },
  {
    name: "Enrico Hoffmann",
    country: "United Arab Emirates",
    odds: {
      percentage: "6",
      fractional: "3/50",
    },
  },
  {
    name: "Hunter Labrada",
    country: "Tomball, Texas",
    odds: {
      percentage: "35",
      fractional: "11/20",
    },
  },
  {
    name: "Lorenzo Leeuwe",
    country: "Netherlands",
    odds: {
      percentage: "7",
      fractional: "7/100",
    },
  },
  {
    name: "Josh Maley",
    country: "United Kingdom",
    odds: {
      percentage: "3",
      fractional: "3/100",
    },
  },
  {
    name: "Diogo Nunes",
    country: "Italy",
    odds: {
      percentage: "4",
      fractional: "1/25",
    },
  },
  {
    name: "Dario Paolozzi",
    country: "Netherlands",
    odds: {
      percentage: "5",
      fractional: "1/20",
    },
  },
  {
    name: "Andrea Presti",
    country: "Italy",
    odds: {
      percentage: "15",
      fractional: "1/4",
    },
  },
  {
    name: "Bruno Santos",
    country: "Brazil",
    odds: {
      percentage: "10",
      fractional: "1/10",
    },
  },
  {
    name: "Nathan Styles",
    country: "United Kingdom",
    odds: {
      percentage: "1",
      fractional: "1/100",
    },
  },
  {
    name: "Chris Ziller",
    country: "Netherlands",
    odds: {
      percentage: "7",
      fractional: "7/100",
    },
  },
];
