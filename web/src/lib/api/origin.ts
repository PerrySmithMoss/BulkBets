type OriginEnvironment = { API_URL?: string; VERCEL?: string };

// Shared by Next's rewrite configuration and server-side requests. Browser
// requests remain relative to /api, so session cookies stay on the frontend host.
export function getApiOrigin(
  env: OriginEnvironment = {
    API_URL: process.env.API_URL,
    VERCEL: process.env.VERCEL,
  },
): string {
  const value = env.API_URL;
  if (env.VERCEL === "1" && !value)
    throw new Error(
      "Set API_URL to your HTTPS VPS API origin in Vercel before building.",
    );
  const url = new URL(value ?? "http://localhost:8080");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "API_URL must be an HTTP(S) origin without a path, credentials, query or fragment.",
    );
  }
  if (env.VERCEL === "1" && url.protocol !== "https:")
    throw new Error("The VPS API_URL must use HTTPS on Vercel.");
  return url.origin;
}
