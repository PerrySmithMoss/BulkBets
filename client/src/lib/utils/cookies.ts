import { cookies } from "next/headers";

// Define the cookies we need for authentication
export const AUTH_COOKIES = ["access_token", "refresh_token"] as const;
type AuthCookie = (typeof AUTH_COOKIES)[number];

export async function getAuthCookies(): Promise<
  Partial<Record<AuthCookie, string>>
> {
  const cookieStore = await cookies(); // Await the promise to get the resolved ReadonlyRequestCookies

  return AUTH_COOKIES.reduce<Partial<Record<AuthCookie, string>>>(
    (acc, cookieName) => {
      const cookie = cookieStore.get(cookieName); // Now we can use `get`
      if (cookie?.value) {
        acc[cookieName] = cookie.value;
      }
      return acc;
    },
    {}
  );
}

export function formatCookieHeader(
  cookies: Partial<Record<string, string>>
): string {
  return Object.entries(cookies)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

export function parseAuthCookies(cookies: string[]): string[] {
  if (!cookies) return [];

  // Filter based on allowed cookies
  const filteredCookies = cookies.filter((cookie) =>
    AUTH_COOKIES.some((allowedCookie) => cookie.startsWith(`${allowedCookie}=`))
  );

  return filteredCookies;
}
