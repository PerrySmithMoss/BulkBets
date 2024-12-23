import { formatCookieHeader, getAuthCookies } from "@/lib/utils/cookies";
import { tryFetcher } from "@/lib/utils/tryFetcher";
import { API_ROUTES } from "../constants";
import { ShowDetailsResponse } from "@/types/api/show/show-details-response";

interface Options {
  status?: string;
  limit?: number;
  offset?: number;
}

export const getUserBets = async (
  opts?: Options
): Promise<ShowDetailsResponse | null> => {
  const authCookies = await getAuthCookies();
  const cookieHeader = formatCookieHeader(authCookies);

  const { data: response, error: fetchError } = await tryFetcher(
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/${API_ROUTES.BETS.BASE}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        Cookie: cookieHeader,
      },
    })
  );

  if (fetchError) {
    console.error(`[getUserBets] - Error fetching user's bets`, fetchError);
    return null;
  }

  if (!response) {
    console.error("[getUserBets] - No response received");
    return null;
  }

  const { data: responseData, error: parseError } = await tryFetcher(
    response.json()
  );

  if (parseError) {
    console.error(
      "[getUserBets] - Error parsing response in utils:",
      parseError
    );
    return null;
  }

  return responseData?.data ?? null;
};
