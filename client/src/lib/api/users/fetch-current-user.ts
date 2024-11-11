import { formatCookieHeader, getAuthCookies } from "@/lib/utils/cookies";
import { tryFetcher } from "@/lib/utils/tryFetcher";
import { User } from "@/types/api/user/user";

export const fetchCurrentUser = async (): Promise<User | null> => {
  const authCookies = await getAuthCookies();
  const cookieHeader = formatCookieHeader(authCookies);

  const { data: response, error: fetchError } = await tryFetcher(
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/users/me`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        Cookie: cookieHeader,
      },
    })
  );

  if (fetchError) {
    console.error("Error fetching current user:", fetchError);
    return null;
  }

  if (!response) {
    console.error("No response received");
    return null;
  }

  const { data: responseData, error: parseError } = await tryFetcher(
    response.json()
  );

  if (parseError) {
    console.error("Error parsing response in utils:", parseError);
    return null;
  }

  return responseData?.data ?? null;
};
