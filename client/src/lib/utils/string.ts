/**
 * Capitalizes the first letter of the input string.
 * @param str - The string to capitalize.
 * @returns A new string with the first letter capitalized.
 */
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str; // Return the original string if it's empty or falsy
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getEnumValueOrNull = (
  value: string,
  enumType: object
): string | null => {
  return Object.values(enumType).includes(value) ? value : null;
};
