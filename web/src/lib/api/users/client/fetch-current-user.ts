import type { User } from "@/types/api/user/user";

// Browser reads use the same-origin API rewrite instead of invoking a Next.js
// server action. The proxy still handles HttpOnly session cookies and refresh.
export async function fetchCurrentUser() {
  try {
    const response = await fetch("/api/v1/users/me", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const { data }: User = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
