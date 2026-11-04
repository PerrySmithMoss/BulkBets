"use server";

import { getApiOrigin } from "@/lib/api/origin";

import { formatCookieHeader, getAuthCookies } from "@/lib/utils/cookies";
import { unstable_rethrow } from "next/navigation";
import { ShowDetailsResponse } from "@/types/api/show/show-details-response";

export async function fetchShowDirectory() {
  try {
    const response = await fetch(`${getApiOrigin()}/api/v1/shows/directory`, {
      headers: { Cookie: formatCookieHeader(await getAuthCookies()) },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Show directory unavailable");
    const { data }: {
      data: { shows: ShowDetailsResponse["data"][]; partial: boolean };
    } = await response.json();
    return {
      shows: data.shows,
      error: data.partial,
    };
  } catch (error) {
    unstable_rethrow(error);
    return { shows: [] as ShowDetailsResponse["data"][], error: true };
  }
}
