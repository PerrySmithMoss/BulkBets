import { RetryButton } from "@/components/retry-button";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchShowDirectory } from "@/lib/api/shows/fetch-show-directory";
import { SportsbookSlip } from "@/components/home/sportsbook-slip";
import { CompetitorTable } from "@/components/competitor-table";

const names: Record<string, string> = {
  bodybuilding: "Men's Open Bodybuilding",
  "212": "212",
  "classic-physique": "Classic Physique",
  "mens-physique": "Men's Physique",
  figure: "Women's Figure",
  fitness: "Fitness",
  wellness: "Women's Wellness",
  bikini: "Bikini",
  "female-bodybuilding": "Women's Bodybuilding",
  "female-physique": "Women's Physique",
  masters: "Men's Masters",
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ division: string }>;
}) {
  const { division } = await params;
  return { title: `${names[division] || "Division"} | BulkBets` };
}
export default async function Page({
  params,
}: {
  params: Promise<{ division: string }>;
}) {
  const { division } = await params;
  const name = names[division];
  if (!name) notFound();
  const { shows, error } = await fetchShowDirectory();
  // eslint-disable-next-line react-hooks/purity -- Snapshot request time on the server for consistent hydration.
  const asOf = Date.now();
  const markets = shows.flatMap((details) =>
    (details.divisions || [])
      .filter((d) => d.name === name)
      .map((d) => ({
        show: details.show,
        division: d,
        competitors: details.competitors[d.id] || [],
      })),
  );
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-5 py-10 pb-24">
      <Link href="/#markets" className="text-sm text-primary">
        ← All shows
      </Link>
      <h1 className="my-6 text-3xl font-bold">{name}</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {error && (
            <p role="alert" className="mb-5">
              Some shows couldn’t be loaded. <RetryButton />
            </p>
          )}
          {markets.length ? (
            markets.map((m) => (
              <section key={m.division.id} className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">{m.show.name}</h2>
                <CompetitorTable {...m} asOf={asOf} demo={!m.show.sandbox} />
              </section>
            ))
          ) : (
            <p className="text-muted-foreground">
              No markets are currently listed for this division. Browse all
              shows to explore other divisions.
            </p>
          )}
        </div>
        <SportsbookSlip />
      </div>
    </main>
  );
}
