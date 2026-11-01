import { Show } from "@/types/api/show/show";
import { Division } from "@/types/api/division/division";

export function isMarketOpen(show: Show, division: Division, now: number) {
  return (
    ["upcoming", "ongoing"].includes(show.status.toLowerCase()) &&
    Date.parse(show.end_time) > now &&
    division.status.toLowerCase() === "scheduled" &&
    Date.parse(division.start_time) > now
  );
}

export function showStatus(show: Show, now: number) {
  if (show.status.toLowerCase() === "canceled") return "Canceled";
  if (
    show.status.toLowerCase() === "completed" ||
    Date.parse(show.end_time) <= now
  )
    return "Completed";
  if (Date.parse(show.start_time) <= now) return "In progress";
  return "Upcoming";
}

export function showDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
