"use server";
import { unstable_rethrow } from "next/navigation";
import { Show } from "@/types/api/show/show";
import { ShowDetailsResponse } from "@/types/api/show/show-details-response";
import { fetchShowById } from "./fetch-show-by-id";

export async function fetchShowDirectory() {
  try {
    const response = await fetch(
      `${process.env.API_URL ?? "http://localhost:8080"}/api/v1/shows`,
      { cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) throw new Error("Show directory unavailable");
    const { data }: { data: Show[] } = await response.json();
    const results = await Promise.all(
      data.map((show) => fetchShowById(show.id)),
    );
    return {
      shows: results.flatMap((result) => (result.data ? [result.data] : [])),
      error: results.some((result) => result.error),
    };
  } catch (error) {
    unstable_rethrow(error);
    return { shows: [] as ShowDetailsResponse["data"][], error: true };
  }
}
