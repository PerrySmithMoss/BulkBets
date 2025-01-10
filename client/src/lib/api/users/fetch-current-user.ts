"use server";

import { formatCookieHeader, getAuthCookies } from "@/lib/utils/cookies";
import { tryFetcher } from "@/lib/utils/tryFetcher";
import { User } from "@/types/api/user/user";

export const fetchCurrentUser = async () => {
  try {
    const authCookies = await getAuthCookies();
    const cookieHeader = formatCookieHeader(authCookies);

    const { data, error } = await tryFetcher<User>(
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/users/me`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Cookie: cookieHeader,
        },
      })
    );

    if (error) {
      return { data: null, error: String(error) };
    }

    return { data: data?.data ?? null, error };
  } catch (error) {
    const errorMessage = `[fetchCurrentUser] - unexpected error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    return { data: null, error: errorMessage };
  }
};
