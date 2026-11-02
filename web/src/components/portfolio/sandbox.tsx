"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { portfolioRequest } from "@/lib/api/portfolio";
import { Show } from "@/types/api/show/show";
import { ShowDetailsResponse } from "@/types/api/show/show-details-response";
import { Competitor } from "@/types/api/competitors/competitors";
import { formatCurrency } from "@/lib/utils/currency";
import { useUser } from "@/store/user/user-context";

type Details = ShowDetailsResponse["data"];
const field =
  "mt-1 min-h-11 w-full rounded-md border bg-background px-3 text-sm";
const starters = [
  { first_name: "Alex", last_name: "Stone", nationality: "British", odds: 2 },
  { first_name: "Jordan", last_name: "Reed", nationality: "American", odds: 3 },
  { first_name: "Sam", last_name: "Rivera", nationality: "Spanish", odds: 5 },
];

function AthleteForm({
  athlete,
  onSave,
}: {
  athlete?: Competitor;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setBusy(true);
        try {
          await onSave({
            first_name: data.get("first_name"),
            last_name: data.get("last_name"),
            nationality: data.get("nationality"),
            odds: Number(data.get("odds")),
          });
          if (!athlete) form.reset();
        } finally {
          setBusy(false);
        }
      }}
      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
    >
      <label className="text-xs">
        First name
        <input
          className={field}
          name="first_name"
          required
          maxLength={50}
          defaultValue={athlete?.first_name}
        />
      </label>
      <label className="text-xs">
        Last name
        <input
          className={field}
          name="last_name"
          required
          maxLength={50}
          defaultValue={athlete?.last_name}
        />
      </label>
      <label className="text-xs">
        Nationality
        <input
          className={field}
          name="nationality"
          maxLength={50}
          defaultValue={athlete?.nationality ?? ""}
        />
      </label>
      <label className="text-xs">
        Decimal odds
        <input
          className={field}
          name="odds"
          type="number"
          required
          min="1.01"
          max="100"
          step="0.01"
          defaultValue={athlete?.odds?.[0]?.odds_value ?? 3}
        />
      </label>
      <Button
        disabled={busy}
        variant="outline"
        className="min-h-11 sm:col-span-2"
      >
        {busy ? "Saving…" : athlete ? "Save athlete and odds" : "Add athlete"}
      </Button>
    </form>
  );
}

