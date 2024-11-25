export const formatAsCurrency = (value: string) => {
  // Remove any non-numeric characters except decimal point
  const cleanValue = value.replace(/[^\d.]/g, "");

  // Ensure only one decimal point
  const parts = cleanValue.split(".");
  const wholePart = parts[0];
  const decimalPart = parts[1] || "";

  // Add commas to the whole number part
  const formattedWholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Combine with decimal part (limited to 2 places)
  return decimalPart
    ? `${formattedWholePart}.${decimalPart.slice(0, 2)}`
    : formattedWholePart;
};
