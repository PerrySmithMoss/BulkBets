import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("wallet transfers persist receipts and retries credit once", async ({
  page,
}, testInfo) => {
  await page.request.post("/api/v1/demo/start");
  await page.goto("/customer/wallet");
  await expect(page.getByLabel("Wallet balance")).toContainText("1,000.00");
  await page.getByLabel("Transfer amount").fill("125.50");
  await page
    .getByRole("button", { name: "Deposit demo funds", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Demo deposit complete");
  await expect(page.getByLabel("Wallet balance")).toContainText("1,125.50");
  await page
    .getByRole("combobox", { name: "Action", exact: true })
    .selectOption("DEMO_WITHDRAWAL");
  await page.getByLabel("Transfer amount").fill("25.50");
  await page
    .getByRole("button", { name: "Withdraw demo funds", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Demo withdrawal complete",
  );
  await page.reload();
  await expect(page.getByLabel("Wallet balance")).toContainText("1,100.00");
  await page.screenshot({
    path: testInfo.outputPath("wallet-desktop.png"),
    animations: "disabled",
    scale: "css",
  });
  const payload = {
    kind: "DEMO_DEPOSIT",
    amount: 10,
    request_key: randomUUID(),
  };
  const responses = await Promise.all(
    Array.from({ length: 5 }, () =>
      page.request.post("/api/v1/wallet/transfer", { data: payload }),
    ),
  );
  for (const response of responses) expect(response.ok()).toBe(true);
  expect(
    new Set(
      await Promise.all(responses.map(async (r) => (await r.json()).data.id)),
    ).size,
  ).toBe(1);
  expect(
    (await (await page.request.get("/api/v1/users/me")).json()).data.balance,
  ).toBe(1110);
  expect(
    (
      await page.request.post("/api/v1/wallet/transfer", {
        data: { ...payload, amount: 20 },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.post("/api/v1/wallet/transfer", {
        data: {
          kind: "DEMO_WITHDRAWAL",
          amount: 9999,
          request_key: randomUUID(),
        },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.post("/api/v1/wallet/transfer", {
        data: { ...payload, request_key: randomUUID() },
        headers: { Origin: "https://untrusted.invalid" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (await (await page.request.get("/api/v1/wallet")).json()).data,
  ).toHaveLength(3);
});

test("private studio edits odds, previews results and pays automatically once", async ({
  page,
  playwright,
}) => {
  const other = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    await page.request.post("/api/v1/demo/start");
    await other.post("/api/v1/demo/start");
    await page.goto("/customer/sandbox");
    await page
      .getByLabel("Show name", { exact: true })
      .fill("Portfolio Championship");
    await page
      .getByRole("button", { name: "Create event", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Portfolio Championship",
        exact: true,
      }),
    ).toBeVisible();
    const shows = (await (await page.request.get("/api/v1/shows")).json()).data;
    const show = shows.find(
      (s: { sandbox: boolean; name: string }) =>
        s.sandbox && s.name === "Portfolio Championship",
    );
    expect((await other.get(`/api/v1/shows/${show.id}`)).status()).toBe(404);
    expect(
      (
        await other.patch(`/api/v1/sandbox/shows/${show.id}`, {
          data: { operation: "rename", name: "Stolen" },
        })
      ).status(),
    ).toBe(404);
    await page
      .getByRole("button", { name: "Suspend betting", exact: true })
      .click();
    await expect(page.getByLabel("Event status")).toHaveText(
      "Betting suspended",
    );
    await page
      .getByRole("button", { name: "Reopen betting", exact: true })
      .click();
    await expect(page.getByLabel("Event status")).toHaveText("Betting open");
    const athleteForm = page
      .locator("form")
      .filter({ has: page.locator('input[name="first_name"][value="Alex"]') });
    await athleteForm.getByLabel("Decimal odds").fill("2.50");
    await athleteForm
      .getByRole("button", { name: "Save athlete and odds" })
      .click();
    await expect(athleteForm.getByLabel("Decimal odds")).toHaveValue("2.5");
    await page.getByRole("link", { name: "Open event market" }).click();
    await page.getByRole("button", { name: /Select Alex Stone/ }).click();
    await page.getByLabel("Stake for Alex Stone").fill("10");
    await page
      .getByRole("button", { name: "Place demo bet", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Bet placed" }),
    ).toBeVisible();
    await page.goto("/customer/sandbox");
    await page
      .getByRole("button", { name: "Preview settlement", exact: true })
      .click();
    await expect(page.getByLabel("Settlement preview")).toContainText("£25.00");
    expect(
      (await (await page.request.get("/api/v1/users/me")).json()).data.balance,
    ).toBe(990);
    await page.getByRole("button", { name: "Run event", exact: true }).click();
    await expect(page.getByLabel("Event status")).toContainText(
      "judging in progress",
    );
    await expect(page.getByLabel("Event status")).toContainText(
      "bets settled",
      { timeout: 15000 },
    );
    await expect(page.getByLabel("Published winners")).toContainText(
      "Alex Stone",
    );
    expect(
      (await (await page.request.get("/api/v1/users/me")).json()).data.balance,
    ).toBe(1015);
    expect(
      (
        await page.request.post(`/api/v1/sandbox/shows/${show.id}/run`, {
          data: { mode: "favourite" },
        })
      ).status(),
    ).toBe(409);
    const receipts = (await (await page.request.get("/api/v1/wallet")).json())
      .data;
    expect(
      receipts.filter((t: { kind: string }) => t.kind === "BET_PAYOUT"),
    ).toHaveLength(1);
    expect(
      (await (await other.get("/api/v1/users/me")).json()).data.balance,
    ).toBe(1000);
    expect((await page.request.post("/api/v1/demo/reset")).ok()).toBe(true);
    expect((await page.request.get(`/api/v1/shows/${show.id}`)).status()).toBe(
      404,
    );
  } finally {
    await other.dispose();
  }
});

test("cancelled replay returns single and accumulator stakes once", async ({
  request,
}) => {
  await request.post("/api/v1/demo/start");
  const data = (await (await request.get("/api/v1/shows/2")).json()).data;
  const selections = data.divisions.slice(0, 2).map((d: { id: number }) => {
    const a = data.competitors[d.id][0];
    const o = a.odds.find((o: { bet_type: string }) => o.bet_type === "win");
    return {
      showId: 2,
      divisionId: d.id,
      competitorId: a.id,
      betType: "win",
      betTypeId: o.bet_type_id,
      odds: o.odds_value,
      amount: 5,
    };
  });
  expect(
    (
      await request.post("/api/v1/bets", {
        data: { activeBets: selections, stakeMultiplier: 10 },
      })
    ).status(),
  ).toBe(201);
  const result = (
    await (await request.post("/api/v1/demo/settle?mode=void")).json()
  ).data;
  expect(result.payout).toBe(20);
  expect(result.settled_bets).toBe(3);
  expect(
    (await (await request.get("/api/v1/users/me")).json()).data.balance,
  ).toBe(1000);
  expect(
    (await (await request.post("/api/v1/demo/settle?mode=void")).json()).data
      .payout,
  ).toBe(0);
});

test("wallet receives automatic event winnings while open", async ({
  page,
}) => {
  await page.request.post("/api/v1/demo/start");
  const created = await (
    await page.request.post("/api/v1/sandbox/shows", {
      data: {
        name: "Wallet live event",
        division: "Open",
        competitors: [
          { first_name: "Alex", last_name: "Stone", odds: 2 },
          { first_name: "Sam", last_name: "Reed", odds: 4 },
        ],
      },
    })
  ).json();
  const event = (
    await (await page.request.get(`/api/v1/shows/${created.data.id}`)).json()
  ).data;
  const d = event.divisions[0];
  const athlete = event.competitors[d.id].find(
    (a: { first_name: string }) => a.first_name === "Alex",
  );
  expect(
    (
      await page.request.post("/api/v1/bets", {
        data: {
          activeBets: [
            {
              showId: event.show.id,
              divisionId: d.id,
              competitorId: athlete.id,
              betType: "win",
              betTypeId: athlete.odds[0].bet_type_id,
              odds: 2,
              amount: 10,
            },
          ],
        },
      })
    ).status(),
  ).toBe(201);
  await page.request.post(`/api/v1/sandbox/shows/${event.show.id}/run`, {
    data: { mode: "favourite" },
  });
  await page.goto("/customer/wallet");
  await expect(page.getByLabel("Wallet balance")).toContainText("990.00");
  await expect(page.getByLabel("Wallet balance")).toContainText("1,010.00", {
    timeout: 15000,
  });
  await expect(page.getByText("Winnings", { exact: true })).toBeVisible();
});

test("saved selections stay out of the wallet and studio", async ({ page }) => {
  await page.request.post("/api/v1/demo/start");
  await page.goto("/");
  await page.getByRole("button", { name: /Select Derek Lunsford/ }).click();
  await page.getByLabel("Stake for Derek Lunsford").fill("10");
  await page.goto("/customer/wallet");
  await expect(
    page.getByRole("heading", { name: "Demo wallet", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Place Bet/ })).toHaveCount(0);
  await page.goto("/customer/sandbox");
  await expect(
    page.getByRole("heading", { name: "Event studio", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Place Bet/ })).toHaveCount(0);
});
