import { Card, CardContent } from "@/components/ui/card";
import { Radio } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitorTable } from "@/components/competitor-table";
import { fetchShowById } from "@/lib/api/shows/fetch-show-by-id";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  // TODO: change so that we call a fetchRecentShows or fetchHomePageShows which
  // allows passing pagination and query params
  const { data: olympiaShow } = await fetchShowById(1);
  const { data: arnoldClassic } = await fetchShowById(2);
  return (
    <div className="max-w-[1450px] my-0 mx-auto flex items-stretch">
      <div className="grid w-full md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr]">
        <div className="hidden border-r md:block">
          <div className="flex flex-col gap-3">
            <div className="pt-6">
              <div className="pb-5 px-6">
                <div className="flex flex-col">
                  <div className="uppercase font-bold text-primary">
                    Upcoming
                  </div>
                  <div className="flex flex-col gap-5 pt-5">
                    <div className="flex items-center gap-2">
                      <Radio className="h-5 w-5 text-red-400" />
                      <p className="text-[15px] font-bold">Live betting</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Radio className="h-5 w-5 text-yellow-400" />
                      <p className="text-[15px] font-bold">2024 NEW YORK PRO</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Radio className="h-5 w-5 text-yellow-400" />
                      <p className="text-[15px] font-bold">
                        FIT XPO 2024 Manchester
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Radio className="h-5 w-5 text-yellow-400" />
                      <p className="text-[15px] font-bold">NABBA Wales 2024</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Radio className="h-5 w-5 text-yellow-400" />
                      <p className="text-[15px] font-bold">2024 DETROIT PRO</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Radio className="h-5 w-5 text-yellow-400" />
                      <p className="text-[15px] font-bold">
                        Pure Elite Manchester 2024
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Radio className="h-5 w-5 text-yellow-400" />
                      <p className="text-[15px] font-bold">
                        PCA Universe Pro/Am
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* <div className="flex items-center justify-between pb-1 pt-3 px-3">
                <Toggle aria-label="Toggle today" className="px-2">
                  TODAY
                </Toggle>
                <Toggle aria-label="Toggle 24 hours" className="px-2">
                  24H
                </Toggle>
                <Toggle aria-label="Toggle 3 days" className="px-2">
                  3D
                </Toggle>
                <Toggle aria-label="Toggle 1 week" className="px-2">
                  1WK
                </Toggle>
                <Toggle aria-label="Toggle all" className="px-2">
                  ALL
                </Toggle>
              </div> */}
            </div>
            <div className="border-t">
              <div className="px-6 pt-6">
                <div className="uppercase text-primary font-bold">
                  Divisions
                </div>
                <ul className="flex flex-col gap-5 pt-5">
                  {/* TODO: create API for returning a list of divisions which 
                  can then be shown here instead of manually typing them */}
                  <Link href="/divisions/bodybuilding">
                    <li className="hover:text-primary cursor-pointer text-[15px] font-bold">
                      Bodybuilding
                    </li>
                  </Link>
                  <Link href="/divisions/212">
                    <li className="hover:text-primary cursor-pointer text-[15px] font-bold">
                      212
                    </li>
                  </Link>
                  <Link href="/divisions/classic-physique">
                    <li className="hover:text-primary cursor-pointer text-[15px] font-bold">
                      Classic Physique
                    </li>
                  </Link>
                  <Link href="/divisions/mens-physique">
                    <li className="hover:text-primary cursor-pointer text-[15px] font-bold">
                      Men&apos;s Physique
                    </li>
                  </Link>
                  <Link href="/divisions/figure">
                    <li className="hover:text-primary cursor-pointer text-[15px] font-bold">
                      Figure
                    </li>
                  </Link>
                  <Link href="/divisions/fitness">
                    <li className="hover:text-primary cursor-pointer text-[15px] font-bold">
                      Fitness
                    </li>
                  </Link>
                  <Link href="/divisions/wellness">
                    <li className="hover:text-primary cursor-pointer text-[15px] font-bold">
                      Wellness
                    </li>
                  </Link>
                  <Link href="/divisions/bikini">
                    <li className="hover:text-primary cursor-pointer text-[15px] font-bold">
                      Bikini
                    </li>
                  </Link>
                  <Link href="/divisions/female-bodybuilding">
                    <li className="hover:text-primary cursor-pointer text-[15px] font-bold">
                      Female Bodybuilding
                    </li>
                  </Link>
                  <Link href="/divisions/female-physique">
                    <li className="hover:text-primary cursor-pointer text-[15px] font-bold">
                      Female Physique
                    </li>
                  </Link>
                  <Link href="/divisions/masters">
                    <li className="hover:text-primary cursor-pointer text-[15px] font-bold">
                      Men&apos;s Masters
                    </li>
                  </Link>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <main className="flex flex-1 flex-col gap-4 p-6 lg:gap-6 lg:p-8">
          <Carousel
            opts={{
              align: "start",
            }}
            className="w-full"
          >
            <CarouselContent>
              <CarouselItem>
                <div className="relative w-full h-[250px]">
                  <Image
                    src="/images/joe-weider-olympia.webp"
                    fill
                    className="object-cover rounded-xl"
                    alt="Arnold Classic 2024"
                  />
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="relative w-full h-[250px]">
                  <Image
                    src="/images/olympia-landscape.jpg"
                    fill
                    className="object-cover rounded-xl"
                    alt="Arnold Classic 2024"
                  />
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="relative w-full h-[250px]">
                  <Image
                    src="/images/olympia-masters.jpg"
                    fill
                    className="object-cover rounded-xl"
                    alt="Arnold Classic 2024"
                  />
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="relative w-full h-[250px]">
                  <Image
                    src="/images/olympia-vegas-2024.jpg"
                    fill
                    className="object-cover rounded-xl"
                    alt="Arnold Classic 2024"
                  />
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="relative w-full h-[250px]">
                  <Image
                    src="/images/olympia.jpg"
                    fill
                    className="object-cover rounded-xl"
                    alt="Arnold Classic 2024"
                  />
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="relative w-full h-[250px]">
                  <Image
                    src="/images/olympia-vip.jpg"
                    fill
                    className="object-cover rounded-xl"
                    alt="Arnold Classic 2024"
                  />
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="relative w-full h-[250px]">
                  <Image
                    src="/images/evolution-pro-2025.jpg"
                    fill
                    className="object-cover rounded-xl"
                    alt="Arnold Classic 2024"
                  />
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious className="-left-3" />
            <CarouselNext className="-right-3" />
          </Carousel>
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
          <div className="flex flex-col gap-8">
            {/* Mr. Olympia show */}
            {olympiaShow ? (
              <div className="flex flex-col gap-4 mt-3">
                <h1 className="text-lg font-bold md:text-2xl uppercase">
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
            {/* Arnold classic show */}
            {arnoldClassic ? (
              <div className="flex flex-col gap-4">
                <h1 className="text-lg font-bold md:text-2xl uppercase">
                  {arnoldClassic.show.name}
                </h1>
                <Tabs
                  // Todo: find better/more reliable way of doing this
                  defaultValue={`${arnoldClassic.divisions?.at(0)?.id}-${
                    arnoldClassic.divisions?.at(0)?.name
                  }`}
                >
                  <TabsList>
                    {arnoldClassic.divisions?.map((division) => (
                      <TabsTrigger
                        key={`${division.id}-${division.name}`}
                        value={`${division.id}-${division.name}`}
                      >
                        {division.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="mt-6">
                    {arnoldClassic.divisions?.map((division) => (
                      <TabsContent
                        key={`${division.id}-${division.name}`}
                        value={`${division.id}-${division.name}`}
                      >
                        <Card className="bg-background">
                          <CardContent className="flex px-0 pb-0">
                            <CompetitorTable
                              show={arnoldClassic.show}
                              division={division}
                              competitors={
                                arnoldClassic.competitors[division.id]
                              }
                            />
                          </CardContent>
                        </Card>
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
