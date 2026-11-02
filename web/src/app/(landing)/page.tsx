import { fetchShowDirectory } from "@/lib/api/shows/fetch-show-directory";
import { ShowDirectory } from "@/components/home/show-directory";
import { RetryButton } from "@/components/retry-button";

export default async function Home({searchParams}:{searchParams:Promise<{show?:string}>}) {
 const params=await searchParams;
  const { shows, error } = await fetchShowDirectory();
  // eslint-disable-next-line react-hooks/purity -- One request-time snapshot for hydration.
  const asOf = Date.now();
  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1600px] px-3 pb-24 pt-4 sm:px-5 lg:px-6 lg:pb-8"
    >
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-5"
        >
          <h1 className="font-semibold">
            {shows.length
              ? "Some shows couldn’t be loaded"
              : "Shows are temporarily unavailable"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please try again in a moment. Your selections are saved.
          </p>
          <RetryButton />
        </div>
      )}
      <ShowDirectory shows={shows} asOf={asOf} initialShowID={Number(params.show)||undefined} />
    </main>
  );
}
