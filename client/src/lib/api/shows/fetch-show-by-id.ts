"use server";

import { formatCookieHeader, getAuthCookies } from "@/lib/utils/cookies";
import { tryFetcher } from "@/lib/utils/tryFetcher";
import { API_ROUTES } from "../constants";
import { ShowDetailsResponse } from "@/types/api/show/show-details-response";

export const fetchShowById = async (id: number) => {
  try {
    const authCookies = await getAuthCookies();
    const cookieHeader = formatCookieHeader(authCookies);

    const { data, error } = await tryFetcher<ShowDetailsResponse>(
      fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/${API_ROUTES.SHOWS.BASE}/${id}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: {
            Cookie: cookieHeader,
          },
        }
      )
    );

    if (error) {
      console.error(
        `[fetchShowById] - error fetching show with id ${id}: `,
        String(error)
      );
      return { data: null, error: String(error) };
    }

    return { data: data?.data ?? null, error };
  } catch (error) {
    const errorMessage = `[fetchShowById] - unexpected error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    return { data: null, error: errorMessage };
  }
};
