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
  currency: Intl.NumberFormatOptions["currency"] = "GBP"
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(value);
};

export const roundCurrency = (value: number): number => {
  return Math.round(value * 100) / 100;
};
