import { getApiOrigin } from "@/lib/api/origin";
import { NextResponse, NextRequest } from "next/server";
import { API_ROUTES } from "./lib/api/constants";

async function refreshTokens(refreshToken: string) {
  try {
    const response = await fetch(
      `${getApiOrigin()}/${API_ROUTES.AUTH.REFRESH_TOKENS}`,
      {
        method: "GET",
        headers: {
          Cookie: `refresh_token=${refreshToken}`,
        },
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to refresh tokens");
    }

    const cookies = response.headers.getSetCookie();

    return cookies;
  } catch (error) {
    console.error("Error refreshing tokens:", error);
    return null;
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // The API refresh endpoint performs its own rotation; do not refresh it twice.
  if (pathname === `/${API_ROUTES.AUTH.REFRESH_TOKENS}`) {
    return NextResponse.next();
  }
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  // 🔹 Protected routes (only logged-in users should access these)
  const isProtectedRoute = pathname.startsWith("/customer");

  // ✅ If access token exists, allow access
  if (accessToken) {
    return NextResponse.next();
  }

  // 🔄 If no access token but refresh token exists, try refreshing
  if (!accessToken && refreshToken) {
    const newCookies = await refreshTokens(refreshToken);

    if (!newCookies) {
      // 🔹 If refresh failed, redirect unauthorized users
      if (isProtectedRoute) {
        // Redirect to login page if user is not authenticated
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Clone the request to modify headers
    const requestHeaders = new Headers(req.headers);
    const requestCookies = new Map(
      req.cookies.getAll().map(({ name, value }) => [name, value]),
    );
    for (const cookie of newCookies) {
      const pair = cookie.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0)
        requestCookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    requestHeaders.set(
      "Cookie",
      Array.from(requestCookies, ([name, value]) => `${name}=${value}`).join(
        "; ",
      ),
    );

    // Create response with the modified request and attach cookies for the client
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    // Attach the new cookies to the response headers for the subsequent server requests
    newCookies.forEach((cookie) => {
      response.headers.append("Set-Cookie", cookie);
    });

    return response;
  }

  // Define protected routes
  if (req.nextUrl.pathname.startsWith("/customer")) {
    // Redirect to login page if user is not authenticated
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!customer/account/create|api/v1/auth/token/refresh|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api)(.*)",
  ],
};
