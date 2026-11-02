import { expect, test } from "@jest/globals";
import { multiplyMoney } from "./currency";
import { calculateBetSlipTotals, calculateSingularBetReturn } from "./betting";
import { ActiveBet, BetSlipState } from "@/types/betting";

test("half-penny payouts round up in the same way as the API", () => {
  expect(multiplyMoney(0.29, 2.5)).toBe(0.73);
  expect(multiplyMoney(4.37, 1.5)).toBe(6.56);
});

test("each single is rounded before totals are added", () => {
  const bets = [
    { amount: "0.29", odds: 2.5 },
    { amount: "0.29", odds: 2.5 },
  ] as ActiveBet[];
  expect(calculateSingularBetReturn(bets)).toBe(1.46);
});

test("decimal stakes sum to an exact penny total", () => {
  const slip = {
    activeBets: [
      { amount: "0.10", odds: 2 },
      { amount: "0.20", odds: 2 },
    ],
    stakeMultiplierRawValue: "",
  } as BetSlipState;
  expect(calculateBetSlipTotals(slip).totalStake).toBe(0.3);
});
