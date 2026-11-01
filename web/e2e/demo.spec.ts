import { ShowDetailsResponse } from "../src/types/api/show/show-details-response";
import { BetResponse } from "../src/types/api/bets/bet-response";
import { test, expect, type APIRequestContext } from "@playwright/test";

async function selection(
  request: APIRequestContext,
  showID = 2,
  divisionIndex = 0,
  winner = true,
) {
  const { data }: ShowDetailsResponse = await (
    await request.get(`/api/v1/shows/${showID}`)
  ).json();
  const division = data.divisions[divisionIndex];
  const athletes = [...data.competitors[division.id]].sort(
    (a, b) =>
      a.odds.find((o) => o.bet_type === "win")!.odds_value -
        b.odds.find((o) => o.bet_type === "win")!.odds_value ||
      a.id.localeCompare(b.id),
  );
  const athlete = winner ? athletes[0] : athletes.at(-1)!;
  const odds = athlete.odds.find((o) => o.bet_type === "win")!;
  return {
    showId: showID,
    divisionId: division.id,
    competitorId: athlete.id,
    betTypeId: odds.bet_type_id,
    betType: "win",
    odds: odds.odds_value,
    amount: 10,
  };
}
const balance = async (r: APIRequestContext) =>
  (await (await r.get("/api/v1/users/me")).json()).data.balance;

test("demo starts without registration, persists, settles returns and resets", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Select Hadi Choopan/ }).click();
  await page.getByLabel("Stake for Hadi Choopan").fill("10");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Try demo" })
    .click();
  await expect(page.getByLabel("Account balance")).toContainText("1,000.00");
  const me = await (await page.request.get("/api/v1/users/me")).json();
  expect(me.data.is_demo).toBe(true);
  await page.getByRole("button", { name: "Place demo bet" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Bet placed" }),
  ).toBeVisible();
  await expect(page.getByLabel("Account balance")).toContainText("990.00");
  await page.reload();
  expect(await balance(page.request)).toBe(990);
  await page.getByRole("button", { name: "Simulate results" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 bet settled" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View my bets" }).click();
  await expect(page.getByText("Hadi Choopan", { exact: true })).toBeVisible();
  await expect(page.getByText("Live Now", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Cash Out/ })).toHaveCount(0);
  await page
    .getByRole("link", { name: "Back to markets", exact: false })
    .click();
  await page.getByRole("button", { name: "Reset my demo" }).click();
  await expect(page.getByLabel("Account balance")).toContainText("1,000.00");
  expect(
    (await (await page.request.get("/api/v1/bets")).json()).data.bets ?? [],
  ).toHaveLength(0);
});

test("historical singles and pure accumulators settle once, include stakes and remain isolated", async ({
  playwright,
  request,
}) => {
  const other = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    const first = await (await request.post("/api/v1/demo/start")).json();
    const second = await (await other.post("/api/v1/demo/start")).json();
    expect(first.data.id).not.toBe(second.data.id);
    expect(
      (await (await request.post("/api/v1/demo/start")).json()).data.id,
    ).toBe(first.data.id);
    const winner = await selection(request);
    const loser = await selection(request, 2, 0, false);
    expect(
      (
        await request.post("/api/v1/bets", {
          data: { activeBets: [winner, loser] },
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await other.post("/api/v1/bets", { data: { activeBets: [winner] } })
      ).status(),
    ).toBe(201);
    const results = await Promise.all([
      request.post("/api/v1/demo/settle"),
      request.post("/api/v1/demo/settle"),
    ]);
    const settled = await Promise.all(results.map((r) => r.json()));
    expect(settled.reduce((sum, r) => sum + r.data.settled_bets, 0)).toBe(2);
    expect(await balance(request)).toBe(980 + 10 * winner.odds);
    expect(await balance(other)).toBe(990);
    const otherBets = (await (await other.get("/api/v1/bets")).json()).data
      .bets;
    expect(otherBets).toHaveLength(1);
    expect(otherBets[0].status).toBe("pending");
    const next = await selection(request, 2, 1);
    const legs = [winner, next].map((b) => ({ ...b, amount: null }));
    const before = await balance(request);
    expect(
      (
        await request.post("/api/v1/bets", {
          data: { stakeMultiplier: 5, activeBets: legs },
        })
      ).status(),
    ).toBe(201);
    expect(await balance(request)).toBe(before - 5);
    const history: BetResponse = await (
      await request.get("/api/v1/bets?limit=1")
    ).json();
    expect(history.data.bets).toHaveLength(3); // parent page includes both component details
    const accumulator = history.data.bets.find((b) => b.is_accumulator)!;
    const expectedReturn =
      Math.round((Math.round(winner.odds * next.odds * 100) / 100) * 5 * 100) /
      100;
    expect(accumulator.potential_payout).toBe(expectedReturn);
    const final = await (await request.post("/api/v1/demo/settle")).json();
    expect(final.data.payout).toBe(expectedReturn);
    expect(await balance(request)).toBeCloseTo(before - 5 + expectedReturn, 2);
    expect((await request.post("/api/v1/demo/reset")).ok()).toBe(true);
    expect(await balance(request)).toBe(1000);
    expect(await balance(other)).toBe(990);
    expect(
      (await (await other.get("/api/v1/bets")).json()).data.bets,
    ).toHaveLength(1);
  } finally {
    await other.dispose();
  }
});

test("demo API rejects unauthenticated, ordinary-account and invalid stake requests", async ({
  request,
}) => {
  expect((await request.post("/api/v1/demo/reset")).status()).toBe(401);
  expect((await request.post("/api/v1/demo/settle")).status()).toBe(401);
  await request.post("/api/v1/auth/login", {
    data: { email: "admin@bulkbets.com", password: "e2e-password" },
  });
  expect((await request.post("/api/v1/demo/reset")).status()).toBe(403);
  expect((await request.post("/api/v1/demo/settle")).status()).toBe(403);
  await request.post("/api/v1/demo/start");
  const bet = await selection(request);
  for (const amount of [-10, 0.001]) {
    expect(
      (
        await request.post("/api/v1/bets", {
          data: { activeBets: [{ ...bet, amount }] },
        })
      ).status(),
    ).toBe(400);
  }
  expect(
    (
      await request.post("/api/v1/bets", {
        data: { activeBets: [{ ...bet, odds: 999 }] },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/v1/bets", {
        data: { activeBets: [{ ...bet, amount: 1001 }] },
      })
    ).status(),
  ).toBe(403);
  expect(await balance(request)).toBe(1000);
});
