import { RetryButton } from "@/components/retry-button";
import { Card, CardContent } from "@/components/ui/card";
import { showDate, showStatus } from "@/lib/utils/markets";
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
  const [olympiaResult, arnoldResult] = await Promise.all([
    fetchShowById(1),
    fetchShowById(2),
  ]);
  const olympiaShow = olympiaResult.data;
  const arnoldClassic = arnoldResult.data;
  // eslint-disable-next-line react-hooks/purity -- Snapshot request time on the server for consistent hydration.
  const asOf = Date.now();
  return (
    <div className="max-w-[1450px] my-0 mx-auto flex items-stretch">
      <div className="grid w-full min-w-0 md:grid-cols-[250px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden border-r p-6 md:block" aria-label="Shows">
          <h2 className="font-semibold">Shows</h2>
          <nav className="mt-5 grid gap-5">
            {[olympiaShow, arnoldClassic].filter(Boolean).map(
              (details) =>
                details && (
                  <Link
                    key={details.show.id}
                    href={`#show-${details.show.id}`}
                    className="text-sm hover:text-primary"
                  >
                    <span className="block font-semibold">
                      {details.show.name}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {showDate(details.show.start_time)} ·{" "}
                      {showStatus(details.show, asOf)}
                    </span>
                  </Link>
                ),
            )}
          </nav>
          <Link
            href="/how-it-works"
            className="mt-8 block text-sm text-primary"
          >
            How markets work
          </Link>
        </aside>
        <main
          id="main-content"
          className="flex min-w-0 flex-1 flex-col gap-4 p-6 lg:gap-6 lg:p-8"
        >
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
          <div id="markets" className="flex scroll-mt-24 flex-col gap-8">
            {(olympiaResult.error || arnoldResult.error) && (
              <div role="alert" className="rounded-lg border p-5">
                <h2 className="font-semibold">Some shows couldn’t be loaded</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please check your connection and try again.
                </p>
                <RetryButton />
              </div>
            )}
            {/* Mr. Olympia show */}
            {olympiaShow ? (
              <div
                id="show-1"
                className="flex scroll-mt-24 flex-col gap-4 mt-3"
              >
                <h1 className="text-lg font-bold md:text-2xl uppercase">
                  {olympiaShow.show.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {showDate(olympiaShow.show.start_time)} ·{" "}
                  {olympiaShow.show.location} ·{" "}
                  {showStatus(olympiaShow.show, asOf)}
                </p>
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
                              asOf={asOf}
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
              <div id="show-2" className="flex scroll-mt-24 flex-col gap-4">
                <h1 className="text-lg font-bold md:text-2xl uppercase">
                  {arnoldClassic.show.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {showDate(arnoldClassic.show.start_time)} ·{" "}
                  {arnoldClassic.show.location} ·{" "}
                  {showStatus(arnoldClassic.show, asOf)}
                </p>
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
                              asOf={asOf}
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
