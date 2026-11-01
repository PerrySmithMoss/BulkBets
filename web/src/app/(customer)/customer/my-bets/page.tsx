import Link from "next/link";
import { Tabs } from "@/components/my-bets/tabs";
import { tabs } from "@/constants/tabs";
import { getUserBets } from "@/lib/api/bets/get-user-bets";
import { RetryButton } from "@/components/retry-button";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tab = tabs.find((t) => t.title === params.tab) ?? tabs[0];
  const offset = Math.max(0, Math.floor(Number(params.offset) || 0));
  const { data, error } = await getUserBets({
    status: tab.statuses,
    limit: 20,
    offset,
  });
  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My bets</h1>
        <Link href="/" className="text-sm text-primary">
          ← Back to markets
        </Link>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Track your stakes and returns. Demo results are simulated, and payouts
        return to your virtual balance.
      </p>
      {error ? (
        <div role="alert" className="rounded-lg border p-5">
          Your bet history could not be loaded.
          <RetryButton />
        </div>
      ) : (
        <Tabs initialBets={data} />
      )}
    </main>
  );
}
