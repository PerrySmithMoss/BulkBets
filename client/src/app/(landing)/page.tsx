import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitorTable } from "@/components/competitor-table";
import { fetchShowById } from "@/lib/api/shows/fetch-show-by-id";
import Image from "next/image";

export default async function Home() {
  const { data: olympiaShow } = await fetchShowById(1);
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
                <ul className="flex flex-col gap-4 py-1">
                  <li>Bodybuilding</li>
                  <li>Classic Physique</li>
                  <li>Men&apos;s Physique</li>
                  <li>Figure</li>
                  <li>Fitness</li>
                  <li>Wellness</li>
                  <li>Bikini</li>
                  <li>Female Bodybuilding</li>
                  <li>Masters</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="w-full">
            <Image
              src="/images/arnold-2024.png"
              width={0}
              height={0}
              sizes="100vw"
              style={{ width: "100%", height: "185px" }}
              className="rounded"
              alt="Arnold Classic 2024"
            />
          </div>
          {/* <div className="w-full h-[200px] bg-card rounded-3xl flex flex-col justify-center items-center">
            <p className="font-bold text-3xl">
              Who will win the Arnold Classic 2024?
            </p>
            <Button className="mt-4 bg-[#f9d904]">Bet now!</Button>
          </div> */}
          {/* <form>
            <div className="relative">
              <Search className="absolute left-4 top-3 h-6 w-6 text-white" />
              <Input
                type="search"
                placeholder="Search"
                className="pl-[52px] py-6 placeholder:text-white font-bold"
              />
            </div>
          </form> */}
          {olympiaShow ? (
            <div className="flex flex-col gap-4">
              <h1 className="text-lg font-semibold md:text-2xl">
                {olympiaShow.show.name}
              </h1>
              <Tabs
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
              </Tabs>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
