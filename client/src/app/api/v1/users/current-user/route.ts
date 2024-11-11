// TODO: WIP - is this needed now that we're leveraging the the next.js middleware?

import { tryFetcher } from "@/lib/utils/tryFetcher";
import { NextResponse } from "next/server";
import { formatCookieHeader, getAuthCookies } from "@/lib/utils/cookies";

export async function GET() {
  const authCookies = await getAuthCookies();
  const cookieHeader = formatCookieHeader(authCookies);

  const { data: response, error: fetchError } = await tryFetcher(
    fetch(`${process.env.API_URL}/v1/users/me`, {
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
    return NextResponse.json({ data: null, error: fetchError, status: 500 });
  }

  if (!response || !response.ok) {
    if (response?.status === 401) {
      return NextResponse.json({
        data: null,
        error: "User not authenticated",
        status: 401,
      });
    }
    return NextResponse.json(
      {
        data: null,
        error: `Failed to fetch user: ${response?.status}`,
      },
      { status: 500 }
    );
  }

  const { data: user, error: parseError } = await tryFetcher(response.json());

  if (parseError) {
    console.error("Error parsing user data in route handler:", parseError);
    return NextResponse.json({ data: null, error: parseError });
  }

  // ? Note - we could potentially filter the cookieHeaders if we only
  // wanted to parse specific ones
  const cookieHeaders = response.headers.getSetCookie();

  const nextResponse = NextResponse.json(
    { data: user, error: null, status: 200 }
    // { headers: { "Set-cookie": "authToken=secret; Path=/; HttpOnly" } }
  );
  // const headers = new Headers();
  // headers.set("Set-Cookie", cookieHeaders.join(", "));

  // return NextResponse.json(
  //   {
  //     data: user,
  //     error: null,
  //     status: response.status,
  //   },
  //   { headers }
  // );

  // const nextResponse = NextResponse.json({
  //   data: user,
  //   error: null,
  //   status: response.status,
  // });
  // const nextResponse = NextResponse.next();

  if (cookieHeaders && cookieHeaders.length > 0) {
    // cookieHeaders.forEach((cookieHeader) => {
    //   // Parse the cookie header to get the key-value pair and options
    //   const [cookieValue, ...options] = cookieHeader.split(";");
    //   const [cookieName, cookieVal] = cookieValue.split("=");
    //   console.log("cookieValue: ", { cookieValue, options });
    //   console.log("cookieName: ", { cookieName, cookieVal });
    //   // Set each cookie using the Next.js cookies API
    //   nextResponse.cookies.set(cookieName.trim(), cookieVal, {
    //     // cookieStore.set(cookieName.trim(), cookieVal, {
    //     // Parse and set cookie options
    //     httpOnly: options.some(
    //       (opt) => opt.trim().toLowerCase() === "httponly"
    //     ),
    //     secure: options.some((opt) => opt.trim().toLowerCase() === "secure"),
    //     sameSite:
    //       (options
    //         .find((opt) => opt.trim().toLowerCase().startsWith("samesite="))
    //         ?.split("=")[1]
    //         .toLowerCase() as "strict" | "lax" | "none") || "lax",
    //     path:
    //       options
    //         .find((opt) => opt.trim().toLowerCase().startsWith("path="))
    //         ?.split("=")[1] || "/",
    //     expires: new Date(
    //       options
    //         .find((opt) => opt.trim().toLowerCase().startsWith("expires="))
    //         ?.split("=")[1] || ""
    //     ),
    //   });
    // });
    // console.log("cookieHeaders: ", cookieHeaders);
    // Set each Set-Cookie header on the Next.js response
    cookieHeaders.forEach((cookie) => {
      nextResponse.headers.append("set-Cookie", cookie.trim());
    });
  }
  // console.log("cookieStore: ", cookieStore);
  // console.log("nextResponse: ", nextResponse);

  return nextResponse;
}
