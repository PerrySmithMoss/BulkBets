import { Locale, parseISO } from "date-fns";
import { format as formatDate } from "date-fns";
import { toZonedTime } from "date-fns-tz";

type FormatOptions = {
  format?: string; // Optional custom date format (e.g., "EEE MMM do, yyyy 'at' hh:mm a")
  locale?: Locale; // Optional locale object (for use with date-fns)
};

export const formatTimestamp = (
  utcTimestamp: string, // The UTC timestamp (e.g., "2024-12-18T21:09:32.60251Z")
  options?: FormatOptions
): string => {
  // Parse the UTC timestamp into a Date object
  const date = parseISO(utcTimestamp);

  // Get the user's timezone from the browser
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Convert the date to the user's local timezone
  const dateInUserTimeZone = toZonedTime(date, userTimeZone);

  // If a custom format is provided, use it with date-fns; otherwise, use Intl.DateTimeFormat
  if (options?.format) {
    return formatDate(dateInUserTimeZone, options.format, {
      locale: options.locale,
    });
  }

  // Default to a locale-aware date and time format
  return new Intl.DateTimeFormat(navigator.language, {
    dateStyle: "medium", // Can be 'short', 'medium', 'long', or 'full'
    timeStyle: "short", // Can be 'short', 'medium', 'long', or 'full'
  }).format(dateInUserTimeZone);
};
