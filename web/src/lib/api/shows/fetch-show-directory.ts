"use server";

import { getApiOrigin } from "@/lib/api/origin";

import { formatCookieHeader, getAuthCookies } from "@/lib/utils/cookies";
import { unstable_rethrow } from "next/navigation";
import { Show } from "@/types/api/show/show";
import { ShowDetailsResponse } from "@/types/api/show/show-details-response";
import { fetchShowById } from "./fetch-show-by-id";

export async function fetchShowDirectory() {
  try {
    const response = await fetch(`${getApiOrigin()}/api/v1/shows`, {
      headers: { Cookie: formatCookieHeader(await getAuthCookies()) },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
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
