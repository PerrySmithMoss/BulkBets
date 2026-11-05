import { test, expect } from "vitest";
import { decimalToFraction, decimalToPercentage } from "./math";
import { formatCurrency, formatInputAsCurrency } from "./currency";

test.each([[2, "1/1"], [1.5, "1/2"], [3.25, "9/4"], [null, "N/A"]])(
  "decimal odds %s display as %s", (odds, expected) => {
    expect(decimalToFraction(odds as number | null)).toBe(expected);
  },
);

test("implied probability is formatted for the competitor table", () => {
  expect(decimalToPercentage(4, true)).toBe("25%");
  expect(decimalToPercentage(3)).toBe("33.33%");
  expect(decimalToPercentage(null)).toBe("");
});

test("stake input preserves decimal entry and formats currency", () => {
  expect(formatInputAsCurrency("001234.567")).toBe("1,234.56");
  expect(formatInputAsCurrency(".")).toBe("0.");
  expect(formatInputAsCurrency("")).toBe("");
  expect(formatCurrency(12.5)).toBe("£12.50");
});
