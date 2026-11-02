"use server";

import { getApiOrigin } from "@/lib/api/origin";

import { unstable_rethrow } from "next/navigation";

import { formatCookieHeader, getAuthCookies } from "@/lib/utils/cookies";
import { tryFetcher } from "@/lib/utils/tryFetcher";
import { User } from "@/types/api/user/user";

export const fetchCurrentUser = async () => {
  try {
    const authCookies = await getAuthCookies();
    if (!authCookies.access_token) return { data: null, error: null };
    const cookieHeader = formatCookieHeader(authCookies);

    const { data, error } = await tryFetcher<User>(
      fetch(`${getApiOrigin()}/api/v1/users/me`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Cookie: cookieHeader,
        },
      }),
    );

    if (error) {
      return { data: null, error: String(error) };
    }

    return { data: data?.data ?? null, error };
  } catch (error) {
    unstable_rethrow(error);
    const errorMessage = `[fetchCurrentUser] - unexpected error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    return { data: null, error: errorMessage };
  }
};
