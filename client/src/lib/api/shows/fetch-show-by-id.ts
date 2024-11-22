import { formatCookieHeader, getAuthCookies } from "@/lib/utils/cookies";
import { tryFetcher } from "@/lib/utils/tryFetcher";
import { API_ROUTES } from "../constants";
import { ShowDetailsResponse } from "@/types/api/show/show-details-response";

export const fetchShowById = async (
  id: number
): Promise<ShowDetailsResponse | null> => {
  const authCookies = await getAuthCookies();
  const cookieHeader = formatCookieHeader(authCookies);

  const { data: response, error: fetchError } = await tryFetcher(
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/${API_ROUTES.SHOWS.BASE}/${id}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        Cookie: cookieHeader,
      },
    })
  );

  if (fetchError) {
    console.error(
      `[fetchShowById] - Error fetching show with ID of ${id}`,
      fetchError
    );
    return null;
  }

  if (!response) {
    console.error("[fetchShowById] - No response received");
    return null;
  }

  const { data: responseData, error: parseError } = await tryFetcher(
    response.json()
  );

  if (parseError) {
    console.error(
      "[fetchShowById] - Error parsing response in utils:",
      parseError
    );
    return null;
  }

  return responseData?.data ?? null;
};
