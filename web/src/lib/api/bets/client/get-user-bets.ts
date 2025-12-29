import { tryFetcher } from "@/lib/utils/tryFetcher";
import { API_ROUTES } from "../../constants";
import { BetResponse } from "@/types/api/bets/bet-response";
import { GetUserBetsOptions } from "../get-user-bets";

export const getUserBetsClient = async (opts?: GetUserBetsOptions) => {
  try {
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
      })
    );

    if (error) {
      console.error(`[getUserBetsClient] - error placing bet: `, String(error));
      return { data: null, error: String(error) };
    }

    return { data: data?.data ?? null, error };
  } catch (error) {
    const errorMessage = `[getUserBetsClient] - unexpected error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    return { data: null, error: errorMessage };
  }
};
