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

export const getUserBets = async (opts?: GetUserBetsOptions) => {
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

  const { data, error } = await tryFetcher<BetResponse>(
    fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        Cookie: cookieHeader,
      },
    })
  );

  if (error) {
    console.error(`[getUserBets] - Error fetching user's bets`, String(error));
    return { data: null, error: String(error) };
  }

  return { data: data?.data ?? null, error };
};
