"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Tabs as TabsComp,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BetResponse } from "@/types/api/bets/bet-response";
import { BetCard } from "@/components/bets/bet-card";
import { tabs } from "@/constants/tabs";

export function Tabs({
  initialBets,
}: {
  initialBets: BetResponse["data"] | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = tabs.find((t) => t.title === params.get("tab")) ?? tabs[0];
  const bets = initialBets?.bets ?? [];
  const visible = bets.filter((bet) => bet.amount > 0);
  const offset = initialBets?.pagination.offset ?? 0;
  const limit = initialBets?.pagination.limit ?? 20;
  return (
    <TabsComp
      value={tab.title}
      onValueChange={(value) =>
        router.push(`?tab=${encodeURIComponent(value)}`)
      }
    >
      <TabsList className="w-full sm:w-auto">
        {tabs.map((t) => (
          <TabsTrigger className="min-h-10 flex-1" key={t.id} value={t.title}>
            {t.title}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={tab.title} className="mt-6">
        {visible.length ? (
          visible.map((bet) => (
            <BetCard
              key={bet.id}
              bet={bet}
              getBetsInAccumulator={(id) => {
                const ids = bets.find((b) => b.id === id)?.components ?? [];
                return bets.filter((b) => ids.includes(b.id));
              }}
            />
          ))
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center">
            <h2 className="font-semibold">
              There are currently no bets to display
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {tab.noContentText}
            </p>
            <Link href="/" className="mt-4 inline-block text-sm text-primary">
              Explore markets
            </Link>
          </div>
        )}
        <nav
          aria-label="Bet history pages"
          className="mt-5 flex justify-between text-sm text-primary"
        >
          {offset > 0 ? (
            <Link
              href={`?tab=${encodeURIComponent(tab.title)}&offset=${Math.max(0, offset - limit)}`}
            >
              ← Newer bets
            </Link>
          ) : (
            <span />
          )}
          {visible.length >= limit && (
            <Link
              href={`?tab=${encodeURIComponent(tab.title)}&offset=${offset + limit}`}
            >
              Older bets →
            </Link>
          )}
        </nav>
      </TabsContent>
    </TabsComp>
  );
}
