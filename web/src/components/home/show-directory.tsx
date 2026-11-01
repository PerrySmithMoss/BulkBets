"use client";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Search,
  SlidersHorizontal,
  Trophy,
  X,
} from "lucide-react";
import { ShowDetailsResponse } from "@/types/api/show/show-details-response";
import { isMarketOpen, showDate, showStatus } from "@/lib/utils/markets";
import { CompetitorTable } from "../competitor-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

type Details = ShowDetailsResponse["data"];
type Filter = "all" | "open" | "past";

function EventCard({
  details,
  division,
  now,
}: {
  details: Details;
  division: string;
  now: number;
}) {
  const divisions = (details.divisions || []).filter(
    (item) => division === "all" || item.name === division,
  );
  const [selected, setSelected] = useState(String(divisions[0]?.id ?? ""));
  const value = divisions.some((item) => String(item.id) === selected)
    ? selected
    : String(divisions[0]?.id ?? "");
  const status = showStatus(details.show, now);
  const open = divisions.some((item) => isMarketOpen(details.show, item, now));
  return (
    <article
      id={`show-${details.show.id}`}
      aria-labelledby={`show-title-${details.show.id}`}
      className="scroll-mt-24 overflow-hidden rounded-xl border bg-card"
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              open
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-border bg-muted/50 text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                open ? "bg-primary" : "bg-muted-foreground",
              )}
            />
            {open ? "Markets open" : status}
          </span>
          <span className="text-xs text-muted-foreground">
            {divisions.length}{" "}
            {divisions.length === 1 ? "division" : "divisions"}
          </span>
        </div>
        <h3
          id={`show-title-${details.show.id}`}
          className="text-xl font-bold tracking-tight sm:text-2xl"
        >
          {details.show.name}
        </h3>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground sm:text-sm">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-3.5" />
            <time dateTime={details.show.start_time}>
              {showDate(details.show.start_time)}
            </time>
          </p>
          {details.show.location && (
            <p className="flex items-center gap-2">
              <MapPin className="size-3.5" />
              {details.show.location}
            </p>
          )}
        </div>
      </div>
      {divisions.length ? (
        <Tabs value={value} onValueChange={setSelected}>
          <div className="border-y bg-background/30 px-4 py-3 sm:px-6">
            <label className="block text-xs text-muted-foreground md:hidden">
              Division
              <select
                aria-label={`${details.show.name} division`}
                value={value}
                onChange={(event) => setSelected(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground focus-visible:outline-primary"
              >
                {divisions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <TabsList
              aria-label={`${details.show.name} divisions`}
              className="hidden h-auto flex-wrap justify-start gap-1 bg-transparent p-0 md:flex"
            >
              {divisions.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={String(item.id)}
                  className="min-h-10 rounded-md px-3 py-2 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  {item.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {divisions.map((item) => (
            <TabsContent key={item.id} value={String(item.id)} className="m-0">
              <CompetitorTable
                asOf={now}
                show={details.show}
                division={item}
                competitors={details.competitors[item.id] || []}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <p className="border-t p-6 text-sm text-muted-foreground">
          Divisions will appear here when the line-up is published.
        </p>
      )}
    </article>
  );
}

export function ShowDirectory({
  shows,
  asOf,
}: {
  shows: Details[];
  asOf: number;
}) {
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState(asOf);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const divisions = [
    ...new Set(
      shows.flatMap((details) =>
        (details.divisions || []).map((item) => item.name),
      ),
    ),
  ].sort();
  const isOpen = (details: Details) =>
    (details.divisions || []).some((item) =>
      isMarketOpen(details.show, item, now),
    );
  const isPast = (details: Details) =>
    ["Completed", "Canceled"].includes(showStatus(details.show, now));
  const visible = shows.filter(
    (details) =>
      (filter === "all" ||
        (filter === "open" ? isOpen(details) : isPast(details))) &&
      (division === "all" ||
        details.divisions?.some((item) => item.name === division)) &&
      `${details.show.name} ${details.show.location || ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const openCount = shows.filter(isOpen).length;
  const reset = () => {
    setQuery("");
    setDivision("all");
    setFilter("all");
  };
  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div
          role="group"
          aria-label="Filter shows by status"
          className="flex gap-1 rounded-lg bg-muted/60 p-1 self-start"
        >
          {(
            [
              { id: "all", label: "All shows", count: shows.length },
              { id: "open", label: "Open markets", count: openCount },
              {
                id: "past",
                label: "Past shows",
                count: shows.filter(isPast).length,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                "min-h-10 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
                filter === item.id
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              <span className="ml-1.5 hidden text-[10px] opacity-70 sm:inline">
                {item.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:max-w-[510px] lg:flex-1">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="absolute left-3 top-3.5 size-4 text-muted-foreground"
            />
            <input
              type="search"
              aria-label="Search shows or locations"
              placeholder="Search shows or locations"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-11 w-full rounded-lg border bg-card pl-10 pr-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-0 top-0 flex size-11 items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setQuery("")}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <label className="relative sm:max-w-48">
            <SlidersHorizontal
              aria-hidden
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
            />
            <select
              aria-label="Filter by division"
              value={division}
              onChange={(event) => setDivision(event.target.value)}
              className="min-h-11 w-full rounded-lg border bg-card pl-9 pr-6 text-sm focus-visible:outline-primary"
            >
              <option value="all">All divisions</option>
              {divisions.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <p role="status" aria-live="polite">
          {visible.length} {visible.length === 1 ? "show" : "shows"}
          {shows.length === 20 ? " · Latest 20 events" : ""}
          {!openCount && filter === "all" ? " · No open markets right now" : ""}
        </p>
        <span>Dates & market times in UTC</span>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_268px]">
        <div className="min-w-0 space-y-6">
          {visible.map((details) => (
            <EventCard
              key={`${details.show.id}-${division}`}
              details={details}
              division={division}
              now={now}
            />
          ))}
          {visible.length === 0 && (
            <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center">
              <Search className="mx-auto mb-5 size-6 text-primary" />
              <h3 className="text-lg font-semibold">
                {filter === "open" && !openCount
                  ? "No open markets right now"
                  : shows.length === 0
                    ? "The next line-up is on its way"
                    : "No shows match your filters"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {shows.length === 0
                  ? "Shows and divisions will appear here when they’re published."
                  : filter === "open" && !openCount
                    ? "You can still explore past shows, line-ups and historical prices."
                    : "Try another show or location, or clear your filters to see the full line-up."}
              </p>
              {shows.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  className="mt-5 min-h-11 rounded-lg border px-5 text-sm font-semibold hover:bg-muted"
                >
                  {filter === "open" && !openCount
                    ? "Browse all shows"
                    : "Clear filters"}
                </button>
              )}
            </div>
          )}
        </div>
        <aside
          aria-label="Market guidance"
          className="hidden space-y-4 xl:block"
        >
          <div className="rounded-xl border bg-card p-5">
            <Trophy className="mb-5 size-5 text-primary" />
            <h3 className="text-lg font-semibold tracking-tight">
              Know the market.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Winner prices are shown as fractional odds. Select an open price
              to add an athlete to your bet slip.
            </p>
            <div className="my-5 rounded-lg border bg-background p-4">
              <p className="text-xs text-muted-foreground">
                An example at{" "}
                <span className="font-semibold text-foreground">2/1</span>
              </p>
              <p className="mt-2 text-sm">
                £10 stake <span className="mx-1 text-muted-foreground">→</span>{" "}
                £30 total return
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                If it wins. Includes your £10 stake; a losing selection returns
                £0.
              </p>
            </div>
            <Link
              href="/how-it-works"
              className="text-sm font-semibold text-primary hover:underline"
            >
              How odds work →
            </Link>
          </div>
          <div className="rounded-xl border p-5">
            <p className="mb-3 inline-flex size-9 items-center justify-center rounded-full border text-xs font-bold">
              18+
            </p>
            <h3 className="text-sm font-semibold">Keep it in perspective.</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Set your own limits. Take a break whenever you need one.
            </p>
            <Link
              href="/help"
              className="mt-4 inline-block text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Help & safer gambling
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
