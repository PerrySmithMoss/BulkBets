export function decimalToFraction(
  decimalOdds: number | null | undefined
): string {
  if (decimalOdds == null) {
    return "N/A";
  }

  if (decimalOdds <= 1) {
    return "0/1"; // No profit scenario
  }

  const fractionalPart = decimalOdds - 1;

  // helper function to find the greatest common divisor (GCD)
  function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
  }

  const precision = 1000; // precision to limit denominators
  const numerator = Math.round(fractionalPart * precision);
  const denominator = precision;

  // simplify the fraction
  const divisor = gcd(numerator, denominator);
  const simplifiedNumerator = numerator / divisor;
  const simplifiedDenominator = denominator / divisor;

  return `${simplifiedNumerator}/${simplifiedDenominator}`;
}

export function decimalToPercentage(
  decimalOdds: number | null | undefined,
  displayAsInteger: boolean = false
): string {
  if (decimalOdds == null) {
    return "";
  }

  // handle invalid decimal odds (e.g., less than or equal to 1)
  if (decimalOdds <= 1) {
    // TODO: throw error or log error here?
    return ""; // decimal odds must be greater than 1
  }

  // calculate implied probability as a percentage
  let probability: number = (1 / decimalOdds) * 100;

  if (displayAsInteger) {
    let roundedProbability: number = Math.round(probability);
    return `${roundedProbability}%`;
  } else {
    return `${probability.toFixed(2)}%`;
  }
}
