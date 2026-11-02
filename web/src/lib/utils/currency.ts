export const formatInputAsCurrency = (value: string | number): string => {
  // Convert the value to a string to ensure compatibility
  const stringValue = String(value).trim();

  // Return early for empty strings to allow clearing the input
  if (stringValue === "") return "";

  // Remove non-numeric characters except the first decimal point
  let cleanValue = stringValue
    .replace(/[^0-9.]/g, "") // Remove non-numeric characters except "."
    .replace(/(\..*?)\./g, "$1"); // Keep only the first decimal point

  // Split into whole and decimal parts
  const parts = cleanValue.split(".");
  let wholePart = parts[0] || "0"; // Default to "0" if the input starts with a decimal
  let decimalPart = parts[1] || ""; // No decimals if not present

  // Handle leading zeros in the whole part
  wholePart = wholePart.replace(/^0+(?!$)/, ""); // Remove leading zeros unless the value is "0"

  // Format the whole number part with commas
  const formattedWholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Trim decimal part to two places if applicable
  if (decimalPart.length > 2) {
    decimalPart = decimalPart.slice(0, 2);
  }

  // Handle special case where input is a decimal point only
  if (stringValue === ".") return "0.";

  // Return formatted result
  if (decimalPart) {
    return `${formattedWholePart}.${decimalPart}`;
  }

  // Handle inputs with trailing decimal point
  if (stringValue.endsWith(".")) {
    return `${formattedWholePart}.`;
  }

  return formattedWholePart;
};

export const formatCurrency = (
  value: number,
  locale: Intl.LocalesArgument = "en-GB",
  currency: Intl.NumberFormatOptions["currency"] = "GBP",
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(value);
};

export const roundCurrency = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export const currencySymbolMap: Map<string, string> = new Map([
  ["GBP", "£"], // British Pound
  ["USD", "$"], // US Dollar
  ["EUR", "€"], // Euro
  ["JPY", "¥"], // Japanese Yen
  ["AUD", "A$"], // Australian Dollar
  ["CAD", "C$"], // Canadian Dollar
  ["CHF", "CHF"], // Swiss Franc
  ["CNY", "¥"], // Chinese Yuan
  ["INR", "₹"], // Indian Rupee
  ["NZD", "NZ$"], // New Zealand Dollar
  ["ZAR", "R"], // South African Rand
  ["KRW", "₩"], // South Korean Won
  ["SEK", "kr"], // Swedish Krona
  ["NOK", "kr"], // Norwegian Krone
  ["DKK", "kr"], // Danish Krone
]);

export const getCurrencySymbol = (currencyCode: string): string => {
  return currencySymbolMap.get(currencyCode) ?? "";
};

export const isValidNumber = (input: string): boolean => {
  const trimmedInput = input.trim();
  return trimmedInput !== "" && !isNaN(Number(trimmedInput));
};

// Stakes and prices arrive with two decimal places. Keep their product exact and
// round half pennies up once, matching the API's decimal calculation.
export function multiplyMoney(...values: number[]): number {
  let numerator = BigInt(1),
    denominator = BigInt(1);
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) return 0;
    numerator *= BigInt(Math.round(value * 100));
    denominator *= BigInt(100);
  }
  const cents =
    (numerator * BigInt(100) + denominator / BigInt(2)) / denominator;
  return Number(cents) / 100;
}
