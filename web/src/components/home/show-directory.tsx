"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Search,
  Trophy,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { ShowDetailsResponse } from "@/types/api/show/show-details-response";
import { CompetitorTable } from "@/components/competitor-table";
import { SportsbookSlip } from "@/components/home/sportsbook-slip";
import { cn } from "@/lib/utils/cn";
import { showDate } from "@/lib/utils/markets";

type Details = ShowDetailsResponse["data"];

export function ShowDirectory({
  shows: rawShows,
  asOf,
  initialShowID,
}: {
  shows: Details[];
  asOf: number;
  initialShowID?: number;
}) {
  const shows = rawShows.map((s) => ({
    ...s,
    divisions: s.divisions ?? [],
    competitors: Object.fromEntries(
      Object.entries(s.competitors ?? {}).map(([id, athletes]) => [
        id,
        athletes ?? [],
      ]),
    ),
  }));
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showID, setShowID] = useState(
    initialShowID ??
      shows.find((s) => Object.values(s.competitors).some((c) => c.length))
        ?.show.id,
  );
  const [divisionID, setDivisionID] = useState<number>();
  const term = query.trim().toLowerCase();
  const filtered = shows.filter(
    ({ show, competitors }) =>
      `${show.name} ${show.location}`.toLowerCase().includes(term) ||
      Object.values(competitors)
        .flat()
        .some((c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(term),
        ),
  );
  const selected = filtered.find((s) => s.show.id === showID) ?? filtered[0];
  const divisions = selected?.divisions ?? [];
  const matchingDivision = divisions.find((d) =>
    selected?.competitors[d.id]?.some((c) =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(term),
    ),
  );
  const division =
    divisions.find(
      (d) =>
        d.id === divisionID &&
        (!term || !matchingDivision || d.id === matchingDivision.id),
    ) ??
    (term ? matchingDivision : undefined) ??
    divisions[0];
  const competitors = division
    ? (selected?.competitors[division.id] ?? [])
    : [];
  // Only this asset matches the seeded event and year. Do not substitute a different show.
  const poster =
    selected?.show.name.toLowerCase().includes("olympia") &&
    selected.show.name.includes("2024")
      ? "/images/joe-weider-olympia.webp"
      : null;
  function chooseShow(id: number) {
    setShowID(id);
    setDivisionID(undefined);
  }
  const showButtons = filtered.map(({ show, divisions: showDivisions }) => (
    <button
      key={show.id}
      onClick={() => chooseShow(show.id)}
      aria-pressed={selected?.show.id === show.id}
      className={cn(
        "flex min-h-12 shrink-0 items-center justify-between gap-3 rounded-md border px-3 py-3 text-left text-sm transition-colors lg:w-full lg:border-transparent",
        selected?.show.id === show.id
          ? "border-primary/30 bg-primary/10 font-semibold text-primary"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span>{show.name}</span>
      <span className="rounded bg-background/70 px-1.5 py-0.5 text-[11px] tabular-nums">
        {showDivisions.length}
      </span>
    </button>
  ));
  return (
    <div
      id="markets"
      className="grid min-w-0 gap-4 lg:grid-cols-[190px_minmax(0,1fr)_320px] xl:grid-cols-[210px_minmax(0,1fr)_340px]"
    >
      <aside
        className="min-w-0 lg:sticky lg:top-20 lg:self-start"
        aria-label="Show navigation"
      >
        <div className="mb-4 hidden items-center gap-2 px-3 text-sm font-semibold lg:flex">
          <Trophy className="size-4 text-primary" />
          Bodybuilding
        </div>
        <label
          className={cn(
            "mb-3 min-h-11 items-center gap-2 rounded-md border bg-card px-3 lg:flex",
            searchOpen ? "flex" : "hidden",
          )}
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search shows or athletes"
            placeholder="Find a show or athlete"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDivisionID(undefined);
            }}
            className="min-w-0 w-full bg-transparent py-3 text-xs outline-none"
          />
        </label>
        <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground lg:block">
          Shows
        </p>
        <div className="flex min-w-0 gap-2 lg:block">
          <button
            aria-label="Search shows or athletes"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground lg:hidden"
          >
            <Search className="size-4" />
          </button>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1">
            {showButtons}
          </div>
        </div>
        <div className="mt-6 hidden border-t pt-5 lg:block">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Divisions
          </p>
          {divisions.map((d) => (
            <button
              key={d.id}
              onClick={() => setDivisionID(d.id)}
              aria-pressed={division?.id === d.id}
              className={cn(
                "flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs hover:bg-muted",
                division?.id === d.id
                  ? "font-semibold text-primary"
                  : "text-muted-foreground",
              )}
            >
              {d.name}
              <ChevronRight className="size-3 shrink-0" />
            </button>
          ))}
        </div>
        <Link
          href="/how-it-works"
          className="mt-6 hidden items-center justify-between border-t px-3 pt-5 text-xs text-muted-foreground hover:text-primary lg:flex"
        >
          How to play
          <ArrowUpRight className="size-3" />
        </Link>
      </aside>
      <section className="min-w-0" aria-label="Betting markets">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-base font-bold tracking-tight sm:text-xl">
            Bodybuilding betting
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[9px] font-semibold text-primary sm:text-[10px]">
            <span className="size-1.5 rounded-full bg-primary" />
            Demo · Virtual funds
          </span>
        </div>
        {selected ? (
          <article className="overflow-hidden rounded-lg border bg-card">
            {poster && (
              <Image
                src={poster}
                alt="Official 2024 Joe Weider’s Olympia event poster, Las Vegas, 10–13 October"
                width={1024}
                height={435}
                priority
                sizes="(max-width: 1023px) 100vw, 700px"
                className="max-h-[120px] sm:max-h-[180px] w-full bg-black object-contain"
              />
            )}
            <div className="border-b p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {selected.show.name}
                </h2>
                <span className="shrink-0 rounded border px-2 py-1 text-[10px] font-medium text-muted-foreground">
                  {selected.show.sandbox
                    ? selected.show.status.toUpperCase()
                    : "EVENT REPLAY"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected.show.location} <span aria-hidden>·</span>{" "}
                {showDate(selected.show.start_time)}
              </p>
            </div>
            {divisions.length > 0 && (
              <>
                <div className="border-b bg-background/30 p-3 sm:hidden">
                  <label htmlFor="market-division" className="sr-only">
                    <SlidersHorizontal className="size-3" />
                    Division
                  </label>
                  <select
                    id="market-division"
                    value={division?.id}
                    onChange={(e) => setDivisionID(Number(e.target.value))}
                    className="min-h-11 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  className="hidden overflow-x-auto border-b bg-background/30 sm:flex"
                  role="group"
                  aria-label="Select division"
                >
                  {divisions.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDivisionID(d.id)}
                      aria-pressed={division?.id === d.id}
                      className={cn(
                        "min-h-12 shrink-0 border-b-2 px-4 text-xs font-semibold transition-colors",
                        division?.id === d.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {division ? (
              <>
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold">
                      <span className="sm:hidden">Division winner</span>
                      <span className="hidden sm:inline">
                        {division.name} — Winner
                      </span>
                    </h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {competitors.length} athletes · Win only
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Fractional odds
                  </span>
                </div>
                <CompetitorTable
                  show={selected.show}
                  division={division}
                  competitors={[...competitors].sort(
                    (a, b) =>
                      (a.odds?.[0]?.odds_value ?? Infinity) -
                      (b.odds?.[0]?.odds_value ?? Infinity),
                  )}
                  asOf={asOf}
                  demo={!selected.show.sandbox}
                />
              </>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                There are no divisions for this show yet. Choose another show to
                explore its markets.
              </p>
            )}
            {selected.show.sandbox && (
              <Link
                href="/customer/sandbox"
                className="block border-t px-4 py-3 text-xs text-primary underline"
              >
                Manage this private event and publish results
              </Link>
            )}
            <div className="border-t bg-background/30 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
              Sample line-ups and prices. Simulated results are separate from
              the official event.
            </div>
          </article>
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center">
            <h2 className="font-semibold">
              {shows.length
                ? "No matching shows or athletes"
                : "No shows available"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {shows.length
                ? "Try a different name or clear your search."
                : "Please try again shortly."}
            </p>
            {query && (
              <button
                className="mt-4 min-h-11 text-sm text-primary"
                onClick={() => setQuery("")}
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </section>
      <SportsbookSlip />
    </div>
  );
}
