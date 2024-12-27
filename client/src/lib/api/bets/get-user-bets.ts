import { formatCookieHeader, getAuthCookies } from "@/lib/utils/cookies";
import { tryFetcher } from "@/lib/utils/tryFetcher";
import { API_ROUTES } from "../constants";
import { BetResponse } from "@/types/api/bets/bet-response";
import { BetStatus } from "@/types/api/bets/bets";

export interface GetUserBetsOptions {
  status?: BetStatus[];
  limit?: number;
  offset?: number;
}

export const getUserBets = async (
  opts?: GetUserBetsOptions
): Promise<BetResponse | null> => {
  const authCookies = await getAuthCookies();
  const cookieHeader = formatCookieHeader(authCookies);

  const params = new URLSearchParams();

  if (opts?.status?.length) {
    opts.status.forEach((status) => params.append("status", status));
  }

  if (opts?.limit) {
    params.append("limit", opts.limit.toString());
  }

  if (opts?.offset) {
    params.append("offset", opts.offset.toString());
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/${API_ROUTES.BETS.BASE}${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const { data: response, error: fetchError } = await tryFetcher(
    fetch(url, {
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
