import { NextResponse, NextRequest } from "next/server";
import { API_ROUTES } from "./lib/api/constants";

async function refreshTokens(refreshToken: string) {
  try {
    const response = await fetch(
      `${process.env.API_URL}/${API_ROUTES.AUTH.REFRESH_TOKENS}`,
      {
        method: "GET",
        headers: {
          Cookie: `refresh_token=${refreshToken}`,
        },
        credentials: "include",
      }
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

export default async function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  if (accessToken) {
    return NextResponse.next();
  }

  if (!accessToken && refreshToken) {
    const newCookies = await refreshTokens(refreshToken);

    if (!newCookies) {
      // May need this for account specific pages?
      // return NextResponse.redirect(new URL('/login', req.url))

      return NextResponse.next();
    }

    // Clone the request to modify headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("Cookie", newCookies.join("; "));

    // Create a new request with updated cookies
    const newRequest = new NextRequest(req.url, {
      headers: requestHeaders,
      method: req.method,
      body: req.body,
      signal: req.signal,
    });

    // Create response with the modified request and attach cookies for the client
    const response = NextResponse.next({
      request: newRequest,
    });

    // Attach the new cookies to the response headers for the subsequent server requests
    newCookies.forEach((cookie) => {
      response.headers.append("Set-Cookie", cookie);
    });

    return response;
  }

  // May need this for account specific pages?
  // return NextResponse.redirect(new URL('/login', req.url))

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!customer/account/create|v1/auth/token/refresh|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api)(.*)",
  ],
};