export function SandboxPanel() {
  const { user, refreshUser } = useUser();
  const userID = user?.id;
  const [owner, setOwner] = useState<string>();
  const [savedShows, setShows] = useState<Show[]>([]);
  const shows = owner === userID ? savedShows : [];
  const [id, setID] = useState<number>();
  const [savedDetails, setDetails] = useState<Details>();
  const details = owner === userID ? savedDetails : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("favourite");
  const [preview, setPreview] = useState<{
    settled_bets: number;
    payout: number;
    winners: string[];
  }>();
  const load = useCallback(async () => {
    const list = (await portfolioRequest<Show[]>("shows")).filter(
      (s) => s.sandbox,
    );
    const current = list.some((s) => s.id === id) ? id : list[0]?.id;
    const next = current
      ? await portfolioRequest<Details>(`shows/${current}`)
      : undefined;
    setShows(list);
    setDetails(next);
    setOwner(userID);
    setError("");
  }, [id, userID]);
  useEffect(() => {
    let active = true;
    void portfolioRequest<Show[]>("shows")
      .then(async (all) => {
        const list = all.filter((s) => s.sandbox);
        const current = list.some((s) => s.id === id) ? id : list[0]?.id;
        const next = current
          ? await portfolioRequest<Details>(`shows/${current}`)
          : undefined;
        if (active) {
          setShows(list);
          setOwner(userID);
          setDetails(next);
        }
      })
      .catch(() => {
        if (active)
          setError("Your events could not be loaded. Try refreshing.");
      });
    return () => {
      active = false;
    };
  }, [id, userID]);
  useEffect(() => {
    if (details?.show.status.toLowerCase() !== "ongoing") return;
    const timer = setInterval(() => {
      void Promise.all([load(), refreshUser()]).catch(() =>
        setError(
          "Connection lost. Your event will finish when the service recovers.",
        ),
      );
    }, 1500);
    return () => clearInterval(timer);
  }, [details?.show.status, load, refreshUser]);
  async function action(
    work: () => Promise<unknown>,
    success = "Saved. Only your private demo changed.",
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    setPreview(undefined);
    try {
      await work();
      setMessage(success);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to complete this action.",
      );
    } finally {
      setBusy(false);
    }
  }
  const selectedID = details?.show.id;
  const editable = details?.show.status.toLowerCase() === "upcoming";
  const edit = (body: Record<string, unknown>) =>
    action(() =>
      portfolioRequest(`sandbox/shows/${selectedID}`, body, "PATCH"),
    );
  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Event studio</h1>
        <Link href="/" className="text-sm text-primary">
          ← Back to markets
        </Link>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
        Run your own private bodybuilding show. Manage athletes and prices,
        place virtual bets, preview the outcome, then close the market and watch
        winnings arrive automatically. Other visitors’ events and balances stay
        separate.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-destructive p-4 text-sm"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm"
        >
          {message}
        </p>
      )}
      {!user?.is_demo ? (
        <p className="mt-6">
          Start a visitor demo from the markets page to use the event studio.
        </p>
      ) : (
        <>
          <form
            className="my-6 rounded-xl border bg-card p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void action(async () => {
                const created = await portfolioRequest<{ id: number }>(
                  "sandbox/shows",
                  {
                    name: data.get("name"),
                    division: data.get("division"),
                    competitors: starters,
                  },
                );
                setID(created.id);
              }, "Private event created with three fictional athletes. Edit the line-up below, or open its market to place bets.");
            }}
          >
            <h2 className="mb-4 font-semibold">Create a private event</h2>
            <fieldset
              disabled={busy}
              className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <label className="text-sm">
                Show name
                <input
                  name="name"
                  className={field}
                  required
                  maxLength={100}
                  defaultValue="BulkBets Invitational"
                />
              </label>
              <label className="text-sm">
                First division
                <input
                  name="division"
                  className={field}
                  required
                  maxLength={100}
                  defaultValue="Men’s Open"
                />
              </label>
              <Button className="min-h-11">Create event</Button>
            </fieldset>
            <p className="mt-3 text-xs text-muted-foreground">
              Up to 10 events, 8 divisions per event and 20 athletes per
              division. Reset my demo clears your studio.
            </p>
          </form>
          {!!shows.length && (
            <label className="block text-sm">
              Choose your event
              <select
                aria-label="Choose your event"
                className={`${field} mb-6 max-w-lg`}
                value={selectedID ?? ""}
                onChange={(e) => {
                  setID(Number(e.target.value));
                  setPreview(undefined);
                  setMessage("");
                }}
              >
                {shows.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.status}
                  </option>
                ))}
              </select>
            </label>
          )}
          {details && (
            <section className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{details.show.name}</h2>
                  <p
                    className="mt-1 text-sm capitalize text-primary"
                    aria-label="Event status"
                  >
                    {details.show.status === "ongoing"
                      ? "Market closed · judging in progress"
                      : details.show.status === "completed"
                        ? "Results published · bets settled"
                        : details.show.status === "canceled"
                          ? "Event cancelled · stakes refunded"
                          : details.divisions.some(
                                (d) => d.status === "ongoing",
                              )
                            ? "Betting suspended"
                            : "Betting open"}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/?show=${selectedID}`}>Open event market</Link>
                </Button>
              </div>
              {editable && (
                <>
                  <form
                    className="flex flex-wrap gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void edit({
                        operation: "rename",
                        name: new FormData(e.currentTarget).get("name"),
                      });
                    }}
                  >
                    <label className="min-w-0 flex-1 text-xs">
                      Rename event
                      <input
                        name="name"
                        className={field}
                        defaultValue={details.show.name}
                        key={`${selectedID}-${details.show.name}`}
                        required
                        maxLength={100}
                      />
                    </label>
                    <Button
                      disabled={busy}
                      className="self-end"
                      variant="outline"
                    >
                      Save name
                    </Button>
                  </form>
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() =>
                      void edit({
                        operation: details.divisions.some(
                          (d) => d.status === "ongoing",
                        )
                          ? "reopen"
                          : "suspend",
                      })
                    }
                  >
                    {details.divisions.some((d) => d.status === "ongoing")
                      ? "Reopen betting"
                      : "Suspend betting"}
                  </Button>
                </>
              )}
              {details.show.status === "completed" && (
                <p
                  aria-label="Published winners"
                  className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary"
                >
                  Winners:{" "}
                  {Object.values(details.competitors)
                    .flat()
                    .filter((a) => a.final_position === 1)
                    .map((a) => `${a.first_name} ${a.last_name}`)
                    .join(", ")}
                </p>
              )}
              {details.divisions.map((division) => (
                <section key={division.id} className="space-y-3 border-t pt-5">
                  <h3 className="font-semibold">{division.name}</h3>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {(details.competitors[division.id] ?? []).map((athlete) => (
                      <div
                        key={`${athlete.id}-${athlete.odds?.[0]?.odds_value}`}
                      >
                        {editable ? (
                          <>
                            <AthleteForm
                              athlete={athlete}
                              onSave={(competitor) =>
                                edit({
                                  operation: "update_competitor",
                                  division_id: division.id,
                                  participant_id: athlete.id,
                                  competitor,
                                })
                              }
                            />
                            <button
                              disabled={busy}
                              className="min-h-11 text-xs text-primary underline"
                              onClick={() =>
                                void edit({
                                  operation: "set_winner",
                                  division_id: division.id,
                                  participant_id: athlete.id,
                                })
                              }
                            >
                              {athlete.final_position === 1
                                ? "Selected simulated winner"
                                : `Choose ${athlete.first_name} as winner`}
                            </button>
                          </>
                        ) : (
                          <p className="rounded-lg border p-4 text-sm">
                            {athlete.first_name} {athlete.last_name} ·{" "}
                            {athlete.odds?.[0]?.odds_value} decimal odds
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {editable && (
                    <details>
                      <summary className="min-h-11 cursor-pointer text-sm text-primary">
                        Add an athlete to {division.name}
                      </summary>
                      <AthleteForm
                        onSave={(competitor) =>
                          edit({
                            operation: "add_competitor",
                            division_id: division.id,
                            competitor,
                          })
                        }
                      />
                    </details>
                  )}
                </section>
              ))}
              {editable && (
                <>
                  <form
                    className="flex flex-wrap items-end gap-3 border-t pt-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void edit({
                        operation: "add_division",
                        name: new FormData(e.currentTarget).get("name"),
                      });
                    }}
                  >
                    <label className="flex-1 text-xs">
                      New division
                      <input
                        className={field}
                        name="name"
                        required
                        maxLength={100}
                        placeholder="Classic Physique"
                      />
                    </label>
                    <Button variant="outline" disabled={busy}>
                      Add division
                    </Button>
                  </form>
                  <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <h3 className="font-semibold">Publish simulated results</h3>
                    <label className="block text-sm">
                      Outcome
                      <select
                        className={field}
                        value={mode}
                        onChange={(e) => {
                          setMode(e.target.value);
                          setPreview(undefined);
                        }}
                      >
                        <option value="favourite">
                          Selected winners, otherwise favourites win
                        </option>
                        <option value="upset">
                          Selected winners, otherwise outsiders win
                        </option>
                        <option value="void">
                          Cancel event and refund stakes
                        </option>
                      </select>
                    </label>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Preview changes nothing. Running the event immediately
                      closes betting, then publishes results and credits virtual
                      returns after five seconds. A cancelled accumulator leg
                      counts at odds of 1.00.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() =>
                          void action(async () => {
                            setPreview(
                              await portfolioRequest(
                                `sandbox/shows/${selectedID}/preview`,
                                { mode },
                              ),
                            );
                          }, "Preview ready. No balances or bets changed.")
                        }
                      >
                        Preview settlement
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void action(
                            () =>
                              portfolioRequest(
                                `sandbox/shows/${selectedID}/run`,
                                { mode },
                              ),
                            "Market closed. Judging takes about five seconds; winnings will be credited automatically.",
                          )
                        }
                      >
                        {mode === "void" ? "Cancel and refund" : "Run event"}
                      </Button>
                    </div>
                    {preview && (
                      <div aria-label="Settlement preview" className="text-sm">
                        <p>
                          {preview.settled_bets} bets ready ·{" "}
                          {formatCurrency(preview.payout)} in virtual returns
                        </p>
                        {mode !== "void" && (
                          <p className="mt-2 text-xs">
                            Winners:{" "}
                            {Object.values(details.competitors)
                              .flat()
                              .filter((a) => preview.winners.includes(a.id))
                              .map((a) => `${a.first_name} ${a.last_name}`)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
              {!editable && (
                <Link
                  href="/customer/wallet"
                  className="inline-flex min-h-11 items-center text-sm text-primary underline"
                >
                  View wallet and settlement receipts
                </Link>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
